import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../primitives/Icon'
import IconButton from '../primitives/IconButton'
import Button from '../primitives/Button'
import Check from '../primitives/Check'
import Menu from '../primitives/Menu'
import EmptyState from '../primitives/EmptyState'
import { SkeletonTable } from '../primitives/Skeleton'
import { useLocalState } from '../../lib/useLocalState'
import ColumnPicker from './ColumnPicker'
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
  search = true,
  searchPlaceholder = 'Search',
  selectable = false,
  bulkActions,
  rowActions,
  onRowClick,
  activeRowId,
  toolbar,
  // Quick filters, rendered beside the search box rather than pushed to the
  // right of the bar with the view controls.
  filters,
  // A second row under the toolbar — saved views, scope banners, and the like.
  subBar,
  // Registers that name the column read better than a blank header, and a
  // real header is what a screen reader announces.
  actionsLabel,
  // Rendered inside the panel above the toolbar: a register header owns the
  // counts and the filter for the rows below it.
  header,
  // Alternative renderings of the same result set. `views` is a list of
  // { id: 'table' | 'cards' | 'groups', label, icon }; the switch only appears
  // when a page opts in, so every existing caller keeps the plain table.
  views,
  view: viewProp,
  onViewChange,
  defaultView = 'table',
  renderCard,
  groupOf,
  groupSummary,
  emptyTitle = 'Nothing to show',
  emptyBody = 'No records match the current view.',
  emptyIcon = 'search',
  loading = false,
  pageSize = 10,
  scrollBody = false,
  footNote,
}) {
  const { density, setDensity } = useApp()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState(() => new Set())
  const [menu, setMenu] = useState(null)
  const [colPick, setColPick] = useState(null)
  // Columns marked `optional` start hidden so a wide table fits its container
  // on first view; the column control still exposes them. The stored choice is
  // stamped with the column set it was made against, so a page that gains or
  // renames columns falls back to the new defaults instead of restoring a
  // layout that no longer matches.
  const [storedCols, setStoredCols] = useLocalState(`tf-idam-cols-${id}`, null)
  const colSig = columns.map((c) => c.key).join('|')
  const defaultHidden = useMemo(
    () => columns.filter((c) => c.optional).map((c) => c.key),
    [columns],
  )
  const hiddenCols = storedCols && storedCols.sig === colSig ? storedCols.hidden : defaultHidden
  const setHiddenCols = (updater) => setStoredCols((prev) => {
    const current = prev && prev.sig === colSig ? prev.hidden : defaultHidden
    return { sig: colSig, hidden: typeof updater === 'function' ? updater(current) : updater }
  })
  const [storedView, setStoredView] = useLocalState(`tf-idam-view-${id}`, defaultView)
  // Page size is a per-register preference: an operator who works in the
  // identity directory at 50 rows should not be put back to 10 every visit.
  const [per, setPer] = useLocalState(`tf-idam-per-${id}`, pageSize)
  const searchRef = useRef(null)

  const viewList = views && views.length ? views : null
  const controlled = viewProp != null && typeof onViewChange === 'function'
  const requested = controlled ? viewProp : storedView
  const setView = controlled ? onViewChange : setStoredView
  const view = viewList && viewList.some((v) => v.id === requested) ? requested : 'table'
  const asCards = view === 'cards' && typeof renderCard === 'function'
  const asGroups = view === 'groups' && typeof groupOf === 'function'
  const labelOf = (r) => String(groupOf(r) ?? '').trim() || 'Unassigned'

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.includes(c.key)),
    [columns, hiddenCols],
  )

  // A column's `value` accessor is the sort key when it has one, so computed
  // cells (nested counts, derived status) sort by what the cell actually shows
  // rather than by an absent top-level field.
  const filtered = useMemo(() => {
    let out = rows
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      out = out.filter((r) =>
        columns.some((c) => {
          const raw = c.value ? c.value(r) : r[c.key]
          return raw != null && String(raw).toLowerCase().includes(needle)
        }),
      )
    }
    if (!sort.key) return out
    const col = columns.find((c) => c.key === sort.key)
    const read = col && col.value ? col.value : (r) => r[sort.key]
    return [...out].sort((a, b) => {
      const x = read(a)
      const y = read(b)
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number' && typeof y === 'number') return sort.dir === 'asc' ? x - y : y - x
      return sort.dir === 'asc'
        ? String(x).localeCompare(String(y))
        : String(y).localeCompare(String(x))
    })
  }, [rows, q, columns, sort])

  // Grouping keeps the active sort inside each section and only reorders the
  // sections themselves, so a grouped page never fragments one section across
  // unrelated rows.
  const { ordered, groups } = useMemo(() => {
    if (!asGroups) return { ordered: filtered, groups: null }
    const buckets = new Map()
    filtered.forEach((r) => {
      const key = labelOf(r)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(r)
    })
    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    return { ordered: sorted.flatMap(([, rs]) => rs), groups: new Map(sorted) }
  }, [filtered, asGroups, groupOf])

  useEffect(() => { setPage(1) }, [q, per, view])

  const pages = Math.max(1, Math.ceil(ordered.length / per))
  const current = Math.min(page, pages)
  const offset = (current - 1) * per
  const pageRows = ordered.slice(offset, current * per)

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

  const openRowMenu = (e, r, rid) => {
    e.stopPropagation()
    setMenu({ anchor: e.currentTarget, rid, items: rowActions(r) })
  }


  const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)

  // Group headers stick below the column header, whose height changes when a
  // long label wraps — so the offset is measured rather than assumed.
  const headRef = useRef(null)
  const [headH, setHeadH] = useState(32)
  useEffect(() => {
    const el = headRef.current
    if (!el) return undefined
    const measure = () => setHeadH(Math.round(el.getBoundingClientRect().height) || 32)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [asCards, visibleColumns.length])

  const tableBody = pageRows.map((r, i) => {
    const rid = getRowId(r)
    const label = asGroups ? labelOf(r) : null
    const opensGroup = asGroups && (i === 0 || labelOf(pageRows[i - 1]) !== label)
    const section = asGroups ? groups.get(label) || [] : null
    return (
      <Fragment key={rid}>
        {opensGroup && (
          <tr className="wb-grp">
            <td colSpan={colSpan}>
              <span className="wb-grp-in">
                <Icon name="layers" size={12} />
                <b>{label}</b>
                <span className="wb-grp-n num">{section.length}</span>
                {groupSummary && <span className="wb-grp-s">{groupSummary(section, label)}</span>}
              </span>
            </td>
          </tr>
        )}
        <tr
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
                <IconButton icon="kebab" size="sm" label="Row actions" onClick={(e) => openRowMenu(e, r, rid)} />
              </span>
            </td>
          )}
        </tr>
      </Fragment>
    )
  })

  return (
    <div className="wb">
      {header}
      <div className="wb-bar">
        {/* Three groups, not two. Search and the facet chips used to travel
            together, so when the bar ran out of width the chips wrapped inside
            that group while the right-hand controls stayed put — a ragged
            second line starting under the middle of the bar. Kept apart, the
            chips can drop to a full row of their own beneath a complete first
            row, which is the only arrangement that stays aligned at every
            width. */}
        {search && (
          <div className="wb-bar-search">
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
          </div>
        )}
        {filters && <div className="wb-bar-filters">{filters}</div>}

        <div className="wb-bar-r">
          {toolbar}
          {viewList && (
            <div className="seg wb-views" role="group" aria-label="View mode">
              {viewList.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  data-on={view === v.id || undefined}
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  title={v.desc || `${v.label} view`}
                >
                  <Icon name={v.icon} size={13} />
                  <span className="wb-view-l">{v.label}</span>
                </button>
              ))}
            </div>
          )}
          {asCards && (
            <span className="wb-sortby">
              <span>Sort</span>
              <select
                className="sel"
                value={sort.key || ''}
                onChange={(e) => setSort({ key: e.target.value || null, dir: 'asc' })}
                aria-label="Sort cards by"
              >
                <option value="">Default order</option>
                {columns
                  .filter((c) => c.sortable !== false && c.key !== '__sno')
                  .map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <IconButton
                icon={sort.dir === 'asc' ? 'sortUp' : 'sortDown'}
                size="sm"
                label={sort.dir === 'asc' ? 'Sort ascending — switch to descending' : 'Sort descending — switch to ascending'}
                disabled={!sort.key}
                onClick={() => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
              />
            </span>
          )}
          {!asCards && (
            <IconButton
              icon="columns"
              label="Configure table fields"
              onClick={(e) => setColPick((a) => (a ? null : e.currentTarget))}
            />
          )}
        </div>
      </div>

      {subBar}

      {selectable && sel.size > 0 && (
        <div className="wb-bulk">
          <Check checked={allOnPage} mixed={!allOnPage && someOnPage} onChange={toggleAll} label="Select all" />
          <span><b>{sel.size}</b> selected</span>
          <button className="link" onClick={() => setSel(new Set())}>Clear</button>
          <div className="wb-bulk-actions">{bulkActions && bulkActions([...sel], () => setSel(new Set()))}</div>
        </div>
      )}

      <div className="wb-scroll" data-bounded={scrollBody || undefined}>
        {loading ? (
          <SkeletonTable rows={8} cols={Math.min(6, visibleColumns.length || 5)} />
        ) : pageRows.length === 0 ? (
          // "Nothing has been published yet" is the wrong thing to say to
          // someone who has simply mistyped a search. The query is internal
          // state, so only this component can tell the two apart.
          q.trim() && rows.length > 0 ? (
            <EmptyState
              icon="search"
              title={`No match for “${q.trim()}”`}
              body="Nothing in this register matches that search. Clear it to see everything again."
              actions={<Button icon="x" onClick={() => setQ('')}>Clear search</Button>}
            />
          ) : <EmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody} />
        ) : asCards ? (
          <div className="wb-cards">
            {pageRows.map((r) => {
              const rid = getRowId(r)
              return (
                <Fragment key={rid}>
                  {renderCard(r, {
                    id: rid,
                    selectable,
                    selected: sel.has(rid),
                    toggle: () => toggleOne(rid),
                    active: activeRowId != null && String(activeRowId) === String(rid),
                    open: onRowClick ? () => onRowClick(r) : undefined,
                    onMenu: rowActions ? (e) => openRowMenu(e, r, rid) : undefined,
                  })}
                </Fragment>
              )
            })}
          </div>
        ) : (
          <table className="tbl" style={{ '--thead-h': `${headH}px` }}>
            <thead ref={headRef}>
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
                {rowActions && <th className="td-act">{actionsLabel}</th>}
              </tr>
            </thead>
            <tbody>{tableBody}</tbody>
          </table>
        )}
      </div>

      <div className="wb-foot">
        <span>
          {ordered.length === 0 ? '0' : `${offset + 1}–${Math.min(current * per, ordered.length)}`} of{' '}
          <b className="num">{ordered.length.toLocaleString()}</b>
          {rows.length !== ordered.length && <span className="t-faint"> · filtered from {rows.length.toLocaleString()}</span>}
        </span>
        {footNote && <span className="t-faint">{footNote}</span>}
        <div className="spacer" />
        {/* Density now changes the card view as much as the table — comfortable
            is a card, compact is a list — so the switch belongs in both. */}
        <div className="density" role="group" aria-label="Density">
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

      {colPick && (
        <ColumnPicker
          anchor={colPick}
          columns={columns}
          hidden={hiddenCols}
          onToggle={(key) => setHiddenCols((h) => (h.includes(key) ? h.filter((k) => k !== key) : [...h, key]))}
          onShowAll={() => setHiddenCols([])}
          onReset={() => setHiddenCols(defaultHidden)}
          onClose={() => setColPick(null)}
        />
      )}
      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
