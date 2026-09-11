import { DEPARTMENTS, GROUPS } from '../../data/seed'
import {
  APPROVERS_L3, DURATIONS, chainSteps, factorsFor, hashOf, levelFields, shiftStamp, stepState, userOf,
} from '../requests/data'

const GROUP_NAMES = GROUPS.map((g) => g.name)
const DESIGNATIONS = ['Engineer', 'Senior Engineer', 'Manager', 'Director', 'Analyst', 'Architect', 'Lead']
const MFA_SCOPES = [
  'All factors cleared · re-enrollment forced',
  'Weak factors cleared (SMS, email codes)',
  'Authenticator app cleared · passkey kept',
]
const SESSION_SCOPES = ['Revoked on every device', 'Left running until natural expiry']
const EXPIRIES = ['Auto-expires 4 hours after grant', 'Auto-expires 24 hours after grant', 'Expires at incident close']

export const CHANGE_TONE = { add: 'ok', remove: 'bad', modify: 'warn' }
export const CHANGE_ICON = { add: 'plus', remove: 'minus', modify: 'edit' }
export const CHANGE_LABEL = { add: 'Added', remove: 'Removed', modify: 'Changed' }

const pickOther = (list, value, offset) => {
  const c = list[offset % list.length]
  return c === value ? list[(offset + 1) % list.length] : c
}

/* The set of changes the requester asked for, derived per request type.
   Rows raised in-session carry an explicit `changes` array and use it directly. */
export const requestedChanges = (row) => {
  if (Array.isArray(row.changes) && row.changes.length > 0) {
    return row.changes.map((c) => ({ options: null, ...c }))
  }
  const h = hashOf(row.id)
  const u = row.userId ? userOf(row.userId) : null
  switch (row.type) {
    case 'New access':
      return [
        { id: 'grant', field: 'Group membership', from: 'Not held', to: row.target, kind: 'add', options: GROUP_NAMES },
        { id: 'duration', field: 'Grant duration', from: '—', to: row.duration || DURATIONS[h % 3], kind: 'add', options: DURATIONS },
      ]
    case 'Role change': {
      const fromRole = (u && u.designation) || DESIGNATIONS[h % DESIGNATIONS.length]
      const toRole = pickOther(DESIGNATIONS, fromRole, h + 2)
      const out = [
        { id: 'designation', field: 'Designation', from: fromRole, to: toRole, kind: 'modify', options: DESIGNATIONS },
        { id: 'bundle', field: 'Entitlement bundle', from: pickOther(GROUP_NAMES, row.target, h + 3), to: row.target, kind: 'modify', options: GROUP_NAMES },
      ]
      if (h % 2 === 0 && u) {
        out.push({ id: 'department', field: 'Department', from: u.department, to: pickOther(DEPARTMENTS, u.department, h + 1), kind: 'modify', options: DEPARTMENTS })
      }
      return out
    }
    case 'Application group': {
      const out = [
        { id: 'add', field: 'Group membership', from: 'Not held', to: row.target, kind: 'add', options: GROUP_NAMES },
      ]
      if (h % 2 === 0) {
        out.push({ id: 'rem', field: 'Group membership', from: pickOther(GROUP_NAMES, row.target, h + 5), to: 'Removed', kind: 'remove', options: null })
      }
      out.push({ id: 'duration', field: 'Grant duration', from: '—', to: row.duration || DURATIONS[h % DURATIONS.length], kind: 'add', options: DURATIONS })
      return out
    }
    case 'MFA reset': {
      const held = u ? factorsFor(u).length : 0
      return [
        { id: 'factors', field: 'Enrolled factors', from: u ? `${held} active factor${held === 1 ? '' : 's'}` : 'Current enrollment', to: MFA_SCOPES[h % MFA_SCOPES.length], kind: 'remove', options: MFA_SCOPES },
        { id: 'sessions', field: 'Active sessions', from: 'Signed in', to: SESSION_SCOPES[h % 5 === 0 ? 1 : 0], kind: 'remove', options: SESSION_SCOPES },
      ]
    }
    case 'Emergency access':
      return [
        { id: 'grant', field: 'Privileged grant', from: 'Not held', to: `${row.target} · emergency scope`, kind: 'add', options: GROUP_NAMES.map((n) => `${n} · emergency scope`) },
        { id: 'expiry', field: 'Expiry', from: '—', to: EXPIRIES[h % EXPIRIES.length], kind: 'add', options: EXPIRIES },
      ]
    default:
      return [
        { id: 'grant', field: 'Requested change', from: '—', to: row.target, kind: 'add', options: null },
      ]
  }
}

const head = (s) => String(s || '').split(' · ')[0]

