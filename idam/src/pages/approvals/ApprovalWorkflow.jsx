import { useMemo } from 'react'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import Meter from '../../components/primitives/Meter'
import { useChain, STEP_LABEL, STEP_TONE } from '../accessRequests/data'
import { CHANGE_ICON, emptyDraft } from './data'
import { durationText, workflowView } from './workflow'

/* ---------------------------------------------------------------------------
   The in-depth reading of an approval workflow.

   The compact card in a record rail states where a request is. Everything
   here is what it has no room to state: how long each level held it against
   the target it was given, the change set as that level received it beside the
   set it handed on, the decision comment in full, and the audit fields the
   decision was written to. One module, so the approver's record, the
   requester's tracking view and the workflow page read the same answer.
   --------------------------------------------------------------------------- */

export const OP_VERB = { add: 'Added', remove: 'Removed', modify: 'Changed' }
const DOT_ICON = { done: 'check', rejected: 'x', current: 'clock', future: 'chevD' }
const KIND_ICON = { add: 'plus', remove: 'minus', modify: 'edit' }

/** One operation of a revision, as a line in a trail. */
export function OpLine({ o, pending }) {
  return (
    <div className="apv-tl-op" data-op={o.op} data-pending={pending || undefined}>
      <Icon name={CHANGE_ICON[o.op === 'modify' ? 'modify' : o.op] || 'edit'} size={11} />
      <span>
        <b>{OP_VERB[o.op]}</b> {o.field}
        {o.op === 'modify' && <>: <span className="mono">{o.from}</span> → <span className="mono">{o.to}</span></>}
        {o.op === 'add' && <>: <span className="mono">{o.kind === 'remove' ? o.from : o.to}</span>{o.kind === 'remove' ? ' (to be removed)' : ''}</>}
        {o.op === 'remove' && <>: <span className="mono">{o.to}</span> — no longer part of the request</>}
      </span>
    </div>
  )
}

/* The four figures that answer "how long did this level take, and was that
   within what it was given". Stated for a level still holding the request too,
   so lateness is visible before the decision rather than after it. */
function ClockStrip({ entry }) {
  const { clock } = entry
  const cells = [
    { k: 'Received', v: entry.receivedAt || 'not reached', mono: !!entry.receivedAt, faint: !entry.receivedAt },
    {
      k: 'Decided',
      v: entry.decidedAt || (entry.state === 'current' && entry.dueAt
        ? `due ${entry.dueAt}`
        : 'not yet reached'),
      mono: true,
      faint: !entry.decidedAt,
    },
    { k: entry.decidedAt ? 'Time taken' : 'Held for', v: durationText(clock.took) },
    { k: 'Target', v: clock.target ? `${clock.target}h` : '—' },
  ]
  return (
    <div className="apv-clock">
      {cells.map((c) => (
        <div className="apv-clock-c" key={c.k}>
          <span className="apv-clock-k">{c.k}</span>
          <span className={`apv-clock-v ${c.mono ? 'mono' : ''} ${c.faint ? 't-faint' : ''}`.trim()}>{c.v}</span>
        </div>
      ))}
      <div className="apv-clock-c apv-clock-sla">
        <span className="apv-clock-k">Against target</span>
        <span className="apv-clock-v">
          <Pill tone={clock.tone} dot>
            {clock.label}
            {clock.overBy ? ` by ${durationText(clock.overBy)}` : ''}
          </Pill>
        </span>
      </div>
    </div>
  )
}

/* A change set, as a list of what it would provision. Used twice per level —
   once for what arrived, once for what left — so the two read as one thing
   before and after. */
