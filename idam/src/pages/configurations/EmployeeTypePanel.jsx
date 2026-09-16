import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Menu from '../../components/primitives/Menu'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Pill from '../../components/primitives/Pill'
import { useApp } from '../../store/AppContext'
import { LOOKUPS } from '../../data/seed'
import { MSG, isAuto } from './rules'

// The seed list. Panels that only need a static list (username and email
// policy) read this; the matrix itself takes the live lookup so a type added
// under Lookups gets a column the moment it exists.
export const EMPLOYEE_TYPES = LOOKUPS.employee_type

const STATES = ['off', 'opt', 'req']
const STATE_LABEL = { off: 'Hidden', opt: 'Optional', req: 'Required' }
const STATE_SHORT = { off: 'Hidden', opt: 'Optional', req: 'Required' }
const STATE_ICON = { off: 'eyeoff', opt: 'minus', req: 'check' }

// A workforce class that is not a person: core identity attributes (name,
// email) may be hidden for it. Anything else keeps them required.
export const isNonHuman = (type) => /service|system|bot|robot|machine|api|daemon|integration/i.test(String(type))
const typeIcon = (type) => (isNonHuman(type) ? 'server' : /contract|vendor|partner|extern/i.test(type) ? 'building' : 'user')

// An attribute nobody has configured for a given employee type has no stored
// setting at all. The fallback is the platform's own: default attributes show
// as enabled and those that are inherently required show as required, and
// everything else shows as off. Defining an attribute is not the same as
// putting it on somebody's form.
const defaultFor = (attr) => (attr.core ? (attr.req ? 'req' : 'opt') : 'off')

/*
 * Two separate locks, as the platform has them.
 *
 * A default attribute may not be switched off — the system needs it — and its
 * required status is locked by this screen for every default attribute. An
 * attribute the system fills in itself may be switched on or off freely but can
 * never be made mandatory: demanding that a person supply a value the system
 * generates is a contradiction.
 */
const allowedStates = (attr) => {
  if (attr.core) return []
  if (isAuto(attr.type)) return ['off', 'opt']
  return STATES
}

const buildDefaults = (attrs, types) => Object.fromEntries(
  attrs.map((a) => [a.id, Object.fromEntries(types.map((t) => [t, defaultFor(a, t)]))]),
)

const csvOf = (attrs, types, cell) => [
  ['Attribute', 'Id', ...types].join(','),
  ...attrs.map((a) => [JSON.stringify(a.label), a.id, ...types.map((t) => STATE_LABEL[cell(a.id, t)])].join(',')),
].join('\n')

