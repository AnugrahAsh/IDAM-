import './ConfigurationsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import { LOOKUPS, USERS, nextId } from '../../data/seed'
import UsernameConfigPanel from './UsernameConfigPanel'
import EmailConfigPanel from './EmailConfigPanel'
import EmployeeTypePanel, { EMPLOYEE_TYPES } from './EmployeeTypePanel'
import AttrEditor from './AttrEditor'
import SectionEditor from './SectionEditor'
import LookupEditor from './LookupEditor'
import LookupWorkbench from './LookupWorkbench'
import MultiLookupEditor, { levelColumns } from './MultiLookupEditor'
import SmartPopulateEditor from './SmartPopulateEditor'
import LevelChain from './LevelChain'
import MultiLookupTree from './MultiLookupTree'
import { MULTI_LOOKUPS, MULTI_ROWS, SMART_RULES, slug } from './configData'
import {
  CONFIGURE_TARGET, MSG, canOpenDefault, downloadCsv, isAuto, isProtectedLookup,
  lookupDisplayName, toCsvText, typeLabel, validCharsLabel,
} from './rules'
import { setAttrs as writeAttrs, setSections as writeSections, useAttrs, useSections } from './schemaStore'

/*
 * The seeded lookups are flat value lists. The platform holds each entry as an
 * option/value pair — the label a person picks and the code the system stores —
 * so the seed is lifted into that shape here rather than being edited, and the
 * value defaults to a slug of the option.
 */
const seedLookups = () => Object.fromEntries(Object.entries(LOOKUPS).map(([key, values]) => [
  key,
  { shortName: key, options: values.map((v) => ({ option: v, value: slug(v) })) },
]))

/*
 * Whether any user holds a value for an attribute. A column carrying real data
 * cannot be dropped, so this is what the delete guard consults — the same
 * question the server asks before it drops the column.
 */
const attrHasData = (id) => USERS.some((u) => u[id] != null && String(u[id]).trim() !== '')

