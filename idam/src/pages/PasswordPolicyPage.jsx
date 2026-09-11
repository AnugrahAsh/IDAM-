import './styles/PasswordPolicyPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import StatCards from '../components/workbench/StatCards'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Banner from '../components/primitives/Banner'
import EmptyState from '../components/primitives/EmptyState'
import { useApp } from '../store/AppContext'
import { num, pct, serialColumn, statusTone } from '../lib/format'
import { PASSWORD_POLICIES, nextId } from '../data/seed'
import { DEFAULT_RULES, LIST_PATH, entropyBits, seatsFor, strengthBand } from './password/passwordData'
import Tabs from '../components/primitives/Tabs'
import PolicyMappings from './password/PolicyMappings'
import PasswordDictionaryPage from './PasswordDictionaryPage'
import PolicyDetail from './password/PolicyDetail'
import PolicyForm from './password/PolicyForm'

const RULE_EXTRAS = {
  1: { maxLength: 64, upper: 1, lower: 1, digits: 1, special: 1, maxRepeat: 2, noSequential: true, noUsername: true, minAgeHours: 24, warnDays: 14, graceLogins: 3, selfService: true, lockoutReset: 'Automatic after the window' },
  2: { maxLength: 48, upper: 1, lower: 1, digits: 2, special: 1, maxRepeat: 2, noSequential: true, noUsername: true, minAgeHours: 48, warnDays: 7, graceLogins: 1, selfService: false, lockoutReset: 'Service desk only' },
  3: { maxLength: 128, upper: 0, lower: 0, digits: 0, special: 0, maxRepeat: 4, noSequential: false, noUsername: true, minAgeHours: 0, warnDays: 0, graceLogins: 0, selfService: false, lockoutReset: 'Automatic after the window' },
}

// Password Policy is a section, not a single screen: the register of policies,
// the organization-to-policy mapping, and the shared dictionary the rules cite.
const SECTIONS = [
  { id: 'policies', label: 'Policies', icon: 'lock' },
  { id: 'mappings', label: 'Policy Mappings', icon: 'building' },
  { id: 'dictionary', label: 'Dictionary', icon: 'file' },
]


const withRules = (p) => ({ ...DEFAULT_RULES, ...(RULE_EXTRAS[p.id] || {}), ...p })

const buildPolicies = () => PASSWORD_POLICIES.map((p) => withRules({ ...p, status: 'Active' }))

