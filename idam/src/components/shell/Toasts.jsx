import Icon from '../primitives/Icon'
import { useApp } from '../../store/AppContext'

const ICON = { ok: 'checkC', warn: 'warn', bad: 'warn', info: 'info' }

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" data-tone={t.tone} key={t.id}>
          <Icon name={ICON[t.tone] || 'info'} size={15} />
          <div>
            <div className="toast-t">{t.title}</div>
            {t.body && <div className="toast-s">{t.body}</div>}
          </div>
          <button type="button" className="toast-x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
