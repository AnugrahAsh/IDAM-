import { useEffect, useMemo, useRef, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import AppLogo from '../../components/primitives/AppLogo'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { ConnectionFields, OperationChecks } from '../applications/facetControls'
import TestResult from '../applications/TestResult'
import { OPERATION_SPECS, probeConnection } from '../applications/appModel'
import { brandForConnector } from '../shared/provisioning/shared'
import {
  BASE, LDAP_APP_OPTIONS, MATCH_KEYS, SYNC_SCHEDULES, blankDraft, canSync, categoryOf, configIssues, draftOf,
  infoErrors, isTracked, lastSyncOf, ldapAppById, ouOptionsFor, statusOf, systemNameFrom, toSystemName,
} from './federationData'

const TABS = [
  { id: 'info', label: 'Application Information', icon: 'file' },
  { id: 'config', label: 'Application Configuration', icon: 'sliders' },
]

/* A value the connector decides. It reads as a field, so the form still shows
   everything the application carries, but it cannot be edited here. */
function Locked({ id, value }) {
  return (
    <span className="fed-locked">
      <TextInput id={id} value={value} readOnly />
      <Icon name="lock" size={12} />
    </span>
  )
}

/* ---------------------------------------------------------------------------
   The setup form, and the same form on an existing federated application.

   Two tabs, as the platform's own form has: what the application is and where
   its users land, then how the connector reaches it. Tabs move freely; a new
   application is checked tab by tab on Continue and in full on Create, and a
   tab that still has something to fix says how many.
   ------------------------------------------------------------------------- */
export default function FederationForm({
  mode, hub, record, rows, onCreate, onSave, onCancel, onDelete, onSync,
}) {
  const { toast, confirm, navigate } = useApp()
  const editing = mode === 'edit'
  const [initial] = useState(() => (editing ? draftOf(record) : blankDraft(hub.id)))
  const [d, setD] = useState(initial)
  const [tab, setTab] = useState('info')
  const [attempted, setAttempted] = useState(() => new Set())
  // A system name typed by hand is the operator's; until then it follows the
  // display name, the way every other register in the console fills it.
  const [nameTouched, setNameTouched] = useState(editing)
  const [probe, setProbe] = useState(null)
  const [testing, setTesting] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const tracked = isTracked(hub.id)
  const category = categoryOf(hub.category)
  const directory = ldapAppById(d.ldapAppId)
  const ouOptions = useMemo(() => ouOptionsFor(directory), [directory])

  const errors = useMemo(() => infoErrors(d, rows, editing ? record.id : null), [d, rows, editing, record])
  const connIssues = useMemo(() => configIssues(d), [d])
  const infoCount = Object.keys(errors).length
  const showInfo = attempted.has('info')
  const showConfig = attempted.has('config')
  const dirty = JSON.stringify(d) !== JSON.stringify(initial)

  const setDisplayName = (v) => setD((x) => ({ ...x, displayName: v, name: nameTouched ? x.name : systemNameFrom(v) }))
  const setName = (v) => { setNameTouched(true); set({ name: toSystemName(v) }) }

  /* A unit belongs to one directory, so changing the directory clears it —
     unless the new directory holds the same unit. */
  const pickDirectory = (id) => {
    const next = ldapAppById(id)
    const keep = !!next && ouOptionsFor(next).some((o) => o.value === d.ouDn)
    set({ ldapAppId: id, ouDn: keep ? d.ouDn : '' })
  }

  const setConnection = (patch) => {
    set({ connection: { ...d.connection, ...patch } })
    setProbe(null)
  }

  const runTest = () => {
    if (testing) return
    setTesting(true)
    setProbe(null)
    timer.current = setTimeout(() => {
      setTesting(false)
      setProbe(probeConnection(hub.id, d.connection))
    }, 850)
  }

  const warnInfo = () => toast('warn', 'Application Information incomplete',
    `${infoCount} ${infoCount === 1 ? 'field needs' : 'fields need'} attention on this tab.`)

  const toConfig = () => {
    setAttempted((a) => new Set([...a, 'info']))
    if (infoCount) { warnInfo(); return }
    setTab('config')
  }

  const submit = () => {
    setAttempted(new Set(['info', 'config']))
    if (infoCount) { setTab('info'); warnInfo(); return }
    if (connIssues.length) {
      setTab('config')
      toast('warn', 'Application Configuration incomplete', connIssues[0])
      return
    }
    if (editing) onSave(record.id, d)
    else onCreate(d)
  }

  const cancel = () => {
    if (!dirty) { onCancel(); return }
    confirm({
      title: 'Discard this application?',
      body: 'Nothing has been created yet. The details entered on this form are lost.',
      confirmLabel: 'Discard',
      onConfirm: onCancel,
    })
  }

  /* On an existing application the form stays open: discarding returns it to
     the saved settings rather than leaving the record. */
  const discard = () => confirm({
    title: 'Discard your changes?',
    body: 'The form returns to the saved settings. The federated application is not changed.',
    confirmLabel: 'Discard changes',
    onConfirm: () => {
      setD(initial)
      setAttempted(new Set())
      setProbe(null)
    },
  })

  const tabs = TABS.map((t) => {
    const n = t.id === 'info' ? (showInfo ? infoCount : 0) : (showConfig ? connIssues.length : 0)
    return n ? { ...t, icon: 'warn', tone: 'bad', badge: `${n} to fix`, badgeTone: 'bad' } : t
  })

  const status = editing ? statusOf(record) : null
  const sync = editing ? lastSyncOf(record) : null
  const title = d.displayName.trim() || (editing ? record.displayName : `New ${hub.name} application`)

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="External User Federation"
        eyebrow={editing ? 'Federated application' : 'New federated application'}
        title={title}
        sub={editing ? record.description || hub.description : hub.description}
        media={(
          <span className="tile-logo">
            <AppLogo brand={brandForConnector(hub.id)} name={hub.name} size={56} />
          </span>
        )}
        badges={(
          <>
            {editing ? <Pill tone={status.tone} dot>{status.label}</Pill> : <Pill tone="acc" dot>Draft</Pill>}
            <Tag tone="acc">{category.tag}</Tag>
          </>
        )}
        meta={(
          <>
            <Fact icon="plug" label="Connector" value={hub.name} />
            <Fact icon="provision" label="Provision method" value={hub.method} />
            {hub.dbType && <Fact icon="db" label="Database type" value={hub.dbType} />}
            <Fact icon="directory" label="LDAP application" value={directory ? directory.displayName : 'Not chosen'} />
            {editing && <Fact icon="users" label="Users" value={num(record.users)} />}
            {editing && <Fact icon="refresh" label="Last sync" value={sync.rel} title={sync.at} />}
          </>
        )}
        actions={editing ? (
          <>
            {canSync(record) && <Button icon="refresh" onClick={() => onSync(record)}>Sync now</Button>}
            <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>
          </>
        ) : (
          <Button icon="swap" onClick={() => navigate(`${BASE}/new`)}>Change connector</Button>
        )}
        tabs={<Tabs value={tab} onChange={setTab} tabs={tabs} />}
      />

      <div className="detail-body">
        <div className="stack">
          {editing && record.lastError && (
            <Banner tone={record.status === 'Failed' ? 'bad' : 'warn'}>
              <b>{record.status === 'Failed' ? 'The last sync failed.' : 'The last sync completed with errors.'}</b> {record.lastError}
            </Banner>
          )}

          {tab === 'info' && (
            <>
              <Card title="Application details" sub="How this application is named in the register, in run history and in the audit trail.">
                <div className="grid grid-2">
                  <Field
                    label="Application Name"
                    required
                    htmlFor="fed-name"
                    hint={nameTouched ? 'Uppercase letters, digits and underscores.' : 'Filled in from the display name until you edit it.'}
                    error={showInfo ? errors.name : undefined}
                  >
                    <TextInput
                      id="fed-name"
                      className="mono"
                      value={d.name}
                      placeholder="HR_DATABASE"
                      autoComplete="off"
                      spellCheck="false"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field label="Display Name" required htmlFor="fed-display" error={showInfo ? errors.displayName : undefined}>
                    <TextInput
                      id="fed-display"
                      value={d.displayName}
                      placeholder="HR Database"
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </Field>
                  <Field label="Description" span={2} htmlFor="fed-desc">
                    <TextInput
                      as="textarea"
                      id="fed-desc"
                      rows={2}
                      value={d.description}
                      placeholder="Whose users this application holds, and why they are federated."
                      onChange={(e) => set({ description: e.target.value })}
                    />
                  </Field>
                  <Field label="Provision Method" required htmlFor="fed-method" hint="Set by the connector chosen in the Connector Hub.">
                    <Locked id="fed-method" value={hub.method} />
                  </Field>
                  {hub.dbType && (
                    <Field label="Database Type" required htmlFor="fed-dbtype" hint={`Fixed by the ${hub.name} connector.`}>
                      <Locked id="fed-dbtype" value={hub.dbType} />
                    </Field>
                  )}
                </div>
              </Card>

              <Card
                title="Directory placement"
                sub="The LDAP application federated users are written into, and the organizational unit they are created in."
              >
                <div className="grid grid-2">
                  <Field
                    label="LDAP Application"
                    required
                    htmlFor="fed-ldap"
                    hint="Directories are managed under LDAP Applications."
                    error={showInfo ? errors.ldapAppId : undefined}
                  >
                    <Select
                      id="fed-ldap"
                      value={d.ldapAppId}
                      placeholder="Select an LDAP application"
                      options={LDAP_APP_OPTIONS}
                      onChange={(e) => pickDirectory(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Organizational Unit"
                    required
                    htmlFor="fed-ou"
                    hint={directory
                      ? `${ouOptions.length} units read from ${directory.displayName}.`
                      : 'Offered once an LDAP application is chosen.'}
                    error={showInfo ? errors.ouDn : undefined}
                  >
                    <SearchSelect
                      id="fed-ou"
                      value={d.ouDn}
                      options={ouOptions}
                      disabled={!directory}
                      placeholder={directory ? 'Select an organizational unit' : 'Choose an LDAP application first'}
                      searchPlaceholder="Search organizational units…"
                      emptyLabel="No organizational units match"
                      onChange={(e) => set({ ouDn: e.target.value })}
                    />
                  </Field>
                </div>
                {directory && directory.status !== 'Healthy' && (
                  <div className="fed-note">
                    <Banner tone={directory.status === 'Failed' ? 'bad' : 'warn'}>
                      <b>{directory.displayName} is {directory.status === 'Failed' ? 'failing' : 'degraded'}.</b>{' '}
                      {directory.lastError}. Federated users are queued until the directory recovers.
                    </Banner>
                  </div>
                )}
              </Card>

              <Card
                title="Configuration"
                sub="What this application may do with the users it federates. An operation that is not ticked is never attempted."
              >
                {tracked ? (
                  <Banner tone="info">
                    No Provisioning keeps a record of where this application&apos;s users live without writing to it, so
                    there are no operations to configure.
                  </Banner>
                ) : (
                  <OperationChecks
                    value={d.operations}
                    onChange={(next) => set({ operations: next })}
                    specs={OPERATION_SPECS}
                    idPrefix="fed-op"
                    disabledIds={['create']}
                  />
                )}
              </Card>
            </>
          )}

          {tab === 'config' && (
            <>
              <Card
                title="Connection settings"
                sub={tracked ? 'No Provisioning has no endpoint to connect to.' : `${hub.name} · only the fields this connector needs`}
              >
                <ConnectionFields
                  connector={hub.id}
                  value={d.connection}
                  onChange={setConnection}
                  showErrors={showConfig}
                  idPrefix="fed-conn"
                  ctx={{ operations: d.operations }}
                />
              </Card>

              {!tracked && (
                <Card
                  title="Connection test"
                  sub={editing ? 'Runs read-only checks against the saved or edited settings.' : 'Recommended before the application is created. A failed test does not block it.'}
                  actions={(
                    <Button size="sm" variant="pri" icon={testing ? 'clock' : 'target'} disabled={testing} onClick={runTest}>
                      {testing ? 'Testing…' : 'Test connection'}
                    </Button>
                  )}
                >
                  <TestResult probe={probe} testing={testing} />
                </Card>
              )}

              {!tracked && (
                <Card
                  title="Synchronization"
                  sub="How often users are read from the source, and how a federated user is matched to one the directory already holds."
                >
                  <div className="grid grid-2">
                    <Field label="Sync schedule" htmlFor="fed-schedule" hint="Manual only syncs when someone runs it from the register.">
                      <Select id="fed-schedule" value={d.schedule} options={SYNC_SCHEDULES} onChange={(e) => set({ schedule: e.target.value })} />
                    </Field>
                    <Field label="Match existing users on" htmlFor="fed-match" hint="How Update for existing user finds the account to adopt.">
                      <Select id="fed-match" value={d.matchKey} options={MATCH_KEYS} onChange={(e) => set({ matchKey: e.target.value })} />
                    </Field>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        {editing ? (
          <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No unsaved changes'}>
            <Button disabled={!dirty} onClick={discard}>Discard</Button>
            <Button variant="pri" icon="save" disabled={!dirty} onClick={submit}>Save changes</Button>
          </StickyActions>
        ) : (
          <StickyActions
            dirty={dirty}
            message={tab === 'info' ? 'Step 1 of 2 · Application Information' : 'Step 2 of 2 · Application Configuration'}
          >
            <Button onClick={cancel}>Cancel</Button>
            {tab === 'config' && <Button icon="chevL" onClick={() => setTab('info')}>Back</Button>}
            {tab === 'info'
              ? <Button variant="pri" iconRight="chevR" onClick={toConfig}>Continue</Button>
              : <Button variant="pri" icon="save" onClick={submit}>Create application</Button>}
          </StickyActions>
        )}
      </div>
    </>
  )
}