export default function PasswordPolicyPage({ segments = [] }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const [policies, setPolicies] = useState(buildPolicies)

  const rows = useMemo(() => policies.map((p, i) => ({ ...p, sno: i + 1 })), [policies])

  const stats = useMemo(() => ({
    total: policies.length,
    identities: policies.reduce((a, p) => a + p.users, 0),
    orgs: new Set(policies.flatMap((p) => p.orgs)).size,
    dictionary: policies.filter((p) => p.dictionary).length,
    unassigned: policies.filter((p) => p.orgs.length === 0).length,
  }), [policies])

  const mutate = (ids, patch, message, body) => {
    const set = new Set(ids.map(String))
    setPolicies((ps) => ps.map((p) => (set.has(String(p.id)) ? { ...p, ...patch } : p)))
    toast('ok', message, body)
  }

  const removePolicies = (ids) => {
    const set = new Set(ids.map(String))
    setPolicies((ps) => ps.filter((p) => !set.has(String(p.id))))
  }

  // Mapping edits name the organizations to move rather than restating the
  // whole assignment, so a change to one row cannot silently drop the rest of
  // the policy's organizations the way a full replace would.
  const assignOrgs = (policy, orgNames) => {
    setPolicies((ps) => ps.map((p) => {
      if (p.id === policy.id) {
        const orgs = [...new Set([...p.orgs, ...orgNames])]
        return { ...p, orgs, status: 'Active', users: seatsFor(orgs) }
      }
      const kept = p.orgs.filter((o) => !orgNames.includes(o))
      return kept.length === p.orgs.length ? p : { ...p, orgs: kept, users: seatsFor(kept) }
    }))
    toast('ok', 'Mapping updated', `${orgNames.length === 1 ? orgNames[0] : `${orgNames.length} organizations`} now governed by ${policy.name}.`)
  }

  const releaseOrgs = (orgNames) => {
    setPolicies((ps) => ps.map((p) => {
      const kept = p.orgs.filter((o) => !orgNames.includes(o))
      return kept.length === p.orgs.length ? p : { ...p, orgs: kept, users: seatsFor(kept) }
    }))
    toast('warn', 'Released to default', `${orgNames.length === 1 ? orgNames[0] : `${orgNames.length} organizations`} fall back to the platform default.`)
  }

  const confirmDelete = (p, back) => confirm({
    title: `Delete ${p.name}?`,
    body: 'The policy is removed permanently. Identities keep their current credential until the next change, then fall back to the organization default.',
    confirmLabel: 'Delete policy',
    onConfirm: () => {
      removePolicies([p.id])
      toast('ok', 'Policy deleted', p.name)
      if (back) navigate(LIST_PATH)
    },
  })

  const mode = segments[0]
  const tab = SECTIONS.some((s) => s.id === mode) ? mode : 'policies'

  // One shell for the three section tabs. The detail, edit and add screens sit
  // outside it: they are a level down from the section, so they carry their own
  // header and back link rather than a tab strip that cannot describe them.
  const section = (children, actions) => (
    <>
      <PageBar
        title="Password Policy"
        sub="Named credential rule sets, the organizations each one governs and the terms no credential may contain."
        crumbs={[{ label: 'Reports' }, { label: 'Password Policy' }]}
        actions={actions}
      />
      <div className="stack">
        <Tabs
          value={tab}
          onChange={(id) => navigate(id === 'policies' ? LIST_PATH : `${LIST_PATH}/${id}`)}
          tabs={SECTIONS}
        />
        {children}
      </div>
    </>
  )

  if (mode === 'mappings') {
    return section(
      <PolicyMappings
        policies={policies}
        onAssign={assignOrgs}
        onRelease={releaseOrgs}
        navigate={navigate}
        setDrawer={setDrawer}
        toast={toast}
        confirm={confirm}
      />,
    )
  }

  if (mode === 'dictionary') {
    return section(<PasswordDictionaryPage embedded />)
  }

  if (mode === 'add') {
    return (
      <PolicyForm
        onCancel={() => navigate(LIST_PATH)}
        onSubmit={(d) => {
          const id = nextId(policies)
          setPolicies((ps) => [...ps, { ...DEFAULT_RULES, ...d, id, orgs: [], users: 0, status: 'Inactive' }])
          toast('ok', 'Policy created', `${d.name} was created. Apply it to an organization to bring it into force.`)
          navigate(`${LIST_PATH}/${id}`)
        }}
      />
    )
  }

  if (mode) {
    const policy = policies.find((p) => String(p.id) === String(mode))
    if (!policy) {
      return (
        <>
          <PageBar
            title="Policy not found"
            sub="This password policy is no longer defined."
            crumbs={[{ label: 'Password Policy', to: LIST_PATH }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="lock"
            title="No password policy with that identifier"
            body="It may have been deleted since the link was created."
            actions={<Button variant="pri" iconRight="chevR" onClick={() => navigate(LIST_PATH)}>Back to the policy list</Button>}
          />
        </>
      )
    }
    if (segments[1] === 'edit') {
      return (
        <PolicyForm
          policy={policy}
          onCancel={() => navigate(`${LIST_PATH}/${policy.id}`)}
          onSubmit={(d) => {
            setPolicies((ps) => ps.map((p) => (p.id === policy.id ? { ...p, ...d } : p)))
            toast('ok', 'Policy saved', `${d.name} applies from the next credential change.`)
            navigate(`${LIST_PATH}/${policy.id}`)
          }}
        />
      )
    }
    return (
      <PolicyDetail
        policy={policy}
        onEdit={(p) => navigate(`${LIST_PATH}/${p.id}/edit`)}
        onDelete={(p) => confirmDelete(p, true)}
        onNavigate={navigate}
      />
    )
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Policy name', locked: true, cls: 'td-main',
      render: (p) => (
        <span className="cell-id">
          <Icon name="lock" size={13} style={{ color: p.dictionary ? 'var(--accent)' : 'var(--faint)' }} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{p.name}</span>
            <span className="cell-sub">{num(p.users)} identities covered</span>
          </span>
        </span>
      ),
    },
    { key: 'description', label: 'Description', render: (p) => <span className="trunc">{p.description}</span> },
    { key: 'minLength', label: 'Min length', align: 'right', render: (p) => <span className="num">{p.minLength}</span> },
    {
      key: 'strength', label: 'Strength', width: 130,
      value: (p) => entropyBits(p),
      render: (p) => {
        const band = strengthBand(entropyBits(p))
        return <Pill tone={band.tone}>{band.label} · {entropyBits(p)} bits</Pill>
      },
    },
    {
      key: 'expiryDays', label: 'Expiry', align: 'right',
      render: (p) => (p.expiryDays === 0 ? <span className="t-mut">Never</span> : <span className="num">{p.expiryDays} d</span>),
    },
    {
      key: 'orgs', label: 'Organizations', sortable: false,
      render: (p) => (p.orgs.length === 0
        ? <span className="t-mut">Unassigned</span>
        : (
          <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            <Tag>{p.orgs[0]}</Tag>
            {p.orgs.length > 1 && <Tag>+{p.orgs.length - 1}</Tag>}
          </span>
        )),
    },
    { key: 'status', label: 'Status', render: (p) => <Pill tone={statusTone(p.status)} dot>{p.status}</Pill> },
  ]

  const rowActions = (p) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => navigate(`${LIST_PATH}/${p.id}`) },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${LIST_PATH}/${p.id}/edit`) },
    { id: 'map', label: 'Policy mappings', icon: 'building', onSelect: () => navigate(`${LIST_PATH}/mappings`) },
    { divider: true },
    {
      id: 'del', label: 'Delete', icon: 'trash', danger: true,
      disabled: p.orgs.length > 0,
      onSelect: () => confirmDelete(p),
    },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="checkC" onClick={() => { mutate(ids, { status: 'Active' }, 'Policies activated', `${ids.length} policies are in force.`); clear() }}>Activate</Button>
      <Button size="sm" icon="ban" onClick={() => { mutate(ids, { status: 'Inactive' }, 'Policies deactivated', `${ids.length} policies no longer apply at credential change.`); clear() }}>Deactivate</Button>
      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} policy definitions queued for CSV export.`)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
        title: `Delete ${ids.length} policies?`,
        body: 'Organizations governed by the selected policies fall back to the default policy at the next credential change.',
        confirmLabel: `Delete ${ids.length}`,
        onConfirm: () => { removePolicies(ids); clear(); toast('ok', 'Policies deleted', `${ids.length} policies removed.`) },
      })}>Delete</Button>
    </>
  )

  return section(
    <>
      <Banner tone="info">
        Dictionary checking is enforced by <b>{stats.dictionary} of {stats.total}</b> policies, covering{' '}
        <b>{pct((policies.filter((p) => p.dictionary).reduce((a, p) => a + p.users, 0) / Math.max(1, stats.identities)) * 100)}</b>{' '}
        of governed identities. The forbidden terms themselves are maintained under{' '}
        <button className="link" onClick={() => navigate(`${LIST_PATH}/dictionary`)}>Dictionary</button>.
      </Banner>

      <StatCards
        items={[
          { key: 'total', icon: 'lock', label: 'Policies', value: stats.total, chip: `${num(stats.orgs)} organizations`, sub: 'credential rules in force' },
          { key: 'identities', icon: 'users', label: 'Identities covered', value: stats.identities, chip: 'under a policy', chipTone: 'ok', sub: 'inherit or assigned directly' },
          { key: 'dictionary', icon: 'shield', label: 'Dictionary enforced', value: stats.dictionary, chip: 'breach checks', sub: 'reject known passwords' },
          { key: 'unassigned', icon: 'warn', label: 'Unassigned', value: stats.unassigned, chip: stats.unassigned ? 'no organization' : 'none', chipTone: stats.unassigned ? 'warn' : undefined, sub: 'defined but not applied' },
        ]}
        label="Password policy summary"
      />

      <DataWorkbench
        id="password-policies"
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search by policy name, description, organization…"
        toolbar={
          <>
            <Button size="sm" icon="building" onClick={() => navigate(`${LIST_PATH}/mappings`)}>Policy mappings</Button>
          </>
        }
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(p) => navigate(`${LIST_PATH}/${p.id}`)}
        emptyTitle="No password policies match"
        emptyBody="Adjust the search. Without a policy every organization falls back to the platform default of eight characters."
        emptyIcon="lock"
        footNote="Rules are evaluated at set, change and reset"
      />
    </>,
    <>
      <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Every policy definition is being exported.')}>Export</Button>
      <Button variant="pri" icon="plus" onClick={() => navigate(`${LIST_PATH}/add`)}>Add Policy</Button>
    </>,
  )
}
