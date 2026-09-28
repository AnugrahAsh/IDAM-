import Banner from '../../components/primitives/Banner'
import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import { num } from '../../lib/format'
import { applicationOf, combinationOf, groupRecord, listLabel, memberCount } from './sodData'
import { sodSeverityBadge } from '../settings/settingsStore'
import {
  Skeleton, SkeletonCard, SkeletonKeyValue, SkeletonTable, SkeletonText,
} from '../../components/primitives/Skeleton'

/**
 * What a segregation-of-duties rule is, and where it currently stands.
 *
 * Everything that was not one of those two questions has gone: the framework
 * mapping, the control owner and record, the enforcement and remediation
 * machinery, and the link rail. A rule is a combination of application groups,
 * a grade and a scope, and this page shows exactly that.
 */
export default function DefinitionTab({ rule, meta, violations, loading = false }) {
  const combination = combinationOf(rule)
  const open = violations.filter((v) => v.status === 'Open').length
  const pairs = Math.max(0, (combination.length * (combination.length - 1)) / 2)

  /* The panel settles as one thing: the definition on the left and the two
     fact panels on the right are the same rule read three ways. The columns
     are the real `.detail-cols` grid, so nothing moves sideways on arrival. */
  if (loading) {
    return (
      <Skeleton label={`Loading ${rule.name}`} className="detail-cols">
        <div className="stack">
          <SkeletonCard>
            <div className="stack">
              {/* Description, the four defining facts, and the banner that
                  reads the combination back in words. */}
              <SkeletonText lines={2} />
              <SkeletonKeyValue rows={4} cols={2} />
              <span className="skel" style={{ display: 'block', height: 58 }} aria-hidden="true" />
            </div>
          </SkeletonCard>
          {/* The entitlement combination table: one row per application group. */}
          <SkeletonCard><SkeletonTable rows={Math.max(2, combination.length)} cols={3} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  return (
    <div className="detail-cols">
      <div className="stack">
        <Card title="Rule definition" sub="What the control asserts">
          <div className="stack">
            <p className="t-sm">{rule.description}</p>
            <KeyValue
              rows={[
                { k: 'Rule type', node: <Tag tone={rule.type === 'Anti-affinity' ? 'acc' : undefined}>{rule.type}</Tag>, icon: 'sod' },
                { k: 'Severity', node: <SeverityBadge level={sodSeverityBadge(rule.severity)}>{rule.severity}</SeverityBadge>, icon: 'warn' },
                { k: 'Scope', v: meta.scope, icon: 'building' },
                { k: 'Last scan', v: meta.lastScan, icon: 'history' },
              ]}
            />
            <Banner tone={rule.type === 'Anti-affinity' ? 'warn' : 'info'}>
              {rule.type === 'Anti-affinity'
                ? <>No single identity may hold more than one of <b>{listLabel(combination)}</b>. The sweep tests {num(pairs)} {pairs === 1 ? 'pair' : 'pairs'}.</>
                : <>An identity holding one of <b>{listLabel(combination)}</b> is expected to hold the rest. Holding a partial set is a breach.</>}
            </Banner>
          </div>
        </Card>

        <Card
          title="Entitlement combination"
          sub={`${combination.length} application ${combination.length === 1 ? 'group' : 'groups'} graded together`}
        >
          <div style={{ overflowX: 'auto' }}><table className="tbl">
            <thead>
              <tr>
                <th>Application group</th>
                <th>Application</th>
                <th className="td-num">Members</th>
              </tr>
            </thead>
            <tbody>
              {combination.map((g) => {
                const record = groupRecord(g)
                return (
                  <tr key={g}>
                    <td className="td-main td-mono">{g}</td>
                    <td>{record ? applicationOf(g) : <span className="t-mut">Not in the group register</span>}</td>
                    <td className="td-num">{num(memberCount(g))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </Card>
      </div>

      <div className="stack">
        <Card title="Current state">
          <KeyValue
            cols={1}
            rows={[
              {
                k: 'Breaches recorded',
                node: open > 0
                  ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{num(open)} open of {num(violations.length)}</span>
                  : violations.length > 0
                    ? <span>0 open of {num(violations.length)} in register</span>
                    : <Pill tone="ok" dot>Clean</Pill>,
                icon: 'sod',
              },
              { k: 'Remediating', v: num(violations.filter((v) => v.status === 'Remediating').length), icon: 'refresh' },
              { k: 'Accepted risk', v: num(violations.filter((v) => v.status === 'Accepted risk').length), icon: 'shield' },
              { k: 'Oldest breach', v: violations.length ? `${Math.max(...violations.map((v) => v.age))} days` : 'None', icon: 'clock' },
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
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
