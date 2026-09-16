import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { IDAM_ATTRS } from '../shared/provisioning/shared'
import { MAPPING_TRANSFORMS } from '../applications/appModel'
import { attrLabel, sourceAttrsFor, sourceLabel, uniqueIssues, uniqueSourceFor } from './trustModel'

// ---------------------------------------------------------------------------
// Attribute configuration for a trust source.
//
// The provisioning table writes outward, so its editable side is the target
// attribute. Reconciliation reads inward, so the editable side here is the
// source attribute — but the decision is the same one, and so are the guards:
// an IDAM attribute may be mapped once, the add control sits on the row it
// creates, and it is unavailable while another row is open.
//
// Manual takes a row out of the source's hands. The source does not carry the
// attribute at all, so instead of naming a field the operator types the value
// every identity from this source is given. That is why ticking Manual swaps
// the source dropdown for a free-text box rather than adding a column: one row
// carries one value whichever way the flag reads.
// ---------------------------------------------------------------------------

const MAP_COLS = [
  { key: 'source', label: 'Source attribute', width: 260 },
  { key: 'idam', label: 'IDAM attribute', width: 230 },
  { key: 'transform', label: 'Transform', width: 150 },
  { key: 'manual', label: 'Manual', width: 90 },
  { key: 'act', label: '', width: 80 },
]

/**
 * The unique pair, reconciliation side.
 *
 * The same decision the provisioning tab designates, phrased for a source that
 * is read rather than written: the name the record is identified by on the
 * source, and the identity attribute it is correlated against here. Neither
 * half means anything alone, so they sit side by side.
 */
function UniqueSourceFields({ rows, sourceValue, idamValue, onChange, catalogue, idPrefix = 'ts-unique' }) {
  const options = sourceValue && !catalogue.includes(sourceValue) ? [...catalogue, sourceValue] : catalogue
  // Every identity attribute is offered, and each option says what currently
  // feeds it — an operator choosing a match key needs to see that the attribute
  // they are about to correlate on is not mapped at all.
  const idamOptions = IDAM_ATTRS.map((a) => {
    const row = rows.find((r) => r.idam === a.value)
    return {
      value: a.value,
      label: `${a.label} · ${row ? (row.manual ? 'set manually' : `reads ${row.source || 'nothing'}`) : 'not mapped'}`,
    }
  })
  const unmapped = !!idamValue && !rows.some((r) => r.idam === idamValue)

  return (
    <>
      <Field
        label="Unique source attribute"
        htmlFor={`${idPrefix}-source`}
        hint="The attribute a record is identified by on the source system."
      >
        <Select
          id={`${idPrefix}-source`}
          className="mono"
          value={sourceValue || ''}
          placeholder="Select a source attribute"
          options={options}
          onChange={(e) => onChange({ uniqueSourceAttribute: e.target.value })}
        />
      </Field>
      <Field
        label="Unique IDAM attribute"
        htmlFor={`${idPrefix}-idam`}
        hint="The identity attribute a reconciled record is correlated against."
        error={unmapped ? 'This attribute has no mapping, so the source supplies no value for it.' : undefined}
      >
        <Select
          id={`${idPrefix}-idam`}
          value={idamValue || ''}
          placeholder="Not set"
          options={idamOptions}
          onChange={(e) => {
            // One pairing, so choosing the identity side proposes the source
            // attribute its mapping already reads. An operator whose source
            // differs overrides it in the field beside this one.
            const next = e.target.value
            const mapped = uniqueSourceFor(rows, next)
            onChange({ uniqueAttribute: next, ...(mapped ? { uniqueSourceAttribute: mapped } : {}) })
          }}
        />
      </Field>
    </>
  )
}

