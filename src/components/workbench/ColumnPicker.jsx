import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Icon from '../primitives/Icon'
import IconButton from '../primitives/IconButton'
import Check from '../primitives/Check'
import Button from '../primitives/Button'

/**
 * The column configurator.
 *
 * A menu that closed on every click was tolerable when a register offered five
 * optional fields. The identity register now offers every attribute the schema
 * defines — forty and counting — so this is a panel instead: it is searchable,
 * it stays open while several columns are toggled, and it says how many of the
 * available fields are currently shown.
 */
export default function ColumnPicker({ anchor, columns, hidden, onToggle, onShowAll, onReset, onClose }) {
  const ref = useRef(null)
  const searchRef = useRef(null)
  const [pos, setPos] = useState({ left: -9999, top: -9999 })
  const [q, setQ] = useState('')

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const m = ref.current.getBoundingClientRect()
    const left = Math.min(a.right - m.width, window.innerWidth - m.width - 10)
    let top = a.bottom + 4
    if (top + m.height > window.innerHeight - 10) top = Math.max(10, a.top - m.height - 4)
    setPos({ left: Math.max(8, left), top })
  }, [anchor])

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchor && !anchor.contains(e.target)) onClose()
    }
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [anchor, onClose])

  const needle = q.trim().toLowerCase()
  const shown = useMemo(
    () => columns.filter((c) => !needle || String(c.label).toLowerCase().includes(needle) || String(c.key).toLowerCase().includes(needle)),
    [columns, needle],
  )
  const visibleCount = columns.filter((c) => !hidden.includes(c.key)).length

  return (
    <div ref={ref} className="colpick" style={pos} role="dialog" aria-label="Configure table fields">
      <div className="colpick-h">
        <span className="t-sm" style={{ fontWeight: 600 }}>Table fields</span>
        <span className="t-xs t-mut num">{visibleCount} of {columns.length} shown</span>
      </div>

      <div className="wb-search colpick-search">
        <Icon name="search" size={13} />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fields…"
          aria-label="Search table fields"
        />
        {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
      </div>

      <div className="colpick-list">
        {shown.length === 0 && <div className="t-sm t-mut" style={{ padding: '8px 10px' }}>No field matches.</div>}
        {shown.map((c) => (
          <label className="colpick-it" key={c.key} data-locked={c.locked || undefined}>
            <Check
              checked={!hidden.includes(c.key)}
              disabled={c.locked}
              label={`Show ${c.label}`}
              onChange={() => !c.locked && onToggle(c.key)}
            />
            <span className="trunc">{c.label}</span>
            {c.locked && <Icon name="lock" size={11} style={{ color: 'var(--faint)', flex: 'none' }} />}
          </label>
        ))}
      </div>

      <div className="colpick-f">
        <Button size="sm" onClick={onShowAll}>Show all</Button>
        <Button size="sm" onClick={onReset}>Reset</Button>
        <div className="spacer" />
        <Button size="sm" variant="pri" onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}
