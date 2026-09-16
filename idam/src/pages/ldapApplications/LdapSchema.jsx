import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import {
  CLASS_TYPES, EQUALITIES, SCHEMA_TARGETS, SUBSTRINGS, SYNTAXES, USAGES, syntaxLabel,
} from './schemaData'

// One editor for both kinds of schema object, with the raw OID fields folded
// behind an advanced toggle — the friendly form is what an operator needs, and
// the raw values are still there when the directory demands them.
export function DefinitionForm({ kind, attributes, initial, onChange }) {
  const [d, setD] = useState(initial)
  const [advanced, setAdvanced] = useState(false)
  const set = (k, v) => { const next = { ...d, [k]: v }; setD(next); onChange(next) }
  const chips = (key) => (
    <div className="schema-chips">
      {attributes.map((a) => {
        const on = d[key].includes(a.name)
        return (
          <button
            key={a.name}
            type="button"
            className="chip"
            data-on={on ? 'true' : undefined}
            onClick={() => set(key, on ? d[key].filter((x) => x !== a.name) : [...d[key], a.name])}
          >
            {a.name}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field label="Schema entry" span={2} hint="Where the definition is written.">
          <Select value={d.target} options={SCHEMA_TARGETS} onChange={(e) => set('target', e.target.value)} />
        </Field>
        <Field label="Name" required htmlFor="sch-name" hint={kind === 'class' ? 'Referenced by entries as an objectClass.' : 'Referenced by entries as an attribute type.'}>
          <TextInput id="sch-name" className="mono" value={d.name} placeholder={kind === 'class' ? 'myAppPerson' : 'myCustomAttr'} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="sch-desc">
          <TextInput id="sch-desc" value={d.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        {kind === 'class' ? (
          <>
            <Field label="Type" htmlFor="sch-type">
              <Select id="sch-type" value={d.type} options={CLASS_TYPES} onChange={(e) => set('type', e.target.value)} />
            </Field>
            <Field label="Superior class" htmlFor="sch-sup">
              <TextInput id="sch-sup" className="mono" value={d.superior} placeholder="top" onChange={(e) => set('superior', e.target.value)} />
            </Field>
            <Field label="MUST — required attributes" span={2} hint="Every entry of this class must carry these.">
              {chips('must')}
            </Field>
            <Field label="MAY — optional attributes" span={2} hint="Permitted, not required.">
              {chips('may')}
            </Field>
          </>
        ) : (
          <>
            <Field label="Syntax" htmlFor="sch-syn" hint="What kind of value the attribute holds.">
              <Select id="sch-syn" value={d.syntax} options={SYNTAXES} onChange={(e) => set('syntax', e.target.value)} />
            </Field>
            <Field label="Equality match" htmlFor="sch-eq" hint="How the server compares two values.">
              <Select id="sch-eq" value={d.equality} options={EQUALITIES} onChange={(e) => set('equality', e.target.value)} />
            </Field>
            <Field label="Values" span={2}>
              <div className="row">
                <Switch checked={d.single} onChange={(v) => set('single', v)} label="Single valued" />
                <span className="t-sm">Single valued — the entry may hold only one value</span>
              </div>
            </Field>
          </>
        )}
      </div>

      <div className="row">
        <Switch checked={advanced} onChange={setAdvanced} label="Show raw OID fields" />
        <span className="t-sm">Raw OID fields</span>
      </div>

      {advanced && (
        <div className="grid grid-2">
          <Field label="OID" span={kind === 'class' ? 2 : 1} hint="Left blank, the platform allocates one under its own arc.">
            <TextInput className="mono" value={d.oid} placeholder="auto-generated if blank" onChange={(e) => set('oid', e.target.value)} />
          </Field>
          {kind === 'attribute' && (
            <>
              <Field label="Substring match">
                <Select value={d.substr} options={SUBSTRINGS.filter(Boolean)} placeholder="None" onChange={(e) => set('substr', e.target.value)} />
              </Field>
              <Field label="Usage" span={2}>
                <Select value={d.usage} options={USAGES} onChange={(e) => set('usage', e.target.value)} />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// The schema the directory publishes. Custom definitions are the tenant's own
// and are the only ones an operator may delete — a standard class is the
// server's, and deleting it is not an option the UI should offer.
export default function LdapSchema({ app, schema, setSchema, onExport }) {
  const { toast, confirm, setDrawer } = useApp()
  const [tab, setTab] = useState('classes')
  const [customOnly, setCustomOnly] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState([])
  const draft = useState(() => ({ current: null }))[0]

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const keep = (x) => (!customOnly || x.custom)
      && (!needle || x.name.toLowerCase().includes(needle) || String(x.description).toLowerCase().includes(needle))
    return { classes: schema.classes.filter(keep), attributes: schema.attributes.filter(keep) }
  }, [schema, customOnly, q])

  const removeDef = (kind, def) => confirm({
    title: `Delete ${def.name}?`,
    body: kind === 'class'
      ? `Entries still holding ${def.name} as an objectClass fail their next write until the class is restored.`
      : `${def.name} is removed from the schema. Entries holding a value for it fail their next write.`,
    confirmLabel: 'Delete definition',
    onConfirm: () => {
      setSchema((s) => ({ ...s, [kind === 'class' ? 'classes' : 'attributes']: s[kind === 'class' ? 'classes' : 'attributes'].filter((x) => x.name !== def.name) }))
      toast('ok', 'Definition deleted', `${def.name} removed from ${app.displayName}.`)
    },
  })

  const openForm = (kind) => {
    draft.current = kind === 'class'
      ? { target: SCHEMA_TARGETS[5].value, name: '', description: '', type: 'STRUCTURAL', superior: 'inetOrgPerson', must: [], may: [], oid: '' }
      : { target: SCHEMA_TARGETS[5].value, name: '', description: '', syntax: SYNTAXES[0].value, equality: 'caseIgnoreMatch', single: true, oid: '', substr: '', usage: 'userApplications' }
    setDrawer({
      title: kind === 'class' ? 'Add object class' : 'Add attribute type',
      sub: `Written to the schema of ${app.displayName}.`,
      size: 'lg',
      children: (
        <DefinitionForm
          kind={kind}
          attributes={schema.attributes}
          initial={draft.current}
          onChange={(v) => { draft.current = v }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="plus"
            onClick={() => {
              const d = draft.current
              if (!d.name.trim()) { toast('warn', 'Name required', 'A definition needs a name before it can be written.'); return }
              const oid = d.oid.trim() || `1.3.6.1.4.1.99999.${kind === 'class' ? 2 : 1}.${schema[kind === 'class' ? 'classes' : 'attributes'].length + 20}`
              const def = kind === 'class'
                ? { ...d, name: d.name.trim(), oid, custom: true }
                : { ...d, name: d.name.trim(), oid, custom: true }
              setSchema((s) => (kind === 'class'
                ? { ...s, classes: [def, ...s.classes] }
                : { ...s, attributes: [def, ...s.attributes] }))
              setDrawer(null)
              toast('ok', kind === 'class' ? 'Object class created' : 'Attribute created', `${def.name} · ${oid}`)
            }}
          >
            {kind === 'class' ? 'Create object class' : 'Create attribute'}
          </Button>
        </>
      ),
    })
  }

  return (
    <div className="stack schema">
      <div className="schema-bar">
        <div className="seg" role="group" aria-label="Schema view">
          <button type="button" data-on={tab === 'classes' || undefined} onClick={() => setTab('classes')}>
            Object classes <b className="num">{filtered.classes.length}</b>
          </button>
          <button type="button" data-on={tab === 'attributes' || undefined} onClick={() => setTab('attributes')}>
            Attributes <b className="num">{filtered.attributes.length}</b>
          </button>
        </div>

        <label className="schema-only">
          <Switch checked={customOnly} onChange={setCustomOnly} label="Custom definitions only" />
          <span>Custom only</span>
        </label>

        <div className="dt-search">
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the schema…" aria-label="Search the schema" />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </div>

        <span className="spacer" />
        <Button size="sm" icon="download" onClick={onExport}>Export LDIF</Button>
        <Button size="sm" icon="plus" onClick={() => openForm('class')}>Add class</Button>
        <Button size="sm" variant="pri" icon="plus" onClick={() => openForm('attribute')}>Add attribute</Button>
      </div>

      {tab === 'classes' ? (
        <div className="schema-list">
          {filtered.classes.map((c) => {
            const isOpen = open.includes(c.name)
            return (
              <div className="schema-row" key={c.name} data-open={isOpen || undefined}>
                {/* A row header cannot be a <button>: it carries the delete
                    control, and a button inside a button is invalid. */}
                <div
                  className="schema-head"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => (isOpen ? o.filter((x) => x !== c.name) : [...o, c.name]))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpen((o) => (isOpen ? o.filter((x) => x !== c.name) : [...o, c.name]))
                    }
                  }}
                >
                  <Icon name="chevR" size={12} className="schema-chev" data-open={isOpen || undefined} />
                  <Icon name="layers" size={14} className="schema-ic" />
                  <b>{c.name}</b>
                  <Tag>{c.type}</Tag>
                  {c.custom && <Tag tone="acc">custom</Tag>}
                  <span className="spacer" />
                  <span className="mono t-xs t-mut">{c.oid}</span>
                  {c.custom && (
                    <IconButton icon="trash" size="sm" className="dt-del" label={`Delete ${c.name}`} onClick={(e) => { e.stopPropagation(); removeDef('class', c) }} />
                  )}
                </div>
                {isOpen && (
                  <div className="schema-body">
                    <p>{c.description}</p>
                    <div className="schema-kv"><span>Superior</span><b className="mono">{c.superior}</b></div>
                    <div className="schema-kv">
                      <span>MUST — required ({c.must.length})</span>
                      <span className="schema-chips">
                        {c.must.length ? c.must.map((m) => <span className="tag mono" key={m}>{m}</span>) : <span className="t-faint">none</span>}
                      </span>
                    </div>
                    <div className="schema-kv">
                      <span>MAY — optional ({c.may.length})</span>
                      <span className="schema-chips">
                        {c.may.length ? c.may.map((m) => <span className="tag mono" key={m}>{m}</span>) : <span className="t-faint">none</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.classes.length === 0 && <div className="dt-none">No object class matches.</div>}
        </div>
      ) : (
        <div className="wb-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 150 }}>Syntax</th>
                <th style={{ width: 170 }}>Equality</th>
                <th style={{ width: 90 }}>Values</th>
                <th style={{ width: 200 }}>OID</th>
                <th className="td-act" />
              </tr>
            </thead>
            <tbody>
              {filtered.attributes.map((a) => (
                <tr key={a.name}>
                  <td className="td-main">
                    <span className="cell-stack">
                      <span className="row" style={{ gap: 6 }}>
                        <Icon name="tag" size={12} style={{ color: 'var(--faint)' }} />
                        <span className="mono">{a.name}</span>
                        {a.custom && <Tag tone="acc">custom</Tag>}
                      </span>
                      <span className="cell-sub trunc">{a.description}</span>
                    </span>
                  </td>
                  <td>{syntaxLabel(a.syntax)}</td>
                  <td className="td-mono">{a.equality || '—'}</td>
                  <td><Tag tone={a.single ? 'acc' : undefined}>{a.single ? 'single' : 'multi'}</Tag></td>
                  <td className="td-mono">{a.oid}</td>
                  <td className="td-act">
                    {a.custom && (
                      <IconButton icon="trash" size="sm" className="dt-del" label={`Delete ${a.name}`} onClick={() => removeDef('attribute', a)} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.attributes.length === 0 && <div className="dt-none">No attribute matches.</div>}
        </div>
      )}

      <div className="schema-foot">
        <span className="mono">cn=schema,cn=config</span>
        <span className="spacer" />
        <span>
          {customOnly
            ? 'Showing the definitions this tenant added. Standard definitions are hidden.'
            : 'Showing every definition the directory publishes. Only custom ones can be deleted.'}
        </span>
      </div>
    </div>
  )
}
