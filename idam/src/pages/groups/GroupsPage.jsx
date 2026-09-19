import './GroupsPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Menu from '../../components/primitives/Menu'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import { GroupMark, TAB_IDS, dayOf } from './GroupDetail'
import GroupForm from './GroupForm'
import UploadForm from '../users/UploadForm'
import { GROUP_DELETE_SPEC } from './groupsData'
import ImportGroups from './ImportGroups'
import {
  BASE_PATH, GROUP_ROWS, KINDS, KIND_META, OWNERS,
  PROTOCOL_ICON, PROTOCOL_TONE, appTargetOf, cleanGroupName, decorateByKind, ssoTargetOf,
} from './groupsData'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { CAMPAIGNS, CONNECTOR_TYPES, nextId } from '../../data/seed'
import SelectionSync from './SelectionSync'
import GroupRecord from './GroupRecord'
import RegisterSummary from '../../components/workbench/RegisterSummary'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import Tag from '../../components/primitives/Tag'
import { useLocalState } from '../../lib/useLocalState'

// Each headline is a question about the entitlement estate, and answering it is
// the same click as filtering to it.
// The register divides into three kinds and nothing else. Privileged and empty
// are properties of a group, not kinds of group: they are still on every row,
// in the grouped view's Privilege sectioning and in the search, but they no
// longer sit in the headline pretending to be a fourth and fifth register.
const FACETS = {
  All: () => true,
  Application: (r) => r.kind === 'Application',
  Access: (r) => r.kind === 'Access',
  SSO: (r) => r.kind === 'SSO',
}

