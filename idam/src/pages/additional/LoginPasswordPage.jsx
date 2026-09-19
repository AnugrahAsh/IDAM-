import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import TextInput from '../../components/primitives/TextInput'
import ScreenGallery from './ScreenGallery'
import {
  AuthCard, DEMO_OTP, DeviceArt, LinkRow, MethodRow, OtpBoxes, PasswordInput, mmss, useCountdown,
} from './authParts'

const BASE = '/iam/additional/login'
const DEMO_LAST4 = '4417'

/* The reset policy, stated the way it is evaluated: each rule reads as met or
   as what is still missing. */
const RULES = [
  { ok: 'Password is at least 2 characters long', no: 'Password must be at least 2 characters long', test: (v) => v.length >= 2 },
  { ok: 'Password does not exceed 26 characters', no: 'Password must not exceed 26 characters', test: (v) => v.length <= 26 },
  { ok: 'Password has at least 1 alphabet character', no: 'Password must have at least 1 alphabet character', test: (v) => /[A-Za-z]/.test(v) },
  { ok: 'Password has at least 1 numeric character', no: 'Password must have at least 1 numeric character', test: (v) => /\d/.test(v) },
  { ok: 'Password has at least 1 lowercase character', no: 'Password must have at least 1 lowercase character', test: (v) => /[a-z]/.test(v) },
  { ok: 'Password has at least 1 uppercase character', no: 'Password must have at least 1 uppercase character', test: (v) => /[A-Z]/.test(v) },
  { ok: 'Password has at least 1 special character', no: 'Password must contain at least 1 special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
  { ok: 'Password does not include the forbidden character ^', no: 'Password must not include the forbidden character ^', test: (v) => !v.includes('^') },
]

function RuleList({ value }) {
  if (!value) return null
  return (
    <ul className="xp-rules" aria-live="polite">
      {RULES.map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.ok} data-ok={ok || undefined}>
            <Icon name={ok ? 'checkC' : 'x'} size={12} />{ok ? r.ok : r.no}
          </li>
        )
      })}
    </ul>
  )
}

function SignIn({ go, toast }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [touched, setTouched] = useState(false)
  const submit = () => {
    setTouched(true)
    if (!user.trim() || !pass) return
    if (user.trim().toLowerCase() === 'expiring') { go('expiry-warning'); return }
    toast('ok', 'Signed in', `Welcome back, ${user.trim()}. Use the username "expiring" to see the password-expiry notice.`)
  }
  return (
    <AuthCard eyebrow="Sign in" title="Welcome!" sub="Please sign in to your account and start the adventure." onSubmit={submit}>
      <Field label="Username" required error={touched && !user.trim() ? 'Enter your username.' : ''} htmlFor="xl-user">
        <TextInput id="xl-user" autoComplete="username" placeholder="Enter your username" value={user} onChange={(e) => setUser(e.target.value)} />
      </Field>
      <Field label="Password" required error={touched && !pass ? 'Enter your password.' : ''} htmlFor="xl-pass">
        <PasswordInput id="xl-pass" placeholder="Enter your password" value={pass} onChange={setPass} />
      </Field>
      <LinkRow><span /><button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button></LinkRow>
      <Button type="submit" variant="pri" size="lg" className="lg-submit">Login</Button>
    </AuthCard>
  )
}

function Forgot({ go }) {
  const [user, setUser] = useState('')
  const [touched, setTouched] = useState(false)
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Welcome!"
      sub="Please confirm your username and reset your password."
      onSubmit={() => { setTouched(true); if (user.trim()) go('choose-method') }}
    >
      <Field label="Username" required error={touched && !user.trim() ? 'Enter your username.' : ''} htmlFor="xl-fuser">
        <TextInput id="xl-fuser" placeholder="Please enter your username" value={user} onChange={(e) => setUser(e.target.value)} />
      </Field>
      <Button type="submit" variant="pri" size="lg" className="lg-submit">Submit</Button>
      <LinkRow center>Return to login? <button type="button" className="link" onClick={() => go('signin')}>Log in</button></LinkRow>
    </AuthCard>
  )
}

function ChooseMethod({ go }) {
  return (
    <AuthCard eyebrow="Account recovery" title="Choose verification method" sub="How would you like to verify your identity?">
      <div className="lg-choose">
        <MethodRow icon="sms" title="Verify via SMS OTP" sub="Verify your mobile number first, then receive OTP via SMS" onClick={() => go('verify-mobile')} />
        <MethodRow icon="mail" title="Verify via Email OTP" sub="Receive OTP directly to your email" onClick={() => go('otp-email')} />
      </div>
      <LinkRow center><button type="button" className="link" onClick={() => go('signin')}>Return to login</button></LinkRow>
    </AuthCard>
  )
}

