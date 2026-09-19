import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import { AuthCard, DEMO_OTP, LinkRow, OtpBoxes, mmss, useCountdown } from './authParts'

/* Second-factor screens shared by the login-MFA and enrolment sets. */

/** A QR-like matrix drawn from a seed, with the three finder squares. */
export function QrCode({ seed = 'tanflow' }) {
  const cells = useMemo(() => {
    const n = 25
    let h = 0
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296 }
    const finder = (x, y) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
    const out = []
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!finder(x, y) && rnd() > 0.52) out.push([x, y])
      }
    }
    return out
  }, [seed])
  const Finder = ({ x, y }) => (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="#111827" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#111827" />
    </g>
  )
  return (
    <div className="xp-qr" role="img" aria-label="QR code for the authenticator app">
      <svg viewBox="0 0 25 25" shapeRendering="crispEdges">
        <rect width="25" height="25" fill="#fff" />
        {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111827" />)}
        <Finder x={0} y={0} /><Finder x={18} y={0} /><Finder x={0} y={18} />
      </svg>
    </div>
  )
}

function useVerify(onOk) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const verify = (v = code) => {
    if (v.length !== 6) return
    if (v !== DEMO_OTP) { setErr('Incorrect code. Please try again.'); setCode(''); return }
    onOk()
  }
  return { code, err, verify, onChange: (v) => { setCode(v); setErr('') } }
}

export function TotpSetup({ secret, onVerified, onBack, backLabel = 'Choose a different method', toast }) {
  const v = useVerify(onVerified)
  return (
    <AuthCard wide eyebrow="Set up authenticator" title="Authenticator app" sub="Link an authenticator app to your account to generate sign-in codes." onSubmit={() => v.verify()}>
      <div className="xp-totp">
        <div className="xp-totp-right">
          <div className="xp-stores">
            <span className="xp-store"><Icon name="play" size={14} /><span>Get it on<b>Google Play</b></span></span>
            <span className="xp-store"><Icon name="device" size={14} /><span>Download on the<b>App Store</b></span></span>
          </div>
          <ol className="xp-totp-steps">
            <li>Open the Tanflow Authenticator app on your phone.</li>
            <li>Open the application and scan the QR code.</li>
            <li>Point your phone at the screen to capture the QR code.</li>
            <li>Enter the one-time code provided by the application and click Verify now.</li>
          </ol>
        </div>
        <div className="xp-totp-right">
          <span className="lg-choose-h">Scan the QR code with your authenticator</span>
          <QrCode seed={secret} />
          <span className="lg-choose-h">Or enter this secret key manually:</span>
          <div className="xp-key">
            <input className="inp" readOnly value={secret} aria-label="Secret key" />
            <IconButton
              icon="copy"
              label="Copy secret key"
              onClick={() => {
                try { navigator.clipboard?.writeText(secret.replace(/\s/g, '')) } catch { /* clipboard unavailable */ }
                toast('ok', 'Copied', 'Secret key copied to the clipboard.')
              }}
            />
          </div>
          <span className="lg-choose-h">Enter the six-digit code from your authenticator:</span>
          <OtpBoxes value={v.code} onChange={v.onChange} onComplete={v.verify} invalid={!!v.err} autoFocus={false} />
          {v.err && <Banner tone="bad">{v.err}</Banner>}
          <span className="t-xs" style={{ color: 'var(--mut)' }}>Demo code {DEMO_OTP}</span>
          <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={v.code.length !== 6}>Verify now</Button>
        </div>
      </div>
      {onBack && <LinkRow center><button type="button" className="link" onClick={onBack}><Icon name="chevL" size={12} />{backLabel}</button></LinkRow>}
    </AuthCard>
  )
}

/** The code challenge for TOTP, SMS and email, with an optional resend timer. */
export function CodeChallenge({ eyebrow = 'Multifactor authentication', title, sub, seconds, onVerified, onBack, backLabel = 'Try another way', button = 'Verify now', icon, toast }) {
  const v = useVerify(onVerified)
  const [round, setRound] = useState(0)
  const left = useCountdown(seconds || 0, round)
  return (
    <AuthCard
      eyebrow={eyebrow}
      title={title}
      sub={sub}
      art={icon ? <span className="xp-art"><Icon name={icon} size={22} /></span> : null}
      onSubmit={() => v.verify()}
    >
      <OtpBoxes value={v.code} onChange={v.onChange} onComplete={v.verify} invalid={!!v.err} />
      {v.err && <Banner tone="bad">{v.err}</Banner>}
      <div className="xp-timer">
        {seconds
          ? (left > 0
            ? <span>Didn't receive a code? <b>{left}s</b></span>
            : <button type="button" className="link" onClick={() => { setRound((r) => r + 1); toast('ok', 'Code sent', 'A new verification code is on its way.') }}>Resend code</button>)
          : <span>Codes refresh every 30 seconds.</span>}
        <span>Demo code {DEMO_OTP}</span>
      </div>
      <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={v.code.length !== 6}>{button}</Button>
      {onBack && <LinkRow center><button type="button" className="link" onClick={onBack}>{backLabel}</button></LinkRow>}
    </AuthCard>
  )
}

function PasskeyTile({ created }) {
  return (
    <div className="xp-passkey">
      <span className="xp-passkey-ic"><Icon name="key" size={15} /></span>
      <span>
        <span className="xp-passkey-t" style={{ display: 'block' }}>My Security Key</span>
        <span className="xp-passkey-s">Created {created}</span>
      </span>
    </div>
  )
}

/** Register a passkey, or sign in with one, with the browser prompt simulated. */
export function PasskeyScreen({ mode, created, onDone, onBack, backLabel = 'Choose a different method' }) {
  const [phase, setPhase] = useState('idle')
  const start = () => {
    setPhase('wait')
    setTimeout(() => setPhase('done'), 1400)
  }
  const register = mode === 'register'
  if (phase === 'done') {
    return (
      <AuthCard center>
        <div className="lg-done">
          <span className="lg-done-ic"><Icon name="checkC" size={22} /></span>
          <h1 className="lg-h">{register ? 'Passkey registered' : 'Signed in'}</h1>
          <p className="lg-sub">{register ? 'Your security key can now be used as a second factor.' : 'Your passkey was verified.'}</p>
        </div>
        <Button variant="pri" size="lg" className="lg-submit" onClick={onDone}>Continue</Button>
      </AuthCard>
    )
  }
  return (
    <AuthCard
      eyebrow={register ? 'Set up passkey' : 'Multifactor authentication'}
      title={register ? 'Passkey registration' : 'Sign in with passkey'}
      sub={register
        ? 'Use a passkey or a USB FIDO2 security key. Your device will ask you to confirm with a fingerprint, face, PIN or a touch of the key.'
        : 'Use the passkey registered to your account.'}
      art={<span className="xp-art"><Icon name="key" size={22} /></span>}
    >
      {!register && <PasskeyTile created={created} />}
      {phase === 'wait' && <Banner tone="info">Waiting for your device… follow the prompt from your browser.</Banner>}
      <Button variant="pri" size="lg" className="lg-submit" disabled={phase === 'wait'} icon={phase === 'wait' ? 'refresh' : undefined} onClick={start}>
        {phase === 'wait' ? 'Waiting…' : register ? 'Register' : 'Sign in with passkey'}
      </Button>
      {onBack && <LinkRow center><button type="button" className="link" onClick={onBack}>{backLabel}</button></LinkRow>}
    </AuthCard>
  )
}

export { mmss }
