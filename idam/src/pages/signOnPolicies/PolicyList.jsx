import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterHeader from '../../components/workbench/RegisterHeader'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { useApp } from '../../store/AppContext'
import { serialColumn, statusTone } from '../../lib/format'
import { BASE, appById, isOrphan, plural, policyPath } from './signOnPolicyData'
import { usePolicies } from './signOnPolicyStore'
import { usePolicyActions } from './usePolicyActions'
import { deniedTitle, usePolicyAccess } from './signOnPolicyAccess'

const FACETS = {
  all: () => true,
  active: (p) => p.status === 'Active',
  inactive: (p) => p.status !== 'Active',
  unattached: (p) => p.applications.length === 0,
}

const EMPTY = {
  all: ['No sign-on policies match', 'Nothing in the register matches the current view.'],
  active: ['No active policies', 'Every policy is inactive. Activate one to have its rules evaluated.'],
  inactive: ['No inactive policies', 'Every policy is active.'],
  unattached: ['Every policy has an application attached', 'No policy is sitting without an application to govern.'],
}

const appNames = (p) => p.applications.map((m) => appById(m.appId)).filter(Boolean).map((a) => a.displayName)

/**
 * The sign-on policy register.
 *
 * Search, page size and the column selection are the workbench's, so the three
 * defects the previous list carried — a search box that filtered nothing, a
 * page size that never reached the server, and column choices lost on reload —
 * are not re-implemented here to be got wrong again.
 */
