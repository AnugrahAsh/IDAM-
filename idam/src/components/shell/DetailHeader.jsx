import Icon from '../primitives/Icon'
import NavLink from './NavLink'

export default function DetailHeader({
  backTo, backLabel, eyebrow, title, sub, media, badges, meta, actions, tabs,
}) {
  return (
    <div className="detail-head">
      {backTo && (
        <NavLink to={backTo} className="detail-back">
          <Icon name="chevL" size={13} />
          {backLabel || 'Back'}
        </NavLink>
      )}
      <div className="detail-top">
        {media && <div className="detail-media">{media}</div>}
        <div className="detail-meta">
          {eyebrow && <div className="detail-eyebrow">{eyebrow}</div>}
          <div className="detail-title-row">
            <h1 className="t-display detail-title">{title}</h1>
            {badges && <div className="detail-badges">{badges}</div>}
          </div>
          {sub && <p className="detail-sub">{sub}</p>}
          {meta && <div className="detail-facts">{meta}</div>}
        </div>
        {actions && <div className="detail-actions">{actions}</div>}
      </div>
      {tabs}
    </div>
  )
}

export function Fact({ label, value, icon }) {
  return (
    <span className="detail-fact">
      {icon && <Icon name={icon} size={12} />}
      <span className="detail-fact-k">{label}</span>
      <span className="detail-fact-v">{value}</span>
    </span>
  )
}