export default function TrustMapping({ source, onPatch }) {
  const { toast, confirm } = useApp()
  const rows = source.mappings || []
  const connector = source.connector
  const name = sourceLabel(source)
  const unique = source.uniqueAttribute || ''
  const uniqueSource = source.uniqueSourceAttribute || ''

  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)

  const setRows = (next) => onPatch({ mappings: typeof next === 'function' ? next(rows) : next })

  const catalogue = useMemo(() => sourceAttrsFor(connector, rows), [connector, rows])
  const used = new Set(rows.map((r) => r.idam))
  const available = IDAM_ATTRS.filter((a) => !used.has(a.value))
  // An identity attribute may be fed once. Offering the ones already spoken for
  // made it possible to commit a second row for the same attribute, and the
  // second row silently won at run time.
  const idamOptions = useMemo(() => {
    const taken = new Set(rows.filter((r) => r.id !== editing).map((r) => r.idam))
    return IDAM_ATTRS.filter((a) => !taken.has(a.value) || (draft && a.value === draft.idam))
  }, [rows, editing, draft])

  const uniqueIssue = uniqueIssues(rows, unique, uniqueSource)[0] || null

  const startAdd = () => {
    const first = available[0]
    // Both guards are also expressed on the Add button, but the button is not
    // the only way in — a keyboard activation on a stale render reaches here.
    if (!first) {
      toast('warn', 'Nothing left to map', 'Every IDAM attribute already has a row. Edit or delete one to change it.')
      return
    }
    if (editing !== null) {
      toast('warn', 'Finish the open row first', 'Save or cancel the mapping you are editing before adding another.')
      return
    }
    setEditing('new')
    setDraft({ id: 'new', idam: first.value, source: '', transform: 'Direct', manual: false })
  }

  const cancel = () => { setEditing(null); setDraft(null) }

  const commit = () => {
    if (!String(draft.source || '').trim()) {
      toast(
        'warn',
        draft.manual ? 'Manual value required' : 'Source attribute required',
        draft.manual
          ? 'Type the value every identity from this source is given, or clear Manual and choose a source attribute.'
          : 'Choose a source attribute, or tick Manual and type a value.',
      )
      return
    }
    if (rows.some((r) => r.id !== editing && r.idam === draft.idam)) {
      toast('warn', 'Attribute already mapped', `${draft.idam} already has a row. Edit that row instead of adding a second one.`)
      return
    }
    const next = { ...draft, label: attrLabel(draft.idam), source: draft.source.trim() }
    if (editing === 'new') {
      setRows((rs) => [...rs, { ...next, id: rs.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1 }])
    } else {
      setRows((rs) => rs.map((r) => (r.id === editing ? { ...r, ...next } : r)))
    }
    toast(
      'ok',
      editing === 'new' ? 'Mapping added' : 'Mapping updated',
      next.manual
        ? `${next.idam} is set to ${next.source} on every identity from this source.`
        : `${next.idam} now reads ${next.source}.`,
    )
    cancel()
  }

  const remove = (r) => confirm({
    title: `Delete the ${r.idam} mapping?`,
    body: r.idam === unique
      ? `${r.idam} is the unique attribute for ${name}. Deleting it leaves the run with no key to correlate a record on until another attribute is designated.`
      : `Records read from ${name} stop carrying this attribute at the next run. Values already on the identities are left in place.`,
    confirmLabel: 'Delete mapping',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== r.id))
      cancel()
      toast(r.idam === unique ? 'warn' : 'ok', 'Mapping deleted', r.idam === unique
        ? `${r.idam} was the unique attribute. Designate another one before the next run.`
        : r.idam)
    },
  })

  const setSource = (id, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, source: v } : r)))
  // Switching a row to manual clears the field name it was reading: the value
  // beside the box is now a value, not a name, and carrying the old one over
  // would import the literal string "sAMAccountName" onto every identity.
  const setManual = (id, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, manual: v, source: '' } : r)))

  const addDisabled = editing !== null || available.length === 0
  const addNote = editing !== null
    ? 'Finish the row you are editing first.'
    : available.length === 0
      ? 'Every IDAM attribute is already mapped. Edit or delete a row to change what this source feeds.'
      : null

  const editorRow = (key) => (
    <tr key={key} className="map-edit">
      <td>
        {draft && draft.manual ? (
          <TextInput
            value={draft.source}
            placeholder="Value given to every identity"
            aria-label="Manual value"
            onChange={(e) => setDraft((x) => ({ ...x, source: e.target.value }))}
          />
        ) : (
          <Select
            className="mono"
            value={draft ? draft.source : ''}
            placeholder="Select a source attribute"
            // A name typed while Manual was ticked is carried into the list, so
            // clearing the checkbox does not silently drop the operator's work.
            options={draft && draft.source && !catalogue.includes(draft.source) ? [...catalogue, draft.source] : catalogue}
            aria-label="Source attribute"
            onChange={(e) => setDraft((x) => ({ ...x, source: e.target.value }))}
          />
        )}
      </td>
      <td>
        <Select
          value={draft ? draft.idam : ''}
          options={idamOptions}
          aria-label="IDAM attribute"
          onChange={(e) => setDraft((x) => ({ ...x, idam: e.target.value }))}
        />
      </td>
      <td>
        <Select
          value={draft ? draft.transform : 'Direct'}
          options={MAPPING_TRANSFORMS}
          aria-label="Transform"
          onChange={(e) => setDraft((x) => ({ ...x, transform: e.target.value }))}
        />
      </td>
      <td className="map-flag">
        <Check
          checked={draft ? draft.manual : false}
          label="Manual"
          onChange={(v) => setDraft((x) => ({ ...x, manual: v, source: '' }))}
        />
      </td>
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
      title="Attribute configuration"
      sub={`${rows.length} attributes flow from ${name} into the identity store. A manual attribute is not read from the source at all — every identity created from it is given the value typed on the row.`}
      flush
      actions={
        <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} mappings queued for CSV export.`)}>Export</Button>
      }
      footer={
        <>
          <span><b className="num">{rows.filter((r) => !r.manual).length}</b> read from the source</span>
          <span><b className="num">{rows.filter((r) => r.manual).length}</b> manual</span>
          <span><b className="num">{rows.filter((r) => r.transform !== 'Direct').length}</b> transformed</span>
          <span className="spacer" />
          <span>A manual attribute never changes, whatever the source reports.</span>
        </>
      }
    >
      <div className="map-unique">
        <div className="section-head">
          <span className="section-title">Match key</span>
          <span className="section-sub">
            The pair a run correlates a source record against an identity on. Without it every record read from this
            source looks new.
          </span>
        </div>
        <div className="grid grid-2">
          <UniqueSourceFields
            rows={rows}
            catalogue={catalogue}
            sourceValue={uniqueSource}
            idamValue={unique}
            onChange={onPatch}
          />
        </div>
        {uniqueIssue && <Banner tone="warn">{uniqueIssue}</Banner>}
      </div>

      <div style={{ overflowX: 'auto' }}><table className="tbl map-tbl trust-map">
        <colgroup>
          {MAP_COLS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {MAP_COLS.map((c) => (
              c.key === 'act'
                ? <th key={c.key} className="td-act" />
                : <th key={c.key} className={c.key === 'manual' ? 'map-flag' : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            editing === r.id ? editorRow(r.id) : (
              <tr key={r.id}>
                <td className="td-main">
                  {r.manual ? (
                    <TextInput
                      value={r.source}
                      placeholder="Value given to every identity"
                      aria-label={`Manual value for ${r.idam}`}
                      onChange={(e) => setSource(r.id, e.target.value)}
                    />
                  ) : (
                    <span className="cell-id">
                      <span className="trunc">
                        <span className="mono" style={{ display: 'block' }}>{r.source || '—'}</span>
                        <span className="cell-sub">read from the source</span>
                      </span>
                    </span>
                  )}
                </td>
                <td>
                  <span className="trunc">
                    <span className="map-idam">
                      {r.label || attrLabel(r.idam)}
                      {r.idam === unique && <Tag tone="acc">Unique</Tag>}
                    </span>
                    <span className="cell-sub mono">{r.idam}</span>
                  </span>
                </td>
                <td>{r.transform === 'Direct' ? <span className="t-mut">Direct</span> : <Tag>{r.transform}</Tag>}</td>
                <td className="map-flag">
                  <Check checked={r.manual} label={`${r.idam} manual`} onChange={(v) => setManual(r.id, v)} />
                </td>
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
          {/* The trigger sits on the row it creates, so the editor opens exactly
              where the control was pressed rather than at the far end of the
              table after a trip to the card header. */}
          {editing === 'new' ? editorRow('new') : (
            <tr className="map-add">
              <td colSpan={MAP_COLS.length}>
                <span className="row" style={{ gap: 10 }}>
                  <Button size="sm" variant="pri" icon="plus" disabled={addDisabled} onClick={startAdd}>Add mapping</Button>
                  {addNote && <span className="t-xs t-mut">{addNote}</span>}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table></div>
    </Card>
  )
}
