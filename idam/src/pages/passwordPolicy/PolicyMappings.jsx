import { useMemo, useRef, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Banner from '../../components/primitives/Banner'
import { SkeletonStats } from '../../components/primitives/Skeleton'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import SearchSelect from '../../components/primitives/SearchSelect'
import { APPLICATIONS, DIRECTORIES, ORGANIZATIONS } from '../../data/seed'
import { num, serialColumn } from '../../lib/format'
import { LIST_PATH, entropyBits, strengthBand } from './passwordData'

export const DEFAULT_LABEL = 'Platform default'

// The mapping is the inverse of the policy list: one row per organization,
// naming the single policy that governs it. An organization is governed by
// exactly one policy, so this is the view where a conflict is impossible to
// miss — the register itself enforces the cardinality.
/* `loading` is Password Policy's flag: the tiles and the register land with the
   page bar and the tab strip rather than a frame after them. The mapping form
   below is a drawer the operator types into, so it is never held. */
export default function PolicyMappings({ policies, onAssign, onRelease, navigate, setDrawer, toast, confirm, loading = false }) {
  const bulkRef = useRef('')

  /**
   * A mapping is a scoped binding, not a property of an organization.
   *
   * The register used to hold one row per organization, which could only ever
   * express "this organization uses that policy". The platform scopes a policy
   * to an organization *and*, optionally, to an application and to a branch of
   * a directory — a contractor OU inside the same organization can be governed
   * by a stricter policy than the organization's default. That cannot be said
   * with one row per organization, so the register is a list of named mapping
   * configurations instead, and the organization coverage is derived from it.
   */
  const [mappings, setMappings] = useState(() => policies.flatMap((p) => p.orgs.map((org, i) => ({
    id: `${p.id}-${i}`,
    name: `${org} · ${p.name}`,
    policyId: p.id,
    org,
    application: '',
    ldapConfig: '',
    ouDn: '',
  }))))

  const policyById = useMemo(() => Object.fromEntries(policies.map((p) => [String(p.id), p])), [policies])
  const orgNames = useMemo(() => ORGANIZATIONS.map((o) => o.name), [])
  const appNames = useMemo(() => APPLICATIONS.map((a) => a.displayName), [])
  const dirNames = useMemo(() => DIRECTORIES.map((d) => d.displayName), [])

  /* An organization is covered when at least one mapping names it. The most
     specific mapping wins at runtime; the register states which that is. */
  const coverage = useMemo(() => {
    const map = {}
    mappings.forEach((m) => {
      const p = policyById[String(m.policyId)]
      if (!p) return
      const specificity = (m.ouDn ? 2 : 0) + (m.application ? 1 : 0)
      const held = map[m.org]
      if (!held || specificity > held.specificity) map[m.org] = { policy: p, specificity, mapping: m }
    })
    return map
  }, [mappings, policyById])

  const orgRows = useMemo(() => ORGANIZATIONS.map((org) => {
    const hit = coverage[org.name]
    return {
      org: org.name,
      users: org.users,
      status: org.status,
      policyName: hit ? hit.policy.name : DEFAULT_LABEL,
      bits: hit ? entropyBits(hit.policy) : 0,
      mapped: !!hit,
    }
  }), [coverage])

  const rows = useMemo(() => mappings.map((m, i) => {
    const p = policyById[String(m.policyId)]
    return {
      ...m,
      sno: i + 1,
      policyName: p ? p.name : DEFAULT_LABEL,
      bits: p ? entropyBits(p) : 0,
      scope: m.ouDn ? 'Directory branch' : m.application ? 'Application' : 'Organization',
      users: (ORGANIZATIONS.find((o) => o.name === m.org) || {}).users || 0,
    }
  }), [mappings, policyById])

  const stats = useMemo(() => {
    const mappedOrgs = orgRows.filter((r) => r.mapped)
    return {
      mappings: mappings.length,
      mapped: mappedOrgs.length,
      unmapped: orgRows.length - mappedOrgs.length,
      scoped: mappings.filter((m) => m.application || m.ouDn).length,
      policies: new Set(mappings.map((m) => String(m.policyId))).size,
      covered: mappedOrgs.reduce((a, r) => a + r.users, 0),
      exposed: orgRows.filter((r) => !r.mapped).reduce((a, r) => a + r.users, 0),
    }
  }, [orgRows, mappings])

  const options = useMemo(
    () => policies.map((p) => ({ value: String(p.id), label: p.name })),
    [policies],
  )

  const syncPolicy = (next) => {
    // The policy records still carry the organizations they govern, so the
    // list screen and the detail header stay in agreement with this register.
    const byPolicy = {}
    next.forEach((m) => {
      byPolicy[String(m.policyId)] = byPolicy[String(m.policyId)] || new Set()
      byPolicy[String(m.policyId)].add(m.org)
    })
    policies.forEach((p) => {
      const want = [...(byPolicy[String(p.id)] || [])]
      const gained = want.filter((o) => !p.orgs.includes(o))
      const lost = p.orgs.filter((o) => !want.includes(o))
      if (gained.length) onAssign(p, gained)
      if (lost.length) onRelease(lost)
    })
  }

  const commit = (next) => { setMappings(next); syncPolicy(next) }

  const openEditor = (row) => {
    const draft = row
      ? { ...row }
      : { id: `m-${Date.now()}`, name: '', policyId: policies[0] ? String(policies[0].id) : '', org: '', application: '', ldapConfig: '', ouDn: '' }
    const ref = { current: draft }

    const render = () => setDrawer({
      title: row ? 'Edit policy mapping' : 'Add policy mapping',
      sub: 'A mapping binds one password policy to an organization, and optionally narrows it to an application or a branch of a directory.',
      children: <MappingForm
        value={ref.current}
        options={options}
        orgNames={orgNames}
        appNames={appNames}
        dirNames={dirNames}
        onChange={(next) => { ref.current = next; render() }}
      />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="save"
            disabled={!ref.current.policyId || !ref.current.org}
            onClick={() => {
              const d = ref.current
              const named = { ...d, name: d.name.trim() || `${d.org} · ${(policyById[String(d.policyId)] || {}).name || 'policy'}` }
              const next = row
                ? mappings.map((m) => (m.id === row.id ? named : m))
                : [...mappings, named]
              setDrawer(null)
              commit(next)
              toast('ok', row ? 'Mapping saved' : 'Mapping added', `${named.name} applies at the next credential change.`)
            }}
          >
            {row ? 'Save mapping' : 'Add mapping'}
          </Button>
        </>
      ),
    })

    render()
  }

  const removeMapping = (row) => confirm({
    title: `Delete ${row.name}?`,
    body: `${row.org} loses this binding. If no other mapping covers it, its identities fall back to the platform default of eight characters.`,
    confirmLabel: 'Delete mapping',
    onConfirm: () => {
      commit(mappings.filter((m) => m.id !== row.id))
      toast('ok', 'Mapping deleted', row.name)
    },
  })

  const bulkAssign = (ids, clear) => {
    const picked = rows.filter((r) => ids.map(String).includes(String(r.id)))
    bulkRef.current = ''
    setDrawer({
      title: `Repoint ${picked.length} mapping${picked.length === 1 ? '' : 's'}`,
      sub: 'Every selected mapping is moved to the policy chosen here. Their scopes are unchanged.',
      children: (
        <div className="stack">
          <div>
            <div className="t-micro t-mut" style={{ marginBottom: 5 }}>Selected</div>
            <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
              {picked.map((r) => <Tag key={r.id} tone="acc">{r.name}</Tag>)}
            </div>
          </div>
          <Field label="Governing policy" required htmlFor="pm-target">
            <Select id="pm-target" options={options} defaultValue="" placeholder="Select a policy" onChange={(e) => { bulkRef.current = e.target.value }} />
          </Field>
          <Banner tone="info">
            {num(picked.reduce((a, r) => a + r.users, 0))} identities are covered by this change. Existing credentials
            stay valid until each identity next changes one.
          </Banner>
        </div>
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="checkC"
            onClick={() => {
              const target = bulkRef.current
              setDrawer(null)
              if (!target) return
              const set = new Set(picked.map((r) => r.id))
              commit(mappings.map((m) => (set.has(m.id) ? { ...m, policyId: target } : m)))
              clear()
              toast('ok', 'Mappings repointed', `${picked.length} mapping${picked.length === 1 ? '' : 's'} moved.`)
            }}
          >
            Apply mapping
          </Button>
        </>
      ),
    })
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Configuration name', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Icon name="lock" size={13} style={{ color: 'var(--accent)' }} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{r.name}</span>
            <span className="cell-sub">{r.scope} scope</span>
          </span>
        </span>
      ),
    },
    {
      key: 'application', label: 'Application name', cls: 'td-flex',
      render: (r) => (r.application ? <span className="trunc">{r.application}</span> : <span className="t-faint">Every application</span>),
    },
    {
      key: 'ouDn', label: 'Organizational unit DN', cls: 'td-mono td-flex',
      render: (r) => (r.ouDn
        ? (
          <span className="cell-stack">
            <span className="trunc mono t-xs">{r.ouDn}</span>
            <span className="cell-sub trunc">{r.ldapConfig}</span>
          </span>
        )
        : <span className="t-faint">Whole organization</span>),
    },
    {
      key: 'policyName', label: 'Password policy', width: 210,
      render: (r) => (
        <Select
          className="pm-sel"
          aria-label={`Policy for ${r.name}`}
          value={String(r.policyId)}
          options={options}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            commit(mappings.map((m) => (m.id === r.id ? { ...m, policyId: e.target.value } : m)))
          }}
        />
      ),
    },
    { key: 'org', label: 'Organizations', cls: 'td-flex' },
    {
      key: 'bits', label: 'Strength', width: 140,
      render: (r) => {
        const band = strengthBand(r.bits)
        return <Pill tone={band.tone}>{band.label} · {r.bits} bits</Pill>
      },
    },
  ]

  return (
    <div className="stack">
      {stats.unmapped > 0 && (
        <Banner tone="warn">
          <b>{stats.unmapped} organization{stats.unmapped === 1 ? '' : 's'}</b> {stats.unmapped === 1 ? 'is' : 'are'} not
          covered by any mapping, leaving <b>{num(stats.exposed)} identities</b> on the platform default of
          eight characters:{' '}
          {orgRows.filter((r) => !r.mapped).map((r) => <Tag key={r.org}>{r.org}</Tag>)}
        </Banner>
      )}

      {loading ? <SkeletonStats count={4} /> : (
      <StatCards
        label="Policy mapping summary"
        items={[
          { key: 'mappings', icon: 'lock', label: 'Mappings', value: stats.mappings, chip: `${stats.scoped} narrowed`, sub: 'named binding configurations' },
          { key: 'mapped', icon: 'building', label: 'Organizations covered', value: stats.mapped, chip: `of ${orgRows.length}`, sub: 'reached by at least one mapping' },
          { key: 'covered', icon: 'users', label: 'Identities covered', value: stats.covered, chip: 'under a policy', chipTone: 'ok', sub: 'rules enforced at next change' },
          { key: 'unmapped', icon: 'warn', label: 'Uncovered', value: stats.unmapped, chip: stats.unmapped ? `${num(stats.exposed)} identities` : 'none', chipTone: stats.unmapped ? 'warn' : undefined, sub: 'falling back to the default' },
        ]}
      />
      )}

      <DataWorkbench
        id="password-policy-mappings"
        rows={rows}
        columns={columns}
        loading={loading}
        selectable
        searchPlaceholder="Search by configuration, organization, application or DN…"
        toolbar={
          <>
            <Button size="sm" variant="pri" icon="plus" onClick={() => openEditor(null)}>Add mapping</Button>
            <Button size="sm" icon="lock" onClick={() => navigate(LIST_PATH)}>Manage policies</Button>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" variant="pri" icon="building" onClick={() => bulkAssign(ids, clear)}>Repoint to policy</Button>
            <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${ids.length} mappings queued for CSV export.`)}>Export</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'edit', label: 'Edit mapping', icon: 'edit', onSelect: () => openEditor(r) },
          { id: 'policy', label: 'Open policy', icon: 'eye', onSelect: () => navigate(`${LIST_PATH}/${r.policyId}`) },
          { divider: true },
          { id: 'del', label: 'Delete mapping', icon: 'trash', danger: true, onSelect: () => removeMapping(r) },
        ]}
        onRowClick={(r) => openEditor(r)}
        emptyTitle="No mappings defined"
        emptyBody="Every organization falls back to the platform default until a mapping is added."
        emptyIcon="lock"
        footNote="The most specific mapping wins: directory branch, then application, then organization"
      />
    </div>
  )
}

/** Resolution order is stated where the scope is chosen, not in a footnote. */
function MappingForm({ value, options, orgNames, appNames, dirNames, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="stack">
      <Field label="Configuration name" hint="Left blank, the mapping is named from its organization and policy." htmlFor="pm-name">
        <TextInput id="pm-name" value={value.name} placeholder="Contractor OU · Strict policy" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Password policy" required htmlFor="pm-policy">
        <Select id="pm-policy" value={String(value.policyId)} options={options} placeholder="Select a policy" onChange={(e) => set('policyId', e.target.value)} />
      </Field>
      <Field label="Organization" required hint="The mapping applies to identities in this organization." htmlFor="pm-org">
        <SearchSelect id="pm-org" value={value.org} options={orgNames} placeholder="Select an organization" onChange={(e) => set('org', e.target.value)} />
      </Field>
      <Field label="Application" hint="Leave blank to govern every application in the organization." htmlFor="pm-app">
        <SearchSelect id="pm-app" value={value.application} options={['', ...appNames]} placeholder="Every application" onChange={(e) => set('application', e.target.value)} />
      </Field>
      <Field label="LDAP configuration" hint="Required to scope the mapping to a branch of a directory." htmlFor="pm-ldap">
        <SearchSelect id="pm-ldap" value={value.ldapConfig} options={['', ...dirNames]} placeholder="No directory scope" onChange={(e) => set('ldapConfig', e.target.value)} />
      </Field>
      <Field
        label="Organizational unit DN"
        hint={value.ldapConfig ? 'Identities below this branch are governed by this mapping.' : 'Select an LDAP configuration first.'}
        htmlFor="pm-dn"
      >
        <TextInput
          id="pm-dn"
          className="mono"
          value={value.ouDn}
          disabled={!value.ldapConfig}
          placeholder="ou=contractors,dc=tanflow,dc=com"
          onChange={(e) => set('ouDn', e.target.value)}
        />
      </Field>
      <Banner tone="info">
        Resolution is most-specific-first: a mapping with an organizational unit DN beats one with an application, which
        beats an organization-wide mapping. Identities matched by none fall back to the platform default.
      </Banner>
    </div>
  )
}