export default function PolicyList() {
  const { navigate } = useApp()
  const policies = usePolicies()
  const access = usePolicyAccess()
  const { changeStatus, removePolicies } = usePolicyActions()
  const [facet, setFacet] = useState('all')
  const [mutedAlert, setMutedAlert] = useState(null)

  const counts = useMemo(() => ({
    active: policies.filter(FACETS.active).length,
    inactive: policies.filter(FACETS.inactive).length,
    unattached: policies.filter(FACETS.unattached).length,
    orphans: policies.filter(isOrphan).length,
    rules: policies.reduce((n, p) => n + p.rules.length, 0),
    apps: new Set(policies.flatMap((p) => p.applications.map((m) => m.appId))).size,
  }), [policies])

  const rows = useMemo(() => policies.filter(FACETS[facet] || FACETS.all), [policies, facet])
  const byIds = (ids) => {
    const set = new Set(ids.map(String))
    return policies.filter((p) => set.has(String(p.id)))
  }

  const alert = counts.orphans > 0 ? {
    tone: 'warn',
    title: `${plural(counts.orphans, 'policy', 'policies')} ${counts.orphans === 1 ? 'has' : 'have'} rules but no applications`,
    detail: 'rules only run for applications attached to their policy',
    filterId: 'unattached',
    actionLabel: 'Show them',
  } : null

  const headerItems = [
    { id: 'all', label: 'policies', value: policies.length },
    { id: 'active', label: 'active', value: counts.active },
    { id: 'inactive', label: 'inactive', value: counts.inactive },
    { id: 'unattached', label: 'without applications', value: counts.unattached, tone: counts.unattached ? 'warn' : undefined },
  ]

  const columns = [
    serialColumn('S.No.'),
    {
      key: 'name', label: 'Name', locked: true, cls: 'td-main',
      render: (p) => (
        <span className="cell-id">
          <span className="feed-ic" data-tone={p.status === 'Active' ? 'acc' : 'mut'}><Icon name="signon" size={13} /></span>
          <span className="trunc">
            <span style={{ display: 'block' }}>{p.name}</span>
            <span className="cell-sub">{plural(p.rules.length, 'rule')} · {plural(p.applications.length, 'application')}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'description', label: 'Description', cls: 'td-flex',
      render: (p) => (p.description ? <span title={p.description}>{p.description}</span> : <span className="t-faint">—</span>),
    },
    {
      key: 'rules', label: 'Rules', align: 'right',
      value: (p) => p.rules.length,
      render: (p) => <span className="num">{p.rules.length}</span>,
    },
    {
      key: 'applications', label: 'Applications', sortable: false,
      value: (p) => appNames(p).join(' '),
      render: (p) => {
        const names = appNames(p)
        if (names.length === 0) {
          return p.rules.length > 0
            ? <Pill tone="warn" icon="warn">None attached</Pill>
            : <span className="t-mut">None</span>
        }
        return (
          <span className="row" style={{ gap: 5, flexWrap: 'nowrap' }} title={names.join(', ')}>
            <Tag>{names[0]}</Tag>
            {names.length > 1 && <Tag>+{names.length - 1}</Tag>}
          </span>
        )
      },
    },
    { key: 'status', label: 'Status', render: (p) => <Pill tone={statusTone(p.status)} dot>{p.status}</Pill> },
    { key: 'createdOn', label: 'Created on', optional: true, cls: 'td-mono' },
    { key: 'createdBy', label: 'Created by', optional: true },
    { key: 'modifiedOn', label: 'Last modified on', optional: true, cls: 'td-mono' },
    { key: 'modifiedBy', label: 'Last modified by', optional: true },
  ]

  const gate = (key) => (access[key] ? {} : { disabled: true, title: deniedTitle(key) })

  const rowActions = (p) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => navigate(policyPath(p.id)) },
    { id: 'edit', label: 'Edit', icon: 'edit', ...gate('edit'), onSelect: () => navigate(policyPath(p.id, 'edit')) },
    { id: 'rules', label: 'Rules', icon: 'layers', onSelect: () => navigate(policyPath(p.id, 'rules')) },
    { id: 'apps', label: 'Applications', icon: 'apps', onSelect: () => navigate(policyPath(p.id, 'applications')) },
    { divider: true },
    p.status === 'Active'
      ? { id: 'off', label: 'Deactivate', icon: 'ban', ...gate('status'), onSelect: () => changeStatus([p], 'Inactive') }
      : { id: 'on', label: 'Activate', icon: 'checkC', ...gate('status'), onSelect: () => changeStatus([p], 'Active') },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, ...gate('remove'), onSelect: () => removePolicies([p]) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      {access.status && <Button size="sm" icon="checkC" onClick={() => changeStatus(byIds(ids), 'Active', clear)}>Activate</Button>}
      {access.status && <Button size="sm" icon="ban" onClick={() => changeStatus(byIds(ids), 'Inactive', clear)}>Deactivate</Button>}
      {access.remove && <Button size="sm" variant="danger" icon="trash" onClick={() => removePolicies(byIds(ids), clear)}>Delete</Button>}
    </>
  )

  const addButton = access.add
    ? <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/add`)}>Add policy</Button>
    : undefined
  const [emptyTitle, emptyBody] = EMPTY[facet] || EMPTY.all

  return (
    <>
      <PageBar
        title="Sign-On Policies"
        sub="Named, ordered rule sets evaluated at sign-in. Rules run top to bottom and the first match decides; a policy only takes effect on the applications attached to it."
        crumbs={[{ label: 'Groups' }, { label: 'Sign-On Policies' }]}
        actions={addButton}
      />

      {policies.length === 0 ? (
        <Card>
          <EmptyState
            icon="signon"
            title="No sign-on policies yet"
            body="Add a policy, give it rules, then attach the SSO applications it should govern."
            actions={addButton}
          />
        </Card>
      ) : (
        <DataWorkbench
          id="sign-on-policies"
          rows={rows}
          columns={columns}
          header={(
            <RegisterHeader
              items={headerItems}
              value={facet}
              onChange={setFacet}
              resetId="all"
              label="Filter the sign-on policy register"
              alert={facet === 'unattached' || (alert && mutedAlert === alert.title) ? null : alert}
              onDismissAlert={() => setMutedAlert(alert ? alert.title : null)}
              summary={[
                { value: counts.rules, label: 'rules' },
                { value: counts.apps, label: 'applications governed' },
              ]}
            />
          )}
          selectable={access.status || access.remove}
          bulkActions={bulkActions}
          rowActions={rowActions}
          onRowClick={(p) => navigate(policyPath(p.id))}
          searchPlaceholder="Search by name or description…"
          emptyTitle={emptyTitle}
          emptyBody={emptyBody}
          emptyIcon="signon"
          footNote="Rules run top to bottom; the first match decides"
        />
      )}
    </>
  )
}