export default function GroupsPage({ segments = [] }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const [rows, setRows] = useState(GROUP_ROWS)
  const [kind, setKind] = useState('All')
  const [menu, setMenu] = useState(null)
  const [selection, setSelection] = useState({ ids: [], clear: null })
  // The drawer's footer button reads the chosen file, and the drawer is not
  // re-rendered by this component, so the choice cannot live in state.
  const bulkFileRef = useRef({ file: '' })

  const syncSelection = useCallback((ids, clear) => setSelection({ ids, clear }), [])

  const stats = useMemo(() => ({
    total: rows.length,
    members: rows.reduce((a, r) => a + r.members, 0),
    application: rows.filter((r) => r.kind === 'Application').length,
    access: rows.filter((r) => r.kind === 'Access').length,
    sso: rows.filter((r) => r.kind === 'SSO').length,
    privileged: rows.filter((r) => r.privileged).length,
  }), [rows])

  const visible = useMemo(() => rows.filter(FACETS[kind] || FACETS.All), [rows, kind])

  const patch = (id, next) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)))

  const removeGroups = (ids, title, done, after) => confirm({
    title,
    body: 'Members lose the entitlement on the next provisioning run and any dynamic policy that targets the group stops evaluating. This cannot be undone.',
    confirmLabel: ids.length > 1 ? `Delete ${ids.length} groups` : 'Delete group',
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (done) done()
      toast('ok', 'Groups deleted', `${ids.length} ${ids.length === 1 ? 'group' : 'groups'} removed from the register.`)
      if (after) after()
    },
  })

  const stageImport = (defs, { kind: importKind, application }) => {
    const start = rows.reduce((m, r) => Math.max(m, r.sno), 0)
    const created = defs.map((d, i) => decorateByKind({
      id: nextId(rows) + i,
      sno: start + i + 1,
      name: cleanGroupName(d.name, `IMPORTED_${i + 1}`),
      description: d.description,
      kind: importKind,
      application,
      members: 0,
      owner: OWNERS[i % OWNERS.length],
      privileged: false,
      external: false,
      ageDays: 0,
      createdOn: dayOf(0),
      reviewedOn: dayOf(0),
    }))
    setRows((rs) => [...created, ...rs])
    toast('ok', 'Import staged', `${created.length} ${created.length === 1 ? 'group' : 'groups'} staged against ${application}.`)
    return created.length
  }

  const openImport = () => setDrawer({
    title: 'Import Groups',
    sub: 'Upload a CSV of group definitions',
    size: 'lg',
    children: (
      <ImportGroups
        defaultKind={kind === 'All' ? 'Application' : kind}
        onCancel={() => setDrawer(null)}
        onImport={stageImport}
      />
    ),
  })

  /* Delete by uploaded list. `UploadForm` is the directory's, deliberately: the
     preparation instructions, the sample-CSV link and the validation contract
     are the same promise whichever register is being loaded, and two copies of
     that promise drift. */
  const openBulkDelete = () => {
    bulkFileRef.current = { file: '' }
    setDrawer({
      title: 'Delete Bulk',
      sub: 'Remove every group listed in the file and revoke what its members hold.',
      children: <UploadForm spec={GROUP_DELETE_SPEC} onChange={(v) => { bulkFileRef.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="danger"
            icon="trash"
            onClick={() => {
              const chosen = bulkFileRef.current.file
              if (!chosen) {
                toast('warn', 'No file selected', 'Choose a CSV file that matches the Delete Bulk template.')
                return
              }
              confirm({
                title: 'Delete every group in this file?',
                body: 'Each group named in the file is removed and its members lose the entitlement at the next provisioning run. This cannot be undone.',
                confirmLabel: 'Delete groups',
                onConfirm: () => {
                  setDrawer(null)
                  toast('warn', 'Delete Bulk queued', `${chosen} accepted for validation. Rows that fail are returned as a downloadable error file.`)
                },
              })
            }}
          >
            Delete groups
          </Button>
        </>
      ),
    })
  }

  const exportRows = (ids) => toast('ok', 'Export queued', `${ids.length} ${ids.length === 1 ? 'group' : 'groups'} queued for CSV export.`)

  /* Two verbs, not one. `Delete` removes what is ticked in the table; `Delete
     Bulk` takes a CSV, which is how an estate-wide cleanup arrives — as a list
     from somewhere else, not as four hundred checkboxes. The Users module makes
     the same split and this follows it. */
  const openMore = (e) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: 'More actions', header: true },
      {
        id: 'del',
        label: selection.ids.length > 0 ? `Delete (${selection.ids.length})` : 'Delete',
        icon: 'trash',
        danger: true,
        disabled: selection.ids.length === 0,
        title: selection.ids.length === 0 ? 'Select the groups to delete first' : undefined,
        onSelect: () => removeGroups(
          selection.ids,
          selection.ids.length === 1 ? 'Delete this group?' : `Delete ${selection.ids.length} groups?`,
          selection.clear,
        ),
      },
      { id: 'bulkdel', label: 'Delete Bulk', icon: 'upload', danger: true, onSelect: openBulkDelete },
      { divider: true },
      { id: 'export', label: 'Export', icon: 'download', disabled: selection.ids.length === 0, onSelect: () => exportRows(selection.ids) },
    ],
  })

  const mode = segments[0]
  const sub = segments[1]

  if (mode === 'add') {
    const initialKind = kind === 'All' ? 'Application' : kind
    return (
      <GroupForm
        mode="add"
        initial={{
          name: '',
          description: '',
          kind: initialKind,
          application: KIND_META[initialKind].appOptions()[0],
          owner: OWNERS[0],
          privileged: false,
          external: false,
        }}
        backTo={BASE_PATH}
        backLabel="Groups"
        title="Add group"
        sub={`Define an entitlement group in one of the three registers. Members are added on the record once it exists. ${rows.length} groups are already registered.`}
        registered={rows.length}
        onCancel={() => navigate(BASE_PATH)}
        onSubmit={(values) => {
          const id = nextId(rows)
          const sno = rows.reduce((m, r) => Math.max(m, r.sno), 0) + 1
          const row = decorateByKind({
            id,
            sno,
            ...values,
            members: 0,
            ageDays: 0,
            createdOn: dayOf(0),
            reviewedOn: dayOf(0),
          })
          setRows((rs) => [row, ...rs])
          toast('ok', 'Group added', `${row.name} is staged against ${row.application}. Add the first members below.`)
          // Membership is no longer chosen at creation, so the administrator
          // lands on the members tab of the record they just made.
          navigate(`${BASE_PATH}/${id}/members`)
        }}
      />
    )
  }

  if (mode) {
    const group = rows.find((r) => String(r.id) === String(mode))

    if (!group) {
      return (
        <>
          <PageBar
            title="Group not found"
            sub="The group in this address is no longer in the register."
            crumbs={[{ label: 'Groups', to: BASE_PATH }, { label: 'Not found' }]}
          />
          <Card>
            <EmptyState
              icon="group"
              title="No such group"
              body="It may have been deleted, or the identifier in the address is wrong."
              actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE_PATH)}>Back to groups</Button>}
            />
          </Card>
        </>
      )
    }

    if (sub === 'edit') {
      return (
        <GroupForm
          mode="edit"
          initial={{
            name: group.name,
            description: group.description,
            kind: group.kind,
            application: group.application,
            owner: group.owner,
            privileged: !!group.privileged,
            external: !!group.external,
          }}
          backTo={`${BASE_PATH}/${group.id}`}
          backLabel={group.name}
          title={`Edit ${group.name}`}
          sub={`Change the definition and ownership of this ${KIND_META[group.kind].label.toLowerCase()}. ${num(group.members)} identities hold it today.`}
          onCancel={() => navigate(`${BASE_PATH}/${group.id}`)}
          onSubmit={(values) => {
            patch(group.id, decorateByKind({ ...group, ...values }))
            toast('ok', 'Group updated', `${values.name} saved.`)
            navigate(`${BASE_PATH}/${group.id}`)
          }}
        />
      )
    }

    return (
      <GroupRecord
        key={group.id}
        group={group}
        peers={rows}
        tab={TAB_IDS.includes(sub) ? sub : 'information'}
        onTab={(id) => navigate(`${BASE_PATH}/${group.id}/${id}`, { replace: true })}
        onPatch={(next) => patch(group.id, next)}
        onDelete={() => removeGroups([group.id], `Delete ${group.name}?`, null, () => navigate(BASE_PATH))}
      />
    )
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Name', locked: true, cls: 'td-main', width: 240,
      render: (r) => (
        <span className="cell-id">
          <span className="trunc">{r.name}</span>
          {r.privileged && <Icon name="key" size={12} style={{ color: 'var(--warn-core)' }} />}
          {r.external && <Icon name="globe" size={12} style={{ color: 'var(--warn-core)' }} />}
        </span>
      ),
    },
    {
      key: 'kind', label: 'Kind',
      render: (r) => <Pill tone={KIND_META[r.kind].tone} icon={KIND_META[r.kind].icon}>{r.kind}</Pill>,
    },
    { key: 'description', label: 'Description', width: 300, optional: true, render: (r) => <span className="trunc" title={r.description}>{r.description}</span> },
    { key: 'application', label: 'Application', render: (r) => <span className="trunc">{r.application}</span> },
    { key: 'owner', label: 'Owner', optional: true },
    // Exactly one group per application is the primary. The column is here
    // rather than only on the record because "which one is primary" is a
    // question about the register, not about any single group — but only
    // Application groups have one, so it is dropped when the register is
    // filtered to a kind that cannot.
    ...(kind === 'All' || kind === 'Application' ? [{
      key: 'primary', label: 'Primary status', width: 132,
      value: (r) => (r.primary ? 1 : 0),
      render: (r) => (r.primary
        ? <Pill tone="acc" icon="star">Primary</Pill>
        : <span className="t-faint">—</span>),
    }] : []),
    {
      key: 'ldapApplication', label: 'LDAP directory', optional: true, cls: 'td-flex',
      render: (r) => (r.ldapApplication
        ? (
          <span className="cell-stack">
            <span className="trunc">{r.ldapApplication}</span>
            <span className="cell-sub trunc mono t-xs">{r.ldapOu}</span>
          </span>
        )
        : <span className="t-faint">Not directory-bound</span>),
    },
    {
      key: 'members', label: 'Members', align: 'right',
      render: (r) => (r.members === 0 ? <span className="t-faint num">0</span> : num(r.members)),
    },
    { key: 'createdOn', label: 'Created on', cls: 'td-mono' },
  ]

  /* One primary per application: setting a new one clears the old, because two
     primaries mean the platform has no default to fall back on. */
  const setPrimary = (row) => {
    setRows((rs) => rs.map((r) => (r.application === row.application && r.kind === row.kind
      ? { ...r, primary: r.id === row.id }
      : r)))
    toast('ok', 'Primary group set', `${row.name} is the default group for ${row.application}.`)
  }

  const rowActions = (r) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => navigate(`${BASE_PATH}/${r.id}`) },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`${BASE_PATH}/${r.id}/edit`) },
    { id: 'members', label: 'Manage members', icon: 'users', onSelect: () => navigate(`${BASE_PATH}/${r.id}/members`) },
    { id: 'schedule', label: 'Schedule Access', icon: 'calendar', onSelect: () => navigate(`${BASE_PATH}/${r.id}/schedule`) },
    {
      id: 'primary',
      label: r.primary ? 'Already the primary group' : 'Set primary',
      icon: 'star',
      disabled: r.primary || r.kind !== 'Application',
      onSelect: () => setPrimary(r),
    },
    { id: 'sod', label: 'Segregation of duties', icon: 'sod', onSelect: () => navigate(`${BASE_PATH}/${r.id}/sod`) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => removeGroups([r.id], `Delete ${r.name}?`) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <SelectionSync ids={ids} clear={clear} onSync={syncSelection} />
      <Button size="sm" icon="calendar" disabled={ids.length !== 1} onClick={() => navigate(`${BASE_PATH}/${ids[0]}/schedule`)}>Schedule</Button>
      <Button size="sm" icon="download" onClick={() => exportRows(ids)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => removeGroups(ids, ids.length === 1 ? 'Delete this group?' : `Delete ${ids.length} groups?`, clear)}>Delete</Button>
    </>
  )

  const kindSegments = [
    {
      id: 'Application', icon: 'provision', label: 'Application', value: stats.application,
      sub: 'granted on a target system',
      hint: 'Groups provisioned onto a target application',
    },
    {
      id: 'Access', icon: 'users', label: 'Access', value: stats.access,
      sub: 'console and gateway surfaces',
      hint: 'Groups that grant access to platform surfaces',
    },
    {
      id: 'SSO', icon: 'sso', label: 'SSO', value: stats.sso,
      sub: 'released in assertions',
      hint: 'Groups released to federated applications',
    },
  ]

  const groupSummary = (section) => {
    const members = section.reduce((a, r) => a + r.members, 0)
    const priv = section.filter((r) => r.privileged).length
    return `${num(members)} members · ${priv} privileged`
  }

  const renderCard = (r, ctx) => (
    <RecordCard
      ctx={ctx}
      label={r.name}
      media={<CardIcon name={KIND_META[r.kind].icon} tone={r.privileged ? 'warn' : 'acc'} />}
      title={r.name}
      sub={r.application}
      tags={(
        <>
          <Pill tone={KIND_META[r.kind].tone} icon={KIND_META[r.kind].icon}>{r.kind}</Pill>
          {r.privileged && <Tag>Privileged</Tag>}
          {r.external && <Tag>External</Tag>}
          <span className="spacer" />
          <span className="rcard-stat"><b className="num">{num(r.members)}</b> members</span>
        </>
      )}
      line={<span className="trunc">{r.description}</span>}
      meta={[
        { k: 'Kind', v: r.kind },
        { k: 'Application', v: r.application },
        { k: 'Owner', v: r.owner },
        { k: 'SoD flags', v: r.sodFlags ? `${r.sodFlags} open` : 'None' },
      ]}
      footR={`Created ${r.createdOn}`}
    />
  )

  return (
    <>
      <PageBar
        title="Groups"
        sub="Application, access and SSO entitlement groups in one register — searchable, certifiable and provisioned from a single place."
        crumbs={[{ label: 'Groups' }]}
        actions={
          <>
            <Button icon="upload" onClick={openImport}>Import Groups</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `${num(visible.length)} groups queued for CSV export.`)}>Export Groups</Button>
            <Button icon="kebab" onClick={openMore}>More Actions</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate(`${BASE_PATH}/add`)}>Add Group</Button>
          </>
        }
      />

      <RegisterSummary
        ariaLabel="Entitlement register"
        icon="group"
        label="All groups"
        value={stats.total}
        caption="entitlement register"
        facts={[
          { k: 'Members', v: stats.members },
          { k: 'Privileged', v: stats.privileged },
        ]}
        segments={kindSegments}
        active={kind}
        allId="All"
        onSelect={setKind}
      />

      <DataWorkbench
        id="groups-register"
        rows={visible}
        columns={columns}
        selectable
        searchPlaceholder="Search by group name, description, application or owner…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={(r) => navigate(`${BASE_PATH}/${r.id}`)}
        emptyTitle="No groups match"
        emptyBody="Clear the search or the kind filter, or add the first group for this register."
        emptyIcon="group"
        footNote={'Membership reconciled against every target application each six hours'}
        pageSize={25}
      />

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
