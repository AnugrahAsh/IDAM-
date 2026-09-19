import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import { GROUPS } from '../../data/seed'
import { num } from '../../lib/format'

/**
 * Add or remove several groups of one type at once, from a searchable table
 * with checkboxes — rather than one dropdown pick, or one "×" removal, at a
 * time. Nothing is applied to the level's draft until the drawer is submitted.
 */
export default function GroupPickerForm({ kind, held, value, onChange }) {
  const [q, setQ] = useState('')
  const pool = useMemo(() => GROUPS.filter((g) => g.kind === kind), [kind])
  const heldIds = useMemo(() => new Set(held.map((h) => h.id)), [held])

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? pool.filter((g) => `${g.name} ${g.application} ${g.description || ''}`.toLowerCase().includes(n))
      : pool
    return list.slice(0, 80)
  }, [pool, q])

  if (pool.length === 0) {
    return <EmptyState size="sm" icon="layers" title="No groups of this type" body="There is nothing in the catalog to add." />
  }

  const allShown = matches.length > 0 && matches.every((g) => value.some((h) => h.id === g.id))
  const toggle = (g) => onChange(value.some((h) => h.id === g.id)
    ? value.filter((h) => h.id !== g.id)
    : [...value, { id: g.id, name: g.name, application: g.application }])

  const added = value.filter((h) => !heldIds.has(h.id)).length
  const removed = held.filter((h) => !value.some((v) => v.id === h.id)).length

  return (
    <div className="stack">
      <div className="row-between">
        <span className="wb-search" style={{ flex: 1 }}>
          <Icon name="search" size={13} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by group, application or description…" aria-label="Search groups" />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </span>
        <Button
          size="sm"
          onClick={() => onChange(allShown
            ? value.filter((h) => !matches.some((g) => g.id === h.id))
            : [...value, ...matches.filter((g) => !value.some((h) => h.id === g.id)).map((g) => ({ id: g.id, name: g.name, application: g.application }))])}
        >
          {allShown ? 'Clear shown' : 'Select shown'}
        </Button>
      </div>

      <div className="rc-group-pick">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 40 }}><span className="vis-hidden">Select</span></th>
              <th>Group</th>
              <th>Application</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((g) => (
              <tr key={g.id} onClick={() => toggle(g)} className="rc-group-row">
                <td onClick={(e) => e.stopPropagation()}>
                  <Check checked={value.some((h) => h.id === g.id)} label={`Select ${g.name}`} onChange={() => toggle(g)} />
                </td>
                <td className="td-main">
                  <span className="trunc">
                    <span style={{ display: 'block' }}>{g.name}</span>
                    {heldIds.has(g.id) && <span className="cell-sub">Currently held</span>}
                  </span>
                </td>
                <td>{g.application}</td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr><td colSpan={3} className="t-sm t-mut" style={{ padding: 10 }}>No group matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="t-xs t-mut">{num(value.length)} selected · showing {num(matches.length)} of {num(pool.length)} available</div>

      {(added > 0 || removed > 0) && (
        <Banner tone="info">
          {added > 0 && `+${added} ${added === 1 ? 'group' : 'groups'} added`}
          {added > 0 && removed > 0 ? ' · ' : ''}
          {removed > 0 && `−${removed} ${removed === 1 ? 'group' : 'groups'} removed`}
          {' '}— applied once you submit this level.
        </Banner>
      )}
    </div>
  )
}
