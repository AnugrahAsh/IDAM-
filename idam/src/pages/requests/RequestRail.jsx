import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { SOD_RULES } from '../../data/seed'
import {
  useChain, STEP_LABEL, STEP_TONE, grantsFor, groupOf, peersFor, sensitivityOf, shiftStamp,
  stepState, userOf,
} from './data'

export const auditCell = (v) => (v ? <span className="mono">{v}</span> : <span className="t-faint">—</span>)

const approverFor = (row, i) => {
  if (i === 1) return row.approvedByL1
  if (i === 2) return row.approvedByL2
  return ''
}
const stampFor = (row, i) => {
  if (i === 1) return row.approvedOnL1
  if (i === 2) return row.approvedOnL2
  return ''
}
const commentFor = (row, i) => {
  if (i === 1) return row.commentL1
  if (i === 2) return row.commentL2
  return ''
}

export function ApprovalChain({ row }) {
  const chain = useChain()
  return (
    <Card
      title="Approval chain"
      sub={`Level ${row.level} of ${row.levels}`}
      actions={<Pill tone={STEP_TONE[stepState(row, row.level)] || 'mut'} dot>{row.status}</Pill>}
    >
      <div className="tl">
        {chain.slice(0, row.levels).map((step, ix) => {
          const i = ix + 1
          const state = stepState(row, i)
          const who = approverFor(row, i)
          const when = stampFor(row, i)
          const note = commentFor(row, i)
          const tone = state === 'done' ? 'ok' : state === 'rejected' ? 'bad' : state === 'current' ? 'warn' : 'mut'
          return (
            <div className="tl-it" key={step.title} data-tone={tone}>
              <span className="tl-dot">
                <Icon name={state === 'done' ? 'check' : state === 'rejected' ? 'x' : state === 'current' ? 'clock' : 'chevD'} size={8} />
              </span>
              <div className="tl-t">
                Level {i} · {step.title}
                <span style={{ marginLeft: 8 }}>
                  <Pill tone={STEP_TONE[state]} dot>{STEP_LABEL[state]}</Pill>
                </span>
              </div>
              <div className="tl-s">
                {state === 'done' && who && <><b>{who}</b> approved. </>}
                {state === 'rejected' && <><b>Rejected at this level.</b> </>}
                {state === 'current' && <><b>{row.pendingWith || 'Unassigned'}</b> holds the decision. </>}
                {state === 'future' && <>{step.detail}. </>}
                {state !== 'future' && state !== 'current' ? '' : `Target ${step.sla}h.`}
              </div>
              {note && state === 'done' && (
                <div className="tl-s" style={{ marginTop: 4, fontStyle: 'italic' }}>“{note}”</div>
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
    </Card>
  )
}

export function RiskPanel({ row, target = row.target }) {
  const { navigate } = useApp()
  const u = row.userId ? userOf(row.userId) : null
  const g = groupOf(target)
  const sensitivity = sensitivityOf(target)
  const conflictRule = SOD_RULES.find((r) => r.groups.includes(target))
  const criticalGrants = grantsFor(target).filter((x) => x.sensitivity === 'critical').length

  return (
    <Card title="Risk" sub="What approving this request exposes">
      {g && g.sodFlags > 0 && (
        <div className="banner" data-tone="bad" style={{ marginBottom: 12 }}>
          <Icon name="warn" size={15} />
          <div>
            This entitlement carries <b>{g.sodFlags} segregation-of-duties {g.sodFlags === 1 ? 'rule' : 'rules'}</b>
            {conflictRule ? <> under <b>{conflictRule.framework}</b> — {conflictRule.name.toLowerCase()}</> : ' under SOX 404'}.
            Record a compensating control or reject the request.
            {' '}
            <button className="link" onClick={() => navigate('segregationofduties')}>Open the rule<Icon name="chevR" size={10} /></button>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 12 }}>
        <div>
          <div className="row-between" style={{ marginBottom: 5 }}>
            <span className="t-xs t-mut">Entitlement sensitivity</span>
            <SeverityBadge level={sensitivity}>{sensitivity}</SeverityBadge>
          </div>
          <div className="t-xs t-mut">
            {criticalGrants > 0
              ? `${criticalGrants} of the granted capabilities are classified critical and are in scope for SOX 404 sampling.`
              : 'No critical capability is carried by this entitlement.'}
          </div>
        </div>

        <KeyValue
          cols={1}
          rows={[
            { k: 'Entitlement class', v: g ? g.kind : 'Not a group grant', icon: 'group' },
            { k: 'Current holders', v: g ? `${num(g.members)} identities` : '—', icon: 'users' },
            { k: 'Owner', v: g ? g.owner : '—', icon: 'user' },
            { k: 'Open conflicts on the group', v: g ? String(g.sodFlags || 0) : '0', icon: 'sod' },
          ]}
        />
      </div>
    </Card>
  )
}

export function EntitlementCard({ row, target = row.target, editNote }) {
  const g = groupOf(target)
  const grants = grantsFor(target)
  const redirected = target !== row.target
  return (
    <Card
      title={redirected ? 'Entitlement after approver edits' : 'Requested entitlement'}
      sub={g ? g.description : 'What approving this request actually grants'}
      actions={(
        <>
          {g && <Tag>{g.kind}</Tag>}
          <SeverityBadge level={sensitivityOf(target)}>{sensitivityOf(target)}</SeverityBadge>
        </>
      )}
    >
      {redirected && (
        <div className="banner" data-tone="warn" style={{ marginBottom: 12 }}>
          <Icon name="edit" size={15} />
          <div>
            {editNote || (
              <>
                An approver changed the entitlement at an earlier level. This card describes
                {' '}<b>{target}</b>, what would be provisioned today — the request was raised for
                {' '}<span className="mono">{row.target}</span>.
              </>
            )}
          </div>
        </div>
      )}
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <span className="code mono" style={{ fontSize: 'var(--t-sm)' }}>{target}</span>
        {g && g.sodFlags > 0 && <Pill tone="bad" icon="sod">{g.sodFlags} conflict rules</Pill>}
        {g && <span className="t-xs t-mut">{g.application}</span>}
      </div>

      <div className="t-micro t-mut" style={{ marginBottom: 8 }}>What it grants</div>
      <div className="feed">
        {grants.map((x) => (
          <div className="feed-it" key={x.capability}>
            <span
              className="feed-ic"
              data-tone={x.sensitivity === 'critical' ? 'bad' : x.sensitivity === 'high' ? 'warn' : 'mut'}
            >
              <Icon name="bolt" size={13} />
            </span>
            <div className="feed-m">
              <div className="feed-t">{x.capability}</div>
              <div className="feed-s">
                <span>{x.target}</span>
                <SeverityBadge level={x.sensitivity}>{x.sensitivity}</SeverityBadge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function PeersCard({ row, target = row.target }) {
  const { navigate } = useApp()
  const g = groupOf(target)
  if (!g) return null
  const peers = peersFor(target)
  return (
    <Card
      title="Who already holds it"
      sub={`${num(g.members)} identities hold ${g.name} today · a sample of five`}
      footer={(
        <button className="link t-xs" onClick={() => navigate('/iam/applicationGroups')}>
          Open {g.name} membership<Icon name="chevR" size={10} />
        </button>
      )}
    >
      <table className="tbl">
        <thead>
          <tr>
            <th>Identity</th>
            <th>Department</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.id}>
              <td className="td-main">
                <span className="cell-id">
                  <Avatar first={p.firstName} last={p.lastName} size="sm" />
                  <span className="trunc">{p.username}</span>
                </span>
              </td>
              <td>{p.department}</td>
              <td><span className="tag">{p.employeeType}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function RequesterCard({ row, profile }) {
  return (
    <Card title="Requester" sub="Track record of the person raising this">
      <div className="row" style={{ gap: 10, marginBottom: 12 }}>
        <Avatar name={row.requester} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div className="t-h3 trunc">{row.requester}</div>
          <div className="t-xs t-mut">{profile.role} · {profile.department}</div>
        </div>
      </div>
      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k">Raised</span>
          <span className="stat-v">{num(profile.raised)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k">Approved</span>
          <span className="stat-v">{num(profile.approved)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k">Rejected</span>
          <span className="stat-v">{num(profile.rejected)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k">Median decision</span>
          <span className="stat-v">{profile.avgHours}<span className="tile-unit"> h</span></span>
        </div>
      </div>
    </Card>
  )
}
