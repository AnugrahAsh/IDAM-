import { useApp } from '../../store/AppContext'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { USERS } from '../../data/seed'
import { num } from '../../lib/format'
import { countRules, groupList } from './policyPageData'

export default function OverviewTab({ policy, model, matched, assigned, meta, targets = [] }) {
  const { navigate } = useApp()
  const names = groupList(policy)
  const flagged = targets.filter((t) => t.sodFlags > 0)
  const coverage = Math.round((matched.length / USERS.length) * 100)

  return (
    <div className="detail-cols">
      <div className="stack">
        <div className="stat-strip">
          <div className="stat-cell"><span className="stat-k"><Icon name="users" size={12} />Matching identities</span><span className="stat-v">{num(matched.length)}</span></div>
          <div className="stat-cell"><span className="stat-k"><Icon name="checkC" size={12} />Currently assigned</span><span className="stat-v">{num(assigned.size)}</span></div>
          <div className="stat-cell"><span className="stat-k"><Icon name="policy" size={12} />Predicates</span><span className="stat-v">{num(countRules(model))}</span></div>
          <div className="stat-cell"><span className="stat-k"><Icon name="group" size={12} />{names.length > 1 ? 'Target groups' : 'Target group'}</span><span className="stat-v">{num(names.length)}</span></div>
        </div>

        <div className="grid">
          <Card title="Directory coverage" sub={`${num(matched.length)} of ${num(USERS.length)} governed identities`}>
            <div className="stack">
              <div className="row-between">
                <span className="t-sm t-mut">Reached by this policy</span>
                <span className="t-h2">{coverage}%</span>
              </div>
              <Meter value={coverage} tone={coverage > 60 ? 'warn' : 'ok'} height={8} />
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Organizations reached', v: num(new Set(matched.map((u) => u.organization)).size), icon: 'building' },
                ]}
              />
            </div>
          </Card>
        </div>

        <Card
          title={names.length > 1 ? 'Target groups' : 'Target group'}
          sub={`${names.join(', ') || 'None'} · ${policy.groupType} ${names.length > 1 ? 'groups' : 'group'}`}
          actions={<Button size="sm" icon="external" onClick={() => navigate('applicationGroups')}>Open groups</Button>}
        >
          {targets.length > 0 ? (
            <div className="stack">
              {targets.map((t) => (
                <div className="stack" key={t.name} style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Icon name="group" size={13} />
                    <span className="t-sm" style={{ fontWeight: 600 }}>{t.name}</span>
                    {t.sodFlags > 0 && <Tag tone="warn">{t.sodFlags} SoD</Tag>}
                  </div>
                  <p className="t-sm t-mut">{t.description}</p>
                  <KeyValue
                    rows={[
                      { k: 'Application', v: t.application, icon: 'provision' },
                      { k: 'Group owner', v: t.owner, icon: 'user' },
                      { k: 'Direct members', v: num(t.members), icon: 'users' },
                      { k: 'SoD flags', v: t.sodFlags > 0 ? `${t.sodFlags} conflicting rules` : 'None', icon: 'sod' },
                      { k: 'Group created', v: t.createdOn, icon: 'history' },
                    ]}
                  />
                </div>
              ))}
              {flagged.length > 0 && (
                <Banner tone="warn">
                  {flagged.map((t) => t.name).join(', ')} {flagged.length === 1 ? 'appears' : 'appear'} in
                  segregation-of-duties rules. Every identity this policy assigns is re-checked against those rules
                  on the next scan.{' '}
                  <button type="button" className="link" onClick={() => navigate('/iam/segregationofduties/rules')}>Open SoD rules</button>
                </Banner>
              )}
            </div>
          ) : (
            <EmptyState size="sm" icon="group" title="Target group not found" body={`${names.join(', ') || 'The target'} is no longer defined in the group catalog.`} />
          )}
        </Card>
      </div>

      <div className="stack">
        <Card title="Definition">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Policy name', v: policy.name, icon: 'policy' },
              { k: 'Description', v: policy.description || 'Not supplied', icon: 'file' },
              { k: 'State', node: <Pill tone={policy.active ? 'ok' : 'mut'} dot>{policy.active ? 'Active' : 'Paused'}</Pill>, icon: 'power' },
              { k: 'Group type', v: policy.groupType, icon: 'layers' },
              { k: names.length > 1 ? 'Target groups' : 'Target group', v: names.join(', ') || 'None', icon: 'group' },
              { k: 'Condition', v: policy.condition, icon: 'code' },
              { k: 'Predicates', v: `${countRules(model)} across ${model.groups.length} ${model.groups.length === 1 ? 'group' : 'groups'}`, icon: 'policy' },
            ]}
          />
        </Card>

        <Card title="Provenance">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Created on', v: meta.createdOn, icon: 'history' },
              { k: 'Created by', v: meta.createdBy, icon: 'user' },
              { k: 'Last modified on', v: meta.modifiedOn, icon: 'edit' },
              { k: 'Last modified by', v: meta.modifiedBy, icon: 'user' },
              { k: 'Last evaluated', v: policy.lastRun || 'Never run', icon: 'play' },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
