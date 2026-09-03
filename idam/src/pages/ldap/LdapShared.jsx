import { useState } from 'react'
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
import SearchSelect from '../../components/primitives/SearchSelect'
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

export function MappingEditorPanel({ mapping, directories, onCancel, onSubmit }) {
  const [d, setD] = useState({
    idam: mapping ? mapping.idam : ATTRS[1].id,
    ldap: mapping ? mapping.ldap : '',
    objectClass: mapping ? mapping.objectClass : 'inetOrgPerson',
    directory: mapping ? mapping.directory : directories[0],
    description: mapping ? mapping.description : '',
  })
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const ready = d.idam && String(d.ldap).trim()

  return (
    <Card
      title={mapping ? 'Edit attribute mapping' : 'New attribute mapping'}
      sub={mapping ? `${mapping.idam} currently reads from ${mapping.ldap}` : 'Translate an identity attribute into a directory attribute.'}
      actions={<IconButton icon="x" size="sm" label="Discard" onClick={onCancel} />}
    >
      <div className="grid grid-2">
        <Field label="Identity attribute" required hint="The attribute held on the Tanflow identity." htmlFor="map-idam">
          <SearchSelect
            id="map-idam"
            value={d.idam}
            options={ATTRS.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` }))}
            placeholder="Select an identity attribute"
            searchPlaceholder="Search identity attributes…"
            onChange={(e) => set('idam', e.target.value)}
          />
        </Field>
        <Field label="LDAP attribute" required hint="The attribute it is read from on the directory." htmlFor="map-ldap">
          <SearchSelect
            id="map-ldap"
            value={d.ldap}
            options={LDAP_ATTRIBUTE_OPTIONS}
            placeholder="Select an LDAP attribute"
            searchPlaceholder="Search directory attributes…"
            onChange={(e) => set('ldap', e.target.value)}
          />
        </Field>
      </div>
      <div className="t-xs t-mut" style={{ marginTop: 10 }}>
        Written against <b>{d.directory}</b> on object class <span className="mono">{d.objectClass}</span>.
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!ready} onClick={() => onSubmit(d)}>
          {mapping ? 'Save mapping' : 'Create mapping'}
        </Button>
      </div>
    </Card>
  )
}

export function MappingTable({ rows, onEdit, onDelete, onDuplicate }) {
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
                <IconButton icon="copy" size="sm" label={`Duplicate ${m.idam}`} onClick={() => onDuplicate(m)} />
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

export function CustomAttributeTable({ rows, onChange, directory }) {
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
      toast('ok', 'Attribute created', `${draft.name} is read from the next synchronization.`)
    }
    setDraft(null)
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
          <Button size="sm" variant="pri" icon="plus" onClick={() => setDraft(emptyAttr(directory))}>Add attribute</Button>
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
      {draft && (
        <div className="card-b" style={{ borderBottom: '1px solid var(--hair)', background: 'var(--surface-2)' }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="t-h3">{draft.id ? 'Edit custom attribute' : 'New custom attribute'}</span>
            <IconButton icon="x" size="sm" label="Discard" onClick={() => setDraft(null)} />
          </div>
          {/* Same editor the Schema section uses to create an attribute type, so
              the two places an operator can define an attribute ask for it in
              the same shape. The fields this table also tracks — where the value
              comes from and whether the server indexes it — follow underneath. */}
          <DefinitionForm
            kind="attribute"
            attributes={[]}
            initial={{
              target: draft.target,
              name: draft.ldap,
              description: draft.name,
              syntax: draft.syntax,
              equality: draft.equality,
              single: !draft.multi,
              oid: draft.oid,
              substr: draft.substr,
              usage: draft.usage,
            }}
            onChange={(v) => setDraft((cur) => ({
              ...cur,
              target: v.target,
              ldap: v.name,
              name: v.description,
              syntax: v.syntax,
              equality: v.equality,
              multi: !v.single,
              oid: v.oid,
              substr: v.substr,
              usage: v.usage,
            }))}
          />
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <Field label="Source of truth" hint="Which system owns the value." htmlFor="ca-source">
              <Select id="ca-source" value={draft.source} options={['Manual', 'Workday HR', 'Contractor intake', 'Active Directory', 'Platform']} onChange={(e) => set('source', e.target.value)} />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 14, gap: 18, flexWrap: 'wrap' }}>
            <span className="row">
              <Switch checked={draft.indexed} onChange={(v) => set('indexed', v)} label="Indexed on the server" />
              <span className="t-sm">Indexed on the server</span>
            </span>
            <span className="spacer" />
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
          body="Only the standard schema is read from this directory."
          actions={<Button size="sm" variant="pri" icon="plus" onClick={() => setDraft(emptyAttr(directory))}>Add attribute</Button>}
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
