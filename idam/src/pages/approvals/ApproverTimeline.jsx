import { useMemo } from 'react'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import {
  useChain, STEP_LABEL, STEP_TONE, shiftStamp, statusTone, stepState,
} from '../requests/data'
import {
  approvalView, approverAt, commentAt, roleAt, stampAt,
} from './data'

const DOT_ICON = { done: 'check', rejected: 'x', current: 'clock', future: 'chevD' }

/* Level-by-level approval workflow: who each approver is, their role and level,
   decision status, decided time, comment, and the edits they made. */
export default function ApproverTimeline({ row }) {
  const chain = useChain()
  const view = useMemo(() => approvalView(row), [row])

  return (
    <Card
      title="Approvers"
      sub={`Approval workflow · level ${row.level} of ${row.levels}`}
      actions={<Pill tone={statusTone(row.status)} dot>{row.status}</Pill>}
    >
      <div className="tl">
        {chain.slice(0, row.levels).map((step, ix) => {
          const i = ix + 1
          const state = stepState(row, i)
          const tone = STEP_TONE[state] || 'mut'
          const name = state === 'current'
            ? (row.pendingWith || 'Unassigned')
            : state === 'done' ? approverAt(row, i) : ''
          const when = state === 'done' ? stampAt(row, i) : ''
          const note = state === 'done' ? commentAt(row, i) : ''
          const levelEdits = view.edits.filter((e) => e.level === i)
          return (
            <div className="tl-it apv-lvl" key={step.title} data-tone={tone}>
              <span className="tl-dot"><Icon name={DOT_ICON[state]} size={8} /></span>
              <div className="tl-t apv-lvl-head">
                {name && <Avatar name={name} size="sm" />}
                <span>{name || 'Not yet assigned'}</span>
                <Pill tone={STEP_TONE[state]} dot>{STEP_LABEL[state]}</Pill>
                {state === 'current' && <Tag tone="acc">deciding now</Tag>}
              </div>
              <div className="tl-s apv-lvl-role">
                Level {i} approver · {step.title} — {step.detail.toLowerCase()}
              </div>
              {state === 'done' && note && (
                <div className="tl-s apv-lvl-note">“{note}”</div>
              )}
              {state === 'done' && !note && (
                <div className="tl-s t-faint">Approved without a comment.</div>
              )}
              {state === 'rejected' && (
                <div className="tl-s"><b>Rejected at this level.</b> The requester was notified with the comment.</div>
              )}
              {state === 'current' && (
                <div className="tl-s">Holds the decision now. Target {step.sla}h from receipt.</div>
              )}
              {levelEdits.length > 0 && (
                <div className="apv-lvl-edits">
                  {levelEdits.map((e) => (
                    <div className="apv-note" key={e.changeId}>
                      <Icon name="edit" size={11} />
                      <span>
                        Changed {e.field}: <span className="mono">{e.from}</span> → <span className="mono">{e.to}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="tl-time mono">
                {when || (state === 'current'
                  ? `due ${shiftStamp(row.raised, step.sla)}`
                  : state === 'rejected' ? row.raised : 'not yet reached')}
              </div>
            </div>
          )
        })}
      </div>
      <div className="t-xs t-faint" style={{ marginTop: 10 }}>
        Decisions and edits are committed in level order. A level never sees the request before every preceding
        level has signed off.
      </div>
    </Card>
  )
}
