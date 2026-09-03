import { useState } from 'react'
import Icon from './Icon'

/**
 * A read-only JSON tree.
 *
 * Gateway and connector responses are the evidence behind a delivery row: the
 * provider's own code, its message id, whatever it echoed back. Flattening that
 * into key/value pairs loses the shape — which field sat under which object,
 * which array index a result came from — so it is rendered as the document it
 * is, typed by colour and collapsible at every level.
 */

const kindOf = (v) => {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

const Scalar = ({ value }) => {
  const kind = kindOf(value)
  const text = kind === 'string' ? `"${value}"` : String(value)
  return <span className="jsonv-s" data-kind={kind}>{text}</span>
}

function Node({ name, value, depth, defaultOpen }) {
  const kind = kindOf(value)
  const branch = kind === 'object' || kind === 'array'
  const [open, setOpen] = useState(defaultOpen)

  if (!branch) {
    return (
      <div className="jsonv-row">
        <span className="jsonv-k">{name}:</span>
        <Scalar value={value} />
      </div>
    )
  }

  const entries = kind === 'array'
    ? value.map((v, i) => [`[${i}]`, v])
    : Object.entries(value)

  return (
    <div className="jsonv-node">
      <button
        type="button"
        className="jsonv-row jsonv-branch"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={open ? 'chevD' : 'chevR'} size={11} />
        <span className="jsonv-k">{name}:</span>
        {!open && (
          <span className="jsonv-count">
            {kind === 'array'
              ? `${entries.length} ${entries.length === 1 ? 'item' : 'items'}`
              : `${entries.length} ${entries.length === 1 ? 'field' : 'fields'}`}
          </span>
        )}
      </button>
      {open && (
        <div className="jsonv-kids">
          {entries.length === 0
            ? <div className="jsonv-row"><span className="jsonv-empty">{kind === 'array' ? 'empty list' : 'no fields'}</span></div>
            : entries.map(([k, v]) => (
              <Node key={k} name={k} value={v} depth={depth + 1} defaultOpen={depth + 1 < 2} />
            ))}
        </div>
      )}
    </div>
  )
}

export default function JsonView({ data, label = 'Response Data' }) {
  if (data == null) {
    return <div className="jsonv-none">No payload was recorded for this event.</div>
  }
  const entries = kindOf(data) === 'object' ? Object.entries(data) : [['value', data]]
  return (
    <div className="jsonv" role="group" aria-label={label}>
      {entries.map(([k, v]) => (
        <Node key={k} name={k} value={v} depth={0} defaultOpen />
      ))}
    </div>
  )
}
