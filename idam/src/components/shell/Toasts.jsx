import Icon from '../primitives/Icon'
import { useApp } from '../../store/AppContext'

const ICON = { ok: 'checkC', warn: 'warn', bad: 'warn', info: 'info' }

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" data-tone={t.tone} key={t.id}>
          <Icon name={t.icon || ICON[t.tone] || 'info'} size={15} />
          <div className="toast-m">
            <div className="toast-t">{t.title}</div>
            {t.body && <div className="toast-s">{t.body}</div>}
            {/* A file being written is not an instant, and a notice that cannot
                say how far it has got reads as a stall. */}
            {t.progress != null && (
              <div
                className="toast-bar"
                role="progressbar"
                aria-valuenow={Math.round(t.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.max(3, Math.min(100, t.progress))}%` }} />
              </div>
            )}
          </div>
          <button type="button" className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
