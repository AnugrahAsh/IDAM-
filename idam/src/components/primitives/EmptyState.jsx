import Icon from './Icon'

export default function EmptyState({ icon = 'search', title, body, actions, size }) {
  return (
    <div className="empty" data-size={size}>
      <div className="empty-ic"><Icon name={icon} size={19} /></div>
      <div className="empty-t">{title}</div>
      {body && <div className="empty-s">{body}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  )
}
