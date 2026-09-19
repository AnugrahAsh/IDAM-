import { useMemo, useState } from 'react'
import Icon from '../primitives/Icon'
import IconButton from '../primitives/IconButton'
import Button from '../primitives/Button'
import Check from '../primitives/Check'
import Meter from '../primitives/Meter'
import EmptyState from '../primitives/EmptyState'
import { num } from '../../lib/format'
import { WRITE_PERMS, permGroups } from '../../lib/permissions'

const HEAD_ROW_H = 32
const MODULE_COL = 268

const FILTERS = [
  { id: 'all', label: 'All modules', icon: 'layers' },
  { id: 'granted', label: 'Granted', icon: 'checkC' },
  { id: 'write', label: 'Write-capable', icon: 'bolt' },
  { id: 'gaps', label: 'Not fully granted', icon: 'minus' },
]

export default function PermissionMatrix({
  catalog = [],
  granted = {},
  readOnly = false,
  onToggle,
  onSetModule,
  onSetColumn,
  note,
  maxHeight = 560,
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const groups = useMemo(() => permGroups(catalog), [catalog])
  const needle = q.trim().toLowerCase()

  const colHits = useMemo(() => {
    if (!needle) return null
    const hits = groups.flatMap((g) => g.perms).filter((p) => p.toLowerCase().includes(needle))
    return hits.length ? new Set(hits) : null
  }, [groups, needle])

  const shownGroups = useMemo(() => (colHits
    ? groups.map((g) => ({ ...g, perms: g.perms.filter((p) => colHits.has(p)) })).filter((g) => g.perms.length > 0)
    : groups), [groups, colHits])

  const modules = useMemo(() => catalog.filter((m) => {
    if (needle && !m.name.toLowerCase().includes(needle) && !m.perms.some((p) => p.toLowerCase().includes(needle))) return false
    const held = (granted[m.name] || []).filter((p) => m.perms.includes(p))
    if (filter === 'granted') return held.length > 0
    if (filter === 'write') return held.some((p) => WRITE_PERMS.has(p))
    if (filter === 'gaps') return held.length < m.perms.length
    return true
  }), [catalog, granted, needle, filter])

  const totals = useMemo(() => {
    let all = 0
    let held = 0
    let write = 0
    let touched = 0
    catalog.forEach((m) => {
      all += m.perms.length
      const valid = (granted[m.name] || []).filter((p) => m.perms.includes(p))
      held += valid.length
      if (valid.length) touched += 1
      if (valid.some((p) => WRITE_PERMS.has(p))) write += 1
    })
    return { all, held, write, touched, pct: all ? Math.round((held / all) * 100) : 0 }
  }, [catalog, granted])

  const groupCount = (g) => modules.reduce((a, m) => {
    const held = granted[m.name] || []
    return a + g.perms.filter((p) => m.perms.includes(p) && held.includes(p)).length
  }, 0)

  const columnState = (perm) => {
    const applicable = modules.filter((m) => m.perms.includes(perm))
    const on = applicable.filter((m) => (granted[m.name] || []).includes(perm))
    return { applicable, all: applicable.length > 0 && on.length === applicable.length, some: on.length > 0, count: on.length }
  }

  const setEveryVisible = (next) => {
    if (readOnly || !onSetModule) return
    modules.forEach((m) => onSetModule(m.name, next))
  }

  const stickyHead = {
    position: 'sticky',
    zIndex: 6,
    background: 'var(--surface-2)',
  }

  return (
    <div className="wb">
      <div className="wb-bar">
        <div className="wb-search">
          <Icon name="search" size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules or permissions…"
            aria-label="Search modules or permissions"
          />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </div>

        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" data-on={filter === f.id} onClick={() => setFilter(f.id)}>
            <Icon name={f.icon} size={12} />
            {f.label}
          </button>
        ))}

        <div className="spacer" />

        {!readOnly && (
          <>
            <Button size="sm" icon="checkC" onClick={() => setEveryVisible(true)}>Grant visible</Button>
            <Button size="sm" icon="minus" onClick={() => setEveryVisible(false)}>Revoke visible</Button>
          </>
        )}
        <span className="chip" data-on="true" style={{ cursor: 'default' }}>
          <Icon name="key" size={12} />
          <span className="num">{num(totals.held)}</span>
          <span className="t-faint">/ {num(totals.all)}</span>
        </span>
      </div>

      <div className="wb-scroll" style={{ maxHeight }}>
        {modules.length === 0 || shownGroups.length === 0 ? (
          <EmptyState
            icon="search"
            title="No modules match"
            body="Clear the search or switch the filter to see the rest of the permission catalog."
          />
        ) : (
          <table className="tbl" style={{ width: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  style={{ ...stickyHead, top: 0, left: 0, zIndex: 8, width: MODULE_COL, minWidth: MODULE_COL }}
                >
                  <span className="th-in">Module</span>
                </th>
                {shownGroups.map((g) => (
                  <th
                    key={g.id}
                    colSpan={g.perms.length}
                    style={{ ...stickyHead, top: 0, textAlign: 'center', borderLeft: '1px solid var(--line)' }}
                  >
                    <span className="th-in" style={{ justifyContent: 'center', width: '100%' }}>
                      {g.label}
                      <span className="t-faint num">{groupCount(g)}</span>
                    </span>
                  </th>
                ))}
              </tr>
              <tr>
                {shownGroups.flatMap((g) => g.perms.map((p, i) => {
                  const st = columnState(p)
                  return (
                    <th
                      key={`${g.id}-${p}`}
                      title={readOnly
                        ? `${p} · granted on ${st.count} of ${st.applicable.length} visible modules`
                        : `${st.all ? 'Revoke' : 'Grant'} ${p} across ${st.applicable.length} visible modules`}
                      onClick={() => {
                        if (readOnly || !onSetColumn || st.applicable.length === 0) return
                        onSetColumn(p, st.applicable.map((m) => m.name), !st.all)
                      }}
                      style={{
                        ...stickyHead,
                        top: HEAD_ROW_H,
                        zIndex: 5,
                        textAlign: 'center',
                        minWidth: 86,
                        padding: '0 6px',
                        cursor: readOnly ? 'default' : 'pointer',
                        color: st.all ? 'var(--accent-a)' : undefined,
                        borderLeft: i === 0 ? '1px solid var(--line)' : undefined,
                      }}
                    >
                      <span className="th-in" style={{ justifyContent: 'center', width: '100%' }}>{p}</span>
                    </th>
                  )
                }))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const held = (granted[m.name] || []).filter((p) => m.perms.includes(p))
                const all = held.length === m.perms.length
                const some = held.length > 0
                const write = held.some((p) => WRITE_PERMS.has(p))
                return (
                  <tr key={m.id}>
                    <td
                      className="td-main"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        background: 'var(--surface)',
                        borderRight: '1px solid var(--line)',
                        width: MODULE_COL,
                        minWidth: MODULE_COL,
                      }}
                    >
                      <span className="cell-id" style={{ opacity: readOnly ? 0.78 : 1 }}>
                        <Check
                          checked={all}
                          mixed={some && !all}
                          disabled={readOnly}
                          label={`Select all permissions in ${m.name}`}
                          onChange={() => onSetModule && onSetModule(m.name, !all)}
                        />
                        <span className="trunc" style={{ flex: 1 }}>{m.name}</span>
                        {write && <Icon name="bolt" size={11} style={{ color: 'var(--warn-core)' }} />}
                        <span className="t-xs t-faint num">{held.length}/{m.perms.length}</span>
                      </span>
                    </td>
                    {shownGroups.flatMap((g) => g.perms.map((p, i) => {
                      const supported = m.perms.includes(p)
                      return (
                        <td
                          key={`${m.id}-${g.id}-${p}`}
                          style={{
                            textAlign: 'center',
                            padding: '0 6px',
                            borderLeft: i === 0 ? '1px solid var(--line)' : undefined,
                          }}
                        >
                          {supported ? (
                            <span style={{ display: 'inline-flex', opacity: readOnly ? 0.68 : 1 }}>
                              <Check
                                checked={held.includes(p)}
                                disabled={readOnly}
                                label={`${p} on ${m.name}`}
                                onChange={() => onToggle && onToggle(m.name, p)}
                              />
                            </span>
                          ) : (
                            <span className="t-faint" aria-hidden="true">·</span>
                          )}
                        </td>
                      )
                    }))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="wb-foot">
        <span>
          <b className="num">{num(totals.held)}</b> of {num(totals.all)} permissions granted across{' '}
          <b className="num">{num(totals.touched)}</b> of {num(catalog.length)} modules
        </span>
        <span style={{ width: 120 }}>
          <Meter value={totals.pct} tone={totals.pct > 66 ? 'bad' : totals.pct > 33 ? 'warn' : 'ok'} />
        </span>
        <span className="t-faint">{totals.pct}% of the catalog</span>
        <div className="spacer" />
        <span className="t-faint">
          <Icon name="bolt" size={11} style={{ color: 'var(--warn-core)' }} /> {num(totals.write)} write-capable modules
        </span>
        {note && <span className="t-faint">{note}</span>}
      </div>
    </div>
  )
}