function AddTypeForm({ types, onChange }) {
  const [draft, setDraft] = useState({ name: '', from: '__defaults' })
  const set = (k, v) => { const next = { ...draft, [k]: v }; setDraft(next); onChange(next) }
  return (
    <div className="stack">
      <Field label="Employee type" required hint="Shown on the identity form and used by lifecycle rules. Becomes a value of the employee_type lookup.">
        <TextInput value={draft.name} placeholder="e.g. Accountant, Administrator, Intern" onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Start from" hint="Copy an existing type's applicability, or take the platform defaults for the attributes.">
        <Select
          value={draft.from}
          options={[{ value: '__defaults', label: 'Platform defaults' }, ...types.map((t) => ({ value: t, label: `Copy of ${t}` }))]}
          onChange={(e) => set('from', e.target.value)}
        />
      </Field>
      {draft.name && (
        <div className="etm-preview">
          <Icon name={typeIcon(draft.name)} size={13} />
          <span>{draft.name}</span>
          <span className="t-xs t-mut">{isNonHuman(draft.name) ? 'Read as a non-human identity: core attributes may be hidden.' : 'Read as a workforce identity: core attributes stay required.'}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Which attributes apply to which employee type on the identity form.
 *
 * Two views over the same matrix. The grid shows every type side by side with
 * a pinned attribute column and a bounded, horizontally scrolling body, so
 * forty types are a scroll rather than a squeeze. The by-type view lists the
 * types in a rail and edits one column at a time, which is how a new class is
 * actually configured. Every cell cycles Hidden → Optional → Required.
 */
export default function EmployeeTypePanel({
  attrs, sectionName, types: typesProp, onAddType, onRemoveType,
}) {
  const { toast, confirm, setDrawer } = useApp()
  const types = typesProp && typesProp.length ? typesProp : EMPLOYEE_TYPES
  const [matrix, setMatrix] = useState(() => buildDefaults(attrs, types))
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState('matrix')
  const [q, setQ] = useState('')
  const [section, setSection] = useState('all')
  const [hidden, setHidden] = useState([]) // types hidden from the grid
  const [collapsed, setCollapsed] = useState([])
  const [active, setActive] = useState(types[0])
  const [typeQ, setTypeQ] = useState('')
  const [menu, setMenu] = useState(null)
  const draft = useState(() => ({ current: null }))[0]

  // An attribute or a type defined after this matrix was first built still
  // needs a cell. It takes the default for its definition rather than reading
  // as "hidden everywhere", which would silently drop it from every form.
  const filled = useMemo(() => {
    const out = {}
    attrs.forEach((a) => {
      const row = matrix[a.id] || {}
      out[a.id] = {}
      types.forEach((t) => { out[a.id][t] = row[t] || defaultFor(a, t) })
    })
    return out
  }, [attrs, types, matrix])

  const cell = (attrId, type) => (filled[attrId] && filled[attrId][type]) || 'off'
  const isDefault = (a, t) => cell(a.id, t) === defaultFor(a)
  // A state a bulk action may legitimately write. A disabled field cannot be
  // made mandatory, so `req` is only reachable once the field is switched on.
  const canSet = (a, t, s) => allowedStates(a).includes(s) && !(s === 'req' && cell(a.id, t) === 'off')

  const write = (updates) => {
    setMatrix((m) => {
      const next = { ...m }
      updates.forEach(([attrId, t, s]) => { next[attrId] = { ...(next[attrId] || filled[attrId]), [t]: s } })
      return next
    })
    setDirty(true)
  }

  const setCell = (a, t, s) => {
    const cur = cell(a.id, t)
    if (s === cur) return
    if (a.core) {
      toast('bad', 'Change refused', s === 'off'
        ? 'Default attributes cannot be disabled. The system needs them.'
        : MSG.requiredDefault)
      return
    }
    if (s === 'req' && cur === 'off') { toast('bad', 'Change refused', MSG.requiredDisabled); return }
    if (s === 'req' && isAuto(a.type)) { toast('bad', 'Change refused', MSG.requiredAuto); return }
    write([[a.id, t, s]])
  }
  const cycle = (a, t) => {
    const opts = allowedStates(a)
    if (opts.length === 0) { setCell(a, t, 'off'); return }
    const next = opts[(opts.indexOf(cell(a.id, t)) + 1) % opts.length]
    setCell(a, t, next)
  }

  const setColumn = (t, s) => {
    const changes = attrs.filter((a) => canSet(a, t, s)).map((a) => [a.id, t, s])
    write(changes)
    const skipped = attrs.length - changes.length
    toast('ok', `${t} set to ${STATE_LABEL[s].toLowerCase()}`, skipped
      ? `${changes.length} attributes changed · ${skipped} left alone: default attributes and auto-filled fields are locked, and a disabled field cannot be made mandatory.`
      : `${changes.length} attributes changed.`)
  }
  const resetColumn = (t) => { write(attrs.filter((a) => !a.core).map((a) => [a.id, t, defaultFor(a)])); toast('ok', `${t} reset`, 'Applicability restored to the platform defaults.') }
  const copyColumn = (from, to) => {
    const changes = attrs.filter((a) => canSet(a, to, cell(a.id, from))).map((a) => [a.id, to, cell(a.id, from)])
    write(changes)
    toast('ok', `${to} now matches ${from}`, `${changes.length} of ${attrs.length} attributes copied.`)
  }
  const setRow = (a, s) => {
    const changes = types.filter((t) => canSet(a, t, s)).map((t) => [a.id, t, s])
    if (changes.length === 0) { setCell(a, types[0], s); return }
    write(changes)
    toast('ok', `${a.label} set to ${STATE_LABEL[s].toLowerCase()}`, `${changes.length} of ${types.length} employee types changed.`)
  }

  const counts = useMemo(() => Object.fromEntries(types.map((t) => {
    let req = 0, visible = 0, changed = 0
    attrs.forEach((a) => {
      const s = cell(a.id, t)
      if (s !== 'off') visible += 1
      if (s === 'req') req += 1
      if (!isDefault(a, t)) changed += 1
    })
    return [t, { req, visible, changed }]
  })), [filled, attrs, types]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalChanged = types.reduce((n, t) => n + counts[t].changed, 0)

  // Rows: filtered by search and section, then grouped by section in order.
  const needle = q.trim().toLowerCase()
  const visibleAttrs = attrs.filter((a) => (section === 'all' || a.section === section)
    && (!needle || a.label.toLowerCase().includes(needle) || a.id.toLowerCase().includes(needle)))
  const sections = useMemo(() => {
    const order = []
    attrs.forEach((a) => { if (!order.includes(a.section)) order.push(a.section) })
    return order
  }, [attrs])
  const groups = sections
    .map((s) => ({ id: s, label: sectionName[s] || s, rows: visibleAttrs.filter((a) => a.section === s) }))
    .filter((g) => g.rows.length)

  const shownTypes = types.filter((t) => !hidden.includes(t))
  const railTypes = types.filter((t) => !typeQ.trim() || t.toLowerCase().includes(typeQ.trim().toLowerCase()))

  const openAdd = () => {
    draft.current = { name: '', from: '__defaults' }
    setDrawer({
      title: 'Add employee type',
      sub: 'A new workforce class with its own attribute applicability.',
      children: <AddTypeForm types={types} onChange={(v) => { draft.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="plus"
            onClick={() => {
              const name = String(draft.current.name || '').trim()
              if (!name) { toast('warn', 'Name required', 'Give the employee type a name.'); return }
              if (types.some((t) => t.toLowerCase() === name.toLowerCase())) { toast('warn', 'Already defined', `${name} is already an employee type.`); return }
              const from = draft.current.from
              setMatrix((m) => {
                const next = { ...m }
                attrs.forEach((a) => {
                  const src = from === '__defaults' || a.core ? defaultFor(a) : cell(a.id, from)
                  next[a.id] = { ...(next[a.id] || filled[a.id]), [name]: src }
                })
                return next
              })
              onAddType && onAddType(name)
              setDirty(true)
              setActive(name)
              setView('type')
              setDrawer(null)
              toast('ok', 'Employee type added', `${name} joins the employee_type lookup with ${attrs.length} attribute rules.`)
            }}
          >
            Add type
          </Button>
        </>
      ),
    })
  }

  const removeType = (t) => confirm({
    title: `Remove ${t}?`,
    body: `${t} is removed from the employee_type lookup. Identities already classified as ${t} keep the value until re-classified, and the create form no longer offers it.`,
    confirmLabel: 'Remove type',
    onConfirm: () => {
      setMatrix((m) => Object.fromEntries(Object.entries(m).map(([id, row]) => { const { [t]: _drop, ...rest } = row; return [id, rest] })))
      setHidden((h) => h.filter((x) => x !== t))
      if (active === t) setActive(types.find((x) => x !== t) || '')
      onRemoveType && onRemoveType(t)
      setDirty(true)
      toast('ok', 'Employee type removed', t)
    },
  })

  const columnMenu = (e, t) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: t, header: true },
      { icon: 'check', label: 'Set every attribute required', onSelect: () => setColumn(t, 'req') },
      { icon: 'minus', label: 'Set every attribute optional', onSelect: () => setColumn(t, 'opt') },
      { icon: 'eyeoff', label: 'Hide every attribute', onSelect: () => setColumn(t, 'off') },
      { divider: true },
      ...types.filter((x) => x !== t).slice(0, 8).map((x) => ({ icon: 'copy', label: `Copy from ${x}`, onSelect: () => copyColumn(x, t) })),
      { divider: true },
      { icon: 'refresh', label: 'Reset to defaults', disabled: counts[t].changed === 0, onSelect: () => resetColumn(t) },
      { icon: 'eyeoff', label: 'Hide column', disabled: shownTypes.length <= 1, onSelect: () => setHidden((h) => [...h, t]) },
      { icon: 'trash', label: 'Remove employee type', danger: true, disabled: !onRemoveType || types.length <= 1, onSelect: () => removeType(t) },
    ],
  })

  const rowMenu = (e, a) => setMenu({
    anchor: e.currentTarget,
    items: [
      { label: `${a.label} · every type`, header: true },
      { icon: 'check', label: 'Required everywhere', disabled: !!a.core || isAuto(a.type), onSelect: () => setRow(a, 'req') },
      { icon: 'minus', label: 'Optional everywhere', disabled: !!a.core, onSelect: () => setRow(a, 'opt') },
      { icon: 'eyeoff', label: 'Hidden everywhere', disabled: !!a.core, onSelect: () => setRow(a, 'off') },
      { divider: true },
      { icon: 'refresh', label: 'Reset row', disabled: !!a.core, onSelect: () => write(types.map((t) => [a.id, t, defaultFor(a)])) },
    ],
  })

  const save = () => {
    setDirty(false)
    toast('ok', 'Employee type attributes saved', `${attrs.length} attributes × ${types.length} employee types. The identity form now renders per type.`)
  }
  const resetAll = () => {
    setMatrix(buildDefaults(attrs, types))
    setDirty(false)
    toast('ok', 'Matrix reset', 'Employee type applicability restored to defaults for every type.')
  }
  const exportCsv = () => {
    const blob = new Blob([csvOf(attrs, types, cell)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'employee-type-applicability.csv'; a.click()
    URL.revokeObjectURL(url)
    toast('ok', 'Matrix exported', `${attrs.length} rows × ${types.length} types written to CSV.`)
  }

  const lockNote = (a) => (a.core
    ? 'default attribute — cannot be disabled and its required status is fixed'
    : isAuto(a.type)
      ? 'auto-filled attribute — may be switched on or off, never made mandatory'
      : '')

  const StateBtn = ({ a, t, wide }) => {
    const s = cell(a.id, t)
    const note = lockNote(a)
    return (
      <button
        type="button"
        className={`etm-btn ${wide ? 'is-wide' : ''}`}
        data-state={s}
        data-changed={!isDefault(a, t) || undefined}
        data-lock={a.core || undefined}
        aria-label={`${a.label} for ${t}: ${STATE_LABEL[s]}${note ? ` (${note})` : ''}`}
        title={note ? `${STATE_LABEL[s]} · ${note}` : `${STATE_LABEL[s]} · click to change`}
        onClick={() => cycle(a, t)}
      >
        <Icon name={a.core ? 'lock' : STATE_ICON[s]} size={11} />
        <span>{STATE_SHORT[s]}</span>
      </button>
    )
  }

  // Each state is disabled on its own rule, so the reason a control is greyed
  // out is the rule itself rather than a blanket lock.
  const segDisabled = (a, t, st) => {
    if (a.core) return true
    if (st === 'req') return isAuto(a.type) || cell(a.id, t) === 'off'
    return false
  }

  const StateSeg = ({ a, t }) => {
    const s = cell(a.id, t)
    const note = lockNote(a)
    return (
      <div className="seg etm-seg" role="radiogroup" aria-label={`${a.label} for ${t}`} title={note || undefined}>
        {STATES.map((st) => (
          <button
            key={st}
            type="button"
            role="radio"
            aria-checked={s === st}
            data-on={s === st}
            data-state={st}
            disabled={segDisabled(a, t, st)}
            onClick={() => setCell(a, t, st)}
          >
            <Icon name={STATE_ICON[st]} size={12} />{STATE_LABEL[st]}
          </button>
        ))}
      </div>
    )
  }

  const attrCell = (a) => (
    <span className="cell-id etm-attr">
      <span className="etm-attr-ic" data-core={a.core || undefined}><Icon name={a.core ? 'lock' : 'sliders'} size={12} /></span>
      <span className="cell-stack">
        <span className="trunc">{a.label}{isAuto(a.type) && <Pill tone="mut">auto-filled</Pill>}</span>
        <span className="cell-sub mono trunc">{a.id} · {sectionName[a.section] || a.section}</span>
      </span>
    </span>
  )

  const toolbar = (
    <div className="wb-bar etm-bar">
      <div className="wb-bar-l">
        <label className="wb-search">
          <Icon name="search" size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter attributes…" aria-label="Filter attributes" />
          {q && <IconButton icon="x" size="sm" label="Clear" onClick={() => setQ('')} />}
        </label>
        <Select
          value={section}
          aria-label="Section"
          options={[{ value: 'all', label: 'All sections' }, ...sections.map((s) => ({ value: s, label: sectionName[s] || s }))]}
          onChange={(e) => setSection(e.target.value)}
        />
        {view === 'matrix' && (
          <span className="etm-cols">
            <span className="t-xs t-mut">Columns</span>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                data-on={!hidden.includes(t)}
                aria-pressed={!hidden.includes(t)}
                onClick={() => setHidden((h) => (h.includes(t) ? h.filter((x) => x !== t) : (shownTypes.length > 1 ? [...h, t] : h)))}
              >
                <Icon name={typeIcon(t)} />{t}
                {counts[t].changed > 0 && <i className="etm-chip-dot" />}
              </button>
            ))}
            {hidden.length > 0 && <button type="button" className="link t-xs" onClick={() => setHidden([])}>Show all</button>}
          </span>
        )}
      </div>
      <div className="etm-bar-r">
        <span className="etm-legend" aria-label="Legend">
          <span><i className="etm-dot" data-state="req" />Required</span>
          <span><i className="etm-dot" data-state="opt" />Optional</span>
          <span><i className="etm-dot" data-state="off" />Hidden</span>
          <span><i className="etm-dot" data-changed="true" />Changed</span>
        </span>
      </div>
    </div>
  )

  return (
    <>
      <Card
        className="etm-card"
        flush
        title="Attribute applicability by employee type"
        sub={(
          <>
            {attrs.length} attributes × {types.length} employee types
            {totalChanged > 0 && <> · <b className="num">{totalChanged}</b> cells differ from the defaults</>}
            {dirty && <> · <span className="etm-unsaved">unsaved</span></>}
          </>
        )}
        actions={(
          <div className="etm-actions">
            <div className="seg" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={view === 'matrix'} data-on={view === 'matrix'} onClick={() => setView('matrix')}><Icon name="columns" size={12} />Grid</button>
              <button type="button" role="tab" aria-selected={view === 'type'} data-on={view === 'type'} onClick={() => setView('type')}><Icon name="panelLeft" size={12} />By type</button>
            </div>
            <IconButton icon="download" size="sm" label="Export matrix as CSV" onClick={exportCsv} />
            <Button size="sm" icon="plus" onClick={openAdd}>Add type</Button>
            <Button size="sm" icon="refresh" onClick={resetAll}>Reset</Button>
            <Button size="sm" variant="pri" icon="save" disabled={!dirty} onClick={save}>Save matrix</Button>
          </div>
        )}
        footer={(
          <>
            <span>
              <b className="num">{visibleAttrs.length}</b> of {attrs.length} attributes
              {view === 'matrix' && <> · <b className="num">{shownTypes.length}</b> of {types.length} types shown</>}
            </span>
            <span className="spacer" />
            <span className="t-mut">Default attributes cannot be disabled and their required status is fixed · pre-populate and smart-populate attributes can never be made mandatory · a disabled field cannot be made mandatory.</span>
          </>
        )}
      >
        {toolbar}

        {view === 'matrix' ? (
          <div className="wb-scroll etm-scroll" data-bounded>
            <table className="tbl etm-tbl" style={{ minWidth: 300 + shownTypes.length * 120 }}>
              <thead>
                <tr>
                  <th className="etm-th-attr">
                    <span className="th-in">Attribute</span>
                  </th>
                  {shownTypes.map((t) => (
                    <th key={t} className="etm-th" data-active={active === t || undefined}>
                      <button type="button" className="etm-th-btn" onClick={(e) => columnMenu(e, t)} title={`${t} · column actions`}>
                        <span className="etm-th-name">
                          <Icon name={typeIcon(t)} size={12} />
                          <span className="trunc">{t}</span>
                          <Icon name="chevD" size={10} className="etm-th-chev" />
                        </span>
                        <span className="etm-th-sub">
                          <b className="num">{counts[t].visible}</b> shown · <b className="num">{counts[t].req}</b> req
                          {counts[t].changed > 0 && <i className="etm-dot" data-changed="true" title={`${counts[t].changed} changed`} />}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="etm-th-row" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isCollapsed = collapsed.includes(g.id)
                  return [
                    <tr key={`g-${g.id}`} className="etm-grp">
                      <td colSpan={shownTypes.length + 2}>
                        <button type="button" className="etm-grp-btn" onClick={() => setCollapsed((c) => (isCollapsed ? c.filter((x) => x !== g.id) : [...c, g.id]))} aria-expanded={!isCollapsed}>
                          <Icon name="chevR" size={11} className="etm-grp-chev" data-open={!isCollapsed || undefined} style={{ transform: isCollapsed ? 'none' : 'rotate(90deg)' }} />
                          <b>{g.label}</b>
                          <span className="t-xs t-mut">{g.rows.length} attributes · {g.rows.filter((a) => a.core).length} core</span>
                        </button>
                      </td>
                    </tr>,
                    ...(isCollapsed ? [] : g.rows.map((a) => (
                      <tr key={a.id} data-core={a.core || undefined}>
                        <td className="td-main etm-td-attr">{attrCell(a)}</td>
                        {shownTypes.map((t) => (
                          <td key={t} className="etm-cell" data-active={active === t || undefined}>
                            <StateBtn a={a} t={t} />
                          </td>
                        ))}
                        <td className="etm-td-row">
                          <IconButton icon="kebab" size="sm" className="row-act" label={`Actions for ${a.label} across every type`} onClick={(e) => rowMenu(e, a)} />
                        </td>
                      </tr>
                    ))),
                  ]
                })}
                {groups.length === 0 && (
                  <tr><td colSpan={shownTypes.length + 2} className="etm-none">No attribute matches “{q}”.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="etm-split">
            <aside className="etm-rail" aria-label="Employee types">
              {types.length > 6 && (
                <label className="wb-search is-block etm-rail-search">
                  <Icon name="search" size={13} />
                  <input value={typeQ} onChange={(e) => setTypeQ(e.target.value)} placeholder="Find a type…" aria-label="Find an employee type" />
                </label>
              )}
              <div className="etm-rail-list" role="tablist" aria-orientation="vertical">
                {railTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active === t}
                    className="etm-rail-it"
                    data-on={active === t || undefined}
                    onClick={() => setActive(t)}
                  >
                    <span className="etm-rail-ic" data-nonhuman={isNonHuman(t) || undefined}><Icon name={typeIcon(t)} size={13} /></span>
                    <span className="cell-stack">
                      <span className="trunc">{t}</span>
                      <span className="cell-sub">{counts[t].visible} shown · {counts[t].req} required</span>
                    </span>
                    {counts[t].changed > 0 && <i className="etm-dot" data-changed="true" title={`${counts[t].changed} changed`} />}
                  </button>
                ))}
                {railTypes.length === 0 && <span className="t-xs t-mut" style={{ padding: '8px 10px' }}>No type matches.</span>}
              </div>
              <button type="button" className="etm-rail-add" onClick={openAdd}><Icon name="plus" size={12} />Add employee type</button>
            </aside>

            <div className="etm-pane">
              {!active ? (
                <EmptyState icon="users" title="No employee type selected" body="Pick a type in the rail, or add one." />
              ) : (
                <>
                  <div className="etm-pane-h">
                    <span className="etm-rail-ic lg" data-nonhuman={isNonHuman(active) || undefined}><Icon name={typeIcon(active)} size={16} /></span>
                    <span className="cell-stack" style={{ flex: 1 }}>
                      <b className="etm-pane-title">{active}</b>
                      <span className="cell-sub">
                        {counts[active].visible} of {attrs.length} attributes shown · {counts[active].req} required
                        · {isNonHuman(active) ? 'non-human identity' : 'workforce identity'}
                        {counts[active].changed > 0 && <> · {counts[active].changed} changed from defaults</>}
                      </span>
                    </span>
                    <div className="etm-pane-acts">
                      <Button size="sm" icon="check" onClick={() => setColumn(active, 'req')}>All required</Button>
                      <Button size="sm" icon="minus" onClick={() => setColumn(active, 'opt')}>All optional</Button>
                      <Button size="sm" icon="eyeoff" onClick={() => setColumn(active, 'off')}>Hide all</Button>
                      <IconButton icon="kebab" size="sm" label={`More actions for ${active}`} onClick={(e) => columnMenu(e, active)} />
                    </div>
                  </div>
                  <div className="etm-pane-list">
                    {groups.map((g) => (
                      <section className="etm-pane-grp" key={g.id}>
                        <header><b>{g.label}</b><span className="t-xs t-mut">{g.rows.length} attributes</span></header>
                        {g.rows.map((a) => (
                          <div className="etm-pane-row" key={a.id} data-changed={!isDefault(a, active) || undefined}>
                            {attrCell(a)}
                            <StateSeg a={a} t={active} />
                          </div>
                        ))}
                      </section>
                    ))}
                    {groups.length === 0 && <div className="etm-none">No attribute matches “{q}”.</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
