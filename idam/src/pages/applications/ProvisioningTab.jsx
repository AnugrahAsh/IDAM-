import { useEffect, useMemo, useRef, useState } from 'react'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Check from '../../components/primitives/Check'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { IDAM_ATTRS, connectorOptionLabel } from '../shared/provisioning/shared'
import TestResult from './TestResult'
import { AuthExtraFields, ConnectionFields, OperationChecks, UniqueAttributeFields } from './facetControls'
import CustomApiFields from './customApiFields'
import {
  AUTH_BEARER_TYPE, BEARER_DYNAMIC, CONNECTORS, EXTRA_OPERATION_SPECS, MAPPING_TRANSFORMS, OPERATION_SPECS, REST_API_CONNECTOR,
  blankConnection, blankOperations, connectionEndpoint, connectionIssues,
  defaultUniqueAttribute, isCustomApiConnector, withLeaverChoice, kindOf, operationIssues, probeConnection, provMappingsFor,
  targetAttrsFor, uniqueAttributeIssues, uniqueTargetFor,
} from './appModel'

// ---------------------------------------------------------------------------
// Connection settings — connector-specific fields, minimal mandatory set.
// ---------------------------------------------------------------------------

// The draft lives one level up in ProvisioningBody so a single action bar can
// sit at the foot of the whole tab; this part only renders the form.
function ConnectionSettings({ app, draft, setDraft, setProbe, probe, testing, runTest }) {
  const facet = app.provisioning

  const changeConnector = (id) => {
    const next = CONNECTORS[id]
    setDraft((d) => {
      const blank = blankConnection(id)
      Object.keys(blank).forEach((k) => {
        if (d.connection[k] !== undefined && d.connection[k] !== '') blank[k] = d.connection[k]
      })
      return { ...d, connector: id, method: next ? next.name : d.method, connection: blank }
    })
    setProbe(null)
  }

  const customApi = isCustomApiConnector(draft.connector)
  const patchConnection = (patch) => setDraft((d) => ({ ...d, connection: { ...d.connection, ...patch } }))
  /* The REST API connector authenticates exactly as Custom API does: a
     dynamic bearer needs the same extra-parameters table Custom API offers
     beside its own Authorization field. */
  const restDynamicBearer = draft.connector === REST_API_CONNECTOR
    && draft.connection.authType === AUTH_BEARER_TYPE && draft.connection.authMethod === BEARER_DYNAMIC

  return (
    <div className="detail-cols">
      <div className="stack">
        {/* The HTTP connectors are the whole of their family, so the kind is
            only worth repeating for a database, a directory or a cloud target. */}
        <Card
          title="Connection settings"
          sub={`${draft.method}${kindOf(draft.connector) === 'Custom' ? '' : ` · ${kindOf(draft.connector)}`} connector — the fields below match the selected connector type.`}
        >
          <div className="grid grid-2" style={{ marginBottom: 14 }}>
            <Field label="Connector type" htmlFor="pv-type" hint="Changing the type swaps the connection fields to match.">
              <Select
                id="pv-type"
                value={draft.connector}
                options={Object.values(CONNECTORS).map((c) => ({ value: c.id, label: connectorOptionLabel(c) }))}
                onChange={(e) => changeConnector(e.target.value)}
              />
            </Field>
          </div>
          {customApi ? (
            /* The Custom API connector draws its own form: the lifecycle
               sections carry their attribute mappings, the error keywords sit
               under the response keys they are matched against. */
            <CustomApiFields
              connector={draft.connector}
              value={draft.connection}
              onChange={patchConnection}
              showErrors
              idPrefix="pv-conn"
              ctx={{ operations: draft.operations }}
            />
          ) : (
            <ConnectionFields
              connector={draft.connector}
              value={draft.connection}
              onChange={patchConnection}
              showErrors
              idPrefix="pv-conn"
              ctx={{ operations: draft.operations }}
              after={restDynamicBearer ? {
                authorization: (
                  <div className="capi-block" key="ax">
                    <AuthExtraFields
                      rows={draft.connection.authExtras || []}
                      onChange={(next) => patchConnection({ authExtras: next })}
                      idPrefix="pv-conn-ax"
                    />
                  </div>
                ),
              } : undefined}
            />
          )}
        </Card>

        <OperationCard draft={draft} setDraft={setDraft} />

        <Card
          title="Connection test"
          sub="Runs against the values currently in this form, not the saved configuration."
          actions={
            <Button size="sm" variant="pri" icon={testing ? 'clock' : 'target'} disabled={testing} onClick={runTest}>
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
          }
        >
          <TestResult probe={probe} testing={testing} />
        </Card>
      </div>

      <div className="stack">
        <Card title="Record">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Endpoint', v: <span className="mono t-xs">{connectionEndpoint(draft.connector, draft.connection)}</span>, icon: 'server' },
              { k: 'Connector', v: draft.method, icon: 'swap' },
              { k: 'Status', node: <Pill tone={facet.status === 'Failed' ? 'bad' : facet.status === 'Degraded' ? 'warn' : 'ok'} dot>{facet.status}</Pill>, icon: 'activity' },
              { k: 'Accounts managed', v: num(facet.accounts), icon: 'users' },
              { k: 'Last sync', v: facet.lastSync, icon: 'history' },
            ]}
          />
        </Card>
        <Banner tone="info">
          Only the core connection fields are mandatory. Page sizes and retry backoff are managed by the platform; the
          request timeout is on the form because it is a property of the target, not of the platform.
        </Banner>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Operation configuration (client item 11) — the same checks the Add
