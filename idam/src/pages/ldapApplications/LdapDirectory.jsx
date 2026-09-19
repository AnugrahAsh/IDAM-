import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import {
  PAGE_SIZE, TYPE_META, TYPE_ORDER, childrenOf, countOf, entriesLdif, modifiedOf,
} from './directoryTree'
import EntryDetails from './LdapEntryDrawer'
import LdapSchema from './LdapSchema'
import { initialSchema, schemaLdif } from './schemaData'

const INDENT = 18

const download = (name, text) => {
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

// Wraps every occurrence of the needle so a filtered row shows *why* it matched.
const highlight = (text, needle) => {
  const s = String(text ?? '')
  if (!needle || !s) return s
  const parts = []
  const lower = s.toLowerCase()
  let i = 0
  let at = lower.indexOf(needle)
  while (at !== -1) {
    if (at > i) parts.push(s.slice(i, at))
    parts.push(<mark className="dt-hl" key={`${at}`}>{s.slice(at, at + needle.length)}</mark>)
    i = at + needle.length
    at = lower.indexOf(needle, i)
  }
  if (i < s.length) parts.push(s.slice(i))
  return parts
}

const COLS = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', width: 104 },
  { key: 'dn', label: 'Distinguished name' },
  { key: 'detail', label: 'Description / Email' },
  { key: 'count', label: 'Contents / Status', width: 150 },
  { key: 'modified', label: 'Modified', width: 128 },
]

