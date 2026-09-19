import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import wordmark from '../../assets/tanflow-wordmark-white.png'
import ScreenGallery from './ScreenGallery'

const BASE = '/iam/additional/errors'

/** A reduced console frame, so the error reads in the place it appears. */
function Shell({ children, crumb }) {
  return (
    <div className="xp-shell">
      <div className="xp-shell-bar">
        <img src={wordmark} alt="Tanflow" />
        <span style={{ color: 'var(--shell-mut)' }}>/</span>
        <span>{crumb}</span>
        <span className="spacer" style={{ flex: 1 }} />
        <Icon name="bell" size={15} />
        <Icon name="help" size={15} />
        <Icon name="user" size={15} />
      </div>
      {children}
    </div>
  )
}

function ErrorState({ code, icon, title, text, go, toast }) {
  return (
    <Shell crumb="Error">
      <div className="xp-err">
        {code ? <div className="xp-err-code">{code}</div> : null}
        {icon && <span className="xp-art" data-tone="bad"><Icon name={icon} size={22} /></span>}
        <h1 className="xp-err-h">{title}</h1>
        <p className="xp-err-s">{text}</p>
        <Button variant="pri" icon="dashboard" onClick={() => toast('info', 'Back to dashboard', 'In the console this returns to the dashboard.')}>Back to dashboard</Button>
      </div>
    </Shell>
  )
}

const USERS = [
  ['Aarav Mehta', 'aarav.mehta', 'aarav.mehta@tanflow.com', 'Active'],
  ['Priya Nair', 'priya.nair', 'priya.nair@tanflow.com', 'Active'],
  ['Rahul Verma', 'rahul.verma', 'rahul.verma@tanflow.com', 'Locked'],
]

function UsersTable({ error, withRows }) {
  return (
    <Shell crumb="Users">
      <div className="xp-shell-body">
        <div>
          <h1 className="xp-err-h" style={{ fontSize: 'var(--t-h1)' }}>Users</h1>
          <p className="xp-err-s" style={{ fontSize: 'var(--t-sm)' }}>Identities in the directory.</p>
        </div>
        <Card flush>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr><th>Name</th><th>Username</th><th>Email</th><th>Status</th></tr>
            </thead>
            <tbody>
              {withRows && USERS.map((u) => (
                <tr key={u[1]}><td>{u[0]}</td><td className="mono">{u[1]}</td><td>{u[2]}</td><td><Pill tone={u[3] === 'Active' ? 'ok' : 'warn'} dot>{u[3]}</Pill></td></tr>
              ))}
              <tr className="xp-inline-err">
                <td colSpan={4}><Icon name="warn" size={14} /> {error}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </Shell>
  )
}

function SessionExpired({ toast }) {
  return (
    <Shell crumb="Dashboard">
      <div className="xp-shell-body" aria-hidden="true">
        <div className="xp-err-h" style={{ fontSize: 'var(--t-h1)' }}>Dashboard</div>
        <Card title="Pending approvals" sub="Requests waiting on you"><div style={{ height: 120 }} /></Card>
        <Card title="Recent activity"><div style={{ height: 160 }} /></Card>
      </div>
      <div className="xp-scrim">
        <div className="xp-dialog" role="alertdialog" aria-modal="true" aria-labelledby="xp-sess-h">
          <span className="xp-art" data-tone="warn" style={{ alignSelf: 'flex-start' }}><Icon name="clock" size={22} /></span>
          <h2 id="xp-sess-h">Session expired</h2>
          <p className="xp-err-s" style={{ fontSize: 'var(--t-sm)' }}>Your session has expired. Please log in again to continue.</p>
          <Button variant="pri" size="lg" onClick={() => toast('info', 'Login', 'In the console this returns to the sign-in page.')}>Login</Button>
        </div>
      </div>
    </Shell>
  )
}

export const ERROR_SCREENS = [
  { id: 'not-found', group: 'Full page', label: 'Page not found', state: '404', path: '/*', render: (c) => <ErrorState {...c} code="404" title="Page not found" text="Oops! The requested URL was not found on this server." /> },
  { id: 'unauthorized', group: 'Full page', label: 'Unauthorized', state: '401', path: '/*', note: 'The signed-in user has no permission for the route.', render: (c) => <ErrorState {...c} code="401" title="Unauthorized" text="Oops! You don't have permission to access this route." /> },
  { id: 'not-licensed', group: 'Full page', label: 'Not licensed', state: '401', path: '/*', note: 'The tenant licence does not include the module.', render: (c) => <ErrorState {...c} code="401" title="Unauthorized" text="Oops! You aren't licensed to access this route." /> },
  { id: 'session-expired', group: 'Dialog', label: 'Session expired', path: 'any page', note: 'A blocking dialog over the page when the token can no longer be refreshed.', render: (c) => <SessionExpired {...c} /> },
  { id: 'permission-row', group: 'Inline', label: 'Permission error in a table', path: '/users', note: 'The table renders but its data call is denied.', render: () => <UsersTable error="You do not have permission to view this data." /> },
  { id: 'license-row', group: 'Inline', label: 'Licence error in a table', path: '/users', render: () => <UsersTable error="Internal server error: licence validation failed." /> },
]

export default function ErrorPagesPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Error Pages"
      sub="Not found, unauthorized, not licensed, session expiry and inline data errors, shown inside the console frame."
      screens={ERROR_SCREENS}
      segments={segments}
      stage="page"
    />
  )
}
