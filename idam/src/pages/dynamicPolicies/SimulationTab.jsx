import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import Avatar from '../../components/primitives/Avatar'
import Card from '../../components/primitives/Card'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Field from '../../components/primitives/Field'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import { ORGS, USERS } from '../../data/seed'
import { num } from '../../lib/format'
import { NOW_MS, assignedIds, fmtStamp, groupLabel, groupList, matchUsers, ruleText, unresolvedRules } from './policyPageData'
import { SkeletonStatStrip } from './PoliciesSkeleton'

export default function SimulationTab({ policy, model, loading = false }) {
  const { navigate } = useApp()
  const names = groupList(policy)
  const label = groupLabel(policy)
  const [scope, setScope] = useState('Whole directory')
  const [activeOnly, setActiveOnly] = useState(false)
  const ranAt = fmtStamp(NOW_MS)

  const pool = useMemo(() => USERS.filter((u) => (scope === 'Whole directory' || u.organization === scope) && (!activeOnly || u.status === 'Active')), [scope, activeOnly])
  const matched = useMemo(() => matchUsers(model, pool), [model, pool])
  const assigned = useMemo(() => assignedIds(policy, matchUsers(model)), [policy, model])
  const unresolved = unresolvedRules(model)

  const outcomeOf = (u) => (assigned.has(u.id) ? 'No change' : 'Grant')
  const revokeRows = pool.filter((u) => assigned.has(u.id) && !matched.some((m) => m.id === u.id))
  const grants = matched.filter((u) => !assigned.has(u.id))

  const simRows = [
    ...matched.map((u) => ({ ...u, outcome: outcomeOf(u), key: `m-${u.id}` })),
    ...revokeRows.map((u) => ({ ...u, outcome: 'Revoke', key: `r-${u.id}` })),
  ]

  const columns = [
    {
      key: 'username', label: 'Identity', locked: true, cls: 'td-main',
      value: (r) => `${r.username} ${r.email}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.username}</span>
            <span className="cell-sub">{r.email}</span>
          </span>
        </span>
      ),
    },
    { key: 'department', label: 'Department' },
    { key: 'organization', label: 'Organization' },
    { key: 'employeeType', label: 'Type', render: (r) => <Tag>{r.employeeType}</Tag> },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : r.status === 'Locked' ? 'bad' : 'mut'} dot>{r.status}</Pill> },
    {
      key: 'outcome', label: 'Outcome',
      // The outcome is the same for every group the policy targets, so the
      // cell names them rather than repeating a pill per group.
      render: (r) => (r.outcome === 'Grant'
        ? <span title={names.join(', ')}><Pill tone="ok" icon="plus">Grant {label}</Pill></span>
        : r.outcome === 'Revoke'
          ? <span title={names.join(', ')}><Pill tone="bad" icon="minus">Revoke {label}</Pill></span>
          : <Tag>No change</Tag>),
    },
  ]

  return (
    <div className="stack">
      <Card
        title="Dry run"
        sub="Evaluates the saved condition against live directory data. Nothing is written until you apply."
      >
        <div className="stack">
          <div className="grid grid-2">
            <Field label="Evaluation scope" hint="Restrict the dry run to one organization." htmlFor="sim-scope">
              <Select id="sim-scope" value={scope} options={['Whole directory', ...ORGS]} onChange={(e) => setScope(e.target.value)} />
            </Field>
            <div className="row-between" style={{ alignItems: 'flex-end', paddingBottom: 4 }}>
              <div>
                <div className="t-sm" style={{ fontWeight: 600 }}>Active identities only</div>
                <div className="t-xs t-mut">Excludes locked, disabled and pending identities from the sample.</div>
              </div>
              <Switch checked={activeOnly} onChange={setActiveOnly} label="Active identities only" />
            </div>
          </div>

          {/* The controls above stay live — they are what the operator sets
              before a run, not a result. The figures are the result, so they
              settle with the rows below them. */}
          {loading ? <SkeletonStatStrip cells={4} /> : (
            <div className="stat-strip">
              <div className="stat-cell"><span className="stat-k">Identities evaluated</span><span className="stat-v">{num(pool.length)}</span></div>
              <div className="stat-cell"><span className="stat-k">Matching</span><span className="stat-v">{num(matched.length)}</span></div>
              <div className="stat-cell"><span className="stat-k">Would gain</span><span className="stat-v" style={{ color: grants.length ? 'var(--ok)' : undefined }}>{num(grants.length)}</span></div>
              <div className="stat-cell"><span className="stat-k">No change</span><span className="stat-v">{num(matched.length - grants.length)}</span></div>
            </div>
          )}

          {unresolved.length > 0 && (
            <div className="t-xs t-mut">
              {unresolved.length} {unresolved.length === 1 ? 'predicate' : 'predicates'} cannot be resolved in a dry run
              ({unresolved.map(ruleText).join('; ')}) and {unresolved.length === 1 ? 'was' : 'were'} treated as true.
              The scheduled evaluation resolves them against the source system.
            </div>
          )}
        </div>
      </Card>

      <DataWorkbench
        id="policy-sim"
        rows={simRows}
        loading={loading}
        columns={columns}
        getRowId={(r) => r.key}
        searchPlaceholder="Search the simulated result set…"
        rowActions={(r) => [
          { id: 'open', label: 'Open identity', icon: 'user', onSelect: () => navigate(`/iam/users/${r.id}`) },
          { id: 'apps', label: 'View entitlements', icon: 'apps', onSelect: () => navigate('applicationGroups') },
        ]}
        emptyTitle="Nothing would change"
        emptyBody="No identity in the selected scope is affected by this condition."
        emptyIcon="checkC"
        footNote={`Dry run at ${ranAt} against ${num(pool.length)} identities · no writes performed`}
      />
    </div>
  )
}
