import Icon from './Icon'
import Pill from './Pill'

/**
 * A tab can carry `tone` (tints its icon so the tab's state — done, waiting,
 * locked — reads at a glance instead of only through its tiny icon shape) and
 * `badge` (a short Pill, e.g. "Editable", for the one tab that stands out
 * from the rest).
 */
export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          className="tab"
          data-on={t.id === value}
          disabled={t.disabled}
          title={t.title}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={14} style={t.tone ? { color: `var(--${t.tone})` } : undefined} />}
          {t.label}
          {t.badge && <Pill tone={t.badgeTone || 'warn'} dot>{t.badge}</Pill>}
          {t.count != null && <span className="tab-n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