function VerifyMobile({ go, toast }) {
  const [digits, setDigits] = useState('')
  const [err, setErr] = useState('')
  const verify = (v = digits) => {
    if (v.length !== 4) return
    if (v !== DEMO_LAST4) { setErr('Those digits do not match the mobile number on file.'); return }
    toast('ok', 'OTP sent', 'OTP sent to your mobile number.')
    go('otp-sms')
  }
  return (
    <AuthCard eyebrow="Account recovery" title="Verify mobile number" sub="Enter the last 4 digits of your mobile number." onSubmit={() => verify()}>
      <div style={{ '--xp-n': 4 }}>
        <OtpBoxes length={4} value={digits} onChange={(v) => { setDigits(v); setErr('') }} invalid={!!err} label="Last 4 digits" />
      </div>
      {err && <Banner tone="bad">{err}</Banner>}
      <div className="lg-hintline"><Icon name="info" size={12} /><span>Demo number ends {DEMO_LAST4}.</span></div>
      <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={digits.length !== 4}>Verify</Button>
      <LinkRow center><button type="button" className="link" onClick={() => go('choose-method')}>Back</button></LinkRow>
    </AuthCard>
  )
}

function OtpVerify({ go, toast, channel }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [round, setRound] = useState(0)
  const left = useCountdown(120, round)
  const verify = (v = code) => {
    if (v.length !== 6) return
    if (v !== DEMO_OTP) { setErr('That code is not valid or has expired.'); setCode(''); return }
    go('reset')
  }
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="OTP verification"
      sub={`Enter the 6-digit code sent to your ${channel === 'sms' ? 'mobile number' : 'email address'}.`}
      onSubmit={() => verify()}
    >
      <OtpBoxes value={code} onChange={(v) => { setCode(v); setErr('') }} onComplete={verify} invalid={!!err} />
      {err && <Banner tone="bad">{err}</Banner>}
      <div className="xp-timer">
        {left > 0
          ? <span>Code expires in <b>{mmss(left)}</b></span>
          : <button type="button" className="link" onClick={() => { setRound((r) => r + 1); toast('ok', 'OTP sent', `A new code was sent to your ${channel === 'sms' ? 'mobile number' : 'email'}.`) }}>Resend code</button>}
        <span>Demo code {DEMO_OTP}</span>
      </div>
      <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={code.length !== 6}>Verify</Button>
      <LinkRow center><button type="button" className="link" onClick={() => go('choose-method')}>Choose a different method</button></LinkRow>
    </AuthCard>
  )
}

function Reset({ go, initial = '' }) {
  const [next, setNext] = useState(initial)
  const [confirm, setConfirm] = useState('')
  const valid = next && RULES.every((r) => r.test(next))
  const mismatch = confirm.length > 0 && confirm !== next
  return (
    <AuthCard eyebrow="Account recovery" title="Reset password" sub="Please enter your new password." onSubmit={() => { if (valid && confirm === next) go('success') }}>
      <Field label="Enter password" required htmlFor="xl-new">
        <PasswordInput id="xl-new" autoComplete="new-password" value={next} onChange={setNext} />
      </Field>
      <RuleList value={next} />
      <Field label="Re-enter password" required error={mismatch ? 'Both passwords must match.' : ''} htmlFor="xl-conf">
        <PasswordInput id="xl-conf" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      </Field>
      <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={!valid || !confirm || mismatch}>Submit</Button>
    </AuthCard>
  )
}

function Success({ go }) {
  return (
    <AuthCard center>
      <div className="lg-done">
        <span className="lg-done-ic"><Icon name="checkC" size={22} /></span>
        <h1 className="lg-h">Success!</h1>
        <p className="lg-sub">Your password has been reset successfully. Use the button below to log in.</p>
      </div>
      <Button variant="pri" size="lg" className="lg-submit" onClick={() => go('signin')}>Login</Button>
    </AuthCard>
  )
}

function LinkExpired({ go }) {
  return (
    <AuthCard center>
      <div className="lg-done">
        <span className="xp-art" data-tone="warn"><Icon name="clock" size={22} /></span>
        <h1 className="lg-h">Link expired</h1>
        <p className="lg-sub">Oops! This link has expired. Request a new one to continue.</p>
      </div>
      <Button variant="pri" size="lg" className="lg-submit" onClick={() => go('forgot')}>Request a new link</Button>
      <LinkRow center><button type="button" className="link" onClick={() => go('signin')}>Return to login</button></LinkRow>
    </AuthCard>
  )
}

