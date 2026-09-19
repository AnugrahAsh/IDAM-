import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import ScreenGallery from './ScreenGallery'
import { AuthCard, DEMO_OTP, LinkRow, OtpBoxes, mmss, useCountdown } from './authParts'

const BASE = '/iam/additional/otpLogin'
const MOBILE = /^\d{10}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Welcome({ go, initialError = '', initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const [err, setErr] = useState(initialError)
  const submit = () => {
    const v = value.trim()
    if (!MOBILE.test(v) && !EMAIL.test(v)) { setErr('Please enter a valid mobile number or email address.'); return }
    if (v === '0000000000') { setErr('We could not process your request. Please try again later.'); return }
    go(MOBILE.test(v) ? 'otp-mobile' : 'otp-email')
  }
  const fieldErr = err.startsWith('Please enter') ? err : ''
  return (
    <AuthCard eyebrow="Passwordless sign in" title="Welcome!" sub="Enter your mobile number or email to receive a one-time password." onSubmit={submit}>
      {err && !fieldErr && <Banner tone="bad">{err}</Banner>}
      <Field label="Mobile number or email" required error={fieldErr} htmlFor="xo-id">
        <span className="xp-inp-ic">
          <Icon name="user" size={14} />
          <input
            id="xo-id"
            className="inp"
            autoComplete="username"
            placeholder="9540175784 or you@company.com"
            value={value}
            onChange={(e) => { setValue(e.target.value); setErr('') }}
          />
        </span>
      </Field>
      <Button type="submit" variant="pri" size="lg" className="lg-submit">Continue</Button>
    </AuthCard>
  )
}

function Otp({ go, toast, to, initialError = '', locked }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState(initialError)
  const [round, setRound] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [lock, setLock] = useState(!!locked)
  const left = useCountdown(lock ? 180 : 60, `${round}-${lock}`)
  const verify = (v = code) => {
    if (v.length !== 6 || lock) return
    if (v === DEMO_OTP) { toast('ok', 'Signed in', `Verified ${to}.`); go('welcome'); return }
    const n = attempts + 1
    setAttempts(n)
    setCode('')
    if (n >= 3) { setLock(true); setErr('Too many incorrect OTP attempts. Please try again after 3 minute(s).') } else setErr('Incorrect OTP. Please try again.')
  }
  return (
    <AuthCard eyebrow="Passwordless sign in" title="Verification" sub={<>Enter the OTP sent to <b>{to}</b></>} onSubmit={() => verify()}>
      <OtpBoxes value={code} onChange={(v) => { setCode(v); if (!lock) setErr('') }} onComplete={verify} invalid={!!err} autoFocus={!lock} />
      {err && <Banner tone="bad">{err}</Banner>}
      <div className="xp-timer">
        {lock
          ? <span>Try again in <b>{mmss(left)}</b></span>
          : left > 0
            ? <span>Resend OTP in <b>{mmss(left)}</b></span>
            : <button type="button" className="link" onClick={() => { setRound((r) => r + 1); toast('ok', 'OTP sent', `A new OTP was sent to ${to}.`) }}>Resend OTP</button>}
        <span>Demo code {DEMO_OTP}</span>
      </div>
      <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={code.length !== 6 || lock}>Verify OTP</Button>
      <LinkRow center><button type="button" className="link" onClick={() => go('welcome')}>Use a different mobile number or email</button></LinkRow>
    </AuthCard>
  )
}

const M = '+91XXXXX5784'
const E = 'v***3@gmail.com'

export const OTP_SCREENS = [
  { id: 'welcome', group: 'Identify', label: 'Welcome', path: '/login/otp', note: 'A 10-digit mobile number goes to the mobile screen, an email to the email screen.', render: (c) => <Welcome {...c} /> },
  { id: 'invalid-id', group: 'Identify', label: 'Invalid mobile or email', state: 'Error', path: '/login/otp', render: (c) => <Welcome {...c} initialValue="95401" initialError="Please enter a valid mobile number or email address." /> },
  { id: 'service-error', group: 'Identify', label: 'Request failed', state: 'Error', path: '/login/otp', note: 'Server-side failure when sending the OTP.', render: (c) => <Welcome {...c} initialValue="9540175784" initialError="We could not process your request. Please try again later." /> },
  { id: 'otp-mobile', group: 'Verify', label: 'Mobile verification', path: '/login/otp/verify', note: 'Three wrong codes lock sign-in for 3 minutes. Demo code 481902.', render: (c) => <Otp {...c} to={M} /> },
  { id: 'otp-email', group: 'Verify', label: 'Email verification', path: '/login/otp/verify', render: (c) => <Otp {...c} to={E} /> },
  { id: 'otp-incorrect', group: 'Verify', label: 'Incorrect OTP', state: 'Error', path: '/login/otp/verify', render: (c) => <Otp {...c} to={M} initialError="Incorrect OTP. Please try again." /> },
  { id: 'otp-locked', group: 'Verify', label: 'Too many attempts', state: 'Locked', path: '/login/otp/verify', render: (c) => <Otp {...c} to={E} locked initialError="Too many incorrect OTP attempts. Please try again after 3 minute(s)." /> },
]

export default function EmailMobileLoginPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Email & Mobile Login"
      sub="Passwordless sign-in with a one-time password sent to a mobile number or email address."
      screens={OTP_SCREENS}
      segments={segments}
    />
  )
}