// Application wizard asks for, kept editable on the record afterwards.
// ---------------------------------------------------------------------------

function OperationCard({ draft, setDraft }) {
  const ops = draft.operations || blankOperations()
  const issues = operationIssues(ops)
  const setOps = (next) => setDraft((d) => ({ ...d, operations: withLeaverChoice(d.operations, next) }))
  return (
    <Card
      title="Operation configuration"
      sub="What this connector is allowed to do on the target. An operation that is not ticked is never attempted, whatever a mapping says."
    >
      <OperationChecks value={ops} onChange={setOps} specs={OPERATION_SPECS} idPrefix="pv-op" />
      <div className="section-head" style={{ margin: '18px 0 8px' }}>
        <span className="section-title">Lifecycle behaviour</span>
        <span className="section-sub">Applied on top of the operations above.</span>
      </div>
      <OperationChecks value={ops} onChange={setOps} specs={EXTRA_OPERATION_SPECS} idPrefix="pv-xop" />
      {issues.length > 0 && (
        <div style={{ marginTop: 14 }}><Banner tone="warn">{issues[0]}</Banner></div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Attribute mapping.
//
// Every row carries four decisions: Not Null refuses a run that would write an
// empty value, Update decides whether an existing account is overwritten
// (item 9), and Manual takes the attribute out of the connector's hands and
// hands the target name to the operator (items 8 and 10).
//
// The table is fixed-layout with an explicit colgroup so the inline editor row
// occupies exactly the same columns as the rows above it — the auto-layout
// version reflowed every column the moment Add mapping was pressed (item 5).
// ---------------------------------------------------------------------------

const MAP_COLS = [
  // The row number is what an operator and an integrator quote at each other
  // when they are looking at the same mapping down a phone line.
  { key: 'sno', label: 'S.No', width: 56 },
  { key: 'idam', label: 'Application attribute', width: 200 },
  { key: 'target', label: 'Target application attribute', width: 240 },
  { key: 'transform', label: 'Value format', width: 140 },
  { key: 'mandatory', label: 'Mandatory', width: 88 },
  { key: 'notNull', label: 'Not Null', width: 84 },
  { key: 'update', label: 'Update', width: 84 },
  { key: 'manual', label: 'Manual input', width: 96 },
  { key: 'act', label: '', width: 80 },
]

// SCIM and directory attribute names are case-insensitive.
const targetKey = (t) => String(t || '').trim().toLowerCase()

function MaxGroupsControl({ value, onChange }) {
  const n = Number(value) || 0
  return (
    <span className="map-max">
      <label className="map-max-l" htmlFor="pv-maxgroups">Max application groups allowed</label>
      <TextInput
        id="pv-maxgroups"
        type="number"
        min="0"
        max="99"
        value={n}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Math.floor(Number(e.target.value) || 0))))}
      />
      <span className="t-xs t-mut">
        {n > 0 ? `Requests past ${n} ${n === 1 ? 'group' : 'groups'} are refused at approval` : 'Zero means no limit'}
      </span>
    </span>
  )
}

