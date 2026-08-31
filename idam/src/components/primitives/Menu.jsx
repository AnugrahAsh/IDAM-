import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from './Icon'

export default function Menu({ anchor, items, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: -9999, top: -9999 })

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const m = ref.current.getBoundingClientRect()
    let left = Math.min(a.left, window.innerWidth - m.width - 10)
    let top = a.bottom + 4
    if (top + m.height > window.innerHeight - 10) top = Math.max(10, a.top - m.height - 4)
    setPos({ left: Math.max(8, left), top })
  }, [anchor])

  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchor && !anchor.contains(e.target)) onClose()
    }
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [anchor, onClose])

  return (
    <div ref={ref} className="menu" style={pos} role="menu">
      {items.map((it, i) => {
        if (it.divider) return <div className="menu-div" key={`d${i}`} />
        if (it.label && it.header) return <div className="menu-lbl" key={`h${i}`}>{it.label}</div>
        return (
          <button
            key={it.id || i}
            type="button"
            role="menuitem"
            className="menu-it"
            data-danger={!!it.danger}
            disabled={it.disabled}
            onClick={() => {
              onClose()
              it.onSelect && it.onSelect()
            }}
          >
            {it.icon && <Icon name={it.icon} size={14} />}
            {it.label}
            {it.hint && <kbd>{it.hint}</kbd>}
          </button>
        )
      })}
    </div>
  )
}
