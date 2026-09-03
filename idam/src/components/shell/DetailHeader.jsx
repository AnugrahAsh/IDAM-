import Icon from '../primitives/Icon'
import NavLink from './NavLink'

export default function DetailHeader({
  backTo, backLabel, eyebrow, title, sub, media, badges, meta, actions, tabs,
}) {
  return (
    <div className="detail-head">
      {/* Detail pages carry the same breadcrumb row as list pages rather than a
          loose back link: one control, aligned to the same left edge, and the
          parent is one click away in the position the rest of the console uses. */}
      <nav className="crumbs" aria-label="Breadcrumb">
        <NavLink to="myapps" className="crumbs-link">Home</NavLink>
        {backTo && (
          <>
            <span className="crumbs-sep">/</span>
            <NavLink to={backTo} className="crumbs-link">{backLabel || 'Back'}</NavLink>
          </>
        )}
        {typeof title === 'string' && title && (
          <>
            <span className="crumbs-sep">/</span>
            <span className="crumbs-cur">{title}</span>
          </>
        )}
      </nav>
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

export function Fact({ label, value, icon, title }) {
  // The value ellipses when the header is tight, so a long one was
  // unrecoverable without a way to read it back.
  const hint = title || (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)
  return (
    <span className="detail-fact">
      {icon && <Icon name={icon} size={12} />}
      <span className="detail-fact-k">{label}</span>
      <span className="detail-fact-v" title={hint}>{value}</span>
    </span>
  )
}
