import Icon from './Icon'
import Button from './Button'
import IconButton from './IconButton'
import { useDialogFocus } from '../../lib/useDialogFocus'

const TONE = {
  bad: ['var(--bad-bg)', 'var(--bad)', 'warn'],
  warn: ['var(--warn-bg)', 'var(--warn-core)', 'warn'],
  ok: ['var(--ok-bg)', 'var(--ok)', 'checkC'],
  acc: ['var(--accent-bg)', 'var(--accent-a)', 'info'],
}

export default function Modal({
  title, body, tone = 'acc', icon, size, confirmLabel, cancelLabel = 'Cancel', onConfirm, onClose, children,
  // A form needs its own actions, because the built-in footer always closes —
  // which dismisses a draft that failed validation. Passing `footer` replaces
  // the default pair; `scroll` gives the body its own scroller so the footer
  // stays put on a long form.
  footer, scroll, closable = false,
}) {
  const ref = useDialogFocus(onClose)

  const [bg, fg, defIcon] = TONE[tone] || TONE.acc
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} className="modal" data-size={size} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-h">
          <span className="modal-ic" style={{ background: bg, color: fg }}>
            <Icon name={icon || defIcon} size={17} />
          </span>
          <div className="t-h2" style={{ paddingTop: 6 }}>{title}</div>
          {closable && <IconButton icon="x" label="Close" className="modal-x" onClick={onClose} />}
        </header>
        <div className={`modal-b ${children ? 'wide' : ''}`} data-scroll={scroll || undefined}>{children || body}</div>
        {footer ? <footer className="modal-f">{footer}</footer> : (cancelLabel || confirmLabel) ? (
          <footer className="modal-f">
            {cancelLabel && <Button variant="sec" onClick={onClose}>{cancelLabel}</Button>}
            {confirmLabel && (
              <Button
                variant={tone === 'bad' ? 'danger-solid' : 'pri'}
                onClick={() => { onConfirm && onConfirm(); onClose() }}
              >
                {confirmLabel}
              </Button>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
