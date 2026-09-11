import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tabs from '../../components/primitives/Tabs'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { num, serialColumn } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useState } from 'react'
import { RULES_BASE, allRules, countRules, modelText, ruleText } from './orphanedData'
import AccountsTable from './AccountsTable'
import StatCards from '../../components/workbench/StatCards'
import { useLocalState } from '../../lib/useLocalState'

/* Table and Grouped, on both tabs. Cards are gone — an orphan rule and an
   orphaned account are each a row of short fields, and a tile per row turned a
   register you scan into three screens you scroll. */
const VIEWS = [
  { id: 'table', label: 'Table', icon: 'menu', desc: 'Dense register with sortable columns' },
  { id: 'groups', label: 'Grouped', icon: 'layers', desc: 'Split into sections' },
]

export default function OrphanList({ rows, rules, stats, ruleRows, actions }) {
  const { toast, navigate } = useApp()
  const [tab, setTab] = useState('rules')
  const [ruleView, setRuleView] = useLocalState('tf-idam-orphan-rules-view', 'table')

  const ruleColumns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Name', locked: true, cls: 'td-main',
      value: (r) => `${r.name} ${r.description}`,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.name}</span>
          <span className="cell-sub">{r.description}</span>
        </span>
      ),
    },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono', optional: true },
    {
      key: 'conditions', label: 'Conditions', sortable: false, value: (r) => modelText(r.model),
      render: (r) => (
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {allRules(r.model).slice(0, 2).map((c, i) => (
            <span className="tag mono" key={`c-${r.id}-${i}`}>{ruleText(c)}</span>
          ))}
          {countRules(r.model) > 2 && <span className="t-xs t-faint">+{countRules(r.model) - 2} more</span>}
        </span>
      ),
    },
    { key: 'scope', label: 'Scope', optional: true },
    { key: 'owner', label: 'Owner', optional: true },
    {
      key: 'matched', label: 'Accounts', align: 'right',
      render: (r) => (r.matched > 0 ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{r.matched}</span> : '0'),
    },
    { key: 'lastRun', label: 'Last run', cls: 'td-mono', render: (r) => r.lastRun || 'Never run' },
    { key: 'active', label: 'Status', render: (r) => <Pill tone={r.active ? 'ok' : 'mut'} dot>{r.active ? 'Enabled' : 'Disabled'}</Pill> },
  ]

  return (
    <>
      <PageBar
        title="Orphan Accounts"
        sub="The rules that decide when a target account counts as orphaned, and every account those rules have surfaced for triage."
        crumbs={[{ label: 'Core' }, { label: 'Orphan Accounts' }]}
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'The orphan register is being exported as CSV.')}>Export</Button>
            <Button icon="plus" onClick={() => navigate(`${RULES_BASE}/add`)}>Add Rule</Button>
            <Button variant="pri" icon="recon" onClick={() => toast('ok', 'Discovery queued', 'A reconciliation sweep is running across every connected target.')}>Run discovery</Button>
          </>
        }
      />

      <StatCards
        items={[
          { key: 'rules', icon: 'policy', label: 'Active rules', value: stats.activeRules, chip: `${num(rules.length)} defined`, sub: 'evaluated on every reconciliation' },
          { key: 'open', icon: 'orphan', label: 'Open orphans', value: stats.open, chip: stats.open ? 'unowned accounts' : 'none', chipTone: stats.open ? 'warn' : 'ok', sub: 'no matching identity' },
          { key: 'suppressed', icon: 'eyeoff', label: 'Suppressed', value: stats.suppressed, chip: 'accepted', sub: 'known and signed off' },
          // Anything above the 30-day triage window has stopped being recent,
          // which is what a 63-day finding was previously called.
          {
            key: 'oldest',
            icon: 'clock',
            label: 'Oldest finding',
            value: `${stats.oldest}d`,
            chip: stats.oldest > 90 ? 'ageing' : stats.oldest > 30 ? 'overdue' : 'recent',
            chipTone: stats.oldest > 90 ? 'bad' : stats.oldest > 30 ? 'warn' : undefined,
            sub: 'since first discovery',
          },
        ]}
        label="Orphaned account summary"
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'rules', label: 'Rules', icon: 'policy', count: rules.length },
            { id: 'accounts', label: 'Discovered accounts', icon: 'orphan', count: rows.length },
          ]}
        />

        {tab === 'rules' ? (
          <DataWorkbench
            id="orphan-rules"
            rows={ruleRows}
            columns={ruleColumns}
            selectable
            views={VIEWS}
            view={ruleView}
            onViewChange={setRuleView}
            /* Grouped splits on whether the rule is live. The previous grouping
               ran a rule row through modelText, which reads a rule model rather
               than a row, so it threw and only Table ever rendered. */
            groupOf={(r) => (r.active ? 'Enabled' : 'Disabled')}
            groupSummary={(section) => {
              const matched = section.reduce((n, r) => n + (r.matched || 0), 0)
              return `${num(matched)} ${matched === 1 ? 'account' : 'accounts'} matched`
            }}
            searchPlaceholder="Search rules by name, description or condition…"
            onRowClick={(r) => navigate(`${RULES_BASE}/${r.id}`)}
            bulkActions={(ids, clear) => {
              const list = ruleRows.filter((r) => ids.map(String).includes(String(r.id)))
              return (
                <Button size="sm" variant="danger" icon="trash" onClick={() => actions.deleteRules(list, clear)}>Delete</Button>
              )
            }}
            rowActions={(r) => [
              { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${RULES_BASE}/${r.id}/edit`) },
              { divider: true },
              { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => actions.deleteRules([r]) },
            ]}
emptyTitle="No detection rules"
            emptyBody="Without a rule nothing is ever flagged as orphaned. Add a rule to describe the accounts reconciliation should surface."
            emptyIcon="policy"
            footNote="Rules are evaluated by the nightly orphan detection sweep"
          />
        ) : (
          <AccountsTable
            id="orphaned"
            rows={rows}
            onAssign={actions.openAssign}
            onDisable={actions.disable}
            onSuppress={actions.suppress}
            onDelete={actions.deleteAccount}
            footNote={`${num(stats.critical)} critical · discovered by nightly reconciliation`}
          />
        )}
      </div>
    </>
  )
}