/* ---------------------------------------------------------------------------
   Revisions.

   An approver does not only sign a request; at their level they may narrow it,
   correct it, or extend it before it moves on. Each such intervention is one
   revision — the level it was made at, who made it, when, and the operations
   it consisted of — and the request carries every revision it has accumulated.
   The next level reads the request as revised, and reads the revisions as a
   trail, so a level-2 approver sees exactly what level 1 added, removed or
   changed rather than a change set that silently differs from the one the
   requester wrote.

   An operation is one of:
     { op: 'modify', changeId, field, from, to }
     { op: 'remove', changeId, field, from, to }         from/to are the change removed
     { op: 'add',    changeId, field, from, to, kind }   the change introduced

   Nothing is edited in place. The requested set stays what the requester
   asked for; the effective set is the fold of the revisions over it.
   --------------------------------------------------------------------------- */

let seq = 0
export const nextChangeId = (level) => `L${level}-${Date.now().toString(36)}-${(seq += 1)}`

/* What an approver may introduce. Kept to the fields a request already speaks
   in, so an addition provisions the same way a requested change does. */
export const ADDABLE = [
  { id: 'group', label: 'Grant a group', field: 'Group membership', kind: 'add', from: 'Not held', options: GROUP_NAMES },
  { id: 'ungroup', label: 'Remove a group', field: 'Group membership', kind: 'remove', to: 'Removed', options: GROUP_NAMES },
  { id: 'duration', label: 'Set a duration', field: 'Grant duration', kind: 'add', from: '—', options: DURATIONS },
  { id: 'other', label: 'Other change', field: '', kind: 'modify', free: true },
]

/* Fold a list of operations over a change set, in order. */
export const applyOps = (changes, ops, level) => {
  let out = changes
  ops.forEach((o) => {
    if (o.op === 'add') {
      out = [...out, {
        id: o.changeId, field: o.field, from: o.from, to: o.to, kind: o.kind || 'add', options: null,
        requestedTo: o.to, editedAtLevels: [], addedAtLevel: level,
      }]
    } else if (o.op === 'remove') {
      out = out.filter((c) => c.id !== o.changeId)
    } else if (o.op === 'modify') {
      out = out.map((c) => (c.id === o.changeId
        ? { ...c, to: o.to, editedAtLevels: [...(c.editedAtLevels || []), level] }
        : c))
    }
  })
  return out
}

/* The revisions a seeded request carries from the levels already signed off.
   Rows raised in this session start with none; rows the demo ships with are
   given a deterministic history so a level-2 record has a level-1 trail to
   show. The same shape either way — one code path reads both. */
const seedRevisions = (row) => {
  const h = hashOf(row.id)
  const revisions = []
  let changes = requestedChanges(row).map((c) => ({ ...c, requestedTo: c.to, editedAtLevels: [] }))
  for (let lvl = 1; lvl <= row.levels; lvl += 1) {
    if (stepState(row, lvl) !== 'done') continue
    if ((h + lvl) % 3 === 0) continue // signed off without touching anything
    const ops = []
    let touched = null
    const editable = changes.filter((c) => c.options && c.options.length > 1)
    if (editable.length > 0) {
      const c = editable[(h + lvl) % editable.length]
      const alternatives = c.options.filter((o) => o !== c.to)
      if (alternatives.length > 0) {
        touched = c.id
        ops.push({ op: 'modify', changeId: c.id, field: c.field, from: c.to, to: alternatives[(h + lvl * 5) % alternatives.length] })
      }
    }
    // Some levels also narrow or extend the scope, so the trail shows every
    // kind of intervention the next level can meet. A level never strikes out
    // the change it has just corrected — that would be two decisions about one
    // line, and reads as one.
    const removable = changes.filter((c) => c.id !== touched)
    if ((h + lvl) % 4 === 1 && removable.length > 0 && changes.length > 1) {
      const victim = removable[removable.length - 1]
      ops.push({ op: 'remove', changeId: victim.id, field: victim.field, from: victim.from, to: victim.to })
    } else if ((h + lvl) % 5 === 2) {
      const extra = GROUP_NAMES[(h * 3 + lvl) % GROUP_NAMES.length]
      if (!changes.some((c) => c.to === extra)) {
        ops.push({ op: 'add', changeId: `L${lvl}-seed-${extra}`, field: 'Group membership', from: 'Not held', to: extra, kind: 'add' })
      }
    }
    if (ops.length === 0) continue
    revisions.push({ level: lvl, approver: approverAt(row, lvl), role: roleAt(lvl).title, when: stampAt(row, lvl), ops })
    changes = applyOps(changes, ops, lvl)
  }
  return revisions
}

