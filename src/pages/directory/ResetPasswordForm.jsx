import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Switch from '../../components/primitives/Switch'
import Banner from '../../components/primitives/Banner'

const RULES = [
  { id: 'len', label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { id: 'case', label: 'Upper and lower case letters', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'digit', label: 'At least one number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'At least one symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export default function ResetPasswordForm({ user, api }) {
  const [mode, setMode] = useState('mail')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [force, setForce] = useState(true)
  const [errors, setErrors] = useState({})

  const rules = [
    ...RULES,
    {
      id: 'username',
      label: 'Does not contain the username',
      test: (p) => !p.toLowerCase().includes(user.username.toLowerCase()),
    },
  ]

  api.current = {
    submit: () => {
      if (mode === 'mail') return { mode: 'mail', force: true }
      const next = {}
      if (!pw) next.pw = 'Enter a new password.'
      else if (rules.some((r) => !r.test(pw))) next.pw = 'The password does not meet the policy below.'
      if (pw2 !== pw || !pw2) next.pw2 = 'Both entries must match.'
      setErrors(next)
      if (Object.keys(next).some((k) => next[k])) return null
      return { mode: 'manual', force }
    },
  }

  return (
    <div className="stack">
      <div className="stack" role="radiogroup" aria-label="How the new credential is delivered" style={{ gap: 8 }}>
        <button
          type="button"
          className="rp-opt"
          role="radio"
          aria-checked={mode === 'mail'}
          data-on={mode === 'mail'}
          onClick={() => setMode('mail')}
        >
          <span className="rp-dot" />
          <span className="rp-m">
            <span className="rp-t"><Icon name="mail" size={14} />Send a reset link by email</span>
            <span className="rp-s">
              A single-use link is mailed to {user.email}. It expires after 24 hours and the identity chooses
              its own password. Recommended — no credential ever passes through an operator.
            </span>
          </span>
        </button>
        <button
          type="button"
          className="rp-opt"
          role="radio"
          aria-checked={mode === 'manual'}
          data-on={mode === 'manual'}
          onClick={() => setMode('manual')}
        >
          <span className="rp-dot" />
          <span className="rp-m">
            <span className="rp-t"><Icon name="key" size={14} />Set a password manually</span>
            <span className="rp-s">
              Type the new password here and hand it over out of band. Use only when the mailbox is
              unreachable or the identity is being recovered.
            </span>
          </span>
        </button>
      </div>

      {mode === 'mail' ? (
        <Banner tone="info">
          Nothing changes until the link is used. Every active session stays valid and a password change is
          forced when the link is opened.
        </Banner>
      ) : (
        <>
          <Field label="New password" required error={errors.pw} htmlFor="rp-pw">
            <div className="row" style={{ gap: 8 }}>
              <TextInput
                id="rp-pw"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw}
                style={{ flex: 1 }}
                onChange={(e) => { setPw(e.target.value); setErrors((s) => ({ ...s, pw: undefined })) }}
              />
              <IconButton
                icon={show ? 'eyeoff' : 'eye'}
                label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((s) => !s)}
              />
            </div>
          </Field>
          <Field label="Confirm password" required error={errors.pw2} htmlFor="rp-pw2">
            <TextInput
              id="rp-pw2"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => { setPw2(e.target.value); setErrors((s) => ({ ...s, pw2: undefined })) }}
            />
          </Field>
          <div className="rp-rules" aria-label="Password policy">
            {rules.map((r) => (
              <div className="rp-rule" data-ok={pw !== '' && r.test(pw)} key={r.id}>
                <Icon name={pw !== '' && r.test(pw) ? 'checkC' : 'minus'} size={12} />
                {r.label}
              </div>
            ))}
          </div>
          <div className="row-between">
            <div style={{ minWidth: 0 }}>
              <div className="t-sm" style={{ fontWeight: 600 }}>Require change at next sign-in</div>
              <div className="t-xs t-mut" style={{ marginTop: 2 }}>
                The password set here works exactly once and must be replaced by the user.
              </div>
            </div>
            <Switch checked={force} label="Require change at next sign-in" onChange={setForce} />
          </div>
          <Banner tone="warn">
            The new password takes effect immediately and every active session is revoked. The value is not
            stored anywhere after this drawer closes — hand it over securely.
          </Banner>
        </>
      )}
    </div>
  )
}

export function openResetPassword({ user, setDrawer, toast }) {
  const api = { current: null }
  setDrawer({
    title: 'Set / Reset Password',
    sub: `${user.username} · ${user.email}`,
    children: <ResetPasswordForm user={user} api={api} />,
    footer: (
      <>
        <Button onClick={() => setDrawer(null)}>Cancel</Button>
        <Button
          variant="pri"
          icon="key"
          onClick={() => {
            const res = api.current && api.current.submit()
            if (!res) return
            setDrawer(null)
            if (res.mode === 'mail') {
              toast('ok', 'Reset link sent', `A single-use reset link was mailed to ${user.email}. It expires in 24 hours.`)
            } else {
              toast('ok', 'Password set', `New password applied for ${user.username}${res.force ? ' — a change is required at next sign-in' : ''}.`)
            }
          }}
        >
          Reset password
        </Button>
      </>
    ),
  })
}
