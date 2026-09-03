import { DEPARTMENTS, GROUPS } from '../../data/seed'
import {
  APPROVERS_L3, DURATIONS, chainSteps, factorsFor, hashOf, shiftStamp, stepState, userOf,
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

/* The change set as it stands right now: preceding-level edits already applied
   by approvalView, plus any in-flight edit the CURRENT approver has made.
   `edits` is keyed by change id, exactly as the decision panel stores it.
   Single source of truth — the panel and every target-derived card read this. */
export const resolveChanges = (row, edits = {}) => approvalView(row).changes.map((c) => ({
  ...c,
  current: edits[c.id] !== undefined ? edits[c.id] : c.to,
  editedByYou: edits[c.id] !== undefined,
}))

/* What would actually be provisioned right now, and why it differs from the
   request: a preceding level redirected it, the current approver just did, or both. */
export const targetState = (row, edits = {}) => {
  const hit = resolveChanges(row, edits).find((c) => head(c.requestedTo) === row.target)
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
export const effectiveTarget = (row, edits = {}) => targetState(row, edits).target

export const approverAt = (row, lvl) => {
  if (lvl === 1) return row.approvedByL1 || ''
  if (lvl === 2) return row.approvedByL2 || ''
  return pickOther(APPROVERS_L3, row.approvedByL2, hashOf(row.id))
}
export const stampAt = (row, lvl) => {
  if (lvl === 1) return row.approvedOnL1 || ''
  if (lvl === 2) return row.approvedOnL2 || ''
  return shiftStamp(row.raised, 30 + (hashOf(row.id) % 11))
}
export const commentAt = (row, lvl) => {
  if (lvl === 1) return row.commentL1 || ''
  if (lvl === 2) return row.commentL2 || ''
  return ''
}
// Read at call time rather than captured at module load: the chain is tenant
// configuration and can change while the console is open.
export const roleAt = (lvl) => {
  const chain = chainSteps()
  return chain[Math.min(lvl, chain.length) - 1]
}

/* Deterministic edits made by approvers at completed (preceding) levels, and the
   change set with those edits applied in level order. */
export const approvalView = (row) => {
  const changes = requestedChanges(row).map((c) => ({ ...c, requestedTo: c.to, editedAtLevels: [] }))
  const h = hashOf(row.id)
  const edits = []
  for (let lvl = 1; lvl <= row.levels; lvl += 1) {
    if (stepState(row, lvl) !== 'done') continue
    if ((h + lvl) % 3 === 0) continue // this approver signed off without touching anything
    const editable = changes.filter((c) => c.options && c.options.length > 1)
    if (editable.length === 0) continue
    const c = editable[(h + lvl) % editable.length]
    const alternatives = c.options.filter((o) => o !== c.to)
    if (alternatives.length === 0) continue
    const to = alternatives[(h + lvl * 5) % alternatives.length]
    edits.push({
      level: lvl,
      approver: approverAt(row, lvl),
      role: roleAt(lvl).title,
      changeId: c.id,
      field: c.field,
      from: c.to,
      to,
      when: stampAt(row, lvl),
    })
    c.to = to
    c.editedAtLevels.push(lvl)
  }
  return { changes, edits }
}
