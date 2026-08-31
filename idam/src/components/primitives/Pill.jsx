import Icon from './Icon'

export default function Pill({ tone = 'mut', dot, icon, children }) {
  return (
    <span className="pill" data-tone={tone}>
      {dot && <span className="pill-dot" />}
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}
