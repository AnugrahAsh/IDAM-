import Icon from '../primitives/Icon'
import { num } from '../../lib/format'

/**
 * The headline for a register that has one total and a small, fixed set of
 * kinds it divides into.
 *
 * A row of equal cards gives every figure the same weight, so the total reads
 * as one option among six and the filters read as statistics. This splits the
 * two jobs apart: an anchor panel on the left states what the register holds,
 * and a connected segment on the right is the filter — one control, obviously
 * a control, with the active segment carrying its own count.
 */
export default function RegisterSummary({
  icon, label, value, caption, facts = [], segments = [], active, onSelect, allId = 'All', ariaLabel = 'Register summary',
}) {
  // With no filter beside them, secondary figures are given the same weight as
  // the anchor rather than being crowded into one stretched panel — a header of
  // even panels, not a tile next to an empty box.
  const plain = segments.length === 0

  return (
    <section className="rsum" data-plain={plain || undefined} aria-label={ariaLabel}>
      <button
        type="button"
        className="rsum-anchor"
        data-on={active === allId || undefined}
        aria-pressed={active === allId}
        onClick={() => onSelect(allId)}
      >
        <span className="rsum-k">{icon && <Icon name={icon} size={12} />}{label}</span>
        <span className="rsum-v num">{typeof value === 'number' ? num(value) : value}</span>
        {caption && <span className="rsum-c">{caption}</span>}
      </button>

      {facts.length > 0 && (plain ? (
        <div className="rsum-stats">
          {facts.map((f) => (
            <dl className="rsum-stat" key={f.k}>
              <dt>{f.icon && <Icon name={f.icon} size={12} />}{f.k}</dt>
              <dd className="num">{typeof f.v === 'number' ? num(f.v) : f.v}</dd>
              {f.c && <span className="rsum-stat-c">{f.c}</span>}
            </dl>
          ))}
        </div>
      ) : (
        <dl className="rsum-facts">
          {facts.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd className="num">{typeof f.v === 'number' ? num(f.v) : f.v}</dd>
            </div>
          ))}
        </dl>
      ))}

      {/* A register with nothing to divide into gets no filter, rather than an
          empty control the width of the page. */}
      {segments.length > 0 && (
      <div className="rsum-seg" role="group" aria-label={`Filter ${ariaLabel.toLowerCase()}`}>
        {segments.map((sgm) => (
          <button
            key={sgm.id}
            type="button"
            data-on={active === sgm.id || undefined}
            aria-pressed={active === sgm.id}
            title={sgm.hint}
            onClick={() => onSelect(active === sgm.id ? allId : sgm.id)}
          >
            <span className="rsum-seg-t">
              {sgm.icon && <Icon name={sgm.icon} size={12} />}
              {sgm.label}
            </span>
            <span className="rsum-seg-v num">{num(sgm.value)}</span>
            {sgm.sub && <span className="rsum-seg-s trunc">{sgm.sub}</span>}
          </button>
        ))}
      </div>
      )}
    </section>
  )
}