export default function ConfigurationsPage() {
  const { toast, confirm, setDrawer } = useApp()
  const [tab, setTab] = useState('attributes')
  // The schema is not local to this screen: an attribute defined here has to
  // reach the identity form, the directory columns and filters, the policy
  // condition builder and the employee-type matrix. All of them read this store.
  const attrs = useAttrs()
  const sections = useSections()
  const setAttrs = writeAttrs
  const setSections = writeSections
  const [lookups, setLookups] = useState(seedLookups)
  /* Which value set the Lookups tab has open. Held on the page rather than in
     the panel so switching tabs and coming back returns to the same set. */
  const [openLookup, setOpenLookup] = useState('')
  const [multi, setMulti] = useState(MULTI_LOOKUPS)
  const [multiData, setMultiData] = useState(MULTI_ROWS)
  const [smartRules, setSmartRules] = useState(SMART_RULES)
  // The multi-level View is a page of its own, read-only, not a side panel: it
  // takes over the page bar and replaces the tab strip, so it reads as somewhere
  // you navigated to rather than a card that appeared under the tabs.
  const [viewing, setViewing] = useState(null)
  const [viewMode, setViewMode] = useState('tree')
  const [treeQuery, setTreeQuery] = useState('')

  const sectionName = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s.name])),
    [sections],
  )
  const lookupKeys = useMemo(() => Object.keys(lookups), [lookups])
  const optionsOf = (key) => ((lookups[key] || {}).options || []).map((o) => o.option)
  // Employee types are the employee_type lookup's options: adding one there
  // gives it a column in the applicability matrix and a generation rule of its
  // own, without a second list to keep in step.
  const employeeTypes = useMemo(
    () => (optionsOf('employee_type').length ? optionsOf('employee_type') : EMPLOYEE_TYPES),
    [lookups],
  ) // eslint-disable-line react-hooks/exhaustive-deps
  const attrLabel = useMemo(
    () => Object.fromEntries(attrs.map((a) => [a.id, a.label])),
    [attrs],
  )

  const openDetail = ({ title, sub, rows, extra }) => setDrawer({
    title,
    sub,
    children: (
      <div className="stack">
        <KeyValue cols={1} rows={rows} />
        {extra}
      </div>
    ),
    footer: <Button variant="pri" onClick={() => setDrawer(null)}>Close</Button>,
  })

  /* ---------------------------------------------------------------- *
   * Attributes
   * ---------------------------------------------------------------- */

  const openAttrEditor = (attr) => {
    if (attr && !canOpenDefault(attr)) {
      toast('warn', 'Default attribute', `${attr.label} ships with the product and cannot be opened for editing.`)
      return
    }
    setDrawer({
      title: attr ? 'Edit attribute' : 'Add Attribute',
      sub: attr
        ? `${attr.id} · ${sectionName[attr.section] || attr.section}`
        : 'Define the field and its rules. Turning it on for an employee type is a separate step.',
      children: (
        <AttrEditor
          attr={attr}
          attrs={attrs}
          sections={sections}
          lookups={lookups}
          multiLookups={multi}
          smartRules={smartRules}
          onCancel={() => setDrawer(null)}
          onSubmit={(next) => {
            setDrawer(null)
            if (attr) {
              /* Replace the row wholesale so options from the previous input type do not linger. */
              setAttrs((rs) => rs.map((r) => (r.id === attr.id ? { ...next, core: r.core } : r)))
              toast('ok', 'Attribute saved', `${next.label} updated on the identity schema.`)
            } else {
              setAttrs((rs) => [...rs, { ...next, core: false }])
              toast('ok', 'Attribute created', `${next.label} added to ${sectionName[next.section] || next.section}. Enable it per employee type to put it on a form.`)
            }
          }}
        />
      ),
    })
  }

  const attrColumns = [
    serialColumn('S.No'),
    {
      key: 'label', label: 'Display name', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id" data-locked={r.core && !canOpenDefault(r) ? 'true' : undefined}>
          {r.core && <Icon name="lock" size={11} style={{ color: 'var(--faint)' }} />}
          <span className="trunc">{r.label}</span>
        </span>
      ),
    },
    { key: 'id', label: 'Attribute name', cls: 'td-mono' },
    {
      key: 'section', label: 'Section',
      value: (r) => sectionName[r.section] || r.section,
      render: (r) => sectionName[r.section] || r.section,
    },
    {
      key: 'type', label: 'Input Type',
      value: (r) => typeLabel(r.type),
      render: (r) => <Tag tone={isAuto(r.type) ? 'acc' : undefined}>{typeLabel(r.type)}</Tag>,
    },
    {
      key: 'src', label: 'Bound list', optional: true,
      value: (r) => r.multiLookup || r.smartRule || r.source || r.src || '',
      render: (r) => {
        if (r.type === 'multi-level') return <Tag>{r.multiLookup || '—'}</Tag>
        if (r.type === 'smart-populate') return <Tag>{r.smartRule || '—'}</Tag>
        if (r.type === 'prepopulate') return <Tag>{r.source || '—'}</Tag>
        if (!r.src) return <span className="t-faint">—</span>
        return <Tag>{lookupDisplayName(r.src)}</Tag>
      },
    },
    {
      key: 'adminPerm', label: 'Admin permission', optional: true,
      render: (r) => <Pill tone={r.adminPerm === 'Hide' ? 'mut' : r.adminPerm === 'Read only' ? 'info' : 'ok'}>{r.adminPerm}</Pill>,
    },
    {
      key: 'unique', label: 'Unique', optional: true,
      value: (r) => (r.unique ? 'Unique' : 'No'),
      render: (r) => (r.unique ? <Pill tone="acc" dot>Unique</Pill> : <span className="t-faint">—</span>),
    },
    {
      key: 'encrypted', label: 'Encryption', optional: true,
      value: (r) => (r.encrypted ? 'Encrypted' : 'Plain text'),
      render: (r) => (r.encrypted
        ? <Pill tone="ok" icon="lock">Encrypted</Pill>
        : <span className="t-faint">Plain text</span>),
    },
    { key: 'order', label: 'Order', align: 'right', width: 78, optional: true },
  ]

  const attrDetail = (r) => openDetail({
    title: r.label,
    sub: `${r.id} · ${sectionName[r.section] || r.section}`,
    rows: [
      { k: 'Attribute name', v: r.id, icon: 'tag' },
      { k: 'Input type', v: typeLabel(r.type), icon: 'sliders' },
      { k: 'Section', v: sectionName[r.section] || r.section, icon: 'layers' },
      r.type === 'multi-level' && { k: 'Multi-level lookup', v: `${r.multiLookup || 'None'}${r.level ? ` · level-${r.level}` : ''}`, icon: 'hierarchy' },
      r.type === 'smart-populate' && { k: 'SmartPopulate', v: r.smartRule || 'None', icon: 'bolt' },
      r.type === 'prepopulate' && { k: 'Copies from', v: r.source ? `${attrLabel[r.source] || r.source} (${r.source})` : 'None', icon: 'swap' },
      (r.type === 'lookup' || r.type === 'select') && { k: 'Lookup', v: r.src ? lookupDisplayName(r.src) : 'None', icon: 'tag' },
      (r.min != null || r.max != null) && { k: 'Length', v: `${r.min == null ? 'no minimum' : r.min} to ${r.max == null ? 'no maximum' : r.max}`, icon: 'sort' },
      r.validChars && { k: 'Valid characters', v: validCharsLabel(r.validChars), icon: 'code' },
      { k: 'Administrator permissions', v: r.adminPerm, icon: 'eye' },
      { k: 'User permissions', v: 'Read Only', icon: 'lock' },
      { k: 'Unique', v: r.unique ? 'Yes' : 'No', icon: 'star' },
      { k: 'Encryption at rest', v: r.encrypted ? 'On — stored encrypted (AES-256)' : 'Off — stored as plain text', icon: r.encrypted ? 'lock' : 'unlock' },
      isAuto(r.type) === false && { k: 'Multi select', v: r.multiValue ? 'Yes' : 'No', icon: 'columns' },
      { k: 'Origin', v: r.core ? 'Default attribute — ships with the product' : 'Custom attribute', icon: r.core ? 'lock' : 'plus' },
      { k: 'Holds data', v: attrHasData(r.id) ? 'Yes — cannot be deleted until cleared' : 'No', icon: 'db' },
    ].filter(Boolean),
    extra: r.src && lookups[r.src] ? (
      <Card flush title="Permitted values" sub={`${optionsOf(r.src).length} options from ${lookupDisplayName(r.src)}`}>
        <table className="tbl">
          <thead><tr><th>Option</th><th>Value</th></tr></thead>
          <tbody>
            {(lookups[r.src].options || []).slice(0, 12).map((o) => (
              <tr key={o.value}><td className="td-main">{o.option}</td><td className="td-mono">{o.value}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    ) : null,
  })

  const deleteAttr = (r) => {
    if (r.core) { toast('bad', 'Delete refused', MSG.attrDefault); return }
    // Clearing the value from every user is a deliberate prerequisite: dropping
    // a populated column destroys real information.
    if (attrHasData(r.id)) { toast('bad', 'Delete refused', MSG.attrHasData); return }
    confirm({
      title: `Delete ${r.label}?`,
      body: 'The attribute is marked deleted, its employee-type settings are permanently removed, and its column is dropped from the users table.',
      confirmLabel: 'Delete attribute',
      onConfirm: () => {
        setAttrs((rs) => rs.filter((x) => x.id !== r.id))
        toast('ok', 'Attribute deleted', r.label)
      },
    })
  }

  const attrActions = (r) => {
    const configureTarget = CONFIGURE_TARGET[r.id]
    return [
      { id: 'view', label: 'View attribute', icon: 'eye', onSelect: () => attrDetail(r) },
      {
        id: 'edit', label: 'Edit/View', icon: 'edit',
        disabled: !canOpenDefault(r),
        onSelect: () => openAttrEditor(r),
      },
      // Configure appears on exactly three attributes, each opening the screen
      // that owns the behaviour behind it.
      configureTarget && {
        id: 'configure', label: 'Configure', icon: 'sliders',
        onSelect: () => setTab(configureTarget),
      },
      { divider: true },
      {
        id: 'del', label: 'Delete', icon: 'trash', danger: true, disabled: !!r.core,
        onSelect: () => deleteAttr(r),
      },
    ].filter(Boolean)
  }

  /* ---------------------------------------------------------------- *
   * Sections
   * ---------------------------------------------------------------- */

  const sectionRows = useMemo(() => sections.map((s) => {
    const owned = attrs.filter((a) => a.section === s.id)
    return { ...s, attrCount: owned.length }
  }), [sections, attrs])

  const sectionColumns = [
    serialColumn('S.No'),
    {
      key: 'internal', label: 'Section name', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Icon name={r.system ? 'lock' : 'layers'} size={13} style={{ color: 'var(--mut)' }} />
          <span className="trunc mono">{r.internal}</span>
        </span>
      ),
    },
    { key: 'name', label: 'Display name' },
    { key: 'attrCount', label: 'Attributes', align: 'right' },
    {
      key: 'system', label: 'Origin',
      value: (r) => (r.system ? 'Default' : 'Custom'),
      render: (r) => (r.system ? <Pill tone="mut" icon="lock">Default</Pill> : <Pill tone="acc">Custom</Pill>),
    },
    { key: 'order', label: 'Order', align: 'right', width: 72, optional: true },
  ]

  const openSectionEditor = (s) => setDrawer({
    title: s ? 'View/Edit section' : 'Add Section',
    sub: s ? `${s.internal} · ${s.system ? 'default section' : 'custom section'}` : 'Create the heading before the fields that sit under it.',
    children: (
      <SectionEditor
        section={s}
        sections={sections}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          setDrawer(null)
          if (s) {
            // Only the display name and position move; the section name is the
            // identifier other records point at.
            setSections((rs) => rs.map((x) => (x.id === s.id ? { ...x, name: d.name, order: d.order } : x)))
            toast('ok', 'Section saved', `The heading now reads ${d.name}.`)
          } else {
            setSections((rs) => [...rs, {
              id: slug(d.internal) || `section_${rs.length + 1}`,
              internal: d.internal,
              name: d.name,
              order: d.order,
              system: false,
            }])
            toast('ok', 'Section created', `${d.name} is available to attributes.`)
          }
        }}
      />
    ),
  })

  const deleteSection = (r) => {
    if (r.system) { toast('bad', 'Delete refused', MSG.sectionDefault); return }
    // An attribute with no section has nowhere to render, so the section has to
    // be emptied first.
    if (r.attrCount > 0) { toast('bad', 'Delete refused', MSG.sectionHasAttrs); return }
    confirm({
      title: `Delete ${r.name}?`,
      body: 'The section is removed from the user form. The record is retained in the database for audit purposes.',
      confirmLabel: 'Delete section',
      onConfirm: () => {
        setSections((rs) => rs.filter((x) => x.id !== r.id))
        toast('ok', 'Section deleted', r.name)
      },
    })
  }

  const sectionActions = (r) => [
    {
      id: 'view', label: 'View/Edit', icon: 'edit', onSelect: () => openSectionEditor(r),
    },
    {
      id: 'attrs', label: 'Attributes in this section', icon: 'sliders',
      onSelect: () => openDetail({
        title: r.name,
        sub: `${r.internal} · ${r.attrCount} attributes`,
        rows: [
          { k: 'Section name', v: r.internal, icon: 'tag' },
          { k: 'Display name', v: r.name, icon: 'layers' },
          { k: 'Display order', v: r.order, icon: 'sort' },
          { k: 'Origin', v: r.system ? 'Default section' : 'Custom section', icon: r.system ? 'lock' : 'plus' },
          { k: 'Attributes', v: num(r.attrCount), icon: 'sliders' },
        ],
        extra: (
          <Card flush title="Attributes in this section" sub="Move every one of these elsewhere before the section can be deleted">
            {r.attrCount === 0 ? (
              <EmptyState size="sm" icon="sliders" title="No attributes" body="This section is empty and can be deleted." />
            ) : (
              <table className="tbl">
                <thead><tr><th>Attribute</th><th>Input type</th></tr></thead>
                <tbody>
                  {attrs.filter((a) => a.section === r.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map((a) => (
                    <tr key={a.id}>
                      <td className="td-main">{a.label}<span className="cell-sub mono">{a.id}</span></td>
                      <td><Tag>{typeLabel(a.type)}</Tag></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ),
      }),
    },
    { divider: true },
    {
      id: 'del', label: 'Delete', icon: 'trash', danger: true, disabled: !!r.system,
      onSelect: () => deleteSection(r),
    },
  ]

  /* ---------------------------------------------------------------- *
   * Lookups
   * ---------------------------------------------------------------- */

  const lookupRows = useMemo(() => lookupKeys.map((key) => ({
    id: key,
    key,
    name: lookupDisplayName(key),
    shortName: lookups[key].shortName || key,
    options: lookups[key].options || [],
    count: (lookups[key].options || []).length,
    protected: isProtectedLookup(key),
  })), [lookupKeys, lookups])

  const openLookupEditor = (r) => setDrawer({
    title: r ? 'Edit/View lookup' : 'Add Lookup',
    sub: r
      ? `${r.name} · ${r.count} options. Saving replaces the whole option list.`
      : 'A named dropdown list. Each entry is an option label and the value the system stores.',
    children: (
      <LookupEditor
        lookup={r}
        existingKeys={lookupKeys}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          setDrawer(null)
          setLookups((l) => ({ ...l, [d.key]: { shortName: d.shortName, options: d.options } }))
          toast('ok', r ? 'Lookup saved' : 'Lookup created',
            `${lookupDisplayName(d.key)} now holds ${num(d.options.length)} option${d.options.length === 1 ? '' : 's'}.`)
        }}
      />
    ),
  })

  /* One value, read on its own: what it stores, and which attributes would
     offer it. Nothing here writes — Edit/View owns every change to a set. */
  const viewLookupOption = (r, o) => {
    const usedBy = attrs.filter((a) => a.src === r.key)
    openDetail({
      title: o.option || 'Unnamed value',
      sub: `${r.key} · value ${r.options.indexOf(o) + 1} of ${r.count}`,
      rows: [
        { k: 'Value', v: o.option || '—', icon: 'tag' },
        { k: 'Stored as', v: o.value || '—', icon: 'db' },
        { k: 'State', v: '—', icon: 'flag' },
        { k: 'Value set', v: `${r.key} · ${lookupDisplayName(r.key)}`, icon: 'layers' },
        {
          k: 'Offered by',
          v: usedBy.length ? usedBy.map((a) => a.label).join(', ') : 'No attribute offers this set yet',
          icon: 'sliders',
        },
      ],
    })
  }

  const downloadLookup = (r) => {
    downloadCsv('lookup_options_data.csv', toCsvText(['option', 'value'], r.options.map((o) => [o.option, o.value])))
    toast('ok', 'Options exported', `${num(r.count)} rows written to lookup_options_data.csv.`)
  }

  const deleteLookup = (r) => {
    if (r.protected) { toast('bad', 'Delete refused', 'The built-in employee-type list cannot be deleted.'); return }
    // Deleting a populated dropdown affects every attribute pointing at it and
    // every user record holding one of its values, so it is a two-step act.
    if (r.count > 0) { toast('bad', 'Delete refused', MSG.lookupHasOptions); return }
    confirm({
      title: `Delete ${r.name}?`,
      body: 'The lookup is marked deleted and disappears from the list. The record is retained in the database for audit purposes.',
      confirmLabel: 'Delete lookup',
      onConfirm: () => {
        setLookups((l) => { const next = { ...l }; delete next[r.key]; return next })
        toast('ok', 'Lookup deleted', r.name)
      },
    })
  }

  /* ---------------------------------------------------------------- *
   * Multi-level lookups
   * ---------------------------------------------------------------- */

  const rowsOf = (id) => multiData[id] || []

  const multiColumns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'Lookup name', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Icon name="hierarchy" size={14} style={{ color: 'var(--mut)' }} />
          <span className="trunc">{r.name}</span>
        </span>
      ),
    },
    {
      key: 'levels', label: 'Lookup levels', sortable: false,
      value: (r) => r.levels.join(', '),
      render: (r) => <LevelChain levels={r.levels} />,
    },
    {
      key: 'rows', label: 'Data rows', align: 'right',
      value: (r) => rowsOf(r.id).length,
      render: (r) => (rowsOf(r.id).length === 0
        ? <span className="t-faint">No data</span>
        : <Pill tone="ok" dot>{num(rowsOf(r.id).length)}</Pill>),
    },
    { key: 'updated', label: 'Updated', cls: 'td-mono' },
  ]

  const openMultiEditor = (r) => setDrawer({
    title: r ? 'Edit Multi-level lookup' : 'Add Multi-level lookup',
    sub: r
      ? `${r.name} · ${r.levels.join(' → ')}. Levels are fixed; uploading replaces every row.`
      : 'Declare the levels, then upload one row per complete path through the hierarchy.',
    children: (
      <MultiLookupEditor
        lookup={r}
        rows={r ? rowsOf(r.id) : []}
        existing={multi}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          setDrawer(null)
          if (r) {
            setMulti((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: d.name, updated: '2026-09-03' } : x)))
            if (d.replaced) setMultiData((m) => ({ ...m, [r.id]: d.rows }))
            toast('ok', 'Multi-level lookup saved', d.replaced
              ? `${d.name} now holds ${num(d.rows.length)} rows, replacing what was there.`
              : `${d.name} renamed.`)
          } else {
            const id = nextId(multi)
            setMulti((rs) => [...rs, { id, name: d.name, levels: d.levels, updated: '2026-09-03' }])
            setMultiData((m) => ({ ...m, [id]: d.rows }))
            toast('ok', 'Multi-level lookup created', `${d.name} · ${d.levels.join(' → ')} · ${num(d.rows.length)} rows.`)
          }
        }}
      />
    ),
  })

  const deleteMulti = (r) => confirm({
    title: `Delete ${r.name}?`,
    body: `The lookup record is soft-deleted, but the table holding its ${num(rowsOf(r.id).length)} data rows is genuinely dropped. Those rows are gone and cannot be recovered — export them first if you might need them. Any attribute pointing at a level of this lookup will have nothing to resolve against.`,
    confirmLabel: 'Delete and destroy the data',
    onConfirm: () => {
      setMulti((rs) => rs.filter((x) => x.id !== r.id))
      setMultiData((m) => { const next = { ...m }; delete next[r.id]; return next })
      toast('ok', 'Multi-level lookup deleted', `${r.name} and its data rows were removed.`)
    },
  })

  const multiActions = (r) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => openView(r.id) },
    { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => openMultiEditor(r) },
    {
      id: 'download', label: 'Download data (CSV)', icon: 'download', disabled: rowsOf(r.id).length === 0,
      onSelect: () => {
        downloadCsv('multi_lookup_data.csv', toCsvText(levelColumns(r.levels), rowsOf(r.id)))
        toast('ok', 'Data exported', `${num(rowsOf(r.id).length)} rows written to multi_lookup_data.csv.`)
      },
    },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => deleteMulti(r) },
  ]

  const openView = (id) => { setTreeQuery(''); setViewing(id) }

  const viewed = multi.find((m) => m.id === viewing)
  const viewedColumns = viewed ? [
    serialColumn('S.No'),
    ...levelColumns(viewed.levels).map((c, i) => ({
      key: `c${i}`,
      label: c,
      cls: i % 2 ? 'td-mono' : '',
      value: (r) => r.cells[i] || '',
      render: (r) => r.cells[i] || '',
    })),
  ] : []
  const viewedRows = viewed
    ? rowsOf(viewed.id).map((cells, i) => ({ id: i + 1, cells }))
    : []

  /* ---------------------------------------------------------------- *
   * Smart Populate
   * ---------------------------------------------------------------- */

  const smartUsedBy = (name) => attrs.filter((a) => a.type === 'smart-populate' && a.smartRule === name)

  const smartColumns = [
    serialColumn('S.No'),
    {
      key: 'name', label: 'SmartPopulate name', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Icon name="bolt" size={13} style={{ color: 'var(--mut)' }} />
          <span className="trunc">{r.name}</span>
        </span>
      ),
    },
    {
      key: 'count', label: 'Conditions', align: 'right',
      value: (r) => r.conditions.length,
      render: (r) => num(r.conditions.length),
    },
    {
      key: 'first', label: 'First rule', sortable: false, cls: 'td-mono',
      value: (r) => (r.conditions[0] ? r.conditions[0].condition : ''),
      render: (r) => (r.conditions[0]
        ? <span className="trunc t-xs">{r.conditions[0].condition} → {r.conditions[0].value}</span>
        : <span className="t-faint">—</span>),
    },
    {
      key: 'used', label: 'Used by',
      value: (r) => smartUsedBy(r.name).length,
      render: (r) => {
        const used = smartUsedBy(r.name)
        return used.length === 0
          ? <span className="t-faint">Not attached</span>
          : <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>{used.map((a) => <Tag key={a.id}>{a.label}</Tag>)}</span>
      },
    },
  ]

  const openSmartEditor = (r) => setDrawer({
    title: r ? 'Edit/View Smart Populate' : 'Add Smart Populate',
    sub: r
      ? `${r.name} · ${r.conditions.length} conditions. Saving replaces the whole list.`
      : 'A named set of if-then rules that many attributes can share.',
    children: (
      <SmartPopulateEditor
        rule={r}
        rules={smartRules}
        attrs={attrs}
        onCancel={() => setDrawer(null)}
        onSubmit={(d) => {
          setDrawer(null)
          if (r) {
            setSmartRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...d } : x)))
            toast('ok', 'Smart Populate saved', `${d.name} now holds ${num(d.conditions.length)} conditions.`)
          } else {
            setSmartRules((rs) => [...rs, { id: nextId(rs), ...d }])
            toast('ok', 'Smart Populate created', `${d.name} · ${num(d.conditions.length)} conditions. Attach it to an attribute to put it to work.`)
          }
        }}
      />
    ),
  })

  const deleteSmart = (r) => {
    const used = smartUsedBy(r.name)
    // A rule set an attribute points at cannot go: re-point the attribute first.
    if (used.length > 0) {
      toast('bad', 'Delete refused', `${MSG.smartInUse} — ${used.map((a) => a.label).join(', ')}`)
      return
    }
    confirm({
      title: `Delete ${r.name}?`,
      body: 'The rule set is marked deleted and disappears from the list. The record is retained in the database for audit purposes.',
      confirmLabel: 'Delete rule set',
      onConfirm: () => {
        setSmartRules((rs) => rs.filter((x) => x.id !== r.id))
        toast('ok', 'Smart Populate deleted', r.name)
      },
    })
  }

  const smartActions = (r) => [
    { id: 'edit', label: 'Edit/View', icon: 'edit', onSelect: () => openSmartEditor(r) },
    {
      id: 'download', label: 'Download conditions (CSV)', icon: 'download',
      onSelect: () => {
        downloadCsv('smart_populate_conditions.csv', toCsvText(['condition', 'value'], r.conditions.map((c) => [c.condition, c.value])))
        toast('ok', 'Conditions exported', `${num(r.conditions.length)} rows written to CSV.`)
      },
    },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => deleteSmart(r) },
  ]

  /* ---------------------------------------------------------------- */

  const PRIMARY = {
    attributes: { label: 'Add Attribute', icon: 'plus', onClick: () => openAttrEditor(null) },
    sections: { label: 'Add Section', icon: 'plus', onClick: () => openSectionEditor(null) },
    lookups: { label: 'Add Lookup', icon: 'plus', onClick: () => openLookupEditor(null) },
    multi: { label: 'Add Lookup', icon: 'plus', onClick: () => openMultiEditor(null) },
    smart: { label: 'Add Smart Populate', icon: 'plus', onClick: () => openSmartEditor(null) },
  }
  const primary = viewing ? null : PRIMARY[tab]

  const prepopCount = attrs.filter((a) => a.type === 'prepopulate').length
  const smartAttrCount = attrs.filter((a) => a.type === 'smart-populate').length

  return (
    <>
      {viewed ? (
        <PageBar
          title={viewed.name}
          crumbs={[{ label: 'Configurations' }, { label: 'Multi-level lookups' }, { label: viewed.name }]}
          sub={`${num(rowsOf(viewed.id).length)} data rows over ${viewed.levels.length} levels — ${viewed.levels.join(' → ')}. Read-only: renaming the lookup and replacing its data happen in the Edit panel.`}
          actions={
            <>
              <Button icon="chevL" onClick={() => setViewing(null)}>Back to multi-level lookups</Button>
              <Button
                icon="download"
                disabled={rowsOf(viewed.id).length === 0}
                onClick={() => {
                  downloadCsv('multi_lookup_data.csv', toCsvText(levelColumns(viewed.levels), rowsOf(viewed.id)))
                  toast('ok', 'Data exported', `${num(rowsOf(viewed.id).length)} rows written to multi_lookup_data.csv.`)
                }}
              >
                Download data
              </Button>
              <Button variant="pri" icon="edit" onClick={() => openMultiEditor(viewed)}>Edit</Button>
            </>
          }
        />
      ) : (
        <PageBar
          title="Configurations"
          sub="The user form is not hard-coded — it is assembled from what is defined here. Sections group the fields, lookups and smart-populate rules supply their values, attributes are the fields themselves, and Employee Type Configuration decides who actually gets which of them."
          actions={
            <>
              <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Schema definition is being exported as JSON.')}>Export schema</Button>
              {primary && <Button variant="pri" icon={primary.icon} onClick={primary.onClick}>{primary.label}</Button>}
            </>
          }
        />
      )}

      <div className="stack">
        {!viewed && <Tabs
          value={tab}
          onChange={(t) => { setViewing(null); setTab(t) }}
          tabs={[
            { id: 'attributes', label: 'Attributes', icon: 'sliders', count: attrs.length },
            { id: 'sections', label: 'Sections', icon: 'layers', count: sections.length },
            { id: 'lookups', label: 'Lookups', icon: 'tag', count: lookupKeys.length },
            { id: 'multi', label: 'Multi-Level Lookups', icon: 'hierarchy', count: multi.length },
            { id: 'smart', label: 'Smart Populate', icon: 'bolt', count: smartRules.length },
            { id: 'emptypes', label: 'Employee Types', icon: 'users', count: employeeTypes.length },
            { id: 'username', label: 'Username', icon: 'user' },
            { id: 'email', label: 'User Email', icon: 'at' },
          ]}
        />}

        {tab === 'attributes' && (
          <>
            <StatCards
              items={[
                { key: 'attrs', icon: 'sliders', label: 'Attributes', value: attrs.length, chip: `${sections.length} sections`, sub: 'fields the system knows about' },
                { key: 'core', icon: 'lock', label: 'Default', value: attrs.filter((a) => a.core).length, chip: 'not removable', sub: 'shipped with the product' },
                { key: 'auto', icon: 'bolt', label: 'Auto-filled', value: prepopCount + smartAttrCount, chip: `${prepopCount} pre · ${smartAttrCount} smart`, sub: 'system owns the value' },
                { key: 'types', icon: 'users', label: 'Employee types', value: employeeTypes.length, chip: 'applicability', sub: 'each with its own rules' },
              ]}
              label="Configuration summary"
            />

            <Banner tone="info">
              Defining an attribute does not put it on anybody&#39;s form — turning it on for an employee type does.
              After creating a field here, open <b>Employee Types</b> and decide, per type, whether it is enabled and
              whether it is compulsory. Configure on <span className="mono">username</span>,{' '}
              <span className="mono">email</span> and <span className="mono">employee_type</span> opens the screen that
              owns that behaviour.
            </Banner>

            <DataWorkbench
              id="cfg-attributes-v2"
              rows={attrs}
              columns={attrColumns}
              rowActions={attrActions}
              onRowClick={(r) => (canOpenDefault(r) ? openAttrEditor(r) : attrDetail(r))}
              searchPlaceholder="Search by display name, attribute name or section…"
              emptyTitle="No attributes match"
              emptyBody="Adjust the search to widen the result set."
              emptyIcon="sliders"
              footNote="Default attributes are protected and cannot be deleted"
              pageSize={10}
            />
          </>
        )}

        {tab === 'sections' && (
          <>
            <Banner tone="info">
              A section has to exist before an attribute can be assigned to it, so sections are the first thing to set
              up on a new system. The section name is the internal identifier and is fixed once created; the display
              name is the heading users see and can be changed at any time.
            </Banner>
            <DataWorkbench
              id="cfg-sections-v2"
              rows={sectionRows}
              columns={sectionColumns}
              rowActions={sectionActions}
              onRowClick={openSectionEditor}
              searchPlaceholder="Search by section name…"
              emptyTitle="No sections match"
              emptyBody="Adjust the search to widen the result set."
              emptyIcon="layers"
              footNote="A default section, or one still holding attributes, cannot be deleted"
              pageSize={10}
            />
          </>
        )}

        {tab === 'lookups' && (
          <>
            <Banner tone="info">
              Every entry is a pair. The <b>value</b> is the label a person sees; <b>stored as</b> is what the system
              keeps and matches on. Rename the label freely — the stored value is what user records and
              smart-populate conditions depend on, and it must be unique within a set.
            </Banner>
            <LookupWorkbench
              rows={lookupRows}
              attrs={attrs}
              selected={openLookup}
              onSelect={setOpenLookup}
              onCreate={() => openLookupEditor(null)}
              onEdit={openLookupEditor}
              onView={viewLookupOption}
              onDownload={downloadLookup}
              onDelete={deleteLookup}
            />
          </>
        )}

        {tab === 'multi' && !viewed && (
          <>
            <Banner tone="info">
              A multi-level lookup is a table of complete paths, not a list per level: one row per valid combination,
              with an option and a value column for every level. The levels are declared at creation and cannot be
              changed afterwards — to restructure a hierarchy you delete it and build a new one.
            </Banner>
            <DataWorkbench
              id="cfg-multi-lookups-v2"
              rows={multi}
              columns={multiColumns}
              rowActions={multiActions}
              onRowClick={(r) => openView(r.id)}
              searchPlaceholder="Search by lookup name or level…"
              emptyTitle="No multi-level lookups match"
              emptyBody="Adjust the search, or declare a new hierarchy."
              emptyIcon="hierarchy"
              footNote="Deleting a multi-level lookup destroys its data rows for real"
              pageSize={10}
            />
          </>
        )}

        {viewed && (
          <Card
            flush
            className="mll-card"
            title="Lookup data"
            sub={viewMode === 'tree'
              ? 'The stored rows folded back into the cascade they describe. Each level narrows the one below it.'
              : 'Every stored row is one complete path through the hierarchy, so a country repeats once per city beneath it.'}
            actions={
              <div className="row" style={{ gap: 6 }}>
                <div className="seg" role="tablist" aria-label="Data view">
                  <button type="button" role="tab" aria-selected={viewMode === 'tree'} data-on={viewMode === 'tree'} onClick={() => setViewMode('tree')}>
                    <Icon name="hierarchy" size={12} />Hierarchy
                  </button>
                  <button type="button" role="tab" aria-selected={viewMode === 'rows'} data-on={viewMode === 'rows'} onClick={() => setViewMode('rows')}>
                    <Icon name="columns" size={12} />Rows
                  </button>
                </div>
              </div>
            }
            footer={<span>Read-only. Renaming the lookup and replacing its data are done from Edit.</span>}
          >
            {viewedRows.length === 0 ? (
              <EmptyState
                size="sm"
                icon="upload"
                title="No data rows"
                body="Edit the lookup and upload a CSV with one row per complete path through the hierarchy."
                actions={<Button icon="edit" onClick={() => openMultiEditor(viewed)}>Edit lookup</Button>}
              />
            ) : viewMode === 'rows' ? (
              <DataWorkbench
                id={`cfg-multi-view-${viewed.id}`}
                rows={viewedRows}
                columns={viewedColumns}
                searchPlaceholder="Search every option and value column…"
                emptyTitle="No rows match"
                emptyBody="Adjust the search to widen the result set."
                emptyIcon="search"
                footNote={`${num(viewedRows.length)} complete paths · ${levelColumns(viewed.levels).length} data columns built from the lookup's own levels`}
                pageSize={10}
              />
            ) : (
              <MultiLookupTree
                rows={rowsOf(viewed.id)}
                levels={viewed.levels}
                query={treeQuery}
                onQuery={setTreeQuery}
              />
            )}
          </Card>
        )}

        {tab === 'smart' && (
          <>
            <Banner tone="info">
              A condition is written against the internal attribute name and against a lookup&#39;s <b>value</b>, never
              its option label — <span className="mono">department = &#39;ENG&#39;</span>, not
              <span className="mono"> department = &#39;Engineering&#39;</span>. A label parses cleanly and then never
              matches. Every attribute a condition names must already exist on the Attributes tab.
            </Banner>
            <DataWorkbench
              id="cfg-smart-populate"
              rows={smartRules}
              columns={smartColumns}
              rowActions={smartActions}
              onRowClick={openSmartEditor}
              searchPlaceholder="Search by rule set name…"
              emptyTitle="No rule sets match"
              emptyBody="Adjust the search, or write a new set of if-then rules."
              emptyIcon="bolt"
              footNote="A rule set cannot be deleted while an attribute still points at it"
              pageSize={10}
            />
          </>
        )}

        {tab === 'emptypes' && (
          <EmployeeTypePanel
            attrs={attrs}
            sectionName={sectionName}
            types={employeeTypes}
            onAddType={(name) => setLookups((l) => ({
              ...l,
              employee_type: {
                ...l.employee_type,
                options: [...((l.employee_type || {}).options || []), { option: name, value: slug(name) }],
              },
            }))}
            onRemoveType={(name) => setLookups((l) => ({
              ...l,
              employee_type: {
                ...l.employee_type,
                options: ((l.employee_type || {}).options || []).filter((o) => o.option !== name),
              },
            }))}
          />
        )}

        {tab === 'username' && <UsernameConfigPanel types={employeeTypes} />}

        {tab === 'email' && <EmailConfigPanel types={employeeTypes} />}
      </div>
    </>
  )
}
