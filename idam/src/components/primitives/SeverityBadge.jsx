import Icon from './Icon'

const ICON = { critical: 'warn', high: 'trendUp', medium: 'flat', low: 'flat' }

export default function SeverityBadge({ level = 'low', children }) {
  const key = String(level).toLowerCase()
  return (
    <span className="sev" data-level={key}>
      <Icon name={ICON[key] || 'flat'} size={11} />
      {children || level}
    </span>
  )
}
