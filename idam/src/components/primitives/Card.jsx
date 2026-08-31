export default function Card({ title, sub, actions, children, flush, footer, className = '', style }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <header className="card-h">
          <div className="card-h-meta">
            {title && <h2 className="card-h-title">{title}</h2>}
            {sub && <div className="card-h-sub">{sub}</div>}
          </div>
          {actions && <div className="card-h-actions">{actions}</div>}
        </header>
      )}
      <div className={`card-b ${flush ? 'flush' : ''}`}>{children}</div>
      {footer && <footer className="card-f">{footer}</footer>}
    </section>
  )
}