// A subtree browser over the directory this record binds to. Each expansion
// reads one level, so a large base DN is never pulled in one go. Siblings can
// be sorted on any column without losing their place in the hierarchy.
export default function LdapDirectory({ app }) {
  const { toast, setDrawer } = useApp()
  const [open, setOpen] = useState([])
  const [rootOpen, setRootOpen] = useState(true)
  const [loaded, setLoaded] = useState({})
  const [busy, setBusy] = useState(null)
  // How many children of each node have been read so far.
  const [shown, setShown] = useState({})
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [selected, setSelected] = useState([])
  const [focus, setFocus] = useState(null)
  const [schema, setSchema] = useState(initialSchema)
  const tableRef = useRef(null)
  const kbRef = useRef(false)
  const searchRef = useRef(null)

  const exportLdif = () => {
    download(`${app.name.toLowerCase()}-schema.ldif`, schemaLdif(schema))
    toast('ok', 'Schema exported', `${schema.classes.length} classes and ${schema.attributes.length} attributes written to LDIF.`)
  }

  const openSchema = () => setDrawer({
    title: 'Schema',
    sub: `Object classes and attribute types published by ${app.displayName}.`,
    size: 'xl',
    children: <LdapSchema app={app} schema={schema} setSchema={setSchema} onExport={exportLdif} />,
    footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
  })

  const openEntry = (row) => {
    if (row.type === 'root') return
    setDrawer({
      title: 'Entry details',
      sub: row.dn,
      size: 'lg',
      children: (
        <EntryDetails app={app} entry={row} readOnly />
      ),
      footer: <Button onClick={() => setDrawer(null)}>Close</Button>,
    })
  }

  const load = (dn, depth) => {
    if (loaded[dn]) return
    setBusy(dn)
    // A subtree read is a round trip; the row says so while it happens.
    setTimeout(() => {
      setLoaded((l) => (l[dn] ? l : { ...l, [dn]: childrenOf(app, dn, depth) }))
      setShown((p) => ({ ...p, [dn]: PAGE_SIZE }))
      setBusy(null)
    }, 220)
  }

  const expand = (row) => {
    if (!row.expandable || row.type === 'root') return
    if (!open.includes(row.dn)) setOpen((o) => [...o, row.dn])
    load(row.dn, row.depth)
  }
  const collapse = (dn) => setOpen((o) => o.filter((d) => d !== dn))
  const toggle = (row) => {
    if (row.type === 'root') { setRootOpen((v) => !v); return }
    if (!row.expandable) return
    if (open.includes(row.dn)) collapse(row.dn)
    else expand(row)
  }

  const rootChildren = loaded[app.baseDn]
  const needle = q.trim().toLowerCase()
  const matches = (r) => !needle
    || r.name.toLowerCase().includes(needle)
    || r.dn.toLowerCase().includes(needle)
    || String(r.detail).toLowerCase().includes(needle)
    || String(r.display || '').toLowerCase().includes(needle)
  const typeOk = (r) => typeFilter === 'all' || r.type === typeFilter

  const cycleSort = (key) => setSort((s) => (s.key !== key
    ? { key, dir: 'asc' }
    : s.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }))

  // Sorting is applied per sibling group so the hierarchy never interleaves.
  const sortSiblings = (list) => {
    if (!sort.key) return list
    const val = (r) => {
      switch (sort.key) {
        case 'type': return TYPE_ORDER[r.type]
        case 'count': return r.type === 'user' ? -1 : (loaded[r.dn] ? loaded[r.dn].length : -0.5)
        case 'modified': return modifiedOf(r)
        case 'detail': return r.detail || ''
        default: return r[sort.key]
      }
    }
    const out = [...list].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
      return sort.dir === 'asc' ? c : -c
    })
    return out
  }

  // Flattened for rendering: a row carries its depth so the name column can
  // indent without nesting tables. A parent survives the filter when any of
  // its descendants does, so a match is always shown in context.
  const rows = useMemo(() => {
    const walk = (dn, depth) => {
      const all = sortSiblings(loaded[dn] || [])
      const limit = needle ? all.length : (shown[dn] || PAGE_SIZE)
      const kids = all.slice(0, limit)
      const out = []
      kids.forEach((k) => {
        const expanded = open.includes(k.dn)
        const childRows = expanded ? walk(k.dn, depth + 1) : []
        const self = { ...k, depth, expanded, childCount: loaded[k.dn] ? loaded[k.dn].length : null }
        const keep = (typeOk(self) && matches(self)) || childRows.length > 0
        if (keep) {
          out.push(self)
          if (expanded && busy === k.dn) out.push({ id: `${k.dn}::busy`, busy: true, depth: depth + 1 })
          out.push(...childRows)
        }
      })
      // The "read more" row belongs to the parent, after its last child.
      if (!needle && all.length > kids.length) {
        out.push({ id: `${dn}::more`, more: true, dn, depth, remaining: all.length - kids.length })
      }
      return out
    }
    const root = {
      id: app.baseDn, dn: app.baseDn, name: app.baseDn, type: 'root', depth: 0,
      expandable: true, expanded: rootOpen, parent: null, detail: `${app.displayName} · ${app.vendor}`,
      childCount: rootChildren ? rootChildren.length : null,
    }
    return [root, ...(rootOpen ? walk(app.baseDn, 1) : [])]
  }, [loaded, open, rootOpen, needle, typeFilter, busy, shown, sort, app.baseDn])

  const entryRows = rows.filter((r) => !r.more && !r.busy)
  const selectable = entryRows.filter((r) => r.type !== 'root')
  const allLoaded = Object.values(loaded).flat()
  const stats = countOf(allLoaded)
  const expandable = allLoaded.filter((r) => r.expandable)
  const selectedRows = allLoaded.filter((r) => selected.includes(r.dn))

  // Keyboard: the table behaves as a tree grid. Arrows move and disclose,
  // Enter opens the focused entry, "/" jumps to the filter.
  useEffect(() => {
    if (!kbRef.current || !focus || !tableRef.current) return
    kbRef.current = false
    const el = tableRef.current.querySelector(`tr[data-dn="${window.CSS?.escape ? CSS.escape(focus) : focus}"]`)
    if (el) el.focus({ preventScroll: false })
  }, [focus, rows])

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT') return
    if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return }
    const idx = Math.max(0, entryRows.findIndex((r) => r.dn === focus))
    const row = entryRows[idx]
    const go = (i) => { const n = entryRows[Math.max(0, Math.min(entryRows.length - 1, i))]; if (n) { kbRef.current = true; setFocus(n.dn) } }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); go(idx + 1); break
      case 'ArrowUp': e.preventDefault(); go(idx - 1); break
      case 'Home': e.preventDefault(); go(0); break
      case 'End': e.preventDefault(); go(entryRows.length - 1); break
      case 'ArrowRight':
        e.preventDefault()
        if (!row) break
        if (row.expandable && !row.expanded) toggle(row)
        else if (row.expanded) go(idx + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (!row) break
        if (row.expanded) toggle(row)
        else if (row.parent) { kbRef.current = true; setFocus(row.parent) }
        break
      case 'Enter': if (row) openEntry(row); break
      case ' ':
        e.preventDefault()
        if (row && row.type !== 'root') toggleSelect(row.dn)
        break
      default:
    }
  }

  const toggleSelect = (dn) => setSelected((s) => (s.includes(dn) ? s.filter((d) => d !== dn) : [...s, dn]))
  const allVisibleSelected = selectable.length > 0 && selectable.every((r) => selected.includes(r.dn))
  const someSelected = selectable.some((r) => selected.includes(r.dn))
  const toggleAll = () => setSelected(allVisibleSelected ? [] : selectable.map((r) => r.dn))

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('ok', `${what} copied`, text.length > 90 ? `${text.slice(0, 90)}…` : text)
    } catch {
      toast('warn', 'Clipboard unavailable', 'Select the value and copy it manually.')
    }
  }

  const exportSelection = () => {
    download(`${app.name.toLowerCase()}-entries.ldif`, entriesLdif(app, selectedRows))
    toast('ok', 'Entries exported', `${selectedRows.length} entries written to LDIF.`)
  }

  const expandAll = () => { setRootOpen(true); setOpen(expandable.map((r) => r.dn)) }
  const collapseAll = () => setOpen([])

  const rdnOf = (dn) => dn.split(',')[0]
  const restOf = (dn) => dn.slice(rdnOf(dn).length)

  const summary = [
    { id: 'all', key: 'all', label: 'Entries read', icon: 'directory', value: allLoaded.length, sub: `below ${app.baseDn}` },
    { id: 'ou', key: 'ou', label: 'Org. units', icon: 'folder', value: stats.ous, chip: 'operator-owned', chipTone: 'warn' },
    { id: 'container', key: 'container', label: 'Containers', icon: 'layers', value: stats.containers, chip: 'platform-owned' },
    { id: 'user', key: 'user', label: 'Users', icon: 'user', value: stats.users, sub: `${num(app.entries)} in the directory` },
    { key: 'open', label: 'Branches expanded', icon: 'branch', value: open.length, sub: `of ${num(expandable.length)} readable` },
  ]

  const Th = ({ col }) => (
    <th
      data-sortable="true"
      data-sorted={sort.key === col.key ? sort.dir : undefined}
      aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={col.width ? { width: col.width } : undefined}
      onClick={() => cycleSort(col.key)}
      title={sort.key === col.key ? (sort.dir === 'asc' ? 'Sorted ascending · click for descending' : 'Sorted descending · click to restore tree order') : `Sort by ${col.label.toLowerCase()}`}
    >
      <span className="th-in">
        {col.label}
        <Icon name={sort.key === col.key ? (sort.dir === 'asc' ? 'sortUp' : 'sortDown') : 'sort'} size={11} />
      </span>
    </th>
  )

  return (
    <Card
      className="dt-card"
      title="Directory tree"
      sub={<>Expand a branch to read its child units and users one level at a time · base DN <span className="mono">{app.baseDn}</span></>}
      actions={(
        <div className="dt-actions">
          <Button
            size="sm"
            icon="refresh"
            onClick={() => { setLoaded({}); setOpen([]); setSelected([]); setFocus(null); toast('ok', 'Tree reset', 'Expand a branch to read it again.') }}
          >
            Refresh
          </Button>
          <Button size="sm" icon="layers" onClick={openSchema}>Schema</Button>
          <Button size="sm" icon="download" onClick={exportLdif}>Export LDIF</Button>
        </div>
      )}
      flush
      footer={rootChildren ? (
        <>
          <span>
            <b className="num">{num(entryRows.length - 1)}</b> rows shown
            {sort.key && <> · sorted by <b>{COLS.find((c) => c.key === sort.key)?.label.toLowerCase()}</b> {sort.dir === 'asc' ? '↑' : '↓'}</>}
            {typeFilter !== 'all' && <> · <b>{TYPE_META[typeFilter].label}</b> only</>}
          </span>
          <span className="spacer" />
          <span className="dt-keys" aria-label="Keyboard shortcuts">
            <kbd>↑</kbd><kbd>↓</kbd> move <kbd>→</kbd> expand <kbd>←</kbd> collapse <kbd>↵</kbd> open <kbd>/</kbd> filter
          </span>
        </>
      ) : null}
    >
      {!rootChildren ? (
        <div className="dt-empty">
          <span className="dt-empty-ic"><Icon name="directory" size={22} /></span>
          <div className="dt-empty-m">
            <b>Nothing read yet</b>
            <span>
              The tree is read one level at a time, so a large base DN is never pulled in one request.
              Reading the root returns its containers, organizational units and top-level users.
            </span>
            <span className="mono dt-empty-dn">{app.baseDn}</span>
          </div>
          <Button
            variant="pri"
            icon="download"
            disabled={busy === app.baseDn}
            onClick={() => { setRootOpen(true); load(app.baseDn, 0) }}
          >
            {busy === app.baseDn ? 'Reading…' : 'Read root level'}
          </Button>
        </div>
      ) : (
        <>
          <div className="dt-summary">
            <StatCards items={summary} value={typeFilter} onChange={setTypeFilter} label="Directory summary" />
          </div>

          <div className="wb-bar dt-bar">
            <div className="wb-bar-l">
              <label className="wb-search">
                <Icon name="search" size={14} />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter by name, DN, email or description…"
                  aria-label="Filter loaded entries"
                />
                {q ? <IconButton icon="x" size="sm" label="Clear filter" onClick={() => setQ('')} /> : <kbd>/</kbd>}
              </label>
              {typeFilter !== 'all' && (
                <button type="button" className="chip" data-on="true" onClick={() => setTypeFilter('all')}>
                  <Icon name={TYPE_META[typeFilter].icon} />
                  {TYPE_META[typeFilter].label} only
                  <span className="chip-x"><Icon name="x" /></span>
                </button>
              )}
              {sort.key && (
                <button type="button" className="chip" data-on="true" onClick={() => setSort({ key: null, dir: 'asc' })}>
                  <Icon name={sort.dir === 'asc' ? 'sortUp' : 'sortDown'} />
                  {COLS.find((c) => c.key === sort.key)?.label}
                  <span className="chip-x"><Icon name="x" /></span>
                </button>
              )}
            </div>
            <div className="dt-bar-r">
              <Button size="sm" icon="chevExpand" onClick={expandAll} disabled={expandable.length === 0}>Expand read</Button>
              <Button size="sm" icon="minus" onClick={collapseAll} disabled={open.length === 0}>Collapse all</Button>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="wb-bulk">
              <Check checked mixed={!allVisibleSelected} onChange={() => setSelected([])} label="Clear selection" />
              <b>{num(selected.length)}</b> selected
              <span className="wb-bulk-actions">
                <Button size="sm" icon="copy" onClick={() => copy(selectedRows.map((r) => r.dn).join('\n'), 'Distinguished names')}>Copy DNs</Button>
                <Button size="sm" icon="download" onClick={exportSelection}>Export LDIF</Button>
                <Button size="sm" icon="x" onClick={() => setSelected([])}>Clear</Button>
              </span>
            </div>
          )}

          <div className="wb-scroll">
            <table className="tbl dt-tbl" ref={tableRef} role="treegrid" aria-label="Directory tree" onKeyDown={onKey}>
              <thead>
                <tr>
                  <th className="td-sel">
                    <Check
                      checked={allVisibleSelected}
                      mixed={someSelected && !allVisibleSelected}
                      onChange={toggleAll}
                      label="Select every visible entry"
                      disabled={selectable.length === 0}
                    />
                  </th>
                  {COLS.map((c) => <Th key={c.key} col={c} />)}
                  <th className="td-act dt-th-act">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (r.more) {
                    return (
                      <tr key={r.id} className="dt-more">
                        <td colSpan={COLS.length + 2}>
                          <span style={{ paddingLeft: r.depth * INDENT + 22 }}>
                            <Button
                              size="sm"
                              icon="chevD"
                              onClick={() => setShown((p) => ({ ...p, [r.dn]: (p[r.dn] || PAGE_SIZE) + PAGE_SIZE }))}
                            >
                              Read {Math.min(PAGE_SIZE, r.remaining)} more
                            </Button>
                            <span className="t-xs t-mut"><b className="num">{num(r.remaining)}</b> not yet shown under this node</span>
                          </span>
                        </td>
                      </tr>
                    )
                  }
                  if (r.busy) {
                    return (
                      <tr key={r.id} className="dt-busy" aria-busy="true">
                        <td colSpan={COLS.length + 2}>
                          <span style={{ paddingLeft: r.depth * INDENT + 22 }}>
                            <Icon name="refresh" size={12} />
                            Reading this level from the directory…
                            <i className="skel" style={{ width: 120 }} />
                            <i className="skel" style={{ width: 200 }} />
                          </span>
                        </td>
                      </tr>
                    )
                  }
                  const meta = TYPE_META[r.type]
                  const isRoot = r.type === 'root'
                  const isSel = selected.includes(r.dn)
                  const contents = () => {
                    if (r.type === 'user') return <Pill tone={statusTone(r.status)} dot>{r.status || 'Active'}</Pill>
                    if (r.childCount != null) {
                      const c = countOf(loaded[r.dn] || [])
                      return (
                        <span className="dt-count">
                          <b className="num">{num(r.childCount)}</b>
                          <span className="t-xs t-mut">{c.users} users · {c.ous + c.containers} units</span>
                        </span>
                      )
                    }
                    return (
                      <button type="button" className="link dt-read" onClick={() => expand(r)}>
                        <Icon name="download" size={11} />Read level
                      </button>
                    )
                  }
                  return (
                    <tr
                      key={r.id}
                      data-dn={r.dn}
                      data-type={r.type}
                      data-selected={isSel || undefined}
                      data-focus={focus === r.dn || undefined}
                      aria-level={r.depth + 1}
                      aria-expanded={r.expandable ? r.expanded : undefined}
                      aria-selected={isSel || undefined}
                      tabIndex={focus === r.dn || (!focus && isRoot) ? 0 : -1}
                      onClick={() => setFocus(r.dn)}
                      onDoubleClick={() => (isRoot ? toggle(r) : openEntry(r))}
                    >
                      <td className="td-sel">
                        {!isRoot && <Check checked={isSel} onChange={() => toggleSelect(r.dn)} label={`Select ${r.name}`} />}
                      </td>
                      <td className="td-main dt-td-name">
                        <span className="dt-name">
                          {Array.from({ length: r.depth }, (_, i) => <i className="dt-guide" key={i} />)}
                          {r.expandable ? (
                            <button
                              type="button"
                              className="dt-chev"
                              data-open={r.expanded || undefined}
                              tabIndex={-1}
                              aria-label={r.expanded ? `Collapse ${r.name}` : `Expand ${r.name}`}
                              onClick={(e) => { e.stopPropagation(); toggle(r) }}
                            >
                              <Icon name="chevR" size={12} />
                            </button>
                          ) : <span className="dt-chev-sp" />}
                          {r.type === 'user'
                            ? <Avatar first={r.first} last={r.last} size="sm" seed={r.name} />
                            : <span className="dt-ico" data-type={r.type}><Icon name={meta.icon} size={13} /></span>}
                          <span className="cell-stack">
                            <button
                              type="button"
                              className={`dt-label ${isRoot ? 'mono' : ''}`}
                              tabIndex={-1}
                              title={isRoot ? 'Collapse or expand the whole tree' : 'View details'}
                              onClick={(e) => { e.stopPropagation(); if (isRoot) toggle(r); else openEntry(r) }}
                            >
                              {highlight(r.name, needle)}
                            </button>
                            {r.type === 'user' && <span className="cell-sub">{highlight(r.display, needle)}{r.department ? ` · ${r.department}` : ''}</span>}
                            {isRoot && <span className="cell-sub">Naming context · {rootChildren.length} top-level entries</span>}
                          </span>
                        </span>
                      </td>
                      <td>
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                      </td>
                      <td className="td-mono td-flex dt-dn">
                        <span className="dt-dn-in">
                          <span className="trunc" title={r.dn}>
                            <span className="dt-dn-rdn">{highlight(isRoot ? r.dn : rdnOf(r.dn), needle)}</span>
                            {!isRoot && <span className="dt-dn-rest">{restOf(r.dn)}</span>}
                          </span>
                          <IconButton icon="copy" size="sm" className="row-act" label="Copy DN" tabIndex={-1} onClick={(e) => { e.stopPropagation(); copy(r.dn, 'DN') }} />
                        </span>
                      </td>
                      <td className="td-flex dt-detail">
                        {r.detail
                          ? <span className="trunc" title={r.detail}>{highlight(r.detail, needle)}</span>
                          : r.type === 'container'
                            ? <span className="t-faint">Platform-managed policy container</span>
                            : <span className="t-faint">—</span>}
                      </td>
                      <td className="dt-contents">{contents()}</td>
                      <td className="td-mono dt-mod">{isRoot ? <span className="t-faint">—</span> : modifiedOf(r)}</td>
                      <td className="td-act">
                        <span className="dt-acts row-act">
                          {!isRoot && <IconButton icon="eye" size="sm" label={`View ${r.name}`} tabIndex={-1} onClick={(e) => { e.stopPropagation(); openEntry(r) }} />}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {entryRows.length <= 1 && rootOpen && (
                  <tr>
                    <td colSpan={COLS.length + 2} className="dt-none">
                      <Icon name="search" size={16} />
                      <b>No loaded entry matches</b>
                      <span>
                        {needle && <>“{q}”</>}{needle && typeFilter !== 'all' && ' among '}
                        {typeFilter !== 'all' && <>{TYPE_META[typeFilter].label} entries</>}.
                        Expand another branch to read more, or <button type="button" className="link" onClick={() => { setQ(''); setTypeFilter('all') }}>clear the filters</button>.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}
