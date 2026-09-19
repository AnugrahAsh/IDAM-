import { useMemo, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Switch from '../../components/primitives/Switch'
import Banner from '../../components/primitives/Banner'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { ROLES } from '../../data/seed'
import { num } from '../../lib/format'

const riskLabel = (r) => r.risk[0].toUpperCase() + r.risk.slice(1)

/**
 * Client scope.
 *
 * `Full scope allowed` decides whether the token this application receives
 * carries every role the identity holds, or only the roles assigned here. The
 * roles are one register: filter it, select rows, and assign or remove them
 * one at a time or in bulk.
 */
export default function ClientScope({ value, onChange, appName, protocol = 'OIDC' }) {
  const { toast } = useApp()
  const [facet, setFacet] = useState('all')
  const carrier = protocol === 'SAML' ? 'assertion' : 'token'
  const full = value.fullScopeAllowed !== false
  const assigned = value.scopeRoles || []
  const isAssigned = (r) => assigned.includes(r.name)

  const stats = useMemo(() => ({
    total: ROLES.length,
    assigned: ROLES.filter(isAssigned).length,
    available: ROLES.filter((r) => !isAssigned(r)).length,
    critical: ROLES.filter((r) => isAssigned(r) && (r.risk === 'critical' || r.risk === 'high')).length,
  }), [assigned])

  const rows = ROLES.filter((r) => (facet === 'assigned' ? isAssigned(r) : facet === 'available' ? !isAssigned(r) : true))

  const assign = (names) => {
    const next = [...new Set([...assigned, ...names])]
    onChange({ scopeRoles: next })
    toast('ok', names.length === 1 ? 'Role assigned' : 'Roles assigned', `${names.length === 1 ? names[0] : `${names.length} roles`} added to the ${carrier} for ${appName}.`)
  }
  const unassign = (names) => {
    onChange({ scopeRoles: assigned.filter((n) => !names.includes(n)) })
    toast('ok', names.length === 1 ? 'Role removed' : 'Roles removed', `${names.length === 1 ? names[0] : `${names.length} roles`} removed from the ${carrier} for ${appName}.`)
  }
  const namesFor = (ids) => ROLES.filter((r) => ids.map(String).includes(String(r.id))).map((r) => r.name)

  const columns = [
    {
      key: 'name', label: 'Role', cls: 'td-main td-flex', locked: true, width: 280,
      value: (r) => `${r.name} ${r.description}`,
      render: (r) => (
        <span className="cell-stack" title={r.description}>
          <span className="trunc">{r.name}</span>
          <span className="cell-sub trunc">{r.description}</span>
        </span>
      ),
    },
    { key: 'scope', label: 'Scope', width: 160 },
    { key: 'members', label: 'Members', align: 'right', render: (r) => num(r.members) },
    {
      key: 'risk', label: 'Risk', width: 110,
      value: (r) => ({ critical: 0, high: 1, medium: 2, low: 3 }[r.risk]),
      render: (r) => <SeverityBadge level={r.risk}>{riskLabel(r)}</SeverityBadge>,
    },
    {
      key: 'status', label: `In ${carrier}`, width: 130,
      value: (r) => (isAssigned(r) ? 'Assigned' : 'Not assigned'),
      render: (r) => (full
        ? <Pill tone="warn" dot>Via full scope</Pill>
        : isAssigned(r) ? <Pill tone="ok" dot>Assigned</Pill> : <Pill tone="mut" dot>Not assigned</Pill>),
    },
    {
      key: 'op', label: 'Operation', width: 120, sortable: false,
      render: (r) => (isAssigned(r)
        ? <Button size="sm" icon="minus" onClick={(e) => { e.stopPropagation(); unassign([r.name]) }}>Remove</Button>
        : <Button size="sm" variant="pri" icon="plus" onClick={(e) => { e.stopPropagation(); assign([r.name]) }}>Assign</Button>),
    },
  ]

  return (
    <div className="stack">
      <Card
        title="Scope"
        sub={`Which of the identity’s roles this application is allowed to see in its ${carrier}.`}
        actions={<Pill tone={full ? 'warn' : 'ok'} dot>{full ? 'Full scope' : 'Restricted'}</Pill>}
      >
        <div className="row-between" style={{ gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div className="t-sm" style={{ fontWeight: 600 }}>Full scope allowed</div>
            <div className="t-xs t-mut">
              On, the {carrier} carries every role the identity holds. Off, it carries only the roles assigned below.
            </div>
          </div>
          <Switch checked={full} label="Full scope allowed" onChange={(v) => onChange({ fullScopeAllowed: v })} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Banner tone={full ? 'warn' : 'info'}>
            {full
              ? `${appName} currently receives all ${num(ROLES.length)} platform roles in every ${carrier}. Turn full scope off to send only the assigned roles.`
              : `${appName} receives ${num(stats.assigned)} ${stats.assigned === 1 ? 'role' : 'roles'}. Any other role the identity holds is invisible to it.`}
          </Banner>
        </div>
      </Card>

      <StatCards
        items={[
          { id: 'all', icon: 'roles', label: 'Platform roles', value: stats.total, sub: 'available to scope' },
          { id: 'assigned', icon: 'checkC', label: 'Assigned', value: stats.assigned, chipTone: 'ok', chip: full ? 'not consulted' : `in the ${carrier}`, sub: 'sent to this application' },
          { id: 'available', icon: 'plus', label: 'Not assigned', value: stats.available, sub: 'withheld from the application' },
          { icon: 'warn', label: 'High-risk assigned', value: stats.critical, chip: stats.critical ? 'review' : 'none', chipTone: stats.critical ? 'warn' : undefined, sub: 'critical or high risk' },
        ]}
        value={facet}
        onChange={setFacet}
        label="Filter roles"
      />

      <DataWorkbench
        id={`client-scope-${appName}`}
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search roles by name, description or scope…"
        bulkActions={(ids, clear) => {
          const names = namesFor(ids)
          const toAssign = names.filter((n) => !assigned.includes(n))
          const toRemove = names.filter((n) => assigned.includes(n))
          return (
            <>
              <Button size="sm" variant="pri" icon="plus" disabled={!toAssign.length} onClick={() => { assign(toAssign); clear() }}>
                Assign {toAssign.length || ''}
              </Button>
              <Button size="sm" icon="minus" disabled={!toRemove.length} onClick={() => { unassign(toRemove); clear() }}>
                Remove {toRemove.length || ''}
              </Button>
            </>
          )
        }}
        emptyTitle={facet === 'assigned' ? 'No roles assigned' : 'No roles match'}
        emptyBody={facet === 'assigned'
          ? `With full scope off and nothing assigned, the ${carrier} carries no roles at all.`
          : 'Clear the search or filter to see every role.'}
        emptyIcon="roles"
        footNote={full
          ? 'Full scope is on, so assignments are not consulted until it is turned off'
          : `Only assigned roles appear in the ${carrier}`}
      />
    </div>
  )
}