function MappingTable({ app, onPatch, maxGroups, onMaxGroups }) {
  const { toast, confirm } = useApp()
  // Mappings live on the application record, so the row flags survive a tab
  // change instead of resetting with component state.
  const rows = app.provisioning.mappings || provMappingsFor(app.provisioning.connector)
  const connector = app.provisioning.connector
  // Both sides of the account key live on the facet. A record written before
  // the target side existed falls back to the mapping the IDAM side points at,
  // so it reads correctly without being rewritten on load.
  const unique = app.provisioning.uniqueAttribute == null
    ? defaultUniqueAttribute(rows)
    : app.provisioning.uniqueAttribute
  const uniqueTarget = app.provisioning.uniqueTargetAttribute == null
    ? uniqueTargetFor(rows, unique)
    : app.provisioning.uniqueTargetAttribute
  const setRows = (next) => onPatch(app.id, (r) => ({
    provisioning: { ...r.provisioning, mappings: typeof next === 'function' ? next(rows) : next },
  }))
  const setUniquePair = (patch) => onPatch(app.id, (r) => ({ provisioning: { ...r.provisioning, ...patch } }))
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const scrollRef = useRef(null)

  // The new-row editor is appended below the fold of the scroll box.
  useEffect(() => {
    if (editing === 'new' && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [editing])

  const targets = useMemo(() => targetAttrsFor(connector, rows), [connector, rows])
  const used = new Set(rows.map((r) => r.idam))
  const available = IDAM_ATTRS.filter((a) => !used.has(a.value))
  // An attribute may be mapped once. Offering the ones already spoken for made
  // it possible to commit a second row for the same attribute, and the second
  // row silently won at run time.
  const idamOptions = useMemo(() => {
    const taken = new Set(rows.filter((r) => r.id !== editing).map((r) => r.idam))
    return IDAM_ATTRS.filter((a) => !taken.has(a.value) || (draft && a.value === draft.idam))
  }, [rows, editing, draft])

  // A target attribute is written by one row only.
  const targetOptions = useMemo(() => {
    const taken = new Set(rows.filter((r) => r.id !== editing).map((r) => targetKey(r.target)))
    return targets.filter((t) => !taken.has(targetKey(t)))
  }, [rows, editing, targets])

  const uniqueIssue = uniqueAttributeIssues(rows, unique, uniqueTarget)[0] || null

  const startAdd = () => {
    const first = available[0]
    // Both guards below are also expressed on the Add button, but the button is
    // not the only way in — a keyboard activation on a stale render reaches here.
    if (!first) {
      toast('warn', 'Nothing left to map', 'Every IDAM attribute already has a row. Edit or delete one to change it.')
      return
    }
    if (editing !== null) {
      toast('warn', 'Finish the open row first', 'Save or cancel the mapping you are editing before adding another.')
      return
    }
    setEditing('new')
    setDraft({
      id: 'new',
      idam: first.value,
      target: '',
      transform: 'Direct',
      notNull: false,
      update: true,
      manual: false,
    })
  }

  const cancel = () => { setEditing(null); setDraft(null) }

  const commit = () => {
    if (!String(draft.target || '').trim()) {
      toast('warn', 'Target attribute required', 'Choose a target attribute, or tick Manual and type one.')
      return
    }
    if (rows.some((r) => r.id !== editing && r.idam === draft.idam)) {
      toast('warn', 'Attribute already mapped', `${draft.idam} already has a row. Edit that row instead of adding a second one.`)
      return
    }
    const clash = rows.find((r) => r.id !== editing && targetKey(r.target) === targetKey(draft.target))
    if (clash) {
      toast('warn', 'Target attribute already mapped', `${draft.target.trim()} is already mapped from ${clash.idam}. A target attribute can be mapped only once.`)
      return
    }
    const attr = IDAM_ATTRS.find((a) => a.value === draft.idam)
    if (editing === 'new') {
      setRows((rs) => [...rs, {
        ...draft,
        id: rs.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
        label: attr ? attr.label.split(' · ')[0] : draft.idam,
        target: draft.target.trim(),
      }])
      toast('ok', 'Mapping added', `${draft.idam} now writes to ${draft.target.trim()}.`)
    } else {
      setRows((rs) => rs.map((r) => (r.id === editing
        ? { ...r, ...draft, label: attr ? attr.label.split(' · ')[0] : draft.idam, target: draft.target.trim() }
        : r)))
      toast('ok', 'Mapping updated', `${draft.idam} now writes to ${draft.target.trim()}.`)
    }
    cancel()
  }

  const remove = (r) => confirm({
    title: `Delete the ${r.idam} mapping?`,
    body: r.idam === unique
      ? `${r.idam} is the unique attribute for ${app.displayName}. Deleting it leaves the connector with no key to match an existing account on until another attribute is designated.`
      : `Accounts on ${app.displayName} stop receiving this attribute at the next run. Values already written are left in place.`,
    confirmLabel: 'Delete mapping',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== r.id))
      cancel()
      toast(r.idam === unique ? 'warn' : 'ok', 'Mapping deleted', r.idam === unique
        ? `${r.idam} was the unique attribute. Designate another one before the next run.`
        : r.idam)
    },
  })

  const addDisabled = editing !== null || available.length === 0
  const addTitle = editing !== null
    ? 'Finish the row you are editing first.'
    : available.length === 0
      ? 'Every IDAM attribute is already mapped. Edit or delete a row to change what this connector writes.'
      : undefined

  const editorRow = (key, index) => (
    <tr key={key} className="map-edit">
      <td className="td-mono">{index == null ? '—' : index + 1}</td>
      <td>
        <Select
          value={draft ? draft.idam : ''}
          options={idamOptions}
          aria-label="IDAM attribute"
          onChange={(e) => setDraft((d) => ({ ...d, idam: e.target.value }))}
        />
      </td>
      <td>
        {draft && draft.manual ? (
          <TextInput
            className="mono"
            value={draft.target}
            placeholder="targetAttribute"
            spellCheck="false"
            aria-label="Target attribute"
            onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
          />
        ) : (
          <Select
            className="mono"
            value={draft ? draft.target : ''}
            placeholder="Select a target attribute"
            // A name typed while Manual was ticked is carried into the list, so
            // clearing the checkbox does not silently drop the operator's work.
            options={draft && draft.target && !targetOptions.includes(draft.target) ? [...targetOptions, draft.target] : targetOptions}
            aria-label="Target attribute"
            onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
          />
        )}
      </td>
      <td>
        <Select value={draft ? draft.transform : 'Direct'} options={MAPPING_TRANSFORMS} aria-label="Value format" onChange={(e) => setDraft((d) => ({ ...d, transform: e.target.value }))} />
      </td>
      <td className="map-flag"><Check checked={draft ? !!draft.mandatory : false} onChange={(v) => setDraft((d) => ({ ...d, mandatory: v }))} label="Mandatory" /></td>
      <td className="map-flag"><Check checked={draft ? draft.notNull : false} onChange={(v) => setDraft((d) => ({ ...d, notNull: v }))} label="Not null" /></td>
      <td className="map-flag"><Check checked={draft ? !!draft.update : false} onChange={(v) => setDraft((d) => ({ ...d, update: v }))} label="Update existing value" /></td>
      <td className="map-flag"><Check checked={draft ? !!draft.manual : false} onChange={(v) => setDraft((d) => ({ ...d, manual: v }))} label="Manual" /></td>
      <td className="td-act">
        <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
          <IconButton icon="check" size="sm" label="Save mapping" onClick={commit} />
          <IconButton icon="x" size="sm" label="Cancel" onClick={cancel} />
        </span>
      </td>
    </tr>
  )

  return (
    <Card
      title="Attribute mapping"
      sub={`${rows.length} attributes flow from the identity store to ${app.displayName}. Not Null refuses a run that would write an empty value, Update decides whether an existing account is overwritten, and Manual lets you type a target attribute the connector does not list.`}
      flush
      actions={
        <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} mappings queued for CSV export.`)}>Export</Button>
      }
      footer={
        <>
          <span><b className="num">{rows.filter((r) => r.notNull).length}</b> not-null</span>
          <span><b className="num">{rows.filter((r) => r.update).length}</b> updated on existing accounts</span>
          <span><b className="num">{rows.filter((r) => r.manual).length}</b> manual</span>
          <span className="spacer" />
          <span>Use the edit action on a row to change its flags.</span>
        </>
      }
    >
      <div className="map-unique">
        <div className="section-head">
          <span className="section-title">Account key</span>
          <span className="section-sub">
            The pair a run matches an existing account on, and the key reconciliation correlates against. The same pair
            is designated when the application is registered.
          </span>
        </div>
        <div className="grid grid-2">
          <UniqueAttributeFields
            connector={connector}
            rows={rows}
            idamValue={unique}
            targetValue={uniqueTarget}
            onChange={setUniquePair}
            idPrefix="pv-unique"
          />
        </div>
        {uniqueIssue && <Banner tone="warn">{uniqueIssue}</Banner>}
      </div>

      <div className="map-scroll" ref={scrollRef}><table className="tbl map-tbl">
        <colgroup>
          {MAP_COLS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {MAP_COLS.map((c) => (
              c.key === 'act'
                ? <th key={c.key} className="td-act" />
                : <th key={c.key} className={['mandatory', 'notNull', 'update', 'manual'].includes(c.key) ? 'map-flag' : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            editing === r.id ? editorRow(r.id, i) : (
              <tr key={r.id}>
                <td className="td-mono">{i + 1}</td>
                <td className="td-main">
                  <span className="cell-id">
                    <span className="trunc">
                      <span className="map-idam">
                        {r.label}
                        {r.idam === unique && <Tag tone="acc">Unique</Tag>}
                      </span>
                      <span className="cell-sub mono">{r.idam}</span>
                    </span>
                  </span>
                </td>
                <td className="td-mono">
                  <span className="trunc" style={{ display: 'block' }}>{r.target}</span>
                </td>
                <td>{r.transform === 'Direct' ? <span className="t-mut">Direct</span> : <Tag>{r.transform}</Tag>}</td>
                <td className="map-flag"><Check checked={!!r.mandatory} disabled label={`${r.idam} mandatory`} /></td>
                <td className="map-flag"><Check checked={!!r.notNull} disabled label={`${r.idam} not null`} /></td>
                <td className="map-flag"><Check checked={!!r.update} disabled label={`Update ${r.idam} on existing accounts`} /></td>
                <td className="map-flag"><Check checked={!!r.manual} disabled label={`${r.idam} manual`} /></td>
                <td className="td-act">
                  <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <IconButton
                      icon="edit"
                      size="sm"
                      label={`Edit ${r.idam} mapping`}
                      disabled={editing !== null && editing !== r.id}
                      onClick={() => { setEditing(r.id); setDraft({ ...r }) }}
                    />
                    <IconButton icon="trash" size="sm" label={`Delete ${r.idam} mapping`} onClick={() => remove(r)} />
                  </span>
                </td>
              </tr>
            )
          ))}
          {editing === 'new' && editorRow('new')}
        </tbody>
      </table></div>

      <div className="map-add-bar">
        <Button size="sm" variant="pri" icon="plus" disabled={addDisabled} onClick={startAdd}>Add mapping</Button>
        {addTitle && <span className="t-xs t-mut">{addTitle}</span>}
        <span className="spacer" />
        <MaxGroupsControl value={maxGroups} onChange={onMaxGroups} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tab body — owns the connection draft so the save bar can be the last thing
// on the page.
// ---------------------------------------------------------------------------

function ProvisioningBody({ app, onPatch }) {
  const { toast } = useApp()
  const facet = app.provisioning
  const initial = useMemo(() => ({
    connector: facet.connector,
    method: facet.method,
    connection: { ...facet.connection },
    operations: { ...blankOperations(), ...(facet.operations || {}) },
    maxGroups: facet.maxGroups == null ? 0 : facet.maxGroups,
  }), [facet])
  const [draft, setDraft] = useState(initial)
  const [probe, setProbe] = useState(null)
  const [testing, setTesting] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const issues = [
    ...connectionIssues(draft.connector, draft.connection, { operations: draft.operations }),
    ...operationIssues(draft.operations),
  ]

  const runTest = () => {
    if (testing) return
    setTesting(true)
    setProbe(null)
    timer.current = setTimeout(() => {
      setTesting(false)
      setProbe(probeConnection(draft.connector, draft.connection))
    }, 850)
  }

  const customApi = isCustomApiConnector(draft.connector)
  const setMaxGroups = (n) => setDraft((d) => ({ ...d, maxGroups: n }))

  const save = () => {
    onPatch(app.id, (r) => ({
      provisioning: {
        ...r.provisioning,
        connector: draft.connector,
        method: draft.method,
        connection: draft.connection,
        operations: draft.operations,
        maxGroups: draft.maxGroups,
        host: draft.connection.host || r.provisioning.host,
        port: draft.connection.port || r.provisioning.port,
        // A Custom API connection designates the account key in its Create
        // section; the facet mirrors it so reconciliation reads the same pair.
        ...(customApi ? {
          uniqueAttribute: draft.connection.uniqueIdamAttribute || '',
          uniqueTargetAttribute: draft.connection.uniqueAppAttribute || '',
        } : {}),
      },
    }))
    toast('ok', 'Provisioning settings saved', `${app.displayName} applies the new settings at the next sync window.`)
  }

  const message = dirty
    ? (issues.length > 0
      ? `Unsaved provisioning changes · ${issues.length} item${issues.length === 1 ? '' : 's'} need attention`
      : 'Unsaved provisioning changes')
    : 'Provisioning settings are up to date'

  return (
    <div className="stack">
      <ConnectionSettings
        app={app}
        draft={draft}
        setDraft={setDraft}
        probe={probe}
        setProbe={setProbe}
        testing={testing}
        runTest={runTest}
      />
      {customApi ? (
        <>
          <Banner tone="info">
            Attribute mapping for a Custom API connector is operation-specific. The Get User, Create, Update and Delete
            sections above each carry their own mapping, opened with <b>Configure attribute mapping</b>, and the account key
            is the unique attribute pair designated under Create.
          </Banner>
          <div className="map-max-bar">
            <MaxGroupsControl value={draft.maxGroups} onChange={setMaxGroups} />
          </div>
        </>
      ) : (
        <MappingTable app={app} onPatch={onPatch} maxGroups={draft.maxGroups} onMaxGroups={setMaxGroups} />
      )}

      <StickyActions dirty={dirty} message={message}>
        <Button disabled={!dirty} onClick={() => { setDraft(initial); setProbe(null) }}>Discard</Button>
        <Button variant="pri" icon="save" disabled={!dirty || issues.length > 0} onClick={save}>Save changes</Button>
      </StickyActions>
    </div>
  )
}

export default function ProvisioningTab({ app, onPatch }) {
  if (!app.provisioning) {
    return (
      <Banner tone="info">
        This application has no provisioning facet. Link one from the Linkage tab, or add a connector from the Add
        Application flow.
      </Banner>
    )
  }
  return <ProvisioningBody key={app.id} app={app} onPatch={onPatch} />
}
