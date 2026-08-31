import { Component } from 'react'
import { BY_ID, TITLES } from '../../data/nav'

/**
 * A render error inside a route used to reach the React root and blank the
 * document — there was no way back except a reload, and nothing recorded what
 * broke. Every route is now wrapped: the module keeps its identity, the
 * operator gets a way back to the module's list, and the error is reported.
 *
 * Keyed on `route` in App, so navigating away resets the boundary; without the
 * key a single broken screen would poison every screen after it.
 */
export default class RouteBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null, open: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Reported rather than swallowed: the console line is what an operator is
    // asked for, and onError lets the shell forward it to the audit sink.
    // eslint-disable-next-line no-console
    console.error(`[iam] render error in module "${this.props.route}"`, error, info)
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error, info, this.props.route) } catch { /* reporting must never re-throw */ }
    }
  }

  render() {
    const { error, info, open } = this.state
    if (!error) return this.props.children

    const route = this.props.route
    const meta = BY_ID[route]
    const label = TITLES[route] || 'This module'
    const backTo = meta ? meta.path : '/iam/myapps'
    const detail = [error && (error.stack || String(error)), info && info.componentStack]
      .filter(Boolean).join('\n\n')

    return (
      <div className="route-error" role="alert">
        <div className="route-error-card">
          <span className="feed-ic" data-tone="bad" style={{ width: 46, height: 46, borderRadius: 'var(--r-lg)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4" /><path d="M12 17h.01" />
            </svg>
          </span>
          <div className="route-error-body">
            <div className="t-xs t-mut route-error-eyebrow">{label}</div>
            <h2 className="route-error-title">This screen could not be displayed</h2>
            <p className="t-sm t-mut route-error-text">
              {label} stopped while rendering, so nothing was drawn. No data was changed. The error has been
              reported — return to the module list and try again, or reload the console.
            </p>
            <div className="route-error-actions">
              <a className="btn btn-pri" href={backTo} style={{ textDecoration: 'none' }}>Back to {label}</a>
              <button type="button" className="btn btn-sec" onClick={() => this.setState({ error: null, info: null, open: false })}>
                Try again
              </button>
              <button type="button" className="btn btn-sec" onClick={() => window.location.reload()}>Reload console</button>
              <button type="button" className="link route-error-toggle" onClick={() => this.setState({ open: !open })}>
                {open ? 'Hide technical detail' : 'Show technical detail'}
              </button>
            </div>
            {open && <pre className="route-error-pre">{detail || 'No stack trace was captured.'}</pre>}
          </div>
        </div>
      </div>
    )
  }
}
