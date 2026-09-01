import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import PageBar from '../../components/shell/PageBar'
import StickyActions from '../../components/shell/StickyActions'
import { useLocalState } from '../../lib/useLocalState'
import { useApp } from '../../store/AppContext'
import { BASE_PATH, STRENGTH } from './authData'

// Presentational detail for each factor: what the user is asked for, and where
// the delivery channel behind it is configured. The methods themselves come
// from the platform's factor list.
const SPEC = {
  passkey: { spec: 'WebAuthn · FIDO2' },
  totp: { spec: '6 digits · 30s · ±1 step' },
  push: { spec: 'Approve or deny · 60s' },
  email: { spec: '6 digits · 5-min code', link: { label: 'Email Management', to: '/iam/emails' } },
  sms: { spec: '6 digits · 5-min code', link: { label: 'SMS Management', to: '/iam/sms' } },
}

const same = (a, b) => a.on === b.on && a.allowed.length === b.allowed.length
  && a.allowed.every((id) => b.allowed.includes(id))

// The one decision this page exists for: is a second factor required, and which
// factors may people enrol in. Everything deeper lives in MFA Configuration.
export default function MfaEnforcement({ methods }) {
  const { navigate, toast } = useApp()
  const [saved, setSaved] = useLocalState('tf-idam-mfa-policy', {
    on: false,
    allowed: methods.filter((m) => m.enabled).map((m) => m.id),
  })
  const [draft, setDraft] = useLocalState('tf-idam-mfa-draft', saved)

  const dirty = !same(draft, saved)
  const selected = methods.filter((m) => draft.allowed.includes(m.id))

  const toggleMethod = (id) => {
    if (!draft.on) return
    setDraft((d) => ({
      ...d,
      allowed: d.allowed.includes(id) ? d.allowed.filter((x) => x !== id) : [...d.allowed, id],
    }))
  }

  const save = () => {
    setSaved(draft)
    toast(
      'ok',
      draft.on ? 'MFA enforcement on' : 'MFA enforcement off',
      draft.on
        ? `Local-login users must enrol in one of ${selected.length} allowed ${selected.length === 1 ? 'method' : 'methods'} at next sign-in.`
        : 'Local-login users sign in with their password alone.',
    )
  }

  return (
    <>
      <PageBar
        title="Multi-Factor Authentication"
        crumbs={[{ label: 'MFA' }]}
        sub="Turn MFA enforcement on or off and pick which verification methods users may enrol in."
        actions={(
          <Button icon="config" onClick={() => navigate(`${BASE_PATH}/factors`)}>MFA Configuration</Button>
        )}
      />

      {/* The state of the whole page in one line, with the switch that changes it. */}
      <section className="mfa-enf" data-on={draft.on || undefined}>
        <span className="mfa-enf-ic"><Icon name="shield" size={24} /></span>
        <div className="mfa-enf-m">
          <h2 className="mfa-enf-t">
            MFA enforcement is {draft.on ? 'on' : 'off'}
            <Pill tone={draft.on ? 'ok' : 'mut'} dot>
              {draft.on ? 'Second factor required' : 'Password only'}
            </Pill>
          </h2>
          <p className="mfa-enf-s">
            {draft.on
              ? 'Local-login users must enrol on next sign-in and are challenged for a code after their password.'
              : 'Local-login users sign in with their password only. Turn this on to require a second factor.'}
          </p>
        </div>
        <div className="mfa-enf-tog">
          <span className="mfa-enf-k">Enforcement</span>
          <span className="mfa-enf-v">
            <b data-on={draft.on || undefined}>{draft.on ? 'On' : 'Off'}</b>
            <Switch
              checked={draft.on}
              onChange={(v) => setDraft((d) => ({ ...d, on: v }))}
              label="MFA enforcement"
            />
          </span>
        </div>
      </section>

      <div className="mfa-cols">
        <Card
          title="Allowed methods"
          sub="What users may enrol in. SSO users bypass this layer — their identity provider handles MFA."
          actions={<span className="t-xs t-mut">{selected.length} of {methods.length} selected</span>}
          flush
        >
          {!draft.on && (
            <div className="mfa-note">
              <Icon name="info" size={13} />
              Enforcement is off, so nothing here is offered to anyone. Turn it on to choose which methods
              users may enrol in.
            </div>
          )}

          <div className="mfa-grid">
            {methods.map((m) => {
              const on = draft.allowed.includes(m.id)
              const strength = STRENGTH[m.strength]
              const extra = SPEC[m.id] || {}
              return (
                <div
                  key={m.id}
                  className="mfa-method"
                  data-on={on || undefined}
                  data-locked={!draft.on || undefined}
                  role="checkbox"
                  aria-checked={on}
                  aria-disabled={!draft.on}
                  tabIndex={draft.on ? 0 : -1}
                  onClick={() => toggleMethod(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMethod(m.id) }
                  }}
                >
                  <div className="mfa-method-top">
                    <span className="mfa-method-ic"><Icon name={m.icon} size={17} /></span>
                    <span className="mfa-method-box" aria-hidden="true">
                      {on && <Icon name="check" size={11} stroke={3} />}
                    </span>
                  </div>
                  <h3 className="mfa-method-n">{m.name}</h3>
                  <p className="mfa-method-d">{m.sub}</p>
                  <div className="mfa-method-f">
                    <Tag tone={strength.tone === 'ok' ? 'acc' : undefined}>{strength.label}</Tag>
                    <span className="mfa-method-spec mono">{extra.spec}</span>
                    {extra.link && (
                      <button
                        type="button"
                        className="link"
                        onClick={(e) => { e.stopPropagation(); navigate(extra.link.to) }}
                      >
                        {extra.link.label}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="stack">
          <Card title="Sign-in preview" sub="What a local-login user will see">
            <div className="mfa-prev">
              <div className="mfa-prev-bar">
                <i data-dot="r" /><i data-dot="y" /><i data-dot="g" />
                <span className="mono">pam1.tanflow.com</span>
              </div>
              <div className="mfa-prev-body">
                <Icon name={draft.on ? 'lock' : 'unlock'} size={30} />
                <b>{draft.on ? 'Password + second factor' : 'Password only'}</b>
                <p>
                  {draft.on
                    ? `After their password, users are challenged for one of the ${selected.length} allowed ${selected.length === 1 ? 'method' : 'methods'} before the console loads.`
                    : 'Users go straight to the console after their password. No second factor is offered, and nobody can enrol until enforcement is on.'}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Where this applies" flush>
            <div className="mfa-scope">
              <div className="mfa-scope-row">
                <span className="feed-ic" data-tone="acc"><Icon name="user" size={14} /></span>
                <span>
                  <b>Local-login users</b>
                  <span>Governed by this page — password, then a second factor when enforcement is on.</span>
                </span>
              </div>
              <div className="mfa-scope-row">
                <span className="feed-ic"><Icon name="sso" size={14} /></span>
                <span>
                  <b>
                    SSO users
                    <button type="button" className="link" onClick={() => navigate('/iam/ssoConfigurations')}>providers</button>
                  </b>
                  <span>Bypass this layer entirely. Their identity provider owns MFA.</span>
                </span>
              </div>
              <div className="mfa-scope-row">
                <span className="feed-ic"><Icon name="key" size={14} /></span>
                <span>
                  <b>Break-glass accounts</b>
                  <span>Exempt by policy so a locked-out tenant can always be recovered.</span>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={(
          <span className="mfa-save">
            <Icon name={dirty ? 'edit' : 'check'} size={14} />
            <span>
              <b>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</b>
              <span>
                {dirty
                  ? 'Save to apply this policy to every local-login user.'
                  : 'This screen matches what the node is enforcing right now.'}
              </span>
            </span>
          </span>
        )}
      >
        <Button disabled={!dirty} onClick={() => setDraft(saved)}>Reset</Button>
        <Button variant="pri" icon="check" disabled={!dirty} onClick={save}>Save changes</Button>
      </StickyActions>
    </>
  )
}
