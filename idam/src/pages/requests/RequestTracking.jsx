import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Meter from '../../components/primitives/Meter'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import EmptyState from '../../components/primitives/EmptyState'
import Menu from '../../components/primitives/Menu'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import {
  useChain, OPEN, grantsFor, nameOf, requesterProfile, shiftStamp, statusTone, userOf,
} from './data'
import { ApprovalChain, EntitlementCard, RiskPanel, auditCell } from './RequestRail'
import { DiffList } from './FormControls'

const trailFor = (row) => {
  const out = [{
    id: 'raised',
    tone: 'acc',
    icon: 'plus',
    t: 'Request raised',
    s: `${row.requester} submitted this ${row.type.toLowerCase()} for ${row.username}.`,
    ts: row.raised,
  }, {
    id: 'policy',
    tone: 'ok',
    icon: 'checkC',
    t: 'Policy pre-check passed',
    s: 'The request routed on the standard approval chain.',
    ts: shiftStamp(row.raised, 0),
  }, {
    id: 'notify',
    tone: 'mut',
    icon: 'mail',
    t: 'Level 1 approver notified',
    s: `${row.approvedByL1 || row.pendingWith || 'The line manager'} received the request in their queue.`,
    ts: shiftStamp(row.raised, 1),
  }]
  if (row.approvedByL1) {
    out.push({
      id: 'l1',
      tone: 'ok',
      icon: 'checkC',
      t: `Level 1 approved by ${row.approvedByL1}`,
      s: row.commentL1 || 'No comment recorded.',
      ts: row.approvedOnL1,
    })
  }
  if (row.approvedByL2) {
    out.push({
      id: 'l2',
      tone: 'ok',
      icon: 'checkC',
      t: `Level 2 approved by ${row.approvedByL2}`,
      s: row.commentL2 || 'No comment recorded.',
      ts: row.approvedOnL2,
    })
  }
  if (row.status === 'Escalated') {
    out.push({
      id: 'esc',
      tone: 'warn',
      icon: 'trendUp',
      t: 'Escalated',
      s: 'No decision inside the window. The request was escalated to the line manager of the current approver.',
      ts: shiftStamp(row.raised, 50),
    })
  }
  if (row.status === 'Approved') {
    out.push({
      id: 'done',
      tone: 'ok',
      icon: 'certify',
      t: 'Approved and queued for provisioning',
      s: 'The fulfilment plan was handed to the provisioning engine and executes on the next run against every mapped target.',
      ts: row.approvedOnL2 || row.approvedOnL1 || row.raised,
    })
  }
  if (row.status === 'Rejected') {
    out.push({
      id: 'rej',
      tone: 'bad',
      icon: 'ban',
      t: 'Rejected',
      s: 'The requester was notified with the approver comment. Nothing was provisioned and a new request must be raised.',
      ts: row.approvedOnL1 || row.raised,
    })
  }
  return out.reverse()
}

