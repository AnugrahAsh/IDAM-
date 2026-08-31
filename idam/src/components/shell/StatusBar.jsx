import { useEffect, useState } from 'react'
import Icon from '../primitives/Icon'
import { LICENSE } from '../../data/seed'

const utc = (d) => `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`

export default function StatusBar() {
  const [now, setNow] = useState(() => utc(new Date()))

  useEffect(() => {
    const t = setInterval(() => setNow(utc(new Date())), 1000)
    return () => clearInterval(t)
  }, [])

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
        <Icon name="clock" /><span className="mono num">{now}</span>
      </span>
      <span className="sb-it" title="Connected">
        <span className="live-dot" aria-hidden="true" />
      </span>
    </footer>
  )
}
