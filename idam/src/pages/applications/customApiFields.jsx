import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Check from '../../components/primitives/Check'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { IDAM_ATTRS } from '../shared/provisioning/shared'
import { AuthExtraFields, ConnectionFields, ErrorClassification } from './facetControls'
import {
  AUTH_BEARER_TYPE, BEARER_DYNAMIC, CUSTOM_API_VALUE_FORMATS, MAPPING_TRANSFORMS,
  blankGetUserMapping, blankLifecycleMapping, payloadPaths, targetAttrsFor,
} from './appModel'

// ---------------------------------------------------------------------------
// Custom API connector.
//
// The scalar fields are the connector's spec, rendered by the same
// ConnectionFields every other connector uses. What that renderer cannot draw
// — the extra authentication pairs, the error classification keywords and one
// attribute mapping per lifecycle operation — is slotted into the group it
// belongs to here, so "Get User API Configurations" reads as its three fields
// and its mapping rather than as three fields and a table somewhere else.
// ---------------------------------------------------------------------------

const idamLabel = (id) => {
  const a = IDAM_ATTRS.find((x) => x.value === id)
  return a ? String(a.label).split(' · ')[0] : id
}

/**
 * The heading of one mapping section: what it is for, how many rows it holds,
 * and the "Configure attribute mapping" action that opens the table.
 */
function MappingHeader({ title, sub, count, open, onToggle }) {
  return (
    <div className="capi-head">
      <div className="section-head">
        <span className="section-title">{title}</span>
        <span className="section-sub">{sub}</span>
      </div>
      <span className="capi-summary">
        <Icon name="swap" size={12} />
        {count === 0 ? 'No attributes mapped' : <><b>{count}</b>&nbsp;{count === 1 ? 'attribute' : 'attributes'} mapped</>}
      </span>
      <Button size="sm" icon={open ? 'chevU' : 'sliders'} aria-expanded={open} onClick={onToggle}>
        {open ? 'Hide attribute mapping' : 'Configure attribute mapping'}
      </Button>
    </div>
  )
}

/* The configured pairs, read without opening the editor. */
function MappingSummary({ rows, render }) {
  if (!rows.length) return null
  return (
    <div className="ec-cat-list" style={{ marginTop: 8 }}>
      {rows.map((r) => (
        <span className="chip mono" key={r.id}>{render(r)}</span>
      ))}
    </div>
  )
}

/**
 * Get User attribute mapping — which key of the user the target returns
 * becomes which IDAM attribute. Two columns and a direction, nothing else.
 */
