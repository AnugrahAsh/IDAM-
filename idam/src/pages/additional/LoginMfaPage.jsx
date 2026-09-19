import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import ScreenGallery from './ScreenGallery'
import { AuthCard, LinkRow, MethodRow, PasswordInput } from './authParts'
import { CodeChallenge, PasskeyScreen, TotpSetup } from './mfaParts'

const BASE = '/iam/additional/loginMfa'

function SignIn({ go }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [touched, setTouched] = useState(false)
  return (
    <AuthCard
      eyebrow="Sign in"
      title="Welcome!"
      sub="Please sign in to your account."
      onSubmit={() => { setTouched(true); if (user.trim() && pass) go('select-method') }}
    >
      <Field label="Username" required error={touched && !user.trim() ? 'Enter your username.' : ''} htmlFor="xm-user">
        <TextInput id="xm-user" autoComplete="username" placeholder="Enter your username" value={user} onChange={(e) => setUser(e.target.value)} />
      </Field>
      <Field label="Password" required error={touched && !pass ? 'Enter your password.' : ''} htmlFor="xm-pass">
        <PasswordInput id="xm-pass" placeholder="Enter your password" value={pass} onChange={setPass} />
      </Field>
      <LinkRow><span /><button type="button" className="link">Forgot password?</button></LinkRow>
      <Button type="submit" variant="pri" size="lg" className="lg-submit">Login</Button>
    </AuthCard>
  )
}

function SelectMethod({ go }) {
  return (
    <AuthCard eyebrow="Multifactor authentication" title="Select login method" sub="Choose how you want to confirm it's you.">
      <div className="lg-choose">
        <MethodRow icon="key" title="Passkey / FIDO2" sub="Use a passkey or USB FIDO2 token. This provides the highest security." onClick={() => go('passkey-register')} />
        <MethodRow icon="device" title="TOTP app" sub="Enter a 6-digit verification code that is generated on a smartphone app." onClick={() => go('totp-setup')} />
      </div>
      <LinkRow center><button type="button" className="link" onClick={() => go('signin')}>Back to sign in</button></LinkRow>
    </AuthCard>
  )
}

const done = (c, msg) => () => { c.toast('ok', 'Signed in', msg); c.go('signin') }

export const LOGIN_MFA_SCREENS = [
  { id: 'signin', group: 'Sign in', label: 'Sign in', path: '/login', render: (c) => <SignIn {...c} /> },
  { id: 'select-method', group: 'Sign in', label: 'Select login method', path: '/login/mfa', note: 'First-time sign-in with MFA required: pick the factor to set up.', render: (c) => <SelectMethod {...c} /> },
  { id: 'totp-setup', group: 'TOTP app', label: 'TOTP enrolment', path: '/login/mfa/totp', note: 'Store links and steps beside the QR code and manual key. Demo code 481902.', render: (c) => <TotpSetup secret="MRTG OVBT JJHF A4ZW G5FG 2T" toast={c.toast} onVerified={() => c.go('totp-verify')} onBack={() => c.go('select-method')} /> },
  { id: 'totp-verify', group: 'TOTP app', label: 'TOTP verification', path: '/login/mfa/totp', note: 'Returning sign-in with an enrolled authenticator.', render: (c) => <CodeChallenge {...c} title="Multifactor authentication" sub="Enter the TOTP verification code." button="Verify OTP" icon="device" onVerified={done(c, 'TOTP verified.')} onBack={() => c.go('select-method')} /> },
  { id: 'passkey-register', group: 'Passkey', label: 'Passkey registration', path: '/login/mfa/passkey', note: 'The browser prompt is simulated.', render: (c) => <PasskeyScreen mode="register" onDone={() => c.go('passkey-signin')} onBack={() => c.go('select-method')} /> },
  { id: 'passkey-signin', group: 'Passkey', label: 'Sign in with passkey', path: '/login/mfa/passkey', render: (c) => <PasskeyScreen mode="signin" created="Jul 14, 2026, 1:07 PM" onDone={() => c.go('signin')} onBack={() => c.go('select-method')} backLabel="Try another way" /> },
]

export default function LoginMfaPage({ segments }) {
  return (
    <ScreenGallery
      base={BASE}
      title="Login MFA"
      sub="Sign in followed by a second factor: TOTP authenticator or passkey / FIDO2."
      screens={LOGIN_MFA_SCREENS}
      segments={segments}
    />
  )
}
