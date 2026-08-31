import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../primitives/Icon'
import { NAV, BY_ID } from '../../data/nav'
import { useApp } from '../../store/AppContext'

// Flatten the one navigation model into palette entries, so the palette can
// never drift from the sidebar.
const ENTRIES = NAV.flatMap((g) => {
  const ids = [...(g.items || []), ...(g.parents || []).flatMap((p) => p.items || [])]
  return ids.map((id) => BY_ID[id]).filter(Boolean).map((r) => ({
    id: r.id, label: r.label, icon: r.icon, group: g.label,
  }))
})

export default function CommandPalette({ open, onClose }) {
  const { navigate } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return ENTRIES.slice(0, 24)
    // Rank by how well the LABEL matches, so "reports" lands on Reports rather
    // than on a page that merely sits in the Reports group.
    const score = (e) => {
      const l = e.label.toLowerCase()
      if (l === t) return 0
      if (l.startsWith(t)) return 1
      if (l.includes(t)) return 2
      if (e.group.toLowerCase().includes(t)) return 3
      return 99
    }
    return ENTRIES
      .map((e) => ({ e, s: score(e) }))
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s)
      .slice(0, 24)
      .map((x) => x.e)
  }, [q])

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
    // Focus directly — the palette DOM is always mounted, so no frame wait is
    // needed. rAF here got cancelled by StrictMode's double-invoked cleanup.
    if (inputRef.current) inputRef.current.focus()
    return undefined
  }, [open])

  useEffect(() => { setSel(0) }, [q])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const hit = results[sel]
        if (hit) { onClose(); navigate(hit.id) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, results, sel, onClose, navigate])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector('.pal-it.sel')
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
  }, [sel])

  let lastGroup = null

  return (
    <div className={`modal-wrap${open ? ' show' : ''}`} aria-hidden={!open}>
      <div className="m-scrim" onMouseDown={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="pal-inp">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a module, search the console…"
            aria-label="Search commands"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="pal-list" ref={listRef}>
          {results.length === 0 && (
            <div className="empty" style={{ padding: '28px 20px' }}>
              <div className="e-t">No matches</div>
              <div className="e-s">Try a module name such as “Users”, “Applications” or “Reports”.</div>
            </div>
          )}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? r.group : null
            lastGroup = r.group
            return (
              <div key={r.id}>
                {head && <div className="pal-grp">{head}</div>}
                <button
                  type="button"
                  className={`pal-it${i === sel ? ' sel' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => { onClose(); navigate(r.id) }}
                >
                  <Icon name={r.icon || 'dashboard'} />
                  <span className="trunc">{r.label}</span>
                  <span className="pi-sub">{r.group}</span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="pal-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
          <span style={{ marginLeft: 'auto' }} className="num">{results.length} results</span>
        </div>
      </div>
    </div>
  )
}
