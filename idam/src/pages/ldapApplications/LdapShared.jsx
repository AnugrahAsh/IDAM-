import { useRef, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Meter from '../../components/primitives/Meter'
import Switch from '../../components/primitives/Switch'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { ATTRS, nextId } from '../../data/seed'
import { SYNTAXES } from './ldapModel'
import { BASE_ATTRIBUTES, CUSTOM_ATTRIBUTES, SCHEMA_TARGETS, SYNTAXES as SCHEMA_SYNTAXES, syntaxLabel } from './schemaData'
import { DefinitionForm } from './LdapSchema'

export function Tiles({ items }) {
  return (
    <div className="stat-strip">
      {items.filter(Boolean).map((s) => (
        <div className="stat-cell" key={s.k}>
          <span className="stat-k"><Icon name={s.icon} size={12} />{s.k}</span>
          <span className="stat-v" style={s.tone ? { color: `var(--${s.tone})` } : undefined}>
            {typeof s.v === 'number' ? num(s.v) : s.v}
          </span>
          {s.sub && <span className="t-xs t-mut trunc">{s.sub}</span>}
        </div>
      ))}
    </div>
  )
}

export function Timeline({ items }) {
  return (
    <div className="tl">
      {items.map((e) => (
        <div className="tl-it" key={e.id} data-tone={e.tone || 'acc'}>
          <span className="tl-dot"><Icon name={e.icon || 'check'} size={8} stroke={3} /></span>
          <div className="tl-t">{e.title}</div>
          {e.sub && <div className="tl-s">{e.sub}</div>}
          <div className="tl-time">{e.time}</div>
        </div>
      ))}
    </div>
  )
}

export function HealthBar({ value, tone, note }) {
  return (
    <div>
      <div className="row-between" style={{ marginBottom: 7 }}>
        <span className="t-micro t-mut">Connection health, last 30 days</span>
        <span className="t-xs num">{Number(value).toFixed(2)}%</span>
      </div>
      <Meter value={value} tone={tone} height={7} />
      {note && <div className="t-xs t-mut" style={{ marginTop: 6 }}>{note}</div>}
    </div>
  )
}

// The object class, directory and description are not decisions taken per
// mapping: the directory is whichever one the panel was opened from, the class
// follows the schema, and the description duplicated the attribute catalog. Only
// the two attributes being joined are asked for; the rest travel with the row so
// the mapping table keeps rendering unchanged.
const LDAP_ATTRIBUTE_OPTIONS = [...BASE_ATTRIBUTES, ...CUSTOM_ATTRIBUTES]
  .map((a) => ({ value: a.name, label: a.custom ? `${a.name} · custom` : a.name }))

const IDENTITY_ATTRIBUTE_OPTIONS = ATTRS.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))
const attrLabel = (id) => (ATTRS.find((a) => a.id === id) || {}).label || ''

/**
 * Every mapping of one directory edited as a table, so several rows can be
 * added and saved in one pass. Each identity attribute and each LDAP attribute
 * can be mapped once; options already used by another row are not offered.
 */
