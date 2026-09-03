import Icon from '../primitives/Icon'
import IconButton from '../primitives/IconButton'
import { num } from '../../lib/format'

// The header of a register, mounted inside the workbench panel so the counts,
// the filter and the rows they describe read as one object.
//
// Three tiers, each of which earns its height:
//   · an alert line, present only while something is actually wrong;
//   · number-led filter tabs, which are the register's headline figures;
//   · the totals that give those figures scale.
export default function RegisterHeader({
  items,
  value,
  onChange,
  label = 'Filter the register',
  resetId,
  summary = [],
  alert,
  onDismissAlert,
}) {
  const anchorId = resetId || (items[0] && items[0].id)
  const filtered = value !== anchorId

  return (
    <div className="reg">
      {alert && (
        <div className="reg-alert" data-tone={alert.tone}>
          <Icon name={alert.icon || 'warn'} size={14} />
          <span className="reg-alert-t trunc"><b>{alert.title}</b>{alert.detail && <span className="reg-alert-d"> — {alert.detail}</span>}</span>
          {alert.filterId && (
            <button type="button" className="link" onClick={() => onChange(alert.filterId)}>
              {alert.actionLabel || 'Review'}
              <Icon name="arrowRight" size={11} />
            </button>
          )}
          {/* Dismissal is per finding: the line returns if the estate changes. */}
          {onDismissAlert && (
            <IconButton
              icon="x"
              size="sm"
              className="reg-alert-x"
              label="Dismiss this alert"
              onClick={onDismissAlert}
            />
          )}
        </div>
      )}

      <div className="reg-row">
        <div className="reg-tabs" role="group" aria-label={label}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className="reg-f"
              data-on={value === it.id || undefined}
              data-tone={it.tone}
              aria-pressed={value === it.id}
              title={it.hint}
              onClick={() => onChange(it.id)}
            >
              {it.tone && <i className="reg-dot" />}
              <b className="num">{num(it.value)}</b>
              <span>{it.label}</span>
            </button>
          ))}
        </div>

        <div className="reg-sum">
          {summary.map((s) => (
            <span key={s.label}><b className="num">{typeof s.value === 'number' ? num(s.value) : s.value}</b> {s.label}</span>
          ))}
          {filtered && (
            <button type="button" className="link" onClick={() => onChange(anchorId)}>
              <Icon name="x" size={11} />
              Clear filter
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
