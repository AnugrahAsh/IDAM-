import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../primitives/Icon'
import IconButton from '../primitives/IconButton'
import Check from '../primitives/Check'
import Menu from '../primitives/Menu'
import EmptyState from '../primitives/EmptyState'
import { SkeletonTable } from '../primitives/Skeleton'
import { sortRows } from '../../lib/format'
import { useLocalState } from '../../lib/useLocalState'
import { useApp } from '../../store/AppContext'

const DENSITIES = [
  { id: 'comfortable', label: 'Comfortable', icon: 'layers' },
  { id: 'compact', label: 'Compact', icon: 'menu' },
]

export default function DataWorkbench({
  id,
  rows = [],
  columns = [],
  getRowId = (r) => r.id,
  filter,
  search = true,
  searchPlaceholder = 'Search',
  selectable = false,
  bulkActions,
  rowActions,
  onRowClick,
  activeRowId,
  toolbar,
  emptyTitle = 'Nothing to show',
  emptyBody = 'No records match the current view.',
  emptyIcon = 'search',
  loading = false,
  pageSize = 10,
  footNote,
}) {
  const { density, setDensity } = useApp()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(() => new Set())
  const [menu, setMenu] = useState(null)
  const [hiddenCols, setHiddenCols] = useLocalState(`tf-idam-cols-${id}`, [])
  const [per, setPer] = useState(pageSize)
  const searchRef = useRef(null)

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.includes(c.key)),
    [columns, hiddenCols],
  )

  const filtered = useMemo(() => {
    let out = filter ? rows.filter(filter) : rows
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      out = out.filter((r) =>
        columns.some((c) => {
          const raw = c.value ? c.value(r) : r[c.key]
          return raw != null && String(raw).toLowerCase().includes(needle)
        }),
      )
    }
    return sortRows(out, sort.key, sort.dir)
  }, [rows, filter, q, columns, sort])

  useEffect(() => { setPage(1) }, [q, per, filter])

  const pages = Math.max(1, Math.ceil(filtered.length / per))
  const current = Math.min(page, pages)
  const offset = (current - 1) * per
  const pageRows = filtered.slice(offset, current * per)

  const allOnPage = pageRows.length > 0 && pageRows.every((r) => sel.has(getRowId(r)))
  const someOnPage = pageRows.some((r) => sel.has(getRowId(r)))

  const toggleAll = () => {
    const next = new Set(sel)
    if (allOnPage) pageRows.forEach((r) => next.delete(getRowId(r)))
    else pageRows.forEach((r) => next.add(getRowId(r)))
    setSel(next)
  }
  const toggleOne = (rid) => {
    const next = new Set(sel)
    next.has(rid) ? next.delete(rid) : next.add(rid)
    setSel(next)
  }

  const columnMenuItems = columns.map((c) => ({
    id: c.key,
    label: c.label,
    icon: hiddenCols.includes(c.key) ? 'eyeoff' : 'check',
    disabled: c.locked,
    onSelect: () =>
      setHiddenCols((h) => (h.includes(c.key) ? h.filter((k) => k !== c.key) : [...h, c.key])),
  }))

  return (
    <div className="wb">
      <div className="wb-bar">
        {search && (
          <div className="wb-search">
            <Icon name="search" size={14} />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
          </div>
        )}

        <div className="spacer" />
        {toolbar}
        <IconButton
          icon="columns"
          label="Configure table fields"
          onClick={(e) => setMenu({ anchor: e.currentTarget, items: [{ label: 'Configure table fields', header: true }, ...columnMenuItems] })}
        />
      </div>

      {selectable && sel.size > 0 && (
        <div className="wb-bulk">
          <Check checked={allOnPage} mixed={!allOnPage && someOnPage} onChange={toggleAll} label="Select all" />
          <span><b>{sel.size}</b> selected</span>
          <button className="link" onClick={() => setSel(new Set())}>Clear</button>
          <div className="wb-bulk-actions">{bulkActions && bulkActions([...sel], () => setSel(new Set()))}</div>
        </div>
      )}

      <div className="wb-scroll">
        {loading ? (
          <SkeletonTable rows={8} cols={Math.min(6, visibleColumns.length || 5)} />
        ) : pageRows.length === 0 ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {selectable && (
                  <th className="td-sel">
                    <Check checked={allOnPage} mixed={!allOnPage && someOnPage} onChange={toggleAll} label="Select all rows" />
                  </th>
                )}
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className={c.align === 'right' ? 'td-num' : undefined}
                    style={c.width ? { width: c.width } : undefined}
                    data-sortable={c.sortable !== false}
                    data-sorted={sort.key === c.key ? sort.dir : undefined}
                    onClick={() =>
                      c.sortable !== false &&
                      setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === 'asc' ? 'desc' : 'asc' }))
                    }
                  >
                    <span className="th-in">
                      {c.label}
                      {sort.key === c.key && <Icon name={sort.dir === 'asc' ? 'sortUp' : 'sortDown'} size={11} />}
                    </span>
                  </th>
                ))}
                {rowActions && <th className="td-act" />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => {
                const rid = getRowId(r)
                return (
                  <tr
                    key={rid}
                    data-selected={sel.has(rid) || undefined}
                    data-active={activeRowId != null && String(activeRowId) === String(rid) ? 'true' : undefined}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                  >
                    {selectable && (
                      <td className="td-sel">
                        <Check checked={sel.has(rid)} onChange={() => toggleOne(rid)} label={`Select ${rid}`} />
                      </td>
                    )}
                    {visibleColumns.map((c) => (
                      <td key={c.key} className={[c.cls, c.align === 'right' ? 'td-num' : ''].filter(Boolean).join(' ')}>
                        {c.render ? c.render(r, offset + i) : r[c.key] == null || r[c.key] === '' ? '—' : String(r[c.key])}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="td-act">
                        <span className="row-act" data-open={menu?.rid === rid || undefined}>
                          <IconButton
                            icon="kebab"
                            size="sm"
                            label="Row actions"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenu({ anchor: e.currentTarget, rid, items: rowActions(r) })
                            }}
                          />
                        </span>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="wb-foot">
        <span>
          {filtered.length === 0 ? '0' : `${offset + 1}–${Math.min(current * per, filtered.length)}`} of{' '}
          <b className="num">{filtered.length.toLocaleString()}</b>
          {rows.length !== filtered.length && <span className="t-faint"> · filtered from {rows.length.toLocaleString()}</span>}
        </span>
        {footNote && <span className="t-faint">{footNote}</span>}
        <div className="spacer" />
        <div className="density" role="group" aria-label="Table density">
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              type="button"
              data-on={density === d.id || undefined}
              aria-pressed={density === d.id}
              onClick={() => setDensity(d.id)}
            >
              <Icon name={d.icon} size={12} />
              {d.label}
            </button>
          ))}
        </div>
        <select className="sel" style={{ width: 96, height: 25 }} value={per} onChange={(e) => setPer(Number(e.target.value))} aria-label="Rows per page">
          {[10, 25, 50, 100, 250].map((n) => <option key={n} value={n}>{n} rows</option>)}
        </select>
        <div className="pager">
          <button disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><Icon name="chevL" size={12} /></button>
          {Array.from(new Set([1, 2, current - 1, current, current + 1, pages - 1, pages]))
            .filter((n) => n >= 1 && n <= pages)
            .sort((a, b) => a - b)
            .map((n, i, arr) => (
              <span key={n} style={{ display: 'contents' }}>
                {i > 0 && n - arr[i - 1] > 1 && <button disabled>…</button>}
                <button data-on={n === current || undefined} onClick={() => setPage(n)}>{n}</button>
              </span>
            ))}
          <button disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page"><Icon name="chevR" size={12} /></button>
        </div>
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