export function MappingBulkEditor({ rows, directory, startWithNew, onSave, onCancel }) {
  const seq = useRef(0)
  const blank = () => {
    seq.current += 1
    return { id: `new-${seq.current}`, idam: '', ldap: '', objectClass: 'inetOrgPerson', directory, description: '' }
  }
  const [draft, setDraft] = useState(() => {
    const base = rows.map((r) => ({ ...r }))
    return startWithNew ? [...base, blank()] : base
  })
  const set = (id, patch) => setDraft((ds) => ds.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const incomplete = draft.some((r) => !r.idam || !String(r.ldap || '').trim())

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl map-tbl ldap-map-tbl">
          <colgroup>
            <col style={{ width: 56 }} />
            <col />
            <col style={{ width: 36 }} />
            <col />
            <col style={{ width: 150 }} />
            <col style={{ width: 56 }} />
          </colgroup>
          <thead>
            <tr>
              <th>S.no</th>
              <th>Identity attribute</th>
              <th aria-label="reads from">←</th>
              <th>LDAP attribute</th>
              <th>Object class</th>
              <th className="td-act"><span className="vis-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {draft.length === 0 && (
              <tr><td colSpan={6} className="t-sm t-mut">No attributes mapped. Add a row for each attribute read from {directory}.</td></tr>
            )}
            {draft.map((r, i) => {
              const others = draft.filter((x) => x.id !== r.id)
              const takenIdam = new Set(others.map((x) => x.idam))
              const takenLdap = new Set(others.map((x) => String(x.ldap || '').toLowerCase()))
              return (
                <tr key={r.id} className="map-edit">
                  <td className="td-mono">{i + 1}</td>
                  <td>
                    <Select
                      value={r.idam}
                      placeholder="Select an identity attribute"
                      options={IDENTITY_ATTRIBUTE_OPTIONS.filter((o) => o.value === r.idam || !takenIdam.has(o.value))}
                      aria-label={`Identity attribute ${i + 1}`}
                      onChange={(e) => set(r.id, { idam: e.target.value, description: attrLabel(e.target.value) })}
                    />
                  </td>
                  <td className="t-faint"><Icon name="chevL" size={13} /></td>
                  <td>
                    <Select
                      className="mono"
                      value={r.ldap}
                      placeholder="Select an LDAP attribute"
                      options={LDAP_ATTRIBUTE_OPTIONS.filter((o) => o.value === r.ldap || !takenLdap.has(o.value.toLowerCase()))}
                      aria-label={`LDAP attribute ${i + 1}`}
                      onChange={(e) => set(r.id, { ldap: e.target.value })}
                    />
                  </td>
                  <td><Tag>{r.objectClass}</Tag></td>
                  <td className="td-act">
                    <IconButton icon="trash" size="sm" label={`Remove row ${i + 1}`} onClick={() => setDraft((ds) => ds.filter((x) => x.id !== r.id))} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="ldap-map-foot">
        <Button size="sm" variant="pri" icon="plus" onClick={() => setDraft((ds) => [...ds, blank()])}>Add attribute</Button>
        {incomplete && <span className="t-xs t-mut">Every row needs an identity attribute and an LDAP attribute.</span>}
        <span className="spacer" />
        <Button size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="pri" icon="save" disabled={incomplete} onClick={() => onSave(draft)}>Save mappings</Button>
      </div>
    </>
  )
}

export function MappingTable({ rows, onEdit, onDelete }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="swap"
        size="sm"
        title="No attribute mappings"
        body="Without a mapping the platform reads nothing from this directory beyond the distinguished name."
      />
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}><table className="tbl">
      <thead>
        <tr>
          <th>Identity attribute</th>
          <th>LDAP attribute</th>
          <th>Object class</th>
          <th>Directory</th>
          <th className="td-act" />
        </tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id}>
            <td className="td-main">
              <span className="cell-id">
                <span className="trunc">
                  <span style={{ display: 'block' }}>{m.idam}</span>
                  {m.description && <span className="cell-sub">{m.description}</span>}
                </span>
              </span>
            </td>
            <td className="td-mono">{m.ldap}</td>
            <td><Tag>{m.objectClass}</Tag></td>
            <td className="trunc">{m.directory}</td>
            <td className="td-act">
              <span className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                <IconButton icon="edit" size="sm" label={`Edit ${m.idam}`} onClick={() => onEdit(m)} />
                <IconButton icon="trash" size="sm" label={`Delete ${m.idam}`} onClick={() => onDelete(m)} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  )
}

const emptyDashboardAttr = () => ({ name: '', ldap: '', type: SYNTAXES[0], description: '' })

