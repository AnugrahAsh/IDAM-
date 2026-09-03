import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../primitives/Icon'
import { NAV, BY_ID, moduleFor } from '../../data/nav'
import { APPLICATIONS, DIRECTORIES, GROUPS, USERS } from '../../data/seed'
import { useApp } from '../../store/AppContext'

// Flatten the one navigation model into palette entries, so the palette can
// never drift from the sidebar.
const MODULES = NAV.flatMap((g) => {
  const ids = [...(g.items || []), ...(g.parents || []).flatMap((p) => p.items || [])]
  return ids.map((id) => BY_ID[id]).filter(Boolean).map((r) => ({
    id: r.id, to: r.id, label: r.label, icon: r.icon, group: g.label,
  }))
})

/* The top bar offers to search "users, applications, groups, pages", so the
   palette has to be able to. It used to search page names only and answer a
   person's name with "no matches", which read as the console not holding them.
   Records are matched on the fields an operator would actually type. */
const RECORDS = [
  ...USERS.map((u) => ({
    id: `user-${u.id}`,
    to: `/iam/users/${u.id}`,
    label: `${u.firstName} ${u.lastName}`,
    hint: u.email,
    terms: `${u.firstName} ${u.lastName} ${u.username} ${u.email} ${u.department}`,
    icon: 'user',
    group: 'Identities',
  })),
  ...APPLICATIONS.map((a) => ({
    id: `app-${a.id}`,
    to: `/iam/applications/${a.id}`,
    label: a.displayName,
    hint: a.name,
    terms: `${a.displayName} ${a.name} ${a.method} ${a.owner}`,
    icon: 'apps',
    group: 'Applications',
  })),
  ...GROUPS.map((g) => ({
    id: `group-${g.id}`,
    to: `/iam/groups/${g.id}`,
    label: g.name,
    hint: `${g.kind} group`,
    terms: `${g.name} ${g.description} ${g.kind} ${g.application}`,
    icon: 'group',
    group: 'Groups',
  })),
  ...DIRECTORIES.map((d) => ({
    id: `dir-${d.id}`,
    to: `/iam/ldapapplications/${d.id}`,
    label: d.displayName,
    hint: d.baseDn,
    terms: `${d.displayName} ${d.name} ${d.baseDn} ${d.url}`,
    icon: 'directory',
    group: 'Directories',
  })),
]

export default function CommandPalette({ open, onClose }) {
  const { navigate, can } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // The palette must not offer a page the role being viewed as cannot open,
  // or it becomes a second route into the guard screen.
  const modules = useMemo(() => MODULES.filter((e) => {
    const mod = moduleFor(e.id)
    return !mod || can(mod)
  }), [can])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    // With nothing typed the palette is a jump list, so only modules are shown.
    if (!t) return modules.slice(0, 24)
    // Rank by how well the LABEL matches, so "reports" lands on Reports rather
    // than on a page that merely sits in the Reports group. Modules outrank
    // records at equal quality, because a bare module name is nearly always a
    // request to go there.
    const score = (e, isModule) => {
      const l = e.label.toLowerCase()
      const base = l === t ? 0 : l.startsWith(t) ? 2 : l.includes(t) ? 4 : null
      if (base !== null) return base + (isModule ? 0 : 1)
      const terms = (e.terms || e.group || '').toLowerCase()
      if (terms.includes(t)) return isModule ? 6 : 7
      return 99
    }
    return [
      ...modules.map((e) => ({ e, s: score(e, true) })),
      ...RECORDS.map((e) => ({ e, s: score(e, false) })),
    ]
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s || a.e.label.localeCompare(b.e.label))
      .slice(0, 24)
      .map((x) => x.e)
  }, [q, modules])

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
        if (hit) { onClose(); navigate(hit.to) }
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
            placeholder="Search users, applications, groups, pages…"
            aria-label="Search commands"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="pal-list" ref={listRef}>
          {results.length === 0 && (
            <div className="empty" style={{ padding: '28px 20px' }}>
              <div className="e-t">No matches</div>
              <div className="e-s">Nothing matches that name. Try part of a person, application, group, directory or page.</div>
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
                  onClick={() => { onClose(); navigate(r.to) }}
                >
                  <Icon name={r.icon || 'dashboard'} />
                  <span className="trunc">{r.label}</span>
                  <span className="pi-sub">{r.hint || r.group}</span>
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
