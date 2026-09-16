import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import {
  APPROVERS_L1, APPROVERS_L2, APPROVERS_L3, OPEN,
  levelColumnDefs, nameOf, requesterProfile, statusTone, userOf,
} from '../accessRequests/data'
import { useApprovalLevels } from '../settings/settingsStore'
import {
  EntitlementCard, PeersCard, RequesterCard, RiskPanel, auditCell,
} from '../accessRequests/RequestRail'
import ChangesPanel from './ChangesPanel'
import ApproverTimeline from './ApproverTimeline'
import { draftCounts, emptyDraft, targetState } from './data'

const BASIS_APPROVE = [
  'Business need confirmed with the requester',
  'Manager attested to the requirement',
  'Compensating control recorded',
  'Time-bound grant, expires automatically',
  'Policy exception granted by the control owner',
]
const BASIS_REJECT = [
  'Insufficient business justification',
  'Creates a segregation-of-duties conflict',
  'Least-privilege alternative exists',
  'Duplicate of an existing entitlement',
  'Requester could not be verified',
]
const REASSIGN_TARGETS = [...new Set([...APPROVERS_L1, ...APPROVERS_L2, ...APPROVERS_L3])]

export default function RequestRecord({ id, rows, onApprove, onReject, onReassign }) {
  const { toast, navigate } = useApp()
  const row = rows.find((r) => String(r.id) === String(id))
  const [comment, setComment] = useState('')
  const [basis, setBasis] = useState(BASIS_APPROVE[0])
  const [rejectBasis, setRejectBasis] = useState(BASIS_REJECT[0])
  const [assignee, setAssignee] = useState(REASSIGN_TARGETS[0])
  /* The revision this approver is building. It is a list of operations against
     the request as it reached this level, and it stays local until Approve
     commits it — a rejection or a reassignment carries none of it forward. */
  const [draft, setDraft] = useState(emptyDraft)
  const levels = useApprovalLevels()
  const evidenceRows = useMemo(() => levelColumnDefs(levels), [levels])

  const prior = useMemo(
    () => (row ? rows.filter((r) => r.username === row.username && r.id !== row.id).slice(0, 6) : []),
    [rows, row],
  )

  if (!row) {
    return (
      <>
        <PageBar title="Request not found" crumbs={[{ label: 'Approvals', to: '/iam/approvals' }, { label: String(id) }]} />
        <EmptyState
          icon="approve"
          title={`No approval record for ${id}`}
          body="The request may already be decided and archived, or the link is stale. Open the approval queue to find the current record."
          actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/approvals')}>Back to approvals</Button>}
        />
      </>
    )
  }

  const open = OPEN.has(row.status)
  const counts = draftCounts(draft)
  const editCount = counts.total
  const ts = targetState(row, draft)
  const target = ts.target
  const n = nameOf(row.username)
  const identity = row.userId ? userOf(row.userId) : null
  const profile = requesterProfile(row.requester)
  const goToDecision = () => {
    const el = document.getElementById('decision-panel')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const signals = [
    (row.risk === 'critical' || row.risk === 'high') && { id: 'risk', tone: 'bad', icon: 'warn', text: `${row.risk === 'critical' ? 'Critical' : 'High'} risk entitlement`, sub: 'Grant is in scope for SOX 404 sampling' },
    row.type === 'Emergency access' && { id: 'brk', tone: 'warn', icon: 'bolt', text: 'Emergency access path', sub: 'Grant expires automatically and is reviewed post-incident' },
  ].filter(Boolean)

  return (
    <>
      <DetailHeader
        backTo="/iam/approvals"
        backLabel="Approvals"
        eyebrow="Access request"
        title={row.id}
        sub={`${row.type} raised by ${row.requester} for ${row.username}. ${row.detail || 'Awaiting a decision in the approval chain.'}`}
        media={<Avatar first={n.first} last={n.last} size="xl" />}
        badges={(
          <>
            <Pill tone={statusTone(row.status)} dot>{row.status}</Pill>
            <SeverityBadge level={row.risk}>{row.risk}</SeverityBadge>
          </>
        )}
        meta={(
          <>
            <Fact icon="user" label="Requester" value={row.requester} />
            <Fact icon="users" label="Identity" value={row.username} />
            <Fact icon="group" label="Entitlement" value={ts.changed ? `${target} (edited)` : row.target} />
            <Fact icon="approve" label="Level" value={`${row.level} of ${row.levels}`} />
            <Fact icon="history" label="Raised" value={row.raised} />
          </>
        )}
        actions={(
          <>
            <Button
              icon="user"
              disabled={!identity}
              onClick={() => navigate(`/iam/users/${row.userId}`)}
            >
              Open identity
            </Button>
            <Button
              icon="download"
              onClick={() => toast('ok', 'Evidence queued', `${row.id} approval trail written to the audit export.`)}
            >
              Export evidence
            </Button>
            <Button variant="pri" icon="checkC" disabled={!open} onClick={goToDecision}>Decide</Button>
          </>
        )}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card
              title="Request summary"
              sub="Everything captured when the request was raised"
              actions={<Tag>{row.type}</Tag>}
            >
              {/* Nine short fields read at a glance before the decision — they
                  do not need a screen of their own above the changes. */}
              <KeyValue
                dense
                cols={3}
                rows={[
                  { k: 'Request id', v: row.id, icon: 'request' },
                  { k: 'Request type', v: row.type, icon: 'tag' },
                  { k: 'Raised by', v: row.requester, icon: 'user' },
                  { k: 'For identity', v: row.username, icon: 'users' },
                  { k: 'Department', v: identity ? identity.department : '', icon: 'building' },
                  { k: 'Organization', v: identity ? identity.organization : '', icon: 'layers' },
                  { k: 'Entitlement', v: ts.changed ? `${target} · edited from ${row.target}${ts.byYou ? ' by you, this level' : ts.levels.length ? ` at level ${ts.levels.join(', ')}` : ''}` : row.target, icon: 'group' },
                  { k: 'Detail', v: row.detail || '', icon: 'file' },
                  { k: 'Duration', v: row.duration || 'Not specified', icon: 'clock' },
                  { k: 'Raised', v: row.raised, icon: 'history' },
                  { k: 'Approval level', v: `${row.level} of ${row.levels}`, icon: 'approve' },
                ]}
              />
            </Card>

            <ChangesPanel row={row} draft={draft} setDraft={setDraft} />

            <Card title="Justification" sub="Written by the requester, unedited">
              <div className="banner" data-tone="info">
                <Icon name="file" size={15} />
                <div>{row.justification}</div>
              </div>
              {signals.length > 0 && (
                <>
                  <div className="t-micro t-mut" style={{ margin: '16px 0 6px' }}>Signals attached at submission</div>
                  <div className="feed">
                    {signals.map((s) => (
                      <div className="feed-it" key={s.id}>
                        <span className="feed-ic" data-tone={s.tone}><Icon name={s.icon} size={13} /></span>
                        <div className="feed-m">
                          <div className="feed-t">{s.text}</div>
                          <div className="feed-s"><span>{s.sub}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <EntitlementCard
              row={row}
              target={target}
              editNote={ts.changed ? (ts.byYou
                ? `You changed the entitlement at level ${row.level}. This card describes ${target}, what approving now would provision — the request was raised for ${row.target}.`
                : `An approver changed the entitlement at level ${ts.levels.join(', ')}. This card describes ${target}, what would be provisioned today — the request was raised for ${row.target}.`) : undefined}
            />

            <PeersCard row={row} target={target} />

            {/* These rows were written by hand against the wrong fields: they
                started at the second level, so the first level's decision was
                missing entirely, and the last pair was headed with the raw
                storage key. The register builds its columns from the configured
                levels, and so does this. */}
            <Card
              title="Approval evidence"
              sub="Timestamps are recorded in UTC when each approver committed the decision"
            >
              {/* Same density as the summary above it — two blocks of short
                  read-only fields on one page should not be set two different
                  ways. */}
              <KeyValue
                dense
                cols={3}
                rows={evidenceRows.map((c) => (c.kind === 'date'
                  ? { k: c.label, node: auditCell(row[c.key]), icon: 'history' }
                  : { k: c.label, v: row[c.key] || '', icon: 'user' }))}
              />
              <div className="t-xs t-faint" style={{ marginTop: 8 }}>
                These {evidenceRows.length} fields are exported with the request for audit sampling and cannot be
                edited after the decision is committed.
              </div>
            </Card>

            <Card
              title="Other requests for this identity"
              sub={prior.length ? `${prior.length} further records against ${row.username}` : `Nothing else is open against ${row.username}`}
            >
              {prior.length === 0 ? (
                <div className="t-sm t-mut">This is the only request in the queue for this identity.</div>
              ) : (
                <div className="feed">
                  {prior.map((p) => (
                    <div className="feed-it" key={p.id}>
                      <span className="feed-ic" data-tone={p.status === 'Approved' ? 'ok' : p.status === 'Rejected' ? 'bad' : 'warn'}>
                        <Icon name="request" size={13} />
                      </span>
                      <div className="feed-m">
                        <div className="feed-t">
                          <button className="link" onClick={() => navigate(`/iam/approvals/${p.id}`)}>{p.id}</button>
                          {' · '}{p.type} · <span className="mono">{p.target}</span>
                        </div>
                        <div className="feed-s">
                          <Pill tone={statusTone(p.status)} dot>{p.status}</Pill>
                          <SeverityBadge level={p.risk}>{p.risk}</SeverityBadge>
                          <span>{p.requester}</span>
                        </div>
                      </div>
                      <span className="feed-time mono">{p.raised}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Your decision"
              sub={open
                ? 'Recorded against your name on the request and carried into the evidence export'
                : 'This request is closed. The decision below is read only.'}
              actions={open ? <Pill tone="warn" dot>Awaiting you</Pill> : <Pill tone="mut" dot>Closed</Pill>}
            >
              <div id="decision-panel" className="grid grid-2">
                <Field
                  label="Decision comment"
                  required
                  hint="Mandatory on a rejection and on any approval that overrides a policy signal."
                  span={2}
                  htmlFor="dec-comment"
                >
                  <TextInput
                    id="dec-comment"
                    as="textarea"
                    rows={4}
                    value={comment}
                    disabled={!open}
                    placeholder="Explain what you verified, who you spoke to, and any compensating control you recorded."
                    onChange={(e) => setComment(e.target.value)}
                  />
                </Field>
                <Field label="Basis for approval" hint="Appears next to your name in the chain." htmlFor="dec-basis">
                  <Select id="dec-basis" value={basis} options={BASIS_APPROVE} disabled={!open} onChange={(e) => setBasis(e.target.value)} />
                </Field>
                <Field label="Basis for rejection" hint="Sent to the requester with your comment." htmlFor="dec-rbasis">
                  <Select id="dec-rbasis" value={rejectBasis} options={BASIS_REJECT} disabled={!open} onChange={(e) => setRejectBasis(e.target.value)} />
                </Field>
                <Field label="Reassign to" hint="Moves the decision without approving or rejecting it." span={2} htmlFor="dec-assign">
                  <Select id="dec-assign" value={assignee} options={REASSIGN_TARGETS} disabled={!open} onChange={(e) => setAssignee(e.target.value)} />
                </Field>
              </div>

            </Card>
          </div>

          <div className="stack">
            <ApproverTimeline row={row} draft={draft} />
            <RiskPanel row={row} target={target} />
            <RequesterCard row={row} profile={profile} />
          </div>
        </div>
      </div>

      <StickyActions
        dirty={comment.trim().length > 0 || editCount > 0}
        message={open
          ? editCount > 0
            ? `Your level ${row.level} revision · ${counts.added} added, ${counts.removed} removed, ${counts.changed} changed · approving commits it and shows it to the next level`
            : comment.trim().length > 0
              ? `Comment captured · ${num(comment.trim().length)} characters`
              : 'Add a decision comment before approving a flagged request'
          : `Decided · ${row.status.toLowerCase()}`}
      >
        <Button icon="swap" disabled={!open} onClick={() => onReassign(row, assignee, comment)}>Reassign</Button>
        <Button variant="danger" icon="ban" disabled={!open} onClick={() => onReject(row, rejectBasis, comment)}>Reject</Button>
        <Button variant="pri" icon="checkC" disabled={!open} onClick={() => onApprove(row, basis, comment, draft)}>Approve</Button>
      </StickyActions>
    </>
  )
}
