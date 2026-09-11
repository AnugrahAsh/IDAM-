import { useEffect, useRef, useState } from 'react'
import NavLink from './NavLink'

export default function PageBar({ title, sub, badge, actions, rail, crumbs }) {
  const ref = useRef(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const scroller = el.closest('.canvas')
    if (!scroller) return undefined
    const onScroll = () => setStuck(scroller.scrollTop > 4)
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const trail = crumbs && crumbs.length ? crumbs : [{ label: title }]

  return (
    <div className="pagebar" ref={ref} data-stuck={stuck}>
      {/* Home leads every trail, My Apps included. It used to be dropped on
          My Apps itself to avoid a link to the page you are already on, but
          that left one page in the product with a shorter crumb line than
          every other, which reads as a layout fault rather than as tact. */}
      <nav className="crumbs" aria-label="Breadcrumb">
        <NavLink to="myapps" className="crumbs-link">Home</NavLink>
        {trail.map((c, i) => (
          <span key={c.label} style={{ display: 'contents' }}>
            <span className="crumbs-sep">/</span>
            {c.to
              ? <NavLink to={c.to} className="crumbs-link">{c.label}</NavLink>
              : <span className="crumbs-cur">{c.label}</span>}
          </span>
        ))}
      </nav>
      <div className="pagebar-top">
        <div className="pagebar-meta">
          <div className="pagebar-title">
            <h1 className="t-h1">{title}</h1>
            {badge}
          </div>
          {sub && <p className="pagebar-sub">{sub}</p>}
        </div>
        {actions && <div className="pagebar-actions">{actions}</div>}
      </div>
      {rail && <div className="pagebar-rail">{rail}</div>}
    </div>
  )
}