export default function RequestTracking({ id, rows, onCancel, onDuplicate }) {
  const chain = useChain()
  const { toast, navigate } = useApp()
  const [nudge, setNudge] = useState('')
  const [menu, setMenu] = useState(null)
  const row = rows.find((r) => String(r.id) === String(id))
  const trail = useMemo(() => (row ? trailFor(row) : []), [row])

  if (!row) {
    return (
      <>
        <PageBar title="Request not found" crumbs={[{ label: 'Access Requests', to: '/iam/requests' }, { label: String(id) }]} />
        <EmptyState
          icon="request"
          title={`No request with id ${id}`}
          body="The request may have been withdrawn, or the link is stale. Open the requester to find the current record."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/requests')}>Back to requests</Button>}
        />
      </>
    )
  }

  const open = OPEN.has(row.status)
  const n = nameOf(row.username)
  const identity = row.userId ? userOf(row.userId) : null
  const profile = requesterProfile(row.requester)
  const plan = grantsFor(row.target)
  const planState = row.status === 'Approved' ? 'Executed' : row.status === 'Rejected' ? 'Canceled' : 'Waiting on approval'

  return (
    <>
      <DetailHeader
        backTo="/iam/requests"
        backLabel="Access Requests"
        eyebrow="Request tracking"
        title={row.id}
        sub={`${row.type} for ${row.username}. ${row.detail || 'Tracking the request through its approval chain.'}`}
        media={<Avatar first={n.first} last={n.last} size="xl" />}
        badges={(
          <>
            <Pill tone={statusTone(row.status)} dot>{row.status}</Pill>
            <SeverityBadge level={row.risk}>{row.risk}</SeverityBadge>
            <Tag>Level {row.level} of {row.levels}</Tag>
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Raised by" value={row.requester} />
            <Fact icon="users" label="For identity" value={row.username} />
            <Fact icon="group" label="Entitlement" value={row.target} />
            <Fact icon="clock" label="Duration" value={row.duration || 'Not specified'} />
            <Fact icon="approve" label="Currently with" value={row.pendingWith || 'Decided'} />
            <Fact icon="history" label="Raised" value={row.raised} />
          </>
        )}
        actions={(
          <>
            <Button icon="copy" onClick={() => onDuplicate(row)}>Duplicate</Button>
            <Button
              icon="download"
              onClick={() => toast('ok', 'Evidence queued', `${row.id} approval trail written to the audit export.`)}
            >
              Export evidence
            </Button>
            <Button variant="danger" icon="ban" disabled={!open} onClick={() => onCancel([row.id])}>Cancel request</Button>
            <IconButton
              icon="kebab"
              label="More actions"
              onClick={(e) => setMenu({
                anchor: e.currentTarget,
                items: [
                  { label: row.id, header: true },
                  { id: 'approvals', label: 'Open in the approval queue', icon: 'approve', onSelect: () => navigate(`/iam/approvals/${row.id}`) },
                  { id: 'identity', label: 'Open identity', icon: 'user', disabled: !identity, onSelect: () => navigate(`/iam/users/${row.userId}`) },
                  { divider: true },
                  { id: 'watch', label: 'Notify me on every decision', icon: 'bell', onSelect: () => toast('ok', 'Watching', `You will be mailed on every state change for ${row.id}.`) },
                ],
              })}
            />
          </>
        )}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Request summary" sub="Everything captured at submission" actions={<Tag>{row.type}</Tag>}>
              <KeyValue
                rows={[
                  { k: 'Request id', v: row.id, icon: 'request' },
                  { k: 'Request type', v: row.type, icon: 'tag' },
                  { k: 'Raised by', v: row.requester, icon: 'user' },
                  { k: 'Requester role', v: `${profile.role} · ${profile.department}`, icon: 'roles' },
                  { k: 'For identity', v: row.username, icon: 'users' },
                  { k: 'Department', v: identity ? identity.department : '', icon: 'building' },
                  { k: 'Entitlement', v: row.target, icon: 'group' },
                  { k: 'Detail', v: row.detail || '', icon: 'file' },
                  { k: 'Duration', v: row.duration || 'Not specified', icon: 'clock' },
                  { k: 'Raised', v: row.raised, icon: 'history' },
                ]}
              />
            </Card>

            {Array.isArray(row.changes) && row.changes.length > 0 && (
              <Card
                title="Requested changes"
                sub="Exactly what you asked for — old value → new value"
                actions={<Tag>{row.changes.length} change{row.changes.length === 1 ? '' : 's'}</Tag>}
              >
                <DiffList changes={row.changes} />
              </Card>
            )}

            <Card title="Justification" sub="As written by the requester">
              <div className="banner" data-tone="info">
                <Icon name="file" size={15} />
                <div>{row.justification}</div>
              </div>
            </Card>

            <EntitlementCard row={row} />

            <Card
              title="Fulfilment plan"
              sub="What the provisioning engine executes once the chain clears"
              actions={<Pill tone={row.status === 'Approved' ? 'ok' : row.status === 'Rejected' ? 'mut' : 'warn'} dot>{planState}</Pill>}
            >
              <div className="feed">
                {plan.map((x, i) => (
                  <div className="feed-it" key={x.capability}>
                    <span className="feed-ic" data-tone={row.status === 'Approved' ? 'ok' : 'mut'}>
                      <Icon name="provision" size={13} />
                    </span>
                    <div className="feed-m">
                      <div className="feed-t">Step {i + 1} · {x.capability}</div>
                      <div className="feed-s">
                        <span>{x.target}</span>
                        <SeverityBadge level={x.sensitivity}>{x.sensitivity}</SeverityBadge>
                      </div>
                    </div>
                    <span className="feed-time">{planState.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Audit trail" sub="Every state change on this request, newest first">
              <div className="tl">
                {trail.map((e) => (
                  <div className="tl-it" key={e.id} data-tone={e.tone}>
                    <span className="tl-dot"><Icon name={e.icon} size={8} /></span>
                    <div className="tl-t">{e.t}</div>
                    <div className="tl-s">{e.s}</div>
                    <div className="tl-time mono">{e.ts}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title="Approval evidence"
              sub="Exported with the request for audit sampling"
            >
              <KeyValue
                rows={[
                  { k: 'Approved on (approver)', node: auditCell(row.approvedOnL1), icon: 'history' },
                  { k: 'Approved by (approver)', v: row.approvedByL1 || '', icon: 'user' },
                  { k: 'Approved on (approver_level_2)', node: auditCell(row.approvedOnL2), icon: 'history' },
                  { k: 'Approved by (approver_level_2)', v: row.approvedByL2 || '', icon: 'user' },
                ]}
              />
              <div style={{ marginTop: 14 }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="t-micro t-mut">Approval progress</span>
                  <span className="t-xs t-mut num">Level {row.level} of {row.levels}</span>
                </div>
                <Meter
                  value={(row.level / row.levels) * 100}
                  tone={row.status === 'Rejected' ? 'bad' : row.status === 'Approved' ? 'ok' : 'warn'}
                />
              </div>
            </Card>

            <Card
              title="Nudge the current approver"
              sub={open
                ? `A short note is delivered to ${row.pendingWith || 'the current approver'} with the request`
                : 'This request is decided. Nudges are disabled.'}
            >
              <Field label="Message" hint="Recorded on the request. Keep it factual — approvers and auditors both read it." htmlFor="nudge">
                <TextInput
                  id="nudge"
                  as="textarea"
                  rows={3}
                  value={nudge}
                  disabled={!open}
                  placeholder="The close runs on Friday and this access is on the critical path."
                  onChange={(e) => setNudge(e.target.value)}
                />
              </Field>
              <div className="row" style={{ marginTop: 12 }}>
                <Button
                  icon="mail"
                  disabled={!open || nudge.trim().length === 0}
                  onClick={() => {
                    toast('ok', 'Nudge sent', `${row.pendingWith || 'The current approver'} was notified with your note on ${row.id}.`)
                    setNudge('')
                  }}
                >
                  Send nudge
                </Button>
                <span className="spacer" />
                <span className="t-xs t-faint">{num(nudge.trim().length)} characters</span>
              </div>
            </Card>
          </div>

          <div className="stack">
            <ApprovalChain row={row} />
            <RiskPanel row={row} />
            <Card title="Chain definition" sub="The route this request type always takes">
              <div className="chain">
                {chain.slice(0, row.levels).map((step, i) => (
                  <div className="chain-step" key={step.title} data-state={i + 1 < row.level ? 'done' : i + 1 === row.level ? 'current' : 'future'}>
                    <span className="cs-n" style={{ background: i + 1 < row.level ? 'var(--ok)' : i + 1 === row.level ? 'var(--warn-core)' : 'var(--mut)' }}>{i + 1}</span>
                    <div className="cs-m">
                      <div className="cs-t">{step.title}</div>
                      <div className="cs-s">{step.detail}. Target {step.sla}h.</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