export function AttributeManagerCard({ rows, onChange }) {
  const { toast, confirm } = useApp()
  const [draft, setDraft] = useState(null)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const ready = draft && String(draft.name).trim() && String(draft.ldap).trim()

  const save = () => {
    if (draft.id) {
      onChange(rows.map((r) => (r.id === draft.id ? { ...r, ...draft } : r)))
      toast('ok', 'Attribute saved', `${draft.name} reads from ${draft.ldap}.`)
    } else {
      onChange([...rows, { ...draft, id: nextId(rows) }])
      toast('ok', 'Attribute created', `${draft.name} is available to every directory connection.`)
    }
    setDraft(null)
  }

  const remove = (row) => confirm({
    title: `Delete the ${row.name} attribute?`,
    body: `${row.ldap} stops being read from every directory at the next synchronization. Values already stored on identities are retained.`,
    confirmLabel: 'Delete attribute',
    onConfirm: () => {
      onChange(rows.filter((r) => r.id !== row.id))
      toast('ok', 'Attribute deleted', row.name)
    },
  })

  return (
    <Card
      title="Attribute management"
      sub="Custom LDAP attributes read beyond the standard schema, available to every directory connection"
      flush
      actions={<Button size="sm" variant="pri" icon="plus" onClick={() => setDraft(emptyDashboardAttr())}>Add attribute</Button>}
      footer={
        <>
          <span><b className="num">{rows.length}</b> custom attributes</span>
          <span className="spacer" />
          <span>New attributes are read from the next synchronization run.</span>
        </>
      }
    >
      {draft && (
        <div className="card-b" style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="t-h3">{draft.id ? 'Edit custom attribute' : 'New custom attribute'}</span>
            <IconButton icon="x" size="sm" label="Discard" onClick={() => setDraft(null)} />
          </div>
          <div className="grid grid-3">
            <Field label="Name" required hint="Shown on the identity record." htmlFor="da-name">
              <TextInput id="da-name" value={draft.name} placeholder="Cost center" onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="LDAP attribute" required htmlFor="da-ldap">
              <TextInput id="da-ldap" className="mono" value={draft.ldap} placeholder="departmentNumber" onChange={(e) => set('ldap', e.target.value)} />
            </Field>
            <Field label="Type" htmlFor="da-type">
              <Select id="da-type" value={draft.type} options={SYNTAXES} onChange={(e) => set('type', e.target.value)} />
            </Field>
            <Field label="Description" span={3} htmlFor="da-desc">
              <TextInput id="da-desc" value={draft.description} placeholder="What this attribute carries and who depends on it." onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="pri" icon="save" disabled={!ready} onClick={save}>{draft.id ? 'Save attribute' : 'Add attribute'}</Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon="tag"
          size="sm"
          title="No custom attributes"
          body="Only the standard schema is read from the connected directories."
          actions={<Button size="sm" variant="pri" icon="plus" onClick={() => setDraft(emptyDashboardAttr())}>Add attribute</Button>}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}><table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>LDAP attribute</th>
              <th>Type</th>
              <th>Description</th>
              <th className="td-act" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td-main">{r.name}</td>
                <td className="td-mono">{r.ldap}</td>
                <td><Tag>{r.type}</Tag></td>
                <td className="trunc" style={{ maxWidth: 360 }}>{r.description}</td>
                <td className="td-act">
                  <span className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                    <IconButton icon="edit" size="sm" label={`Edit ${r.name}`} onClick={() => setDraft({ ...r })} />
                    <IconButton icon="trash" size="sm" label={`Delete ${r.name}`} onClick={() => remove(r)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}

const emptyAttr = (directory) => ({
  name: '',
  ldap: '',
  // The shared schema editor names an attribute and describes it; this table
  // shows the description as the label and the name as the LDAP attribute.
  target: SCHEMA_TARGETS[5].value,
  syntax: SCHEMA_SYNTAXES[0].value,
  equality: 'caseIgnoreMatch',
  oid: '',
  substr: '',
  usage: 'userApplications',
  multi: false,
  indexed: false,
  populated: 0,
  source: 'Manual',
  directory,
})

// The schema editor's fields plus the two this table also tracks. It owns its
// state so the drawer re-renders as it is edited; the latest value is handed up
// on every change for the drawer's footer to save.
function CustomAttributeForm({ initial, onChange }) {
  const cur = useRef(initial)
  const [d, setD] = useState(initial)
  const update = (patch) => {
    cur.current = { ...cur.current, ...patch }
    setD(cur.current)
    onChange(cur.current)
  }
  return (
    <div className="stack">
      <DefinitionForm
        kind="attribute"
        attributes={[]}
        initial={{
          target: initial.target,
          name: initial.ldap,
          description: initial.name,
          syntax: initial.syntax,
          equality: initial.equality,
          single: !initial.multi,
          oid: initial.oid,
          substr: initial.substr,
          usage: initial.usage,
        }}
        onChange={(v) => update({
          target: v.target,
          ldap: v.name,
          name: v.description,
          syntax: v.syntax,
          equality: v.equality,
          multi: !v.single,
          oid: v.oid,
          substr: v.substr,
          usage: v.usage,
        })}
      />
      <div className="grid grid-2">
        <Field label="Source of truth" hint="Which system owns the value." htmlFor="ca-source">
          <Select id="ca-source" value={d.source} options={['Manual', 'Workday HR', 'Contractor intake', 'Active Directory', 'Platform']} onChange={(e) => update({ source: e.target.value })} />
        </Field>
      </div>
      <span className="row">
        <Switch checked={d.indexed} onChange={(v) => update({ indexed: v })} label="Indexed on the server" />
        <span className="t-sm">Indexed on the server</span>
      </span>
    </div>
  )
}

export function CustomAttributeTable({ rows, onChange, directory }) {
  const { toast, confirm, setDrawer } = useApp()

  // Opened in the same drawer the Schema section uses to add an attribute type.
  const openForm = (row) => {
    let draft = row ? { ...row } : emptyAttr(directory)
    setDrawer({
      title: row ? 'Edit custom attribute' : 'Add custom attribute',
      sub: `Read from ${directory} on every synchronization.`,
      size: 'lg',
      children: <CustomAttributeForm initial={draft} onChange={(v) => { draft = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon={row ? 'save' : 'plus'}
            onClick={() => {
              if (!String(draft.ldap || '').trim() || !String(draft.name || '').trim()) {
                toast('warn', 'Name and description required', 'Give the attribute a name and a description before saving it.')
                return
              }
              if (row) {
                onChange(rows.map((r) => (r.id === row.id ? { ...r, ...draft } : r)))
                toast('ok', 'Attribute saved', `${draft.name} reads from ${draft.ldap}.`)
              } else {
                onChange([...rows, { ...draft, id: nextId(rows) }])
                toast('ok', 'Attribute created', `${draft.name} is read from the next synchronization.`)
              }
              setDrawer(null)
            }}
          >
            {row ? 'Save attribute' : 'Add attribute'}
          </Button>
        </>
      ),
    })
  }

  const remove = (row) => confirm({
    title: `Delete the ${row.name} attribute?`,
    body: `${row.ldap} stops being read from ${directory} at the next synchronization. Values already stored on identities are retained.`,
    confirmLabel: 'Delete attribute',
    onConfirm: () => {
      onChange(rows.filter((r) => r.id !== row.id))
      toast('ok', 'Attribute deleted', row.name)
    },
  })

  return (
    <Card
      title="Custom attributes"
      sub={`Directory attributes beyond the standard schema that ${directory} exposes to the platform`}
      flush
      actions={
        <>
          <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} custom attributes queued for CSV export.`)}>Export</Button>
          <Button size="sm" variant="pri" icon="plus" onClick={() => openForm(null)}>Add attribute</Button>
        </>
      }
      footer={
        <>
          <span><b className="num">{rows.length}</b> custom attributes</span>
          <span><b className="num">{rows.filter((r) => r.indexed).length}</b> indexed</span>
          <span className="spacer" />
          <span>Unindexed attributes force a full subtree scan on every lookup.</span>
        </>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon="tag"
          size="sm"
          title="No custom attributes"
          body="Only the standard schema is read from this directory."
          actions={<Button size="sm" variant="pri" icon="plus" onClick={() => openForm(null)}>Add attribute</Button>}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}><table className="tbl">
          <thead>
            <tr>
              <th>Label</th>
              <th>LDAP attribute</th>
              <th>Syntax</th>
              <th>Cardinality</th>
              <th>Indexed</th>
              <th>Source</th>
              <th style={{ width: 150 }}>Populated</th>
              <th className="td-act" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td-main">{r.name}</td>
                <td className="td-mono">{r.ldap}</td>
                <td>{syntaxLabel(r.syntax)}</td>
                <td>{r.multi ? <Tag>Multi valued</Tag> : <span className="t-mut">Single</span>}</td>
                <td>{r.indexed ? <Pill tone="ok" dot>Indexed</Pill> : <Pill tone="warn" dot>Scan</Pill>}</td>
                <td>{r.source}</td>
                <td>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 54 }}>
                      <Meter value={r.populated} tone={r.populated > 70 ? 'ok' : r.populated > 40 ? 'warn' : 'bad'} />
                    </span>
                    <span className="t-xs num">{r.populated}%</span>
                  </span>
                </td>
                <td className="td-act">
                  <span className="row" style={{ gap: 2, justifyContent: 'flex-end' }}>
                    <IconButton icon="edit" size="sm" label={`Edit ${r.name}`} onClick={() => openForm(r)} />
                    <IconButton icon="trash" size="sm" label={`Delete ${r.name}`} onClick={() => remove(r)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </Card>
  )
}
