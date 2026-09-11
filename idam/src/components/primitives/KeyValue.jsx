import Icon from './Icon'

/**
 * A labelled read-only field grid.
 *
 * `dense` is for summaries that are read at a glance rather than studied: the
 * icon loses its 24px chip and moves inline with the label, and the rows tighten.
 * That buys enough width for a third column, so a nine-field summary is three
 * rows instead of five and stops claiming a screen of its own.
 */
export default function KeyValue({ rows, cols = 2, dense }) {
  return (
    <div className="kv" data-cols={cols} data-dense={dense || undefined}>
      {rows.filter(Boolean).map((r, i) => (
        <div className="kv-row" key={r.k || i}>
          {!dense && <span className="kv-ic"><Icon name={r.icon || 'info'} size={12} /></span>}
          <span className="kv-m">
            <span className="kv-k">
              {dense && <Icon name={r.icon || 'info'} size={11} />}
              {r.k}
            </span>
            <span className="kv-v">{r.node || (r.v === '' || r.v == null ? '—' : r.v)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
