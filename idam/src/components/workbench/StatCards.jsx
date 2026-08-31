import Icon from '../primitives/Icon'
import { num } from '../../lib/format'

// Headline metrics above a register. Each card carries three things: the count,
// a second-order figure that qualifies it (the chip), and the caption that says
// what the count is. Cards with an `id` also apply that filter when clicked.
export default function StatCards({ items, value, onChange, label = 'Register summary' }) {
  return (
    <section className="scards" role="group" aria-label={label}>
      {items.map((it) => {
        const clickable = !!(it.id && onChange)
        return (
          <button
            key={it.key || it.id || it.label}
            type="button"
            className="scard"
            data-on={clickable && value === it.id ? true : undefined}
            data-static={clickable ? undefined : true}
            aria-pressed={clickable ? value === it.id : undefined}
            title={it.hint}
            onClick={clickable ? () => onChange(value === it.id && it.id !== 'all' ? 'all' : it.id) : undefined}
          >
            <span className="scard-k">{it.icon && <Icon name={it.icon} size={12} />}{it.label}</span>
            <span className="scard-v num">{typeof it.value === 'number' ? num(it.value) : it.value}</span>
            <span className="scard-f">
              {it.chip && <span className="scard-chip" data-tone={it.chipTone}>{it.chip}</span>}
              {it.sub && <span className="scard-s trunc">{it.sub}</span>}
            </span>
          </button>
        )
      })}
    </section>
  )
}
