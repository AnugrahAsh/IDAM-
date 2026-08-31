import { pathFor } from '../../data/nav'
import { useApp } from '../../store/AppContext'

export default function NavLink({ to, className, children, title, onClick, ...rest }) {
  const { navigate } = useApp()
  const href = to.startsWith('/') ? to : pathFor(to)
  return (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (onClick) onClick(e)
        navigate(href)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
