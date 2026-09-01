import Icon from '../primitives/Icon'
import Check from '../primitives/Check'
import IconButton from '../primitives/IconButton'

const stop = (e) => e.stopPropagation()

// The card view of a register row, shared by every page so the estate reads as
// one product. A page supplies the facts; the card owns the shape:
//
//   media   — logo, avatar or tinted icon
//   title   — what the record is called, with `sub` beneath it
//   tags    — status pills and labels, right-aligned after a spacer
//   line    — one full-width fact (an endpoint, an address, a condition)
//   meta    — up to four label/value pairs in a two-column grid
//   footL / footR — the closing line: a figure on the left, timing on the right
export default function RecordCard({
  media, title, sub, tags, line, meta = [], footL, footR, ctx = {}, label,
}) {
  return (
    <article
      className="rcard"
      data-selected={ctx.selected || undefined}
      data-active={ctx.active || undefined}
      onClick={ctx.open}
      role={ctx.open ? 'button' : undefined}
      tabIndex={ctx.open ? 0 : undefined}
      onKeyDown={ctx.open ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.open() } } : undefined}
    >
      <header className="rcard-top">
        {ctx.selectable && (
          <span onClick={stop} role="presentation">
            <Check checked={!!ctx.selected} onChange={ctx.toggle} label={`Select ${label || title}`} />
          </span>
        )}
        {media}
        <span className="rcard-id">
          <span className="rcard-name trunc">{title}</span>
          {sub && <span className="rcard-sub trunc">{sub}</span>}
        </span>
        {ctx.onMenu && <IconButton icon="kebab" size="sm" label={`Actions for ${label || title}`} onClick={ctx.onMenu} />}
      </header>

      {tags && <div className="rcard-tags">{tags}</div>}

      {line && <span className="rcard-line">{line}</span>}

      {meta.length > 0 && (
        <dl className="rcard-meta">
          {meta.map((m) => (
            <div key={m.k}>
              <dt>{m.k}</dt>
              <dd className="trunc">{m.v == null || m.v === '' ? <span className="t-faint">—</span> : m.v}</dd>
            </div>
          ))}
        </dl>
      )}

      {(footL || footR) && (
        <footer className="rcard-foot">
          {footL && <span className="rcard-stat">{footL}</span>}
          <span className="spacer" />
          {footR && <span className="rcard-when">{footR}</span>}
        </footer>
      )}
    </article>
  )
}

// A tinted icon tile, the default media for records without a logo or avatar.
export function CardIcon({ name, tone = 'acc' }) {
  return <span className="feed-ic" data-tone={tone}><Icon name={name} size={15} /></span>
}
