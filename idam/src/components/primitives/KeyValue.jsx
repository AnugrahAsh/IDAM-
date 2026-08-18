import Icon from './Icon'

export default function KeyValue({ rows, cols = 2 }) {
  return (
    <div className="kv" data-cols={cols}>
      {rows.filter(Boolean).map((r, i) => (
        <div className="kv-row" key={r.k || i}>
          <span className="kv-ic"><Icon name={r.icon || 'info'} size={12} /></span>
          <span className="kv-m">
            <span className="kv-k">{r.k}</span>
            <span className="kv-v">{r.node || (r.v === '' || r.v == null ? '—' : r.v)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
