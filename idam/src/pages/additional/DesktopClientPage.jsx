import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'
import ScreenGallery from './ScreenGallery'

const BASE = '/iam/additional/desktop'

const STATUS = {
  ready: { tone: 'acc', label: 'Ready' },
  waiting: { tone: 'info', label: 'Waiting' },
  connected: { tone: 'ok', label: 'Connected' },
  failed: { tone: 'bad', label: 'Failed' },
  offline: { tone: 'warn', label: 'Offline' },
}

function DesktopWindow({ initial = 'ready', toast }) {
  const [state, setState] = useState(initial)
  const s = STATUS[state]

  const signIn = () => {
    setState('waiting')
    setTimeout(() => setState((cur) => (cur === 'waiting' ? 'connected' : cur)), 2200)
  }

  let content
  if (state === 'connected') {
    content = (
      <>
        <span className="lg-eyebrow">Signed in</span>
        <h1 className="lg-h">You're connected</h1>
        <p className="lg-sub">Signed in as <b>aarav.mehta@tanflow.com</b>. Your SAP applications are available from the tray.</p>
        <dl className="xp-mail-kv">
          <dt>Device</dt><dd>TF-LAP-0412 · trusted</dd>
          <dt>Session</dt><dd>Expires in 8 hours</dd>
          <dt>Last sign-in</dt><dd>Today, 09:14</dd>
        </dl>
        <div className="xp-btn-row">
          <Button variant="pri" size="lg" icon="external" onClick={() => toast('info', 'SAP Logon', 'Opens SAP Logon with single sign-on.')}>Open SAP Logon</Button>
          <Button size="lg" icon="power" onClick={() => setState('ready')}>Sign out</Button>
        </div>
      </>
    )
  } else {
    const waiting = state === 'waiting'
    content = (
      <>
        <span className="lg-eyebrow">Get started</span>
        <h1 className="lg-h">Sign in to continue</h1>
        <p className="lg-sub">We'll open your default browser to complete sign-in on the secure TanFlow login page, including any required multi-factor checks.</p>
        {state === 'failed' && <Banner tone="bad">Sign-in didn't complete. The browser window was closed or the request timed out. Try again.</Banner>}
        {state === 'offline' && <Banner tone="warn">You're offline. Connect to the network to sign in.</Banner>}
        {waiting && <Banner tone="info">Waiting for the browser… finish signing in there, then come back to this window.</Banner>}
        <button type="button" className="xp-signin-btn" disabled={waiting || state === 'offline'} onClick={signIn}>
          <img src={wordmarkDark} alt="" />
          <span>{waiting ? 'Waiting for browser…' : 'Sign in with TanFlow'}</span>
          <span className="spacer" />
          <Icon name={waiting ? 'refresh' : 'arrowRight'} size={15} className={waiting ? 'xp-spin' : undefined} />
        </button>
        {waiting && <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setState('failed')}>Cancel</button>}
        {state === 'offline' && <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setState('ready')}>Retry connection</button>}
        <p className="xp-foot-note"><Icon name="lock" size={12} />Your tokens are encrypted at rest using Windows DPAPI and never leave your machine.</p>
      </>
    )
  }

  return (
    <div className="xp-win" role="group" aria-label="TanFlow Desktop window">
      <div className="xp-win-bar">
        <Icon name="shield" size={12} />
        <span>TanFlow Desktop</span>
        <span className="spacer" />
        <Icon name="minus" size={11} />
        <i />
        <Icon name="x" size={11} />
      </div>
      <div className="xp-win-body">
        <aside className="xp-win-brand">
          <img src={wordmarkWhite} alt="TanFlow" />
          <h2>Your SAP workspace, securely at hand.</h2>
          <p>Sign in once and unlock your SAP environment from the desktop. Certificate-based authentication keeps your business data protected — no passwords stored, no sessions left exposed.</p>
          <ul>
            <li><Icon name="signon" size={14} />Single sign-on to SAP applications</li>
            <li><Icon name="device" size={14} />Trusted device identity</li>
            <li><Icon name="lock" size={14} />No credentials saved on disk</li>
            <li><Icon name="refresh" size={14} />Clean session cleanup on exit</li>
          </ul>
        </aside>
        <div className="xp-win-main">
          <div className="xp-win-head">
            <span>Authentication</span>
            <Pill tone={s.tone} dot>{s.label}</Pill>
          </div>
          <div className="xp-win-content">
            <div className="xp-win-col">{content}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const DESKTOP_SCREENS = [
  { id: 'ready', group: 'Sign in', label: 'Ready to sign in', path: 'TanFlow Desktop', note: 'Sign in opens the browser; the window completes on its own after a moment.', render: (c) => <DesktopWindow {...c} /> },
  { id: 'waiting', group: 'Sign in', label: 'Waiting for browser', path: 'TanFlow Desktop', render: (c) => <DesktopWindow {...c} initial="waiting" /> },
  { id: 'connected', group: 'Sign in', label: 'Connected', path: 'TanFlow Desktop', render: (c) => <DesktopWindow {...c} initial="connected" /> },
  { id: 'failed', group: 'Problems', label: 'Sign-in failed', state: 'Error', path: 'TanFlow Desktop', render: (c) => <DesktopWindow {...c} initial="failed" /> },
  { id: 'offline', group: 'Problems', label: 'Offline', state: 'Error', path: 'TanFlow Desktop', render: (c) => <DesktopWindow {...c} initial="offline" /> },
]

export default function DesktopClientPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Desktop Client"
      sub="The TanFlow Desktop sign-in window for SAP access, with browser-based authentication."
      screens={DESKTOP_SCREENS}
      segments={segments}
      stage="desktop"
    />
  )
}
