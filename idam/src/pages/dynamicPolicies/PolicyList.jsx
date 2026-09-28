import { useMemo } from 'react'
import { useApp } from '../../store/AppContext'
import Button from '../../components/primitives/Button'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import PageBar from '../../components/shell/PageBar'
import Switch from '../../components/primitives/Switch'
import { nextId } from '../../data/seed'
import { num, serialColumn } from '../../lib/format'
import { BASE, GROUP_TYPES, HIGH_IMPACT, countRules, groupList, groupPhrase, groupsOfType, matchUsers, parseExpression } from './policyPageData'
import ImportForm from './ImportForm'
import StatCards from '../../components/workbench/StatCards'
import { useLoading } from '../../lib/useLoading'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import { PolicyListSkeleton } from './PoliciesSkeleton'

export default function PolicyList({ rows, setRows, onDelete }) {
  const { toast, navigate, setDrawer } = useApp()
  /* One flag for the screen: the masthead, the four figures and the rows are
     one reading of the register and settle together. */
  const loading = useLoading()

  const enriched = useMemo(() => rows.map((p) => {
    const model = parseExpression(p.condition)
    return { ...p, model, matched: matchUsers(model).length, predicates: countRules(model) }
  }), [rows])

  const stats = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter((r) => r.active).length,
    matched: enriched.filter((r) => r.active).reduce((a, r) => a + r.matched, 0),
    high: enriched.filter((r) => r.matched >= HIGH_IMPACT).length,
  }), [enriched])

  const toggle = (p) => {
    setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, active: !r.active } : r)))
    toast(p.active ? 'warn' : 'ok', p.active ? 'Policy paused' : 'Policy activated',
      p.active
        ? `${p.name} is skipped from the next evaluation. Existing assignments are retained.`
        : `${p.name} evaluates at the next cycle and will assign ${groupPhrase(p)}.`)
  }

  const setActive = (ids, active) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, active } : r)))
    toast('ok', active ? 'Policies activated' : 'Policies paused', `${ids.length} ${ids.length === 1 ? 'policy' : 'policies'} updated.`)
  }

  const openImport = () => setDrawer({
    title: 'Import policy',
    sub: 'Load dynamic policy definitions exported from another tenant or environment',
    children: (
      <ImportForm
        onCancel={() => setDrawer(null)}
        onImport={(list, skipped) => {
          setRows((rs) => {
            let id = nextId(rs)
            const created = list.map((p) => {
              const groupType = GROUP_TYPES.includes(p.groupType) ? p.groupType : 'Access'
              const options = groupsOfType(groupType)
              // An imported definition may name one group or several, and may
              // name groups this tenant does not hold; whatever survives that
              // filter is the target, falling back to the first of the type.
              const named = groupList(p).filter((g) => options.includes(g))
              const group = named.length > 0 ? named : [options[0]].filter(Boolean)
              const row = {
                id,
                name: String(p.name).trim(),
                description: String(p.description || '').trim(),
                condition: String(p.condition).trim(),
                groupType,
                group,
                active: false,
                matched: matchUsers(parseExpression(p.condition)).length,
                lastRun: '—',
              }
              id += 1
              return row
            })
            return [...rs, ...created]
          })
          setDrawer(null)
          toast(skipped > 0 ? 'warn' : 'ok', 'Policies imported',
            skipped > 0
              ? `${list.length} ${list.length === 1 ? 'policy' : 'policies'} created inactive, ${skipped} definitions skipped.`
              : `${list.length} ${list.length === 1 ? 'policy' : 'policies'} created inactive. Simulate before activating.`)
        }}
      />
    ),
  })

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Policy', locked: true, cls: 'td-main',
      value: (r) => `${r.name} ${r.description}`,
      render: (r) => (
        <span className="cell-id">
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{r.description}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'condition', label: 'Condition',
      render: (r) => <span className="mono t-xs trunc" style={{ display: 'block', maxWidth: 260 }} title={r.condition}>{r.condition}</span>,
    },
    { key: 'predicates', label: 'Predicates', align: 'right', optional: true },
    {
      key: 'group', label: 'Target groups',
      // Search and sort read every name, not just the one the cell leads with.
      value: (r) => groupList(r).join(' '),
      render: (r) => {
        const names = groupList(r)
        return (
          <span className="trunc" title={names.join(', ')}>
            <span style={{ display: 'block' }}>{names[0] || '—'}</span>
            <span className="cell-sub">
              {names.length > 1 ? `+ ${names.length - 1} more · ` : ''}{r.groupType} {names.length > 1 ? 'groups' : 'group'}
            </span>
          </span>
        )
      },
    },
    { key: 'matched', label: 'Matched identities', align: 'right', render: (r) => num(r.matched) },
    {
      key: 'active', label: 'Active', sortable: false,
      render: (r) => (
        <span className="row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <Switch checked={r.active} onChange={() => toggle(r)} label={`Toggle ${r.name}`} />
          <span className="t-xs t-mut">{r.active ? 'On' : 'Off'}</span>
        </span>
      ),
    },
    { key: 'lastRun', label: 'Last run', cls: 'td-mono' },
  ]

  const rowActions = (r) => [
    { id: 'open', label: 'View', icon: 'eye', onSelect: () => navigate(`${BASE}/${r.id}`) },
    { id: 'edit', label: 'Edit condition', icon: 'edit', onSelect: () => navigate(`${BASE}/${r.id}/edit`) },
    { id: 'sim', label: 'Simulate', icon: 'play', onSelect: () => navigate(`${BASE}/${r.id}/simulation`) },
    { id: 'hist', label: 'Run history', icon: 'history', onSelect: () => navigate(`${BASE}/${r.id}/history`) },
    { divider: true },
    { id: 'toggle', label: r.active ? 'Pause policy' : 'Activate policy', icon: r.active ? 'ban' : 'checkC', onSelect: () => toggle(r) },
    { id: 'group', label: groupList(r).length > 1 ? 'Open target groups' : 'Open target group', icon: 'group', onSelect: () => navigate('applicationGroups') },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDelete([r.id], `Delete ${r.name}?`) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="checkC" onClick={() => { setActive(ids, true); clear() }}>Activate</Button>
      <Button size="sm" icon="ban" onClick={() => { setActive(ids, false); clear() }}>Pause</Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} policy definitions queued as JSON.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(ids, `Delete ${ids.length} policies?`, clear)}>Delete</Button>
    </>
  )

  return (
    <>
      {/* One announcing region for the screen. The register below draws its own
          rows from `loading`, and those shapes are decoration. */}
      {loading ? <PolicyListSkeleton /> : (
        <PageBar
          title="Dynamic Policies"
          sub="Attribute rules that assign entitlements without a request. Every policy states a condition, a target group and the identities it currently reaches."
          crumbs={[{ label: 'Groups' }, { label: 'Dynamic Policy' }]}
          actions={
            <>
              <Button icon="upload" onClick={openImport}>Import policy</Button>
              <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Add Policy</Button>
            </>
          }
        />
      )}

      <div className="stack">
        {/* In the tiles' own place, so the rows do not move when they land. */}
        {loading ? <SkeletonStats count={4} /> : (
        <StatCards
          items={[
            { key: 'total', icon: 'policy', label: 'Policies', value: stats.total, chip: `${stats.active} active`, sub: 'membership rules' },
            { key: 'active', icon: 'play', label: 'Active', value: stats.active, chip: 'evaluating', chipTone: 'ok', sub: 'running on every cycle' },
            { key: 'matched', icon: 'users', label: 'Identities matched', value: stats.matched, chip: 'granted by rule', sub: 'across active policies' },
            { key: 'high', icon: 'warn', label: 'High impact', value: stats.high, chip: stats.high ? 'wide blast radius' : 'none', chipTone: stats.high ? 'warn' : undefined, sub: `over ${HIGH_IMPACT} identities each` },
          ]}
          label="Dynamic policy summary"
        />
        )}

        <DataWorkbench
          id="policies"
          rows={enriched}
          loading={loading}
          columns={columns}
          selectable
          searchPlaceholder="Search policies by name, condition or target group…"
          bulkActions={bulkActions}
          rowActions={rowActions}
          onRowClick={(r) => navigate(`${BASE}/${r.id}`)}
          toolbar={
            <>
              <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} policy definitions queued as JSON.`)}>Export</Button>
            </>
          }
          emptyTitle="No policies match"
          emptyBody="Adjust the view, filters or search, or create a policy to assign entitlements from identity attributes."
          emptyIcon="policy"
          footNote="Assignments made by policy cannot be revoked manually while the policy is active"
        />
      </div>
    </>
  )
}
