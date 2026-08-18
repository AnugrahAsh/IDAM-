import Icon from './Icon'

export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          className="tab"
          data-on={t.id === value}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={14} />}
          {t.label}
          {t.count != null && <span className="tab-n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}
