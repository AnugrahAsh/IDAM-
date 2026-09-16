import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { appById, policyPath, ruleSummary } from './signOnPolicyData'
import { usePolicyAccess } from './signOnPolicyAccess'
import { ActionPill } from './RuleParts'

const LADDER_CAP = 5

const EVALUATION = [
  { icon: 'apps', title: 'An identity signs in to an attached application', sub: 'Applications not attached to the policy are not evaluated against it.' },
  { icon: 'layers', title: 'Rules are checked from priority 1 down', sub: 'Each rule matches on IP address, browser, operating system or device.' },
  { icon: 'target', title: 'The first matching rule decides', sub: 'It allows or denies the sign-in, and may require MFA first. Rules below it are not checked.' },
]

export default function InformationTab({ policy }) {
  const { navigate } = useApp()
  const access = usePolicyAccess()
  const apps = policy.applications.map((m) => appById(m.appId)).filter(Boolean)
  const count = (fn) => policy.rules.filter(fn).length

  return (
    <div className="detail-cols">
      <div className="stack">
        <Card
          title="Details"
          sub="Overview of this sign-on policy"
          actions={access.edit
            ? <Button size="sm" icon="edit" onClick={() => navigate(policyPath(policy.id, 'edit'))}>Edit</Button>
            : undefined}
        >
          <KeyValue
            rows={[
              { k: 'Name', v: policy.name, icon: 'signon' },
              { k: 'Status', node: <Pill tone={statusTone(policy.status)} dot>{policy.status}</Pill>, icon: 'power' },
              { k: 'Description', v: policy.description, icon: 'file' },
              {
                k: 'Applications',
                icon: 'apps',
                node: apps.length > 0
                  ? <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>{apps.map((a) => <Tag key={a.id}>{a.displayName}</Tag>)}</span>
                  : null,
              },
              { k: 'Created on', v: policy.createdOn, icon: 'calendar' },
              { k: 'Created by', v: policy.createdBy, icon: 'user' },
              { k: 'Last modified on', v: policy.modifiedOn, icon: 'history' },
              { k: 'Last modified by', v: policy.modifiedBy, icon: 'user' },
            ]}
          />
        </Card>

        <Card
          title="Rules in priority order"
          sub="Evaluated top-to-bottom by priority; first match wins"
          actions={<Button size="sm" iconRight="chevR" onClick={() => navigate(policyPath(policy.id, 'rules'))}>All rules</Button>}
        >
          {policy.rules.length === 0 ? (
            <EmptyState size="sm" icon="layers" title="No rules configured yet" body="Add one on the Rules tab to get started." />
          ) : (
            <ol className="sop-order">
              {policy.rules.slice(0, LADDER_CAP).map((r, i) => (
                <li key={r.id}>
                  <span className="sop-prio">{i + 1}</span>
                  <span className="sop-order-m">
                    <span className="sop-order-t">{r.name}</span>
                    <span className="sop-order-s">{ruleSummary(r)}</span>
                  </span>
                  <ActionPill action={r.action} />
                </li>
              ))}
              {policy.rules.length > LADDER_CAP && (
                <li className="sop-order-more">+ {num(policy.rules.length - LADDER_CAP)} more on the Rules tab</li>
              )}
            </ol>
          )}
        </Card>
      </div>

      <div className="stack">
        <Card title="Coverage" sub="What the rules decide">
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-k"><Icon name="checkC" size={12} />Allow rules</span>
              <span className="stat-v">{num(count((r) => r.action === 'ALLOW'))}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="ban" size={12} />Deny rules</span>
              <span className="stat-v">{num(count((r) => r.action === 'DENY'))}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="shield" size={12} />Require MFA</span>
              <span className="stat-v">{num(count((r) => r.promptMfa))}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-k"><Icon name="users" size={12} />With exclusions</span>
              <span className="stat-v">{num(count((r) => r.excludeUsers))}</span>
            </div>
          </div>
        </Card>

        <Card title="At sign-in" sub="How a policy is evaluated">
          <div className="feed">
            {EVALUATION.map((s) => (
              <div className="feed-it" key={s.title}>
                <span className="feed-ic" data-tone="acc"><Icon name={s.icon} size={13} /></span>
                <div className="feed-m">
                  <div className="feed-t"><b>{s.title}</b></div>
                  <div className="feed-s">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