export function GetUserMappingEditor({ rows = [], onChange, payload, idPrefix = 'gm' }) {
  const [open, setOpen] = useState(false)
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const add = () => { onChange([...rows, blankGetUserMapping(rows)]); setOpen(true) }
  const paths = useMemo(() => payloadPaths(payload), [payload])

  return (
    <div className="capi-block">
      <MappingHeader
        title="Get User attribute mapping"
        sub={paths.length
          ? 'Pick the payload key the target returns, nested keys as dot paths such as profile.email, and the IDAM attribute it is read into.'
          : 'The attribute the target returns, and the IDAM attribute it is read into. Keys added to the Get API payload become selectable here.'}
        count={rows.length}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      {!open && <MappingSummary rows={rows} render={(r) => <>{r.applicationAttribute || '—'} → {r.idamAttribute || '—'}</>} />}
      {open && (
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table className="tbl capi-tbl">
            <colgroup>
              <col style={{ width: 56 }} />
              <col />
              <col style={{ width: 36 }} />
              <col />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>S.no</th>
                <th>Application attribute</th>
                <th className="capi-arrow" aria-label="maps to">→</th>
                <th>IDAM attribute</th>
                <th className="td-act"><span className="vis-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="conn-empty">No attributes mapped yet. Add a row for each attribute the Get User response carries.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="td-mono">{i + 1}</td>
                  <td>
                    {paths.length ? (
                      <Select
                        id={`${idPrefix}-app-${r.id}`}
                        className="mono"
                        value={r.applicationAttribute || ''}
                        placeholder="Select a payload key"
                        // A value from before the payload changed stays offered rather than being dropped.
                        options={r.applicationAttribute && !paths.includes(r.applicationAttribute) ? [...paths, r.applicationAttribute] : paths}
                        aria-label={`Application attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { applicationAttribute: e.target.value })}
                      />
                    ) : (
                      <TextInput
                        id={`${idPrefix}-app-${r.id}`}
                        className="mono"
                        value={r.applicationAttribute}
                        placeholder="profile.email"
                        spellCheck="false"
                        aria-label={`Application attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { applicationAttribute: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="capi-arrow"><Icon name="arrowRight" size={13} /></td>
                  <td>
                    <Select
                      value={r.idamAttribute || ''}
                      placeholder="Select an IDAM attribute"
                      options={IDAM_ATTRS}
                      aria-label={`IDAM attribute ${i + 1}`}
                      onChange={(e) => set(r.id, { idamAttribute: e.target.value })}
                    />
                  </td>
                  <td className="td-act">
                    <IconButton icon="trash" size="sm" label={`Remove mapping ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="capi-foot">
            <Button size="sm" variant="pri" icon="plus" onClick={add}>Add attribute</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Attribute mapping for every connector other than Custom API, as the Add
 * Application wizard asks for it. Rows use the provisioning facet's shape
 * (target, idam, transform, update, notNull) so the record needs no conversion.
 */
export function ConnectorMappingEditor({
  connector, rows = [], onChange, uniqueIdam, uniqueApp, idPrefix = 'cm',
}) {
  const [open, setOpen] = useState(false)
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const targets = targetAttrsFor(connector, rows)
  const add = () => {
    const row = {
      id: rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
      idam: '', label: '', target: '', transform: MAPPING_TRANSFORMS[0],
      update: true, notNull: false, mandatory: false, manual: false,
    }
    // Until the unique pair has a row, a new row starts as that pair.
    const keyMapped = rows.some((r) => r.idam === uniqueIdam)
    onChange([...rows, uniqueIdam && !keyMapped
      ? { ...row, idam: uniqueIdam, label: idamLabel(uniqueIdam), target: uniqueApp || '', notNull: true, mandatory: true }
      : row])
    setOpen(true)
  }

  return (
    <div className="capi-block">
      <MappingHeader
        title="Mapped attributes"
        sub="The attribute on the application, and the IDAM attribute it is mapped to. Each attribute can be mapped once."
        count={rows.length}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      {!open && <MappingSummary rows={rows} render={(r) => <>{r.target || '—'} → {r.idam || '—'}</>} />}
      {open && (
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table className="tbl capi-tbl capi-cm">
            <colgroup>
              <col style={{ width: 56 }} />
              <col />
              <col style={{ width: 36 }} />
              <col />
              <col style={{ width: 140 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>S.no</th>
                <th>Application attribute</th>
                <th className="capi-arrow" aria-label="maps to">→</th>
                <th>IDAM attribute</th>
                <th>Value format</th>
                <th className="map-flag">Update</th>
                <th className="map-flag">Not null</th>
                <th className="td-act"><span className="vis-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="conn-empty">No attributes mapped yet. Add a row for each attribute this connector writes.</td></tr>
              )}
              {rows.map((r, i) => {
                const others = rows.filter((x) => x.id !== r.id)
                const takenTargets = new Set(others.map((x) => String(x.target || '').toLowerCase()))
                const takenIdam = new Set(others.map((x) => x.idam))
                const targetOptions = targets.filter((t) => !takenTargets.has(t.toLowerCase()))
                return (
                  <tr key={r.id}>
                    <td className="td-mono">{i + 1}</td>
                    <td>
                      <Select
                        id={`${idPrefix}-target-${r.id}`}
                        className="mono"
                        value={r.target || ''}
                        placeholder="Select an attribute"
                        options={r.target && !targetOptions.includes(r.target) ? [...targetOptions, r.target] : targetOptions}
                        aria-label={`Application attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { target: e.target.value })}
                      />
                    </td>
                    <td className="capi-arrow"><Icon name="arrowRight" size={13} /></td>
                    <td>
                      <Select
                        value={r.idam || ''}
                        placeholder="Select an IDAM attribute"
                        options={IDAM_ATTRS.filter((a) => a.value === r.idam || !takenIdam.has(a.value))}
                        aria-label={`IDAM attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { idam: e.target.value, label: idamLabel(e.target.value) })}
                      />
                    </td>
                    <td>
                      <Select
                        value={r.transform || MAPPING_TRANSFORMS[0]}
                        options={MAPPING_TRANSFORMS}
                        aria-label={`Value format ${i + 1}`}
                        onChange={(e) => set(r.id, { transform: e.target.value })}
                      />
                    </td>
                    <td className="map-flag">
                      <Check checked={!!r.update} onChange={(v) => set(r.id, { update: v })} label={`Update for row ${i + 1}`} />
                    </td>
                    <td className="map-flag">
                      <Check checked={!!r.notNull} onChange={(v) => set(r.id, { notNull: v })} label={`Not null for row ${i + 1}`} />
                    </td>
                    <td className="td-act">
                      <IconButton icon="trash" size="sm" label={`Remove mapping ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="capi-foot">
            <Button size="sm" variant="pri" icon="plus" onClick={add}>Add attribute</Button>
            <span className="t-xs t-mut">Update overwrites the value on an existing account; Not null refuses a run that would write an empty value.</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Create or Update attribute mapping.
 *
 * A row says which IDAM attribute is written, to which application attribute,
 * in what format, and with what promises: Mandatory means the key must be in
 * the payload at all, Not null means the value it carries cannot be empty.
 * Manual input turns the application attribute into a free-text name, for the
 * case where the operator knows a key the catalogue does not.
 */
export function LifecycleMappingEditor({
  operation, rows = [], onChange, connector, uniqueIdam, uniqueApp, payload, idPrefix = 'lm',
}) {
  const [open, setOpen] = useState(false)
  const set = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  // Until the unique pair has a row, a new row starts as that pair.
  const add = () => {
    const row = blankLifecycleMapping(rows)
    const keyMapped = rows.some((r) => r.idamAttribute === uniqueIdam)
    onChange([...rows, uniqueIdam && !keyMapped
      ? { ...row, idamAttribute: uniqueIdam, applicationAttribute: uniqueApp || '', mandatory: true, notNull: true }
      : row])
    setOpen(true)
  }
  const catalog = targetAttrsFor(connector, rows.map((r) => ({ target: r.manualInputAttribute ? '' : r.applicationAttribute })))
  // Nested keys straight from the payload the operator authored, dot-pathed to
  // any depth, are offered first; the connector's own catalogue and anything
  // already mapped stay offered too, so a blank or flat payload still behaves
  // exactly as it did before this payload was wired in.
  const payloadKeys = useMemo(() => payloadPaths(payload), [payload])
  const targets = payloadKeys.length ? [...new Set([...payloadKeys, ...catalog])] : catalog

  return (
    <div className="capi-block">
      <MappingHeader
        title={`${operation} attribute mapping`}
        sub={payloadKeys.length
          ? `Pick the payload key the ${operation.toLowerCase()} request writes, nested keys as dot paths such as profile.email, and the IDAM attribute mapped into it.`
          : `Which IDAM attributes the ${operation.toLowerCase()} payload carries, and the application attribute each is written to.`}
        count={rows.length}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />
      {!open && <MappingSummary rows={rows} render={(r) => <>{idamLabel(r.idamAttribute) || '—'} → {r.applicationAttribute || '—'}</>} />}
      {open && (
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table className="tbl capi-tbl capi-lc">
            <colgroup>
              <col style={{ width: 56 }} />
              <col style={{ width: 200 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 48 }} />
            </colgroup>
            <thead>
              <tr>
                <th>S.no</th>
                <th>Application attribute</th>
                <th>Target application attribute</th>
                <th className="map-flag">Manual input</th>
                <th>Value format</th>
                <th className="map-flag">Mandatory</th>
                <th className="map-flag">Not null</th>
                <th className="td-act"><span className="vis-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="conn-empty">No attributes mapped yet. Add a row for each attribute the {operation.toLowerCase()} payload writes.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="td-mono">{i + 1}</td>
                  <td>
                    <Select
                      id={`${idPrefix}-idam-${r.id}`}
                      value={r.idamAttribute || ''}
                      placeholder="Select an attribute"
                      options={IDAM_ATTRS}
                      aria-label={`Application attribute ${i + 1}`}
                      onChange={(e) => set(r.id, { idamAttribute: e.target.value })}
                    />
                  </td>
                  <td>
                    {r.manualInputAttribute ? (
                      <TextInput
                        className="mono"
                        value={r.applicationAttribute}
                        placeholder="targetAttribute"
                        spellCheck="false"
                        aria-label={`Target application attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { applicationAttribute: e.target.value })}
                      />
                    ) : (
                      <Select
                        className="mono"
                        value={r.applicationAttribute || ''}
                        placeholder="Select a target attribute"
                        // A name typed while Manual was ticked stays offered, so
                        // clearing the checkbox does not silently drop it.
                        options={r.applicationAttribute && !targets.includes(r.applicationAttribute) ? [...targets, r.applicationAttribute] : targets}
                        aria-label={`Target application attribute ${i + 1}`}
                        onChange={(e) => set(r.id, { applicationAttribute: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="map-flag">
                    <Check
                      checked={!!r.manualInputAttribute}
                      onChange={(v) => set(r.id, { manualInputAttribute: v })}
                      label={`Manual input for row ${i + 1}`}
                    />
                  </td>
                  <td>
                    <Select
                      value={r.valueFormat || CUSTOM_API_VALUE_FORMATS[0]}
                      options={CUSTOM_API_VALUE_FORMATS}
                      aria-label={`Value format ${i + 1}`}
                      onChange={(e) => set(r.id, { valueFormat: e.target.value })}
                    />
                  </td>
                  <td className="map-flag">
                    <Check checked={!!r.mandatory} onChange={(v) => set(r.id, { mandatory: v })} label={`Mandatory attribute for row ${i + 1}`} />
                  </td>
                  <td className="map-flag">
                    <Check checked={!!r.notNull} onChange={(v) => set(r.id, { notNull: v })} label={`Not null attribute for row ${i + 1}`} />
                  </td>
                  <td className="td-act">
                    <IconButton icon="trash" size="sm" label={`Remove mapping ${i + 1}`} onClick={() => onChange(rows.filter((x) => x.id !== r.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="capi-foot">
            <Button size="sm" variant="pri" icon="plus" onClick={add}>Add attribute</Button>
            <span className="t-xs t-mut">Mandatory keeps the key in the payload; Not null refuses a run that would write an empty value.</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The whole Custom API connection form.
 *
 * Same contract as ConnectionFields — a connection value, a patch callback and
 * the operations the application may perform — so the wizard and the
 * Provisioning tab call it in exactly the place they would call the generic
 * renderer.
 */
export default function CustomApiFields({
  connector, value = {}, onChange, showErrors = false, idPrefix = 'capi', ctx = {},
}) {
  const { toast } = useApp()
  const ops = ctx.operations || {}
  const dynamic = value.authType === AUTH_BEARER_TYPE && value.authMethod === BEARER_DYNAMIC

  /* Changing the application unique attribute clears the Create and Update
     mapping tables: the rows were built against the old key and would be
     written to the wrong account under the new one. */
  const change = (patch) => {
    if ('uniqueAppAttribute' in patch && patch.uniqueAppAttribute !== value.uniqueAppAttribute
      && ((value.createMappings || []).length || (value.updateMappings || []).length || (value.deleteMappings || []).length)) {
      onChange({ ...patch, createMappings: [], updateMappings: [], deleteMappings: [] })
      toast('warn', 'Attribute mapping cleared', 'The Create, Update and Delete attribute mappings were built against the previous unique attribute. Configure them again.')
      return
    }
    onChange(patch)
  }

  const after = {
    errorKey: (
      <div className="capi-block" key="ec">
        <div className="section-head" style={{ marginBottom: 10 }}>
          <span className="section-title">Error classification keywords</span>
          <span className="section-sub">
            Keywords matched against the error key above, grouped by the category that decides what the platform does next.
            Default keywords are locked; keywords you add can be removed.
          </span>
        </div>
        <ErrorClassification
          rows={value.errorClasses || []}
          onChange={(next) => onChange({ errorClasses: next })}
        />
      </div>
    ),
    getUserAPIPayload: (
      <GetUserMappingEditor
        key="get"
        rows={value.getUserMappings || []}
        onChange={(next) => onChange({ getUserMappings: next })}
        payload={value.getUserAPIPayload}
        idPrefix={`${idPrefix}-gm`}
      />
    ),
  }
  if (dynamic) {
    after.authorization = (
      <div className="capi-block" key="ax">
        <AuthExtraFields
          rows={value.authExtras || []}
          onChange={(next) => onChange({ authExtras: next })}
          idPrefix={`${idPrefix}-ax`}
        />
      </div>
    )
  }
  if (ops.create) {
    after.uniqueIdamAttribute = (
      <LifecycleMappingEditor
        key="create"
        operation="Create"
        connector={connector}
        rows={value.createMappings || []}
        onChange={(next) => onChange({ createMappings: next })}
        uniqueIdam={value.uniqueIdamAttribute}
        uniqueApp={value.uniqueAppAttribute}
        payload={value.createUserAPIPayload}
        idPrefix={`${idPrefix}-cm`}
      />
    )
  }
  if (ops.update) {
    // The unique pair sits under Update only when Create is off, and the
    // mapping follows whichever field closes the section.
    after[ops.create ? 'updateUserAPIPayload' : 'uniqueIdamAttribute'] = (
      <LifecycleMappingEditor
        key="update"
        operation="Update"
        connector={connector}
        rows={value.updateMappings || []}
        onChange={(next) => onChange({ updateMappings: next })}
        uniqueIdam={value.uniqueIdamAttribute}
        uniqueApp={value.uniqueAppAttribute}
        payload={value.updateUserAPIPayload}
        idPrefix={`${idPrefix}-um`}
      />
    )
  }
  if (ops.remove) {
    after.deleteUserAPIPayload = (
      <LifecycleMappingEditor
        key="delete"
        operation="Delete"
        connector={connector}
        rows={value.deleteMappings || []}
        onChange={(next) => onChange({ deleteMappings: next })}
        uniqueIdam={value.uniqueIdamAttribute}
        uniqueApp={value.uniqueAppAttribute}
        payload={value.deleteUserAPIPayload}
        idPrefix={`${idPrefix}-dm`}
      />
    )
  }

  return (
    <ConnectionFields
      connector={connector}
      value={value}
      onChange={change}
      showErrors={showErrors}
      idPrefix={idPrefix}
      ctx={ctx}
      after={after}
    />
  )
}
