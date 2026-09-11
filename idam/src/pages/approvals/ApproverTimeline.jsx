import { useState } from 'react'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Button from '../../components/primitives/Button'
import Avatar from '../../components/primitives/Avatar'
import { useApp } from '../../store/AppContext'
import { STEP_LABEL, STEP_TONE, statusTone } from '../requests/data'
import { draftCounts, emptyDraft } from './data'
import { LevelExpansion, OpLine, useWorkflow } from './ApprovalWorkflow'
import { durationText } from './workflow'

const DOT_ICON = { done: 'check', rejected: 'x', current: 'clock', future: 'chevD' }

/* Level-by-level approval workflow: who each approver is, their role and level,
   decision status, decided time, comment — and the revision they made to the
   request, operation by operation, so the next level reads exactly what
   changed hands before it reached them.

   Every level opens in place. The card states where the request is; the
   expansion states how long the level held it against its target, what it
   received beside what it handed on, and the comment in full — the reading an
   approver used to have to leave the record to get, and mostly did not get. */
export default function ApproverTimeline({ row, draft = emptyDraft() }) {
  const { navigate } = useApp()
  const view = useWorkflow(row, draft)
  const counts = draftCounts(draft)
  /* Which levels are open. The level currently deciding starts open — it is
     the one the approver came to read — and the rest stay shut so the rail
     still reads as a summary. */
  const [open, setOpen] = useState(() => new Set(row.level ? [row.level] : []))
  const toggle = (i) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(i)) n.delete(i); else n.add(i)
    return n
  })

  return (
    <Card
      title="Approvers"
      sub={`Approval workflow · level ${row.level} of ${row.levels}`}
      actions={<Pill tone={statusTone(row.status)} dot>{row.status}</Pill>}
      footer={(
        <Button
          size="sm"
          icon="external"
          onClick={() => navigate(`/iam/approvals/${row.id}/workflow`)}
        >
          Open the full workflow
        </Button>
      )}
    >
      <div className="tl">
        {view.levels.map((entry) => {
          const i = entry.level
          const step = entry.step
          const state = entry.state
          const tone = STEP_TONE[state] || 'mut'
          const name = state === 'current'
            ? (row.pendingWith || 'Unassigned')
            : state === 'done' || state === 'rejected' ? entry.approver : ''
          const when = entry.decidedAt
          const note = state === 'done' ? entry.comment : ''
          const revision = entry.revision
          const isCurrent = state === 'current'
          const isOpen = open.has(i)
          return (
            <div className="tl-it apv-lvl" key={step.id || step.title} data-tone={tone} data-open={isOpen || undefined}>
              <span className="tl-dot"><Icon name={DOT_ICON[state]} size={8} /></span>
              <div className="tl-t apv-lvl-head">
                {name && <Avatar name={name} size="sm" />}
                <span>{name || 'Not yet assigned'}</span>
                <Pill tone={STEP_TONE[state]} dot>{STEP_LABEL[state]}</Pill>
                {isCurrent && <Tag tone="acc">deciding now</Tag>}
                {revision && <Tag>{revision.ops.length} {revision.ops.length === 1 ? 'revision' : 'revisions'}</Tag>}
                {/* The affordance sits in the head row rather than under the
                    level, so a shut level is one line taller than it was and
                    the rail keeps its shape. */}
                <button
                  type="button"
                  className="apv-lvl-more"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Hide level ${i} detail` : `Show level ${i} detail`}
                  onClick={() => toggle(i)}
                >
                  <span>{isOpen ? 'Less' : 'Detail'}</span>
                  <Icon name={isOpen ? 'chevU' : 'chevD'} size={11} />
                </button>
              </div>
              <div className="tl-s apv-lvl-role">
                Level {i} approver · {step.title} — {step.detail.toLowerCase()}
              </div>

              {!isOpen && (
                <>
                  {state === 'done' && note && <div className="tl-s apv-lvl-note">“{note}”</div>}
                  {state === 'done' && !note && !revision && <div className="tl-s t-faint">Approved as requested, without a comment.</div>}
                  {state === 'done' && !note && revision && <div className="tl-s t-faint">Approved with the revision below, without a comment.</div>}
                  {state === 'rejected' && (
                    <div className="tl-s"><b>Rejected at this level.</b> The requester was notified with the comment.</div>
                  )}
                  {isCurrent && counts.total === 0 && (
                    <div className="tl-s">Holds the decision now. Target {step.sla}h from receipt.</div>
                  )}

                  {/* What this level did to the request. Committed levels show
                      the revision they signed; the current level shows the
                      draft that will become its revision on approval. */}
                  {revision && (
                    <div className="apv-lvl-edits">
                      {revision.ops.map((o, k) => <OpLine o={o} key={`${o.changeId}-${k}`} />)}
                    </div>
                  )}
                  {isCurrent && counts.total > 0 && (
                    <div className="apv-lvl-edits" data-pending="true">
                      <div className="apv-tl-pending">
                        <Icon name="edit" size={11} />
                        <span>Your revision · {counts.added} added, {counts.removed} removed, {counts.changed} changed · commits on approval</span>
                      </div>
                      {draft.ops.map((o, k) => <OpLine o={o} key={`${o.changeId}-${k}`} pending />)}
                    </div>
                  )}
                </>
              )}

              {isOpen && <LevelExpansion row={row} level={i} draft={draft} />}

              <div className="tl-time mono">
                {when || (isCurrent && entry.dueAt
                  ? `due ${entry.dueAt}`
                  : state === 'rejected' ? row.raised : 'not yet reached')}
                {/* A level that ran past its target says so on the collapsed
                    line too. It is the one thing in the expansion that changes
                    what an approver does next. */}
                {entry.clock.overBy != null && (
                  <span className="apv-lvl-late"> · {durationText(entry.clock.overBy)} over target</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="t-xs t-faint" style={{ marginTop: 10 }}>
        Decisions and revisions are committed in level order. Each level reads the request as the levels before it
        left it, and sees every addition, removal and change they made.
      </div>
    </Card>
  )
}
