import Icon from './Icon'

// A rail chip. Given onClick it is a real toggle that filters the view below it;
// without one it renders as a static metric so it stops advertising a click that
// never happens.
export default function StatChip({ icon, active, onClick, title, children }) {
  const body = (
    <>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </>
  )

  if (!onClick) {
    return <span className="chip" data-static="true" title={title}>{body}</span>
  }

  return (
    <button
      type="button"
      className="chip"
      data-on={active || undefined}
      aria-pressed={!!active}
      title={title}
      onClick={onClick}
    >
      {body}
    </button>
  )
}
