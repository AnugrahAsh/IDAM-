import { NOW_MS, stampText } from '../../lib/clock'
import { levelFields, stepState } from '../accessRequests/data'
import {
  applyOps, approverAt, commentAt, emptyDraft, requestedChanges, revisionsOf, stampAt,
} from './data'

/* ---------------------------------------------------------------------------
   The approval workflow, in depth.

   The Approvers card answers "where is this and who has it". It cannot answer
   the questions an approver, a requester or an auditor actually arrives with:

     · how long did each level sit on it, against the target it was given
     · what did this level receive, and what did it hand on
     · which stored audit fields carry this level's decision

   The card has the same source data and no room to say any of it. This module
   derives the full model once, and every surface that shows an approval — the
   approver's record, the requester's tracking view, the workflow page — reads
   the same answer rather than each recomputing a partial one.
   --------------------------------------------------------------------------- */

const STAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{1,2})/

/** A console stamp (`YYYY-MM-DD HH:MM`, UTC) as epoch ms, or null. */
export const stampMs = (v) => {
  const m = STAMP_RE.exec(String(v || ''))
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) % 24, Number(m[5]) % 60)
}

/** Hours between two stamps, or null when either is missing. */
export const hoursBetween = (from, to) => {
  const a = stampMs(from)
  const b = typeof to === 'number' ? to : stampMs(to)
  if (a == null || b == null) return null
  return Math.max(0, (b - a) / 3600000)
}

/**
 * A stamp `hours` after another one.
 *
 * `shiftStamp` clamps to the platform clock, which is right for a decision
 * that has already been taken and wrong for a deadline that has not: a request
 * raised at the current instant rendered "due" at the same minute it arrived.
 * A due date is allowed to be in the future.
 */
export const addHours = (stamp, hours) => {
  const ms = stampMs(stamp)
  if (ms == null) return ''
  return stampText(new Date(ms + (hours || 0) * 3600000))
}

/** `26h` / `4.5h` / `18m` — a duration short enough to sit in a table cell. */
export const durationText = (hours) => {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  if (hours < 10) return `${Math.round(hours * 10) / 10}h`
  if (hours < 48) return `${Math.round(hours)}h`
  const d = Math.floor(hours / 24)
  const r = Math.round(hours % 24)
  return r ? `${d}d ${r}h` : `${d}d`
}

const SLA_TONE = { met: 'ok', late: 'bad', due: 'warn', running: 'warn', pending: 'mut' }
const SLA_LABEL = {
  met: 'Within target', late: 'Over target', due: 'Running late', running: 'Running', pending: 'Not started',
}

/**
 * A level's clock: when it received the request, when it decided, how that
 * compares with the target it was given.
 *
 * A level receives the request when the level before it let go of it — level 1
 * when it was raised. A level still holding the request is measured against the
 * platform clock, so "running late" is stated before the decision rather than
 * discovered after it.
 */
const clockFor = ({ receivedAt, decidedAt, sla, state }) => {
  const target = sla || 0
  if (state === 'future') {
    return { state: 'pending', tone: SLA_TONE.pending, label: SLA_LABEL.pending, target, took: null, overBy: null }
  }
  if (decidedAt) {
    const took = hoursBetween(receivedAt, decidedAt)
    const late = took != null && target > 0 && took > target
    return {
      state: late ? 'late' : 'met',
      tone: late ? SLA_TONE.late : SLA_TONE.met,
      label: late ? SLA_LABEL.late : SLA_LABEL.met,
      target,
      took,
      overBy: late ? took - target : null,
    }
  }
  const held = hoursBetween(receivedAt, NOW_MS)
  const late = held != null && target > 0 && held > target
  return {
    state: late ? 'due' : 'running',
    tone: late ? SLA_TONE.due : SLA_TONE.running,
    label: late ? SLA_LABEL.due : SLA_LABEL.running,
    target,
    took: held,
    overBy: late ? held - target : null,
  }
}

/* A change set reduced to the lines a reader compares: field, what it does,
   and the value it would provision. */
const summarise = (changes) => changes.map((c) => ({
  id: c.id,
  field: c.field,
  kind: c.kind,
  value: c.to,
  from: c.from,
}))

/* Which lines differ between the set a level received and the set it handed
   on. Keyed by change id, so a line the level rewrote reads as changed rather
   than as one removal and one addition. */
const diffSets = (before, after) => {
  const b = new Map(before.map((c) => [c.id, c]))
  const a = new Map(after.map((c) => [c.id, c]))
  const added = after.filter((c) => !b.has(c.id))
  const removed = before.filter((c) => !a.has(c.id))
  const changed = after.filter((c) => b.has(c.id) && b.get(c.id).value !== c.value)
    .map((c) => ({ ...c, was: b.get(c.id).value }))
  return { added, removed, changed, total: added.length + removed.length + changed.length }
}

