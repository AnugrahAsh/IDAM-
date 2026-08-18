import Icon from '../primitives/Icon'
import { LICENSE } from '../../data/seed'

const YEAR = 2026

// Shell furniture: sits under the scrolling canvas inside .main, so it stays put
// while the page scrolls and never collides with the sidebar's own .side-foot.
// Deliberately carries no route links — every packet ships a different subset of
// routes, and a footer link to a page that is not in the build would dead-end.
export default function AppFooter() {
  return (
    <footer className="appfoot" role="contentinfo">
      <span className="appfoot-l">
        <span className="appfoot-brand">{LICENSE.product}</span>
        <span className="appfoot-sep" />
        <span className="appfoot-x">{LICENSE.edition} edition</span>
        <span className="appfoot-sep" />
        <span className="appfoot-env">
          <span className="appfoot-dot" />
          Production
        </span>
        <span className="appfoot-sep" />
        <span className="appfoot-x"><Icon name="lock" size={11} />TLS 1.3</span>
      </span>

      <span className="spacer" />

      <span className="appfoot-r">
        <span className="appfoot-x">Licensed to {LICENSE.licensedTo}</span>
        <span className="appfoot-sep" />
        <span className="appfoot-x num">Seats {LICENSE.seatsUsed.toLocaleString()} / {LICENSE.seats.toLocaleString()}</span>
        <span className="appfoot-sep" />
        <span className="appfoot-c">© {YEAR} Tanflow · All rights reserved</span>
      </span>
    </footer>
  )
}
