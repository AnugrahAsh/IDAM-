import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

const norm = (o) => (o && o.value !== undefined
  ? { value: o.value, label: o.label !== undefined ? o.label : o.value }
  : { value: o, label: o })

// A dropdown with a filter box, and optionally more than one selection.
//
// It reports through `onChange` with an event-shaped argument so it is a drop-in
// for the native Select primitive: single mode hands back a string, multi mode
// an array. The native control is still right for short option lists — this one
// exists because picking a department out of forty in an unfiltered dropdown is
// not a realistic thing to ask an administrator to do.
export default function SearchSelect({
  id,
  value,
  options = [],
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  multiple = false,
  disabled = false,
  emptyLabel = 'No matches',
  onChange,
}) {
  const items = useMemo(() => options.map(norm), [options])
  const selected = multiple ? (Array.isArray(value) ? value : []) : value
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const wrapRef = useRef(null)
  const searchRef = useRef(null)
  const listId = useId()

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((o) => String(o.label).toLowerCase().includes(needle))
  }, [items, q])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) { setQ(''); setCursor(0); searchRef.current?.focus() }
  }, [open])

  const labelFor = (v) => {
    const hit = items.find((o) => String(o.value) === String(v))
    return hit ? hit.label : v
  }

  const emit = (next) => onChange && onChange({ target: { value: next } })

  const choose = (opt) => {
    if (!multiple) {
      emit(opt.value)
      setOpen(false)
      return
    }
    const has = selected.some((v) => String(v) === String(opt.value))
    emit(has ? selected.filter((v) => String(v) !== String(opt.value)) : [...selected, opt.value])
  }

  const clearOne = (v) => emit(selected.filter((x) => String(x) !== String(v)))

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(shown.length - 1, c + 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = shown[cursor]
      if (opt) choose(opt)
    }
  }

  const isEmpty = multiple ? selected.length === 0 : !selected

  return (
    <div className="ssel" ref={wrapRef} data-open={open || undefined} data-disabled={disabled || undefined}>
      <button
        type="button"
        id={id}
        className="ssel-btn"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ssel-val">
          {isEmpty && <span className="ssel-ph">{placeholder}</span>}
          {!multiple && !isEmpty && <span className="trunc">{labelFor(selected)}</span>}
          {multiple && selected.map((v) => (
            <span className="ssel-chip" key={v}>
              <span className="trunc">{labelFor(v)}</span>
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Remove ${labelFor(v)}`}
                onClick={(e) => { e.stopPropagation(); clearOne(v) }}
              >
                <Icon name="x" size={9} />
              </span>
            </span>
          ))}
        </span>
        <Icon name="chevD" size={13} className="ssel-caret" />
      </button>

      {open && (
        <div className="ssel-pop">
          <div className="ssel-search">
            <Icon name="search" size={13} />
            <input
              ref={searchRef}
              value={q}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              onChange={(e) => { setQ(e.target.value); setCursor(0) }}
              onKeyDown={onKeyDown}
            />
            {q && (
              <button type="button" className="ssel-clear" aria-label="Clear search" onClick={() => { setQ(''); searchRef.current?.focus() }}>
                <Icon name="x" size={10} />
              </button>
            )}
          </div>

          <div className="ssel-list" id={listId} role="listbox" aria-multiselectable={multiple || undefined}>
            {shown.length === 0 && <div className="ssel-empty">{emptyLabel}</div>}
            {shown.map((o, i) => {
              const on = multiple
                ? selected.some((v) => String(v) === String(o.value))
                : String(selected) === String(o.value)
              return (
                <button
                  type="button"
                  key={o.value}
                  role="option"
                  aria-selected={on}
                  className="ssel-opt"
                  data-on={on || undefined}
                  data-cursor={i === cursor || undefined}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(o)}
                >
                  <span className="trunc">{o.label}</span>
                  {on && <Icon name="check" size={12} />}
                </button>
              )
            })}
          </div>

          {multiple && (
            <div className="ssel-foot">
              <span className="t-xs t-mut">{selected.length} selected</span>
              <button type="button" className="link" onClick={() => emit([])}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