/**
 * The whole workflow for a request: one entry per configured level, plus the
 * summary figures a header needs.
 *
 * `chain` is passed in rather than read here, so a caller inside a component
 * can supply the reactive `useChain()` and a level renamed in Settings renames
 * it everywhere at once.
 *
 * `draft` is the current approver's uncommitted revision. It is folded into the
 * level that is deciding — shown as pending, never as history — so the reader
 * sees what the next level would receive if this one approved now.
 */
export const workflowView = (row, chain, draft = emptyDraft()) => {
  const revisions = revisionsOf(row)
  const draftOps = (draft && draft.ops) || []
  let carried = requestedChanges(row).map((c) => ({ ...c, requestedTo: c.to, editedAtLevels: [] }))
  const requested = summarise(carried)

  const levels = chain.slice(0, row.levels).map((step, ix) => {
    const level = ix + 1
    const state = stepState(row, level)
    const revision = revisions.find((r) => r.level === level)
    const isCurrent = state === 'current'
    const fields = levelFields(level - 1)

    // What this level opened. The level before it committed its revision before
    // handing over, so the carried set is already the revised one.
    const received = summarise(carried)

    // What it hands on: its committed revision, or — while it is still holding
    // the request — the draft it has staged and would commit by approving.
    const ops = revision ? revision.ops : isCurrent ? draftOps : []
    if (ops.length > 0) carried = applyOps(carried, ops, level)
    const handed = summarise(carried)

    /* A level that has not been reached has not received anything. It was
       falling back to the raised stamp, so a request rejected at level 1 showed
       levels 2 and 3 holding it since the day it was raised. */
    const receivedAt = state === 'future'
      ? ''
      : level === 1 ? row.raised : stampAt(row, level - 1) || row.raised
    const decidedAt = state === 'done' || state === 'rejected' ? stampAt(row, level) : ''
    const clock = clockFor({ receivedAt, decidedAt, sla: step.sla, state })

    return {
      level,
      state,
      step,
      title: step.title,
      detail: step.detail,
      approver: state === 'current'
        ? (row.pendingWith || 'Unassigned')
        : state === 'future' ? '' : approverAt(row, level),
      assigned: state !== 'future',
      // Only a level that has closed has written a comment. The seeded audit
      // fields carry one a level ahead of the decision, so reading them
      // ungated put a signed-sounding comment under a level still deciding.
      comment: state === 'done' || state === 'rejected' ? commentAt(row, level) : '',
      revision,
      ops,
      pending: isCurrent && ops.length > 0,
      received,
      handed,
      diff: diffSets(received, handed),
      receivedAt,
      decidedAt,
      // When this level's decision is due. Unknown for a level that has not
      // received the request yet — there is no clock running on it.
      dueAt: receivedAt ? addHours(receivedAt, step.sla) : '',
      clock,
      // Named so an auditor reading the evidence export can find this level's
      // three cells without counting suffixes.
      evidence: [
        { key: fields.on, label: `Decided on (${step.title})`, value: row[fields.on] || '' },
        { key: fields.by, label: `Decided by (${step.title})`, value: row[fields.by] || '' },
        { key: fields.comment, label: `Comment (${step.title})`, value: row[fields.comment] || '' },
      ],
    }
  })

  const cleared = levels.filter((l) => l.state === 'done').length
  const rejectedAt = levels.find((l) => l.state === 'rejected')
  const current = levels.find((l) => l.state === 'current')
  const decided = levels.filter((l) => l.decidedAt)
  const lastStamp = decided.length ? decided[decided.length - 1].decidedAt : ''

  return {
    levels,
    requested,
    effective: levels.length ? levels[levels.length - 1].handed : requested,
    revisions,
    cleared,
    total: levels.length,
    pct: levels.length ? Math.round((cleared / levels.length) * 100) : 0,
    current,
    rejectedAt,
    // Time on the request as a whole: to the last decision when it is closed,
    // to the platform clock while it is still moving.
    elapsedH: hoursBetween(row.raised, lastStamp && !current ? lastStamp : NOW_MS),
    // The sum of the targets the configured chain gives it, so a request can be
    // read against the window it was promised rather than against one level's.
    targetH: levels.reduce((t, l) => t + (l.clock.target || 0), 0),
    breachedLevels: levels.filter((l) => l.clock.state === 'late' || l.clock.state === 'due').length,
    revisedLevels: levels.filter((l) => l.diff.total > 0).length,
  }
}
