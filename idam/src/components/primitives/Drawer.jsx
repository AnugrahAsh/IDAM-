import IconButton from './IconButton'
import { useDialogFocus } from '../../lib/useDialogFocus'

export default function Drawer({ title, sub, size, footer, onClose, children }) {
  const ref = useDialogFocus(onClose)

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside ref={ref} tabIndex={-1} className="drawer" data-size={size} role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-h">
          <div className="card-h-meta">
            <div className="t-h2">{title}</div>
            {sub && <div className="card-h-sub">{sub}</div>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </header>
        <div className="drawer-b">{children}</div>
        {footer && <footer className="drawer-f">{footer}</footer>}
      </aside>
    </>
  )
}
