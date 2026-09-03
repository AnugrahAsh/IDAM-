import Icon from '../primitives/Icon'
import { LICENSE } from '../../data/seed'
import { NOW_MS, clockText, dateText } from '../../lib/clock'

// The clock reads from the platform clock, not the browser. It used to tick
// against real time while every figure in the console was measured from the
// instant the dataset represents, so the footer quietly contradicted the rest
// of the screen — a scheduler "due in 6 hours" beside a clock a month past it.
export default function StatusBar() {
  const now = clockText()

  return (
    <footer className="statusbar" role="contentinfo">
      <span className="sb-it">
        <span className="live-dot" aria-hidden="true" />
        <b>All systems operational</b>
      </span>
      <span className="sb-it sb-optional">
        <Icon name="server" />Directory <b>3 of 3 healthy</b>
      </span>
      <span className="sb-it sb-optional">
        <Icon name="refresh" />Last sync <b className="num">6m</b> ago
      </span>
      <span className="sb-it sb-optional">
        <Icon name="activity" />Auth <b className="num">1,284</b>/min
      </span>
      <span className="sb-it sb-optional">
        <Icon name="bolt" />p95 <b className="num">82</b> ms
      </span>

      <span className="sb-spacer" />

      <span className="sb-it sb-optional">
        <Icon name="lock" />TLS 1.3 · AES-256-GCM
      </span>
      <span className="sb-it sb-optional">
        Tenant <b className="mono">tanflow-prod</b>
      </span>
      <span className="sb-it sb-optional">
        <span className="mono">{LICENSE.edition} v1.2.2</span>
      </span>
      <span className="sb-it">
        <Icon name="clock" />
        <span className="mono num" title={`Platform time · ${dateText(new Date(NOW_MS))}`}>{now}</span>
      </span>
      <span className="sb-it" title="Connected">
        <span className="live-dot" aria-hidden="true" />
      </span>
    </footer>
  )
}
