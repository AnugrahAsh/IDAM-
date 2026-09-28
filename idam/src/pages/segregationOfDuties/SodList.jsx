import Button from '../../components/primitives/Button'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { num, serialColumn } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useMemo } from 'react'
import { BASE, metaFor, ruleLabel } from './sodData'
import { sodSeverityBadge, useSodSeverities } from '../settings/settingsStore'
import StatCards from '../../components/workbench/StatCards'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import { useLoading } from '../../lib/useLoading'

export default function SodList({ rules, violations, onDelete }) {
  const { toast, navigate } = useApp()
  // Subscribed so a severity renamed in Settings recolours this register on the
  // same render rather than at the next navigation.
  useSodSeverities()
  // One flag: the summary tiles count the same rules the register lists.
  const loading = useLoading()

  const open = violations.filter((v) => v.status === 'Open')
  const critical = open.filter((v) => v.severity === 'critical')
  // The tile counts open criticals, so it needs the whole population beside it —
  // "3 critical" against a register holding 8 read as a miscount.
  const allCritical = violations.filter((v) => v.severity === 'critical')

  const ruleRows = useMemo(() => rules.map((r) => {
    const mine = violations.filter((v) => v.rule === r.name)
    return {
      ...r,
      pair: ruleLabel(r),
      breaches: mine.length,
      openBreaches: mine.filter((v) => v.status === 'Open').length,
      scope: metaFor(r).scope,
      lastScan: metaFor(r).lastScan,
    }
  }), [rules, violations])

  const clean = ruleRows.filter((r) => r.openBreaches === 0).length

  const ruleColumns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Rule', cls: 'td-main', locked: true,
      value: (r) => `${r.name} ${r.description}`,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.name}</span>
          <span className="cell-sub">{r.description}</span>
        </span>
      ),
    },
    { key: 'type', label: 'Type', render: (r) => <Tag tone={r.type === 'Anti-affinity' ? 'acc' : undefined}>{r.type}</Tag> },
    { key: 'pair', label: 'Entitlement combination', cls: 'td-mono td-flex', render: (r) => <span className="trunc" title={r.pair}>{r.pair}</span> },
    { key: 'scope', label: 'Scope' },
    {
      key: 'openBreaches', label: 'Open breaches', align: 'right',
      render: (r) => (r.openBreaches > 0 ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{r.openBreaches}</span> : '0'),
    },
    { key: 'breaches', label: 'Register', align: 'right', render: (r) => num(r.breaches) },
    { key: 'severity', label: 'Severity', render: (r) => <SeverityBadge level={sodSeverityBadge(r.severity)}>{r.severity}</SeverityBadge> },
    { key: 'lastScan', label: 'Last scan', cls: 'td-mono' },
  ]

  return (
    <>
      {/* One region for the page. The register's own body skeleton is
          decoration, so the wait is described once. */}
      {loading ? (
        <Skeleton label="Loading the segregation-of-duties register">
          <SkeletonPageBar actions={2} crumbs={2} />
          <SkeletonStats count={4} />
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="Segregation of Duties"
            sub="Toxic entitlement combinations, the rules that detect them, and the identities currently in breach."
            crumbs={[{ label: 'Groups' }, { label: 'Segregation of Duties' }]}
            actions={
              <>
                <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Conflict register is being generated for audit.')}>Export register</Button>
                <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Add Rule</Button>
              </>
            }
          />

          <StatCards
            items={[
              { key: 'rules', icon: 'policy', label: 'Rules', value: rules.length, chip: 'enforced', sub: 'anti-affinity and affinity' },
              { key: 'open', icon: 'sod', label: 'Open conflicts', value: open.length, chip: `${num(violations.length)} total`, chipTone: open.length ? 'warn' : 'ok', sub: 'identities holding both sides' },
              { key: 'critical', icon: 'warn', label: 'Open critical', value: critical.length, chip: `${num(allCritical.length)} total`, chipTone: critical.length ? 'bad' : undefined, sub: 'highest severity, not yet cleared' },
              { key: 'clean', icon: 'checkC', label: 'Clean rules', value: clean, chip: clean === rules.length ? 'all clear' : 'no open breach', chipTone: clean === rules.length ? 'ok' : undefined, sub: 'nothing outstanding today' },
            ]}
            label="Segregation of duties summary"
          />
        </>
      )}

      <div className="stack">
        <DataWorkbench
          id="sod-rules"
          rows={ruleRows}
          loading={loading}
          columns={ruleColumns}
          selectable
          searchPlaceholder="Search rules by name or entitlement…"
          onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
          bulkActions={(ids, clear) => (
            <>
              <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} rule definitions queued for export.`)}>Export</Button>
              <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(ids, `Delete ${ids.length} rules?`, clear)}>Delete</Button>
            </>
          )}
          /* View and Delete. Editing is reached from the rule itself, where the
             definition being changed is on screen beside the form. */
          rowActions={(r) => [
            { id: 'open', label: 'View', icon: 'eye', onSelect: () => navigate(`${BASE}/${r.id}`) },
            { divider: true },
            { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete([r.id], `Delete ${r.name}?`) },
          ]}
          emptyTitle="No rules"
          emptyBody="Define an anti-affinity rule to begin detecting toxic entitlement combinations."
          emptyIcon="policy"
          footNote="Rules are evaluated by the nightly segregation-of-duties sweep"
        />
      </div>
    </>
  )
}