function ExpiryWarning({ go, toast }) {
  return (
    <AuthCard center eyebrow="Action required" title="Password expiration notice">
      <span className="xp-art" data-tone="warn" style={{ order: -1 }}><Icon name="lock" size={22} /></span>
      <p className="lg-sub">Your password will expire in <b style={{ color: 'var(--accent-a)' }}>11</b> days.</p>
      <p className="lg-sub">Please change your password to ensure uninterrupted access to your account.</p>
      <Button variant="pri" size="lg" className="lg-submit" onClick={() => go('update-password')}>Change password now</Button>
      <Button size="lg" className="lg-submit" onClick={() => toast('info', 'Reminder set', 'You will be reminded at your next sign-in.')}>Remind me later</Button>
    </AuthCard>
  )
}

function UpdatePassword({ go, toast }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const valid = current && next && RULES.every((r) => r.test(next)) && confirm === next
  return (
    <AuthCard
      eyebrow="Password expiry"
      title="Update password"
      onSubmit={() => { if (valid) { toast('ok', 'Password updated', 'Your new password is active from now.'); go('signin') } }}
    >
      <button type="button" className="link xp-back" onClick={() => go('expiry-warning')}><Icon name="chevL" size={12} />Back</button>
      <Field label="Current password" required htmlFor="xl-cur">
        <PasswordInput id="xl-cur" value={current} onChange={setCurrent} />
      </Field>
      <Field label="New password" required htmlFor="xl-nw">
        <PasswordInput id="xl-nw" autoComplete="new-password" value={next} onChange={setNext} />
      </Field>
      <RuleList value={next} />
      <Field label="Confirm new password" required error={confirm && confirm !== next ? 'Both passwords must match.' : ''} htmlFor="xl-cf">
        <PasswordInput id="xl-cf" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      </Field>
      <div className="xp-btn-row">
        <Button type="submit" variant="pri" size="lg" disabled={!valid}>Update password</Button>
        <Button size="lg" onClick={() => go('expiry-warning')}>Cancel</Button>
      </div>
    </AuthCard>
  )
}

export const LOGIN_SCREENS = [
  { id: 'signin', group: 'Sign in', label: 'Sign in', path: '/login', note: 'Username and password. “Forgot password?” starts recovery.', render: (c) => <SignIn {...c} /> },
  { id: 'forgot', group: 'Forgot password', label: 'Confirm username', path: '/forgotPassword', note: 'The first recovery step.', render: (c) => <Forgot {...c} /> },
  { id: 'choose-method', group: 'Forgot password', label: 'Choose verification method', path: '/forgotPassword', note: 'SMS verifies the mobile number first; email sends the code straight away.', render: (c) => <ChooseMethod {...c} /> },
  { id: 'verify-mobile', group: 'Forgot password', label: 'Verify mobile number', path: '/forgotPassword', note: 'Last 4 digits of the number on file. Demo: 4417.', render: (c) => <VerifyMobile {...c} /> },
  { id: 'otp-sms', group: 'Forgot password', label: 'OTP verification · SMS', path: '/forgotPassword', note: 'Six-digit code with a 2-minute expiry and resend. Demo: 481902.', render: (c) => <OtpVerify {...c} channel="sms" /> },
  { id: 'otp-email', group: 'Forgot password', label: 'OTP verification · Email', path: '/forgotPassword', note: 'The email branch of the same step.', render: (c) => <OtpVerify {...c} channel="email" /> },
  { id: 'reset', group: 'Reset password', label: 'Reset password', path: '/resetPassword', note: 'Submit stays disabled until every rule passes and both entries match.', render: (c) => <Reset {...c} /> },
  { id: 'reset-rules', group: 'Reset password', label: 'Reset password · live rules', state: 'While typing', path: '/resetPassword', note: 'The rule checklist responds as the password is typed.', render: (c) => <Reset {...c} initial="abcd" /> },
  { id: 'success', group: 'Reset password', label: 'Password reset successful', path: '/resetPassword', render: (c) => <Success {...c} /> },
  { id: 'link-expired', group: 'Reset password', label: 'Link expired', state: 'Error', path: '/resetPassword', note: 'Opened from a reset link that has expired.', render: (c) => <LinkExpired {...c} /> },
  { id: 'expiry-warning', group: 'Password expiry', label: 'Password expiration notice', path: '/passwordexpiry/warning', note: 'Shown after sign-in when the password is close to expiry.', render: (c) => <ExpiryWarning {...c} /> },
  { id: 'update-password', group: 'Password expiry', label: 'Update password', path: '/passwordexpiry/warning', render: (c) => <UpdatePassword {...c} /> },
]

export default function LoginPasswordPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Login & Password"
      sub="Sign in, forgot password, reset password and password-expiry screens, in the new sign-in theme. Buttons walk the real flow."
      screens={LOGIN_SCREENS}
      segments={segments}
    />
  )
}
