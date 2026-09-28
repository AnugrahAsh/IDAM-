import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'

/* Every row the arrow keys should reach — including rows a caller drew itself
   inside a `node`, which is how the account panel gets an identity block at the
   top without a second popup implementation growing up beside this one. */
const ROW = '[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"]'

/**
 * An anchored popup menu.
 *
 * `items` carries four kinds of entry: `{ divider }`, `{ label, header }`,
 * `{ node }` for content the caller draws itself, and anything else as a
 * command row. A row with `checked` defined becomes a radio row, which is what
 * a set of mutually exclusive choices — the roles an identity may act as —
 * needs in order to say which one is in force without a sentence.
 */
export default function Menu({ anchor, items, onClose, align = 'start', width, className, label, id }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: -9999, top: -9999, maxHeight: undefined })

  /* Closing from the keyboard hands focus back to the control that opened the
     menu; closing by clicking away does not, because the pointer has already
     decided where attention went. */
  const close = useCallback((restore) => {
    if (restore && anchor && anchor.isConnected) anchor.focus({ preventScroll: true })
    onClose()
  }, [anchor, onClose])

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const m = ref.current.getBoundingClientRect()
    const edge = 10
    const below = window.innerHeight - a.bottom - edge
    const above = a.top - edge
    /* Flip above only where there is genuinely more room there. A tall menu on
       a short viewport used to jump upward and run off the top instead; it now
       stays where it was opened and scrolls inside its own box. */
    const up = m.height > below && above > below
    const room = Math.max(180, (up ? above : below) - 4)
    /* A chip at the right edge of the header hangs its panel from that edge.
       Left-aligning a 288px panel to a 34px avatar pushes it off screen, and
       the clamp below then detaches the panel from the thing it belongs to. */
    let left = align === 'end' ? a.right - m.width : a.left
    left = Math.min(left, window.innerWidth - m.width - edge)
    const top = up ? Math.max(edge, a.top - Math.min(m.height, room) - 4) : a.bottom + 4
    setPos({ left: Math.max(8, left), top, maxHeight: Math.round(room) })
  }, [anchor, align])

  const rows = useCallback(
    () => Array.from(ref.current ? ref.current.querySelectorAll(ROW) : []).filter((el) => !el.disabled),
    [],
  )

  // A menu opened from the keyboard has to land inside itself, or the next Tab
  // walks into the page behind the popup as though nothing had opened.
  useEffect(() => {
    const first = rows()[0]
    if (first) first.focus({ preventScroll: true })
  }, [rows])

  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchor && !anchor.contains(e.target)) onClose()
    }
    const esc = (e) => { if (e.key === 'Escape') close(true) }
    /* The page moving under a menu leaves it stranded, so it closes — but a
       long menu now scrolls inside itself, and that must not count as the page
       moving or the roles list would dismiss itself halfway down. */
    const scrolled = (e) => {
      if (ref.current && e.target && e.target.nodeType && ref.current.contains(e.target)) return
      onClose()
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', scrolled, true)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', scrolled, true)
    }
  }, [anchor, onClose, close])

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      /* A menu is not a dialog: Tab leaves it rather than cycling inside it,
         and it leaves from the control that opened it. */
      e.preventDefault()
      close(true)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    const list = rows()
    if (!list.length) return
    e.preventDefault()
    const at = list.indexOf(document.activeElement)
    let next = 0
    if (e.key === 'End') next = list.length - 1
    else if (e.key === 'ArrowDown') next = at < 0 ? 0 : (at + 1) % list.length
    else if (e.key === 'ArrowUp') next = at < 0 ? list.length - 1 : (at - 1 + list.length) % list.length
    list[next].focus()
  }

  return (
    <div
      ref={ref}
      id={id}
      className={className ? `menu ${className}` : 'menu'}
      data-align={align === 'end' ? 'end' : undefined}
      style={{ left: pos.left, top: pos.top, width, maxHeight: pos.maxHeight, overflowY: 'auto' }}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {items.map((it, i) => {
        if (it.divider) return <div className="menu-div" key={`d${i}`} />
        if (it.node) return <div className="menu-node" role="none" key={it.id || `n${i}`}>{it.node}</div>
        if (it.label && it.header) return <div className="menu-lbl" key={`h${i}`}>{it.label}</div>
        const radio = it.checked !== undefined
        return (
          <button
            key={it.id || i}
            type="button"
            role={radio ? 'menuitemradio' : 'menuitem'}
            aria-checked={radio ? !!it.checked : undefined}
            // The arrow keys move focus between rows, so the menu is one tab
            // stop and Tab leaves it — the roving pattern a menu is read with.
            tabIndex={-1}
            className="menu-it"
            data-danger={!!it.danger}
            data-desc={it.desc ? 'true' : undefined}
            disabled={it.disabled}
            /* Why an item is disabled belongs on the item, not in a note beside
               the table: "Run now" greyed out with no reason reads as a fault. */
            title={it.title}
            /* Choosing a row unmounts the button that focus is sitting on —
               the menu moves focus into itself on open — so the same handover
               Escape and Tab use has to happen here too, or `activeElement`
               falls back to <body> and the next Tab restarts from the top of
               the document. Focus goes home before the selection runs, so a
               row that navigates is not fighting a focus call landing on the
               page it just left. */
            onClick={() => {
              close(true)
              it.onSelect && it.onSelect()
            }}
          >
            {radio
              ? <span className="menu-tick" aria-hidden="true">{it.checked ? <Icon name="check" size={14} /> : null}</span>
              : it.icon && <Icon name={it.icon} size={14} />}
            {it.desc
              ? (
                <span className="menu-t">
                  <span className="menu-l">{it.label}</span>
                  <span className="menu-desc">{it.desc}</span>
                </span>
              )
              : it.label}
            {it.hint && <kbd>{it.hint}</kbd>}
          </button>
        )
      })}
    </div>
  )
}
