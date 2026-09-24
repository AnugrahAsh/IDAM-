import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/primitives/Icon'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Button from '../../components/primitives/Button'
import Banner from '../../components/primitives/Banner'
import Meter from '../../components/primitives/Meter'
import DottedGlobe from './DottedGlobe'
import WaveField from './WaveField'
import {
  DEMO_LAST4, DEMO_OTP, EXPIRY_DAYS, LOCK_SECONDS, MAX_ATTEMPTS, METHODS, OTP_LENGTH,
  RESEND_SECONDS, RULES, SCORE_LABEL, SCORE_TONE, VERIFY_METHODS, maskEmail, passwordScore,
} from './authModel'
import { probeDeviceAgent } from './deviceAgent'
import { useApp } from '../../store/AppContext'
import Avatar from '../../components/primitives/Avatar'
import { ME } from '../../data/seed'
import './LoginPage.css'
import wordmark from '../../assets/tanflow-wordmark-white.png'

const YEAR = 2026

export default function LoginPage() {
  const { signIn, toast, navigate } = useApp()
  const [step, setStep] = useState('signin')
  /* The credential form is the second path, not the first. The console opens on
     the administrator card, and the form is revealed by asking for it — which
     is what "sign in as someone else" means on a console with one seeded
     identity. */
  const [credentials, setCredentials] = useState(false)
  const [method, setMethod] = useState('local')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [caps, setCaps] = useState(false)
  const [touched, setTouched] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpErr, setOtpErr] = useState('')
  const [channel, setChannel] = useState('email')
  const [last4, setLast4] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockLeft, setLockLeft] = useState(0)
  const [resendLeft, setResendLeft] = useState(0)
  const [remember, setRemember] = useState(true)
  const [device, setDevice] = useState(null)
  const [probing, setProbing] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    if (lockLeft <= 0) return undefined
    const t = setInterval(() => setLockLeft((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [lockLeft])

  useEffect(() => {
    if (resendLeft <= 0) return undefined
    const t = setInterval(() => setResendLeft((v) => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [resendLeft])

  useEffect(() => {
    const root = cardRef.current
    if (!root) return
    const target = root.querySelector('input:not([type="hidden"])') || root.querySelector('h1')
    if (!target) return
    if (target.tagName === 'H1') target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }, [step])

  /* The one-time password path: one identifier, no password, and the same
     verification card the password path ends on. */
  const passwordless = method === 'otp'
  const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())
  const looksLikeMobile = (v) => /^\+?[\d\s-]{7,15}$/.test(String(v).trim())

  const startOtpSignIn = (e) => {
    if (e) e.preventDefault()
    setTouched(true)
    const id = username.trim()
    if (!id || (!looksLikeEmail(id) && !looksLikeMobile(id))) return
    const sms = !looksLikeEmail(id)
    setChannel(sms ? 'sms' : 'email')
    setLast4(sms ? id.replace(/\D/g, '').slice(-4) || DEMO_LAST4 : '')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      setResendLeft(RESEND_SECONDS)
      go('otp')
    }, 320)
  }

  const userErr = touched && !username.trim() ? 'Enter your username.' : ''
  const idErr = touched && passwordless
    ? (!username.trim()
      ? 'Enter your mobile number or email address.'
      : (!looksLikeEmail(username) && !looksLikeMobile(username)
        ? 'That is neither a mobile number nor an email address.'
        : ''))
    : ''
  const passErr = touched && !password ? 'Enter your password.' : ''
  const score = useMemo(() => passwordScore(next), [next])
  const mismatch = confirm.length > 0 && next !== confirm

  const go = (s) => { setStep(s); setTouched(false); setOtp(''); setOtpErr('') }

  const submit = (e) => {
    if (e) e.preventDefault()
    if (lockLeft > 0) return
    setTouched(true)
    if (!username.trim() || !password) return
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (password.length < 4) {
        const n = attempts + 1
        setAttempts(n)
        if (n >= MAX_ATTEMPTS) { setLockLeft(LOCK_SECONDS); setAttempts(0) }
        return
      }
      setAttempts(0)
      setResendLeft(RESEND_SECONDS)
      go(username.trim().toLowerCase() === 'expired' ? 'expiry' : 'otp')
    }, 280)
  }

  const federated = (m) => {
    const spec = METHODS.find((x) => x.id === m)
    toast('info', spec.label, spec.hint)
    setBusy(true)
    setTimeout(() => { setBusy(false); go('otp') }, 400)
  }

  const checkDevice = async () => {
    setProbing(true)
    const res = await probeDeviceAgent()
    setProbing(false)
    setDevice(res)
    if (res.ok) toast('ok', 'Device attested', `Device ${String(res.deviceId).slice(0, 12)}… is bound to this account.`)
  }

  const verifyOtp = (value) => {
    const code = typeof value === 'string' ? value : otp
    if (code.length !== OTP_LENGTH) { setOtpErr(`Enter the ${OTP_LENGTH}-digit code.`); return }
    if (code !== DEMO_OTP) { setOtpErr('That code is not valid or has expired.'); return }
    if (step === 'reset-otp') { go('reset'); return }
    toast('ok', 'Signed in', `Welcome back, ${username.trim() || ME.username}.`)
    signIn()
  }

  const resetDone = () => {
    if (score < 3 || mismatch || !next) return
    go('done')
  }

  const otpTarget = channel === 'sms'
    ? 'Enter the 6-digit code sent to your mobile number'
    : 'Enter the 6-digit code sent to your email address'

  /* One click into the console. The account is already provisioned on this
     tenant, so there is nothing to collect — the card is the credential. */
  const quickSignIn = () => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      toast('ok', 'Signed in', `Welcome back, ${ME.firstName}.`)
      signIn()
    }, 320)
  }

  const card = () => {
    if (step === 'signin') {
      return (
        <form className="lg-card" onSubmit={submit} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">Console access</span>
            <h1 className="lg-h">Welcome</h1>
            <p className="lg-sub">Continue as the administrator of this tenant.</p>
          </header>

          <button type="button" className="lg-quick" onClick={quickSignIn} disabled={busy}>
            <Avatar first={ME.firstName} last={ME.lastName} size="lg" />
            <span className="lg-quick-m">
              <span className="lg-quick-n">{ME.firstName} {ME.lastName}</span>
              <span className="lg-quick-r">{ME.roleLabel}</span>
              <span className="lg-quick-u">{ME.username}</span>
            </span>
            <span className="lg-quick-go" aria-hidden="true">
              {busy ? <Icon name="refresh" size={16} /> : <Icon name="arrowRight" size={16} />}
            </span>
          </button>

          <p className="lg-quick-note">
            <Icon name="shield" size={12} />
            <span>Signed in with the session policy this tenant enforces. Last sign-in {ME.lastLoginRel}.</span>
          </p>

          {!credentials ? (
            <>
              <div className="lg-or">or</div>
              <button type="button" className="lg-other" onClick={() => setCredentials(true)}>
                <Icon name="key" size={14} />
                Sign in with credentials
              </button>
            </>
          ) : (
            <>
          <div className="lg-or">sign in with credentials</div>

          <div className="lg-seg" role="tablist" aria-label="Authentication method">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={method === m.id}
                data-on={method === m.id || undefined}
                onClick={() => setMethod(m.id)}
              >
                {m.tab}
              </button>
            ))}
          </div>

          {lockLeft > 0 && (
            <Banner tone="bad">
              Too many failed attempts. Try again in {lockLeft}s, or reset your password.
            </Banner>
          )}
          {lockLeft === 0 && attempts > 0 && (
            <Banner tone="warn">
              That username or password was not recognized. {MAX_ATTEMPTS - attempts}{' '}
              {MAX_ATTEMPTS - attempts === 1 ? 'attempt' : 'attempts'} left before the account is locked.
            </Banner>
          )}

          {passwordless ? (
            <>
              <Field
                label="Mobile number or email"
                required
                error={idErr}
                hint="The code is sent to whichever of the two this matches on your account."
                htmlFor="lg-otp-id"
              >
                <TextInput
                  id="lg-otp-id"
                  autoComplete="username"
                  placeholder="Mobile number or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Button
                variant="pri"
                size="lg"
                className="lg-submit"
                disabled={busy}
                onClick={startOtpSignIn}
              >
                {busy ? 'Sending a code…' : 'Continue'}
              </Button>

              <div className="lg-row lg-swap">
                <span className="t-xs t-mut">Prefer your username and password?</span>
                <button type="button" className="link" onClick={() => { setMethod('local'); setTouched(false) }}>
                  Sign in with password
                </button>
              </div>
            </>
          ) : method !== 'local' ? (
            <>
              <Banner tone="info">{METHODS.find((m) => m.id === method).hint}</Banner>
              <Button variant="pri" size="lg" className="lg-submit" icon="sso" disabled={busy} onClick={() => federated(method)}>
                {busy ? 'Redirecting…' : `Continue with ${method === 'saml' ? 'SAML' : 'OAuth'}`}
              </Button>
            </>
          ) : (
            <>
              <Field label="Username" required error={userErr} htmlFor="lg-user">
                <TextInput
                  id="lg-user"
                  autoComplete="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field label="Password" required error={passErr} hint={caps ? 'Caps Lock is on.' : undefined} htmlFor="lg-pass">
                <span className="lg-pw">
                  <TextInput
                    id="lg-pass"
                    type={reveal ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCaps(e.getModifierState && e.getModifierState('CapsLock'))}
                  />
                  <button type="button" className="lg-eye" onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}>
                    <Icon name={reveal ? 'eyeoff' : 'eye'} size={14} />
                  </button>
                </span>
              </Field>

              <div className="lg-row lg-row-split">
                <label className="lg-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember this device</span>
                </label>
                <button type="button" className="link" onClick={() => go('forgot')}>Forgot Password?</button>
              </div>

              {remember && (
                <div className="lg-device" data-state={device ? (device.ok ? 'ok' : 'bad') : 'idle'}>
                  <Icon name={device ? (device.ok ? 'checkC' : 'warn') : 'device'} size={13} />
                  <span className="lg-device-t">
                    {probing
                      ? 'Contacting the IDAM Device Agent…'
                      : device
                        ? (device.ok ? 'Device attested and bound to this sign-in.' : device.reason)
                        : 'Device binding requires the IDAM Device Agent.'}
                  </span>
                  {!probing && (
                    <button type="button" className="link" onClick={checkDevice}>
                      {device ? 'Retry' : 'Check device'}
                    </button>
                  )}
                </div>
              )}

              <Button type="submit" variant="pri" size="lg" className="lg-submit" disabled={busy || lockLeft > 0} onClick={submit}>
                {lockLeft > 0 ? `Locked · ${lockLeft}s` : busy ? 'Signing in…' : 'Login'}
              </Button>
            </>
          )}
            </>
          )}

          {/* The way in for someone the directory does not know yet. Below the
              sign-in rather than beside it: it is a registration an administrator
              approves, not another way to authenticate. */}
          <div className="lg-enroll">
            <span className="lg-enroll-t">New to Tanflow?</span>
            <button type="button" className="lg-other" onClick={() => navigate('selfEnrollment')}>
              <Icon name="user" size={14} />
              Self-Enrollment
            </button>
          </div>
        </form>
      )
    }

    if (step === 'expiry') {
      return (
        <form className="lg-card" onSubmit={(e) => { e.preventDefault(); go('reset') }} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">Action required</span>
            <h1 className="lg-h">Your password expires soon</h1>
            <p className="lg-sub">
              This password expires in {EXPIRY_DAYS} days. Set a new one now, or continue and be
              prompted again at the next sign-in.
            </p>
          </header>

          <Banner tone="warn">
            Privileged roles cannot be used once a password has expired. Reset before it lapses to
            avoid losing console access.
          </Banner>

          <Button type="submit" variant="pri" size="lg" className="lg-submit">Set a new password</Button>
          <div className="lg-row lg-row-split">
            <button type="button" className="link" onClick={() => go('otp')}>Continue for now</button>
            <button type="button" className="link" onClick={() => go('signin')}>Return to login</button>
          </div>
        </form>
      )
    }

    if (step === 'otp' || step === 'reset-otp') {
      return (
        <form className="lg-card" onSubmit={(e) => { e.preventDefault(); verifyOtp() }} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">{passwordless && step === 'otp' ? 'One-time password' : 'Step 2 of 2'}</span>
            <h1 className="lg-h">{passwordless && step === 'otp' ? 'Verify it is you' : 'OTP verification'}</h1>
            <p className="lg-sub">{otpTarget}</p>
          </header>

          <Field label="One-time code" required error={otpErr} htmlFor="lg-otp">
            <TextInput
              id="lg-otp"
              className="lg-otp mono"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              placeholder="••••••"
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
                setOtp(v)
                setOtpErr('')
                if (v.length === OTP_LENGTH) setTimeout(() => verifyOtp(v), 80)
              }}
            />
          </Field>

          <div className="lg-hintline">
            <Icon name="info" size={12} />
            <span>Sent to {channel === 'sms' ? `••• ••• ${last4 || DEMO_LAST4}` : maskEmail(username)}. Demo code {DEMO_OTP}.</span>
          </div>

          <Button type="submit" variant="pri" size="lg" className="lg-submit" onClick={verifyOtp}>Verify</Button>
          <div className="lg-row lg-row-split">
            <button
              type="button"
              className="link"
              disabled={resendLeft > 0}
              onClick={() => { setResendLeft(RESEND_SECONDS); toast('info', 'Code resent', 'A new one-time code has been issued.') }}
            >
              {resendLeft > 0 ? `Resend in ${resendLeft}s` : 'Resend code'}
            </button>
            <button type="button" className="link" onClick={() => go('signin')}>
              {passwordless && step === 'otp' ? 'Start over' : 'Return to login'}
            </button>
          </div>
        </form>
      )
    }

    if (step === 'forgot') {
      return (
        <form className="lg-card" onSubmit={(e) => { e.preventDefault(); if (username.trim()) go(channel === 'sms' ? 'mobile' : 'reset-otp') }} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">Account recovery</span>
            <h1 className="lg-h">Reset password</h1>
            <p className="lg-sub">Confirm your username, then set a new password.</p>
          </header>

          <Field label="Username" required htmlFor="lg-fuser">
            <TextInput id="lg-fuser" placeholder="Your username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>

          <div className="lg-choose">
            <div className="lg-choose-h">How would you like to verify your identity?</div>
            {VERIFY_METHODS.map((v) => (
              <button
                key={v.id}
                type="button"
                className="lg-choice"
                data-on={channel === v.id || undefined}
                onClick={() => setChannel(v.id)}
              >
                <span className="lg-choice-ic"><Icon name={v.icon} size={15} /></span>
                <span className="lg-choice-m">
                  <span className="lg-choice-t">{v.label}</span>
                  <span className="lg-choice-s">{v.hint}</span>
                </span>
                <Icon name={channel === v.id ? 'checkC' : 'chevR'} size={13} />
              </button>
            ))}
          </div>

          <Button
            variant="pri"
            size="lg"
            className="lg-submit"
            disabled={!username.trim()}
            onClick={() => go(channel === 'sms' ? 'mobile' : 'reset-otp')}
          >
            Continue
          </Button>
          <div className="lg-row"><button type="button" className="link" onClick={() => go('signin')}>Return to login</button></div>
        </form>
      )
    }

    if (step === 'mobile') {
      return (
        <form className="lg-card" onSubmit={(e) => { e.preventDefault(); if (last4 === DEMO_LAST4) go('reset-otp'); else setOtpErr('Those digits do not match the number on file.') }} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">Account recovery</span>
            <h1 className="lg-h">Verify mobile number</h1>
            <p className="lg-sub">Enter the last 4 digits of your mobile number:</p>
          </header>

          <Field label="Last 4 digits" required error={otpErr} htmlFor="lg-last4">
            <TextInput
              id="lg-last4"
              className="lg-otp mono"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={last4}
              onChange={(e) => { setLast4(e.target.value.replace(/\D/g, '').slice(0, 4)); setOtpErr('') }}
            />
          </Field>

          <div className="lg-hintline">
            <Icon name="info" size={12} />
            <span>Demo number ends {DEMO_LAST4}.</span>
          </div>

          <Button
            variant="pri"
            size="lg"
            className="lg-submit"
            onClick={() => (last4 === DEMO_LAST4 ? go('reset-otp') : setOtpErr('Those digits do not match the number on file.'))}
          >
            Verify Mobile Number
          </Button>
          <div className="lg-row"><button type="button" className="link" onClick={() => go('forgot')}>Back</button></div>
        </form>
      )
    }

    if (step === 'reset') {
      return (
        <form className="lg-card" onSubmit={(e) => { e.preventDefault(); resetDone() }} noValidate>
          <header className="lg-card-h">
            <span className="lg-eyebrow">Account recovery</span>
            <h1 className="lg-h">Set a new password</h1>
            <p className="lg-sub">Choose a new password.</p>
          </header>

          <Field label="Enter Password" required htmlFor="lg-new">
            <span className="lg-pw">
              <TextInput
                id="lg-new"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <button type="button" className="lg-eye" onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}>
                <Icon name={reveal ? 'eyeoff' : 'eye'} size={14} />
              </button>
            </span>
          </Field>

          {next && (
            <div className="lg-strength">
              <div className="lg-strength-h">
                <span>Strength</span>
                <span data-tone={SCORE_TONE[score]}>{SCORE_LABEL[score]}</span>
              </div>
              <Meter value={(score / 4) * 100} tone={SCORE_TONE[score]} />
              <ul className="lg-rules">
                {RULES.map((r) => (
                  <li key={r.id} data-ok={r.test(next) || undefined}>
                    <Icon name={r.test(next) ? 'checkC' : 'x'} size={11} />{r.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Re-enter Password" required error={mismatch ? 'Both passwords must match.' : ''} htmlFor="lg-conf">
            <TextInput
              id="lg-conf"
              type={reveal ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          <Button variant="pri" size="lg" className="lg-submit" disabled={score < 3 || mismatch || !confirm} onClick={resetDone}>
            Reset Password
          </Button>
        </form>
      )
    }

    return (
      <div className="lg-card">
        <div className="lg-done">
          <span className="lg-done-ic"><Icon name="checkC" size={22} /></span>
          <h1 className="lg-h">Success!</h1>
          <p className="lg-sub">Your password has been reset successfully. Use the link below to log in.</p>
        </div>
        <Button variant="pri" size="lg" className="lg-submit" onClick={() => { setPassword(''); go('signin') }}>Log-In</Button>
      </div>
    )
  }

  return (
    <div className="lg">
      <WaveField />
      <div className="lg-orb" aria-hidden="true">
        <DottedGlobe size={640} />
      </div>

      <section className="lg-art">
        <div className="lg-art-in">
          <header className="lg-lockup">
            <img className="lg-mark" src={wordmark} alt="Tanflow" />
            <span className="lg-descriptor">Identity &amp; access management</span>
          </header>

          <div className="lg-hero">
            <h2 className="lg-hero-h">Every identity, governed end to end.</h2>
            <p className="lg-hero-s">
              One console for every identity, entitlement and approval across your estate.
            </p>
          </div>
        </div>
      </section>

      <section className="lg-panel" ref={cardRef} aria-live="polite">{card()}</section>

      <footer className="lg-foot">
        <span className="lg-foot-l">
          <span className="lg-env"><span className="lg-env-dot" />Production</span>
          <span className="lg-foot-sep" />
          <span className="lg-foot-x"><Icon name="lock" size={11} />TLS 1.3</span>
          <span className="lg-foot-sep" />
          <span className="lg-foot-x">Sign-in attempts are recorded</span>
        </span>
        <span className="lg-foot-r">©{YEAR} Tanflow · All rights reserved</span>
      </footer>
    </div>
  )
}