function SetList({ items, empty = 'Nothing in the request at this point.' }) {
  if (!items.length) return <div className="t-xs t-faint">{empty}</div>
  return (
    <div className="apv-set">
      {items.map((c) => (
        <div className="apv-set-it" data-kind={c.kind} key={c.id}>
          <Icon name={KIND_ICON[c.kind] || 'edit'} size={11} />
          <span className="apv-set-f">{c.field}</span>
          <span className="apv-set-v mono">{c.value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * One level, in full.
 *
 * `compact` drops the side-by-side sets and the evidence keys — the rail is
 * ~340px wide and two columns of change lines there are unreadable. Everything
 * that fits in a single column stays, so expanding in the rail is a smaller
 * view of the same thing rather than a different one.
 */
export function LevelDetail({ entry, compact }) {
  const { diff, clock } = entry
  const changed = diff.total > 0

  return (
    <div className="apv-deep" data-compact={compact || undefined}>
      <ClockStrip entry={entry} />

      {entry.state === 'rejected' && (
        <div className="banner" data-tone="bad">
          <Icon name="ban" size={15} />
          <div>
            <b>Rejected at this level.</b> The request stopped here — no later level saw it, and nothing was
            provisioned. The requester was notified with the comment below.
          </div>
        </div>
      )}

      <section className="apv-deep-s">
        <div className="apv-deep-h"><Icon name="file" size={12} />Decision comment</div>
        {entry.comment
          ? <div className="apv-quote">“{entry.comment}”</div>
          : (
            <div className="t-xs t-faint">
              {entry.state === 'done'
                ? 'Signed off without a written comment. A comment is only mandatory on a rejection or a policy override.'
                : entry.state === 'current'
                  ? 'Not written yet — the approver holding this level has not committed a decision.'
                  : 'This level has not been reached.'}
            </div>
          )}
      </section>

      <section className="apv-deep-s">
        <div className="apv-deep-h">
          <Icon name="edit" size={12} />
          What this level changed
          {entry.pending
            ? <Tag tone="acc">staged · commits on approval</Tag>
            : <Tag>{changed ? `${diff.total} ${diff.total === 1 ? 'operation' : 'operations'}` : 'none'}</Tag>}
        </div>
        {entry.ops.length > 0 ? (
          <div className="apv-lvl-edits" data-pending={entry.pending || undefined}>
            {entry.ops.map((o, k) => <OpLine o={o} key={`${o.changeId}-${k}`} pending={entry.pending} />)}
          </div>
        ) : (
          <div className="t-xs t-faint">
            {entry.state === 'done'
              ? 'Approved the request exactly as it arrived — nothing added, removed or rewritten.'
              : entry.state === 'current'
                ? 'No revision staged. Approving now hands the next level the request unchanged.'
                : 'Nothing yet.'}
          </div>
        )}
      </section>

      {!compact && (
        <section className="apv-deep-s">
          <div className="apv-deep-h">
            <Icon name="swap" size={12} />
            Received and handed on
            {changed && <Tag tone={entry.pending ? 'acc' : 'warn'}>not the same request</Tag>}
          </div>
          <div className="apv-ba">
            <div className="apv-ba-col">
              <div className="apv-ba-k">As this level received it</div>
              <SetList items={entry.received} empty="The request carried no change lines when it arrived." />
            </div>
            <div className="apv-ba-arr"><Icon name="arrowRight" size={14} /></div>
            <div className="apv-ba-col" data-changed={changed || undefined}>
              <div className="apv-ba-k">
                {entry.state === 'current'
                  ? (entry.pending ? 'As the next level would receive it' : 'Unchanged so far')
                  : 'As it handed the request on'}
              </div>
              <SetList items={entry.handed} empty="Every line was struck out at this level." />
            </div>
          </div>
        </section>
      )}

      {!compact && (
        <section className="apv-deep-s">
          <div className="apv-deep-h"><Icon name="db" size={12} />Evidence fields</div>
          <div className="apv-ev">
            {entry.evidence.map((e) => (
              <div className="apv-ev-r" key={e.key}>
                <span className="apv-ev-k mono">{e.key}</span>
                <span className="apv-ev-l">{e.label}</span>
                <span className="apv-ev-v">{e.value || <span className="t-faint">not written</span>}</span>
              </div>
            ))}
          </div>
          <div className="t-xs t-faint" style={{ marginTop: 6 }}>
            These are the stored keys this level's decision is written to and exported from. They are sealed once
            the decision is committed.
          </div>
        </section>
      )}
    </div>
  )
}

/* The header figures: where the request is in the chain, how long it has been
   there in total, and whether any level has run past what it was given. */
function WorkflowSummary({ row, view }) {
  const items = [
    { k: 'Levels cleared', v: `${view.cleared} of ${view.total}`, icon: 'approve' },
    { k: 'Currently with', v: view.rejectedAt ? 'Rejected — stopped' : (view.current ? (row.pendingWith || 'Unassigned') : 'Decided'), icon: 'user' },
    { k: 'Time on request', v: durationText(view.elapsedH), icon: 'clock' },
    { k: 'Chain target', v: view.targetH ? `${view.targetH}h` : '—', icon: 'target' },
    {
      k: 'Levels over target',
      v: view.breachedLevels,
      icon: 'warn',
      tone: view.breachedLevels ? 'bad' : undefined,
    },
    {
      k: 'Levels that revised it',
      v: view.revisedLevels,
      icon: 'edit',
      tone: view.revisedLevels ? 'warn' : undefined,
    },
  ]
  return (
    <div className="apv-sum">
      <div className="apv-sum-bar">
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span className="t-xs t-mut">Progress through the chain</span>
          <span className="t-xs mono">{view.pct}%</span>
        </div>
        <Meter value={view.pct} tone={view.rejectedAt ? 'bad' : view.pct === 100 ? 'ok' : 'warn'} />
      </div>
      <div className="apv-sum-g">
        {items.map((i) => (
          <div className="apv-sum-c" key={i.k} data-tone={i.tone}>
            <span className="apv-sum-k"><Icon name={i.icon} size={11} />{i.k}</span>
            <span className="apv-sum-v">{i.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The whole workflow, level by level, every level open.
 *
 * Sections rather than a timeline: at this depth each level is a page of
 * reading, and threading a 15px dot rail down the side of six stacked sections
 * connects nothing the heading does not already say.
 */
export default function ApprovalWorkflow({ row, draft = emptyDraft(), summary = true }) {
  const view = useWorkflow(row, draft)

  return (
    <div className="stack">
      {summary && (
        <Card
          title="Where this request stands"
          sub={`Approval workflow · level ${row.level} of ${row.levels} · ${view.total} configured ${view.total === 1 ? 'level' : 'levels'}`}
          actions={<Pill tone={STEP_TONE[view.rejectedAt ? 'rejected' : view.current ? 'current' : 'done']} dot>{row.status}</Pill>}
        >
          <WorkflowSummary row={row} view={view} />
        </Card>
      )}

      {view.levels.map((entry) => (
        <Card
          key={entry.level}
          className="apv-deep-card"
          title={`Level ${entry.level} · ${entry.title}`}
          sub={entry.detail}
          actions={(
            <>
              {entry.state === 'current' && <Tag tone="acc">deciding now</Tag>}
              {entry.diff.total > 0 && (
                <Tag tone={entry.pending ? 'acc' : undefined}>
                  {entry.diff.total} {entry.diff.total === 1 ? 'revision' : 'revisions'}
                </Tag>
              )}
              <Pill tone={STEP_TONE[entry.state]} dot>{STEP_LABEL[entry.state]}</Pill>
            </>
          )}
        >
          <div className="apv-who">
            <span className="apv-who-dot" data-tone={STEP_TONE[entry.state]}>
              <Icon name={DOT_ICON[entry.state]} size={11} />
            </span>
            {entry.assigned
              ? <Avatar name={entry.approver} size="md" />
              : <span className="apv-who-blank"><Icon name="user" size={14} /></span>}
            <div className="apv-who-m">
              <div className="apv-who-n">{entry.approver || 'Not yet assigned'}</div>
              <div className="apv-who-s">
                {entry.state === 'done' ? 'Committed the decision at this level'
                  : entry.state === 'rejected' ? 'Rejected the request at this level'
                    : entry.state === 'current' ? 'Holds the decision now'
                      : 'Assigned when the request reaches this level'}
                {' · '}{entry.title}
              </div>
            </div>
          </div>
          <LevelDetail entry={entry} />
        </Card>
      ))}

      <Card title="How to read this" className="apv-legend">
        <div className="t-sm t-mut">
          Levels decide in order, and each one reads the request as the level before it left it. A level may narrow,
          correct or extend the request before passing it on; every such intervention is committed with the approval
          as a revision and is shown above beside the level that made it. Timestamps are UTC, recorded when the
          decision was committed, and cannot be edited afterwards.
        </div>
      </Card>
    </div>
  )
}

/** The workflow model, against the live chain. Every surface reads this. */
export const useWorkflow = (row, draft = emptyDraft()) => {
  const chain = useChain()
  return useMemo(() => workflowView(row, chain, draft), [row, chain, draft])
}

/**
 * The rail form: one level of the compact timeline, expanded in place.
 *
 * Kept here rather than in the timeline so the expanded reading and the page
 * are one component — a field added to the depth view appears in both without
 * anyone having to remember the second one.
 */
export function LevelExpansion({ row, level, draft }) {
  const view = useWorkflow(row, draft)
  const entry = view.levels.find((l) => l.level === level)
  if (!entry) return null
  return <LevelDetail entry={entry} compact />
}
