import Icon from './Icon'
import Button from './Button'
import { useDialogFocus } from '../../lib/useDialogFocus'

const TONE = {
  bad: ['var(--bad-bg)', 'var(--bad)', 'warn'],
  warn: ['var(--warn-bg)', 'var(--warn-core)', 'warn'],
  ok: ['var(--ok-bg)', 'var(--ok)', 'checkC'],
  acc: ['var(--accent-bg)', 'var(--accent-a)', 'info'],
}

export default function Modal({ title, body, tone = 'acc', icon, size, confirmLabel, cancelLabel = 'Cancel', onConfirm, onClose, children }) {
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
        </header>
        <div className={`modal-b ${children ? 'wide' : ''}`}>{children || body}</div>
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
      </div>
    </div>
  )
}
