import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Meter from '../../components/primitives/Meter'
import EmptyState from '../../components/primitives/EmptyState'
import Menu from '../../components/primitives/Menu'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { CONSENT_RECORDS, AUDIENCES, stamp } from '../shared/comms/commsData'
import './ConsentsPage.css'
import ConsentDetail from './ConsentDetail'
import { ConsentInitiativeModal, ImportInitiationForm } from './InitiateForm'
import MapUsersForm from './MapUsersForm'

const blank = () => ({
  id: null, code: '', name: '', version: 'v1.0', mandatory: true, status: 'Draft',
  accepted: 0, pending: 0, effective: stamp(0), owner: 'Legal',
  body: '', attributes: ['username', 'timestamp', 'ipAddress'], audience: 'All users',
  description: '', consentType: 'OPTIONAL', purpose: '', processingActivity: '',
  dataCategories: [], dataAttributes: [], validityPeriod: '', validityUnit: 'Months',
  allowWithdrawal: false, allowEvidenceDownload: true, allowViewConsent: true,
})

export default function ConsentsPage({ segments = [], embedded, templates = [], rows, setRows, mapped, setMapped }) {
  const { navigate, toast, confirm, setDrawer } = useApp()
  const [initiative, setInitiative] = useState(null)
  const [initMenu, setInitMenu] = useState(null)

  const submitInitiative = (form, consent) => {
    setRows((rs) => rs.map((r) => (r.id === consent.id
      ? { ...r, pending: r.pending + 1, status: r.status === 'Draft' ? 'Active' : r.status }
      : r)))
    if (initiative && initiative.clear) initiative.clear()
    setInitiative(null)
    toast('ok', 'Consent initiated', `${form.firstName} ${form.lastName} (${form.email}) is asked to accept ${consent.name}.`)
  }

  // One Initiate control everywhere: a single person through the User Consent
  // Initiative form, or a CSV of requests through Bulk Initiate.
  const openInitMenu = (e, targets, clear) => setInitMenu({
    anchor: e.currentTarget,
    items: [
      { id: 'init', label: 'Initiate', icon: 'user', onSelect: () => setInitiative({ preselect: targets.length === 1 ? targets[0] : null, clear }) },
      { id: 'bulk', label: 'Bulk Initiate', icon: 'users', onSelect: () => openInitiate(targets, clear) },
    ],
  })

  const overlays = (
    <>
      {initMenu && <Menu anchor={initMenu.anchor} items={initMenu.items} onClose={() => setInitMenu(null)} />}
      {initiative && (
        <ConsentInitiativeModal
          consents={rows}
          preselect={initiative.preselect}
          onSubmit={submitInitiative}
          onClose={() => setInitiative(null)}
        />
      )}
    </>
  )

  // Bulk Initiate imports one consent request per CSV row; each row adds to its
  // consent's pending count, as a single initiation does.
  const openInitiate = (targets, clear) => setDrawer({
    title: 'Import Consent Initiation',
    size: 'lg',
    children: (
      <ImportInitiationForm
        consents={rows}
        sampleCode={(targets[0] || rows[0] || {}).code || 'CONSENT_CODE'}
        onCancel={() => setDrawer(null)}
        onImport={(valid, skipped) => {
          const counts = valid.reduce((m, r) => m.set(r.consent.id, (m.get(r.consent.id) || 0) + 1), new Map())
          setRows((rs) => rs.map((r) => (counts.has(r.id)
            ? { ...r, pending: r.pending + counts.get(r.id), status: r.status === 'Draft' ? 'Active' : r.status }
            : r)))
          setDrawer(null)
          if (clear) clear()
          toast(
            'ok',
            'Consent initiation imported',
            `${num(valid.length)} ${valid.length === 1 ? 'request' : 'requests'} initiated${skipped ? ` · ${num(skipped)} ${skipped === 1 ? 'row' : 'rows'} skipped` : ''}.`,
          )
        }}
      />
    ),
  })

  const openMapUsers = (row, mode) => {
    const held = mapped[row.id] || []
    const ref = { current: mode === 'add' ? [] : held.slice() }

    const render = () => setDrawer({
      title: mode === 'add' ? `Map users to ${row.name}` : `Remove users from ${row.name}`,
      sub: mode === 'add'
        ? 'Mapped identities are in scope for this consent whatever the audience rule says.'
        : 'Removing an identity takes it out of scope. Acceptance records already captured are retained as evidence.',
      children: (
        <MapUsersForm
          mode={mode}
          held={held}
          value={ref.current}
          onChange={(next) => { ref.current = next; render() }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant={mode === 'add' ? 'pri' : 'danger-solid'}
            icon={mode === 'add' ? 'plus' : 'minus'}
            disabled={ref.current.length === 0}
            onClick={() => {
              const picked = ref.current
              setMapped((m) => ({
                ...m,
                [row.id]: mode === 'add'
                  ? [...new Set([...(m[row.id] || []), ...picked])]
                  : (m[row.id] || []).filter((id) => !picked.includes(id)),
              }))
              setRows((rs) => rs.map((r) => (r.id === row.id
                ? { ...r, pending: Math.max(0, r.pending + (mode === 'add' ? picked.length : -picked.length)) }
                : r)))
              setDrawer(null)
              toast(
                'ok',
                mode === 'add' ? 'Users mapped' : 'Users removed',
                `${num(picked.length)} ${picked.length === 1 ? 'identity' : 'identities'} ${mode === 'add' ? 'mapped to' : 'removed from'} ${row.name}.`,
              )
            }}
          >
            {mode === 'add' ? `Map ${num(ref.current.length)}` : `Remove ${num(ref.current.length)}`}
          </Button>
        </>
      ),
    })

    render()
  }

  const mode = segments[0]
  const record = useMemo(
    () => (mode && mode !== 'add' ? rows.find((r) => String(r.id) === String(mode)) : null),
    [mode, rows],
  )

  if (mode === 'add') {
    return (
      <ConsentDetail
        record={blank()}
        templates={templates}
        onCancel={() => navigate('/iam/consent')}
        onDelete={() => {}}
        onSave={(v) => {
          setRows((rs) => [...rs, { ...v, id: rs.reduce((m, r) => Math.max(m, r.id), 0) + 1 }])
          toast('ok', 'Consent created', v.name)
          navigate('/iam/consent')
        }}
      />
    )
  }

  if (mode) {
    if (!record) {
      return (
        <>
          <PageBar title="Consent not found" crumbs={[{ label: 'Consents', to: 'consent' }, { label: 'Not found' }]} />
          <Card><EmptyState icon="consent" title="No such consent" body={`Consent ${mode} does not exist.`} actions={<Button variant="pri" onClick={() => navigate('/iam/consent')}>Back to consents</Button>} /></Card>
        </>
      )
    }
    return (
      <>
      <ConsentDetail
        record={record}
        templates={templates}
        onInitiateMenu={(e) => openInitMenu(e, [record])}
        onCancel={() => navigate('/iam/consent')}
        onSave={(v) => { setRows((rs) => rs.map((r) => (r.id === v.id ? v : r))); toast('ok', 'Consent saved', v.name); navigate('/iam/consent') }}
        onDelete={(r) => confirm({
          title: `Delete ${r.name}?`,
          body: 'Existing acceptance records are retained for evidence, but the consent stops being captured.',
          confirmLabel: 'Delete consent',
          onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Consent deleted', r.name); navigate('/iam/consent') },
        })}
      />
      {overlays}
      </>
    )
  }

  const columns = [
    serialColumn('S.No'),
    { key: 'code', label: 'Consent code', cls: 'td-main td-mono', locked: true, render: (r) => <span className="link" onClick={() => navigate(`/iam/consent/${r.id}`)}>{r.code}</span> },
    { key: 'name', label: 'Consent name' },
    { key: 'version', label: 'Version', cls: 'td-mono', render: (r) => <Tag>{r.version}</Tag> },
    { key: 'mandatory', label: 'Mandatory', render: (r) => (r.mandatory ? <Pill tone="warn">Mandatory</Pill> : <span className="t-faint">Optional</span>) },
    { key: 'accepted', label: 'Accepted', align: 'right', render: (r) => num(r.accepted) },
    { key: 'pending', label: 'Pending', align: 'right', render: (r) => (r.pending > 0 ? <span style={{ color: 'var(--warn)', fontWeight: 600 }}>{num(r.pending)}</span> : '0') },
    {
      key: 'rate', label: 'Acceptance', align: 'right', sortable: false,
      value: (r) => Math.round((r.accepted / ((r.accepted + r.pending) || 1)) * 100),
      render: (r) => {
        const pct = Math.round((r.accepted / ((r.accepted + r.pending) || 1)) * 100)
        return (
          <span className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <span style={{ width: 52 }}><Meter value={pct} tone={pct > 90 ? 'ok' : pct > 70 ? 'warn' : 'bad'} /></span>
            {pct}%
          </span>
        )
      },
    },
    {
      key: 'mapped', label: 'Mapped users', align: 'right',
      value: (r) => (mapped[r.id] || []).length,
      render: (r) => ((mapped[r.id] || []).length
        ? <Tag tone="acc">{num((mapped[r.id] || []).length)} mapped</Tag>
        : <span className="t-faint">Audience only</span>),
    },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill> },
    { key: 'effective', label: 'Effective', cls: 'td-mono' },
  ]

  return (
    <>
      {!embedded && (
      <PageBar
        title="Consents"
        sub="The notices identities must accept, what each one captures, and how far acceptance has spread."
        crumbs={[{ label: 'Consents' }]}
        actions={
          <>
            <Button icon="sliders" onClick={() => navigate('/iam/consent/rules')}>Assignment Rules</Button>
            <Button icon="bell" iconRight="chevD" onClick={(e) => openInitMenu(e, rows.filter((r) => r.status === 'Active'))}>Initiate</Button>
            <Button variant="pri" icon="plus" onClick={() => navigate('/iam/consent/add')}>Add</Button>
          </>
        }
      />
      )}

      <StatCards
        items={[
          { key: 'total', icon: 'consent', label: 'Consents', value: rows.length, chip: `${rows.filter((r) => r.mandatory).length} mandatory`, sub: 'published to identities' },
          { key: 'accepted', icon: 'checkC', label: 'Accepted', value: rows.reduce((a, r) => a + r.accepted, 0), chip: 'on record', chipTone: 'ok', sub: 'agreements captured' },
          { key: 'pending', icon: 'clock', label: 'Pending', value: rows.reduce((a, r) => a + r.pending, 0), chip: 'awaiting a decision', chipTone: 'warn', sub: 'shown at next sign-in' },
          { key: 'mandatory', icon: 'warn', label: 'Mandatory', value: rows.filter((r) => r.mandatory).length, chip: 'blocking', sub: 'cannot be skipped' },
        ]}
        label="Consent summary"
      />

      <DataWorkbench
        id="consents"
        rows={rows}
        columns={columns}
        selectable
        searchPlaceholder="Search by code, name or owner…"
        onRowClick={(r) => navigate(`/iam/consent/${r.id}`)}
        toolbar={
          <>
            <Button
              size="sm"
              variant="pri"
              icon="bell"
              iconRight="chevD"
              onClick={(e) => openInitMenu(e, rows.filter((r) => r.status === 'Active'))}
            >
              Initiate
            </Button>
            <Button size="sm" icon="plus" onClick={() => navigate('/iam/consent/add')}>Add consent</Button>
            <Button size="sm" icon="sliders" onClick={() => navigate('/iam/consent/rules')}>Assignment Rules</Button>
          </>
        }
        bulkActions={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="pri"
              icon="bell"
              iconRight="chevD"
              onClick={(e) => openInitMenu(e, rows.filter((r) => ids.map(String).includes(String(r.id))), clear)}
            >
              Initiate
            </Button>
            <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Consent definitions exported.')}>Export</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'view', label: 'View', icon: 'eye', onSelect: () => navigate(`/iam/consent/${r.id}`) },
          { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(`/iam/consent/${r.id}`) },
          { id: 'init', label: 'Initiate', icon: 'bell', onSelect: () => setInitiative({ preselect: r }) },
          { id: 'bulk', label: 'Bulk Initiate', icon: 'users', onSelect: () => openInitiate([r]) },
          { divider: true },
          { id: 'map', label: 'Map users', icon: 'users', onSelect: () => openMapUsers(r, 'add') },
          {
            id: 'unmap',
            label: 'Remove users',
            icon: 'minus',
            disabled: !(mapped[r.id] || []).length,
            onSelect: () => openMapUsers(r, 'remove'),
          },
          { id: 'records', label: 'View records', icon: 'file', onSelect: () => navigate('/iam/consent/records') },
          { divider: true },
          {
            id: 'del', label: 'Delete', icon: 'trash', danger: true,
            onSelect: () => confirm({
              title: `Delete ${r.name}?`,
              body: 'Acceptance records are retained for evidence, but the consent stops being captured.',
              confirmLabel: 'Delete consent',
              onConfirm: () => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('ok', 'Consent deleted', r.name) },
            }),
          },
        ]}
        emptyTitle="No consents"
        emptyBody="Define a consent so the platform can capture lawful basis at sign-in."
        emptyIcon="consent"
      />
      {overlays}
    </>
  )
}