/** Every revision the request carries, committed ones only. */
export const revisionsOf = (row) => (Array.isArray(row.revisions) ? row.revisions : seedRevisions(row))

/* The change set as the levels so far have left it, plus the trail that got it
   there. `edits` is the flattened trail — one entry per operation — for the
   surfaces that annotate a change with who touched it. */
export const approvalView = (row) => {
  let changes = requestedChanges(row).map((c) => ({ ...c, requestedTo: c.to, editedAtLevels: [] }))
  const revisions = revisionsOf(row)
  const edits = []
  revisions.forEach((rev) => {
    rev.ops.forEach((o) => edits.push({ ...o, level: rev.level, approver: rev.approver, role: rev.role, when: rev.when }))
    changes = applyOps(changes, rev.ops, rev.level)
  })
  return { changes, edits, revisions }
}

/* The current approver's uncommitted work: a list of operations, applied on
   top of the committed view. Nothing here reaches the request until Approve. */
export const emptyDraft = () => ({ ops: [] })

export const draftCounts = (draft) => {
  const ops = (draft && draft.ops) || []
  return {
    added: ops.filter((o) => o.op === 'add').length,
    removed: ops.filter((o) => o.op === 'remove').length,
    changed: ops.filter((o) => o.op === 'modify').length,
    total: ops.length,
  }
}

/* The effective set with the draft applied. Removed changes are kept in the
   list, flagged, so the panel can show what is being struck out and offer to
   undo it; every other consumer should filter on `!c.removedByYou`. */
export const resolveChanges = (row, draft = emptyDraft()) => {
  const base = approvalView(row).changes
  const ops = draft.ops || []
  const removed = new Set(ops.filter((o) => o.op === 'remove').map((o) => o.changeId))
  const modified = Object.fromEntries(ops.filter((o) => o.op === 'modify').map((o) => [o.changeId, o.to]))
  const kept = base.map((c) => ({
    ...c,
    current: modified[c.id] !== undefined ? modified[c.id] : c.to,
    editedByYou: modified[c.id] !== undefined,
    removedByYou: removed.has(c.id),
    addedByYou: false,
  }))
  const added = ops.filter((o) => o.op === 'add').map((o) => ({
    id: o.changeId, field: o.field, from: o.from, to: o.to, kind: o.kind || 'add', options: null,
    requestedTo: o.to, editedAtLevels: [], current: o.to,
    editedByYou: false, removedByYou: false, addedByYou: true,
  }))
  return [...kept, ...added]
}

/** The changes that would actually be provisioned if the draft were approved. */
export const effectiveChanges = (row, draft) => resolveChanges(row, draft).filter((c) => !c.removedByYou)

/* What would actually be provisioned right now, and why it differs from the
   request: a preceding level redirected it, the current approver just did, or both. */
export const targetState = (row, draft = emptyDraft()) => {
  const hit = effectiveChanges(row, draft).find((c) => head(c.requestedTo) === row.target)
  if (!hit) return { target: row.target, changed: false, byYou: false, levels: [] }
  const target = head(hit.current)
  return {
    target,
    changed: target !== row.target,
    byYou: hit.editedByYou && head(hit.current) !== head(hit.to),
    levels: hit.editedAtLevels || [],
  }
}

/* Scope suffixes such as "· emergency scope" are stripped so the value stays a group name. */
export const effectiveTarget = (row, draft) => targetState(row, draft).target

/* Who decided at a level, when, and what they wrote — read through the same
   key mapping every writer uses (`levelFields`: level 1 in the unsuffixed
   keys, level 2 in `…L1`, level 3 in `…L2`). These used to read one level
   ahead of that, so a live level-1 approval showed as "not yet assigned" and
   a seeded level 1 wore level 2's placeholder name. */
export const approverAt = (row, lvl) => {
  const f = levelFields(lvl - 1)
  if (row[f.by]) return row[f.by]
  return lvl >= 3 && stepState(row, lvl) === 'done' ? pickOther(APPROVERS_L3, row.approvedByL1, hashOf(row.id)) : ''
}
export const stampAt = (row, lvl) => {
  const f = levelFields(lvl - 1)
  if (row[f.on]) return row[f.on]
  return lvl >= 3 && stepState(row, lvl) === 'done' ? shiftStamp(row.raised, 30 + (hashOf(row.id) % 11)) : ''
}
export const commentAt = (row, lvl) => row[levelFields(lvl - 1).comment] || ''
// Read at call time rather than captured at module load: the chain is tenant
// configuration and can change while the console is open.
export const roleAt = (lvl) => {
  const chain = chainSteps()
  return chain[Math.min(lvl, chain.length) - 1]
}

