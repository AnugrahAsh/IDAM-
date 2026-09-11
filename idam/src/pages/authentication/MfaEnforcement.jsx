import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import Banner from '../../components/primitives/Banner'
import PageBar from '../../components/shell/PageBar'
import StickyActions from '../../components/shell/StickyActions'
import { useLocalState } from '../../lib/useLocalState'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { BASE_PATH, DIRECTORY, STRENGTH } from './authData'

// Presentational detail for each factor: what the user is asked to do, and the
// shape of the challenge behind it.
const SPEC = {
  passkey: { spec: 'WebAuthn · FIDO2', how: 'The browser asks for the platform authenticator or a security key. Nothing is typed, so nothing can be phished.' },
  totp: { spec: '6 digits · 30s · ±1 step', how: 'The user reads a rotating code from an authenticator app and types it.' },
  push: { spec: 'Approve or deny · 60s', how: 'A prompt is pushed to the Tanflow mobile app and approved with a tap.' },
  email: { spec: '6 digits · 5-min code', how: 'A code is mailed to the registered address.' },
  sms: { spec: '6 digits · 5-min code', how: 'A code is sent by SMS. Interceptable by SIM swap — keep it as a fallback only.' },
}

const same = (a, b) => a.on === b.on
  && a.allowed.length === b.allowed.length && a.allowed.every((id) => b.allowed.includes(id))

/**
 * MFA enforcement.
 *
 * One decision — is a second factor required, and which factors may be used to
 * satisfy it — so the screen is one viewport, not a scroll. The factor list and
 * the detail of the selected factor sit side by side because they are read
 * together: "a second factor is required, and a passkey satisfies it" is a
 * single sentence, and it used to be spread over three screens of scrolling.
 */
export default function MfaEnforcement({ methods }) {
  const { navigate, toast } = useApp()
  const [saved, setSaved] = useLocalState('tf-idam-mfa-policy', {
    on: false,
    allowed: methods.filter((m) => m.enabled).map((m) => m.id),
  })
  const [draft, setDraft] = useLocalState('tf-idam-mfa-draft', saved)
  const [focus, setFocus] = useState(methods[0].id)

  const dirty = !same(draft, saved)
  const selected = methods.filter((m) => draft.allowed.includes(m.id))
  const strongest = methods.find((m) => m.strength === 'strongest')
  const active = methods.find((m) => m.id === focus) || methods[0]
  const activeOn = draft.allowed.includes(active.id)

  /**
   * Enforcement on with nothing allowed locks every local identity out, so the
   * last enabled factor cannot be removed while enforcement is on — and turning
   * enforcement on with nothing selected adopts the phishing-resistant factor
   * rather than saving a policy that refuses everyone.
   */
  const toggleMethod = (id) => {
    if (!draft.on) {
      toast('info', 'Enforcement is off', 'Turn enforcement on to choose which factors identities may enrol in.')
      return
    }
    const on = draft.allowed.includes(id)
    if (on && draft.allowed.length === 1) {
      toast('warn', 'At least one factor is required', 'With enforcement on and no allowed factor, no local identity could complete a sign-in.')
      return
    }
    setDraft((d) => ({ ...d, allowed: on ? d.allowed.filter((x) => x !== id) : [...d.allowed, id] }))
  }

  const setEnforcement = (on) => setDraft((d) => ({
    ...d,
    on,
    allowed: on && d.allowed.length === 0 && strongest ? [strongest.id] : d.allowed,
  }))

  const save = () => {
    setSaved(draft)
    toast(
      'ok',
      draft.on ? 'MFA enforcement on' : 'MFA enforcement off',
      draft.on
        ? `Every local identity must enrol in one of ${selected.length} allowed ${selected.length === 1 ? 'factor' : 'factors'}.`
        : 'Local-login users sign in with their password alone.',
    )
  }

  // The share of the identities a second factor applies to that already hold
  // one of the ticked factors. It was divided by an inflated denominator, which
  // reported full coverage on a directory with five identities not enrolled.
  const coverage = useMemo(() => {
    if (!DIRECTORY) return 0
    const enrolled = selected.reduce((a, m) => a + m.enrolled, 0)
    return Math.min(100, Math.round((enrolled / DIRECTORY) * 100))
  }, [selected])

  const resistant = selected.some((m) => m.strength === 'strongest')

  return (
    <>
      <PageBar
        title="Multi-Factor Authentication"
        crumbs={[{ label: 'Core' }, { label: 'Multi-Factor Authentication' }]}
        sub="Whether a second factor is required, and which factors satisfy it for every local identity."
        badge={<Pill tone={draft.on ? 'ok' : 'mut'} dot>{draft.on ? 'Enforced' : 'Password only'}</Pill>}
        actions={<Button icon="config" onClick={() => navigate(`${BASE_PATH}/factors`)}>MFA Configuration</Button>}
      />

      {/* The state of the whole page in one line, with the switch that changes it. */}
      <section className="mfa-enf" data-on={draft.on || undefined}>
        <span className="mfa-enf-ic"><Icon name="shield" size={24} /></span>
        <div className="mfa-enf-m">
          <h2 className="mfa-enf-t">
            MFA enforcement is {draft.on ? 'on' : 'off'}
            <Pill tone={draft.on ? 'ok' : 'mut'} dot>
              {draft.on ? `${selected.length} ${selected.length === 1 ? 'factor' : 'factors'} allowed` : 'Password only'}
            </Pill>
          </h2>
          <p className="mfa-enf-s">
            {draft.on
              ? 'Every local identity must enrol on next sign-in and is challenged after their password.'
              : 'Local-login users sign in with their password only. Turn this on to require a second factor.'}
          </p>
        </div>
        <div className="mfa-enf-tog">
          <span className="mfa-enf-k">Enforcement</span>
          <span className="mfa-enf-v">
            <b data-on={draft.on || undefined}>{draft.on ? 'On' : 'Off'}</b>
            <Switch checked={draft.on} onChange={setEnforcement} label="MFA enforcement" />
          </span>
        </div>
      </section>

      {/* Fixed two-pane shell: every factor visible at once on the left, the
          detail of the selected factor on the right. */}
      <div className="mfa-shell">
        <Card
          flush
          title="Allowed factors"
          sub={draft.on
            ? 'Tick what identities may enrol in. Select a tile to read what it asks of the user.'
            : 'Enforcement is off, so nothing here is offered to anyone and the switches are unavailable. Select a tile to read what a factor asks of the user.'}
          actions={<span className="t-xs t-mut">{selected.length} of {methods.length} allowed</span>}
        >
          <div className="mfa-grid" data-locked={!draft.on || undefined}>
            {methods.map((m) => {
              const on = draft.allowed.includes(m.id)
              const strength = STRENGTH[m.strength]
              const extra = SPEC[m.id] || {}
              return (
                <div
                  key={m.id}
                  className="mfa-method"
                  data-on={on || undefined}
                  data-focus={focus === m.id || undefined}
                  data-locked={!draft.on || undefined}
                  role="button"
                  aria-pressed={focus === m.id}
                  tabIndex={0}
                  onClick={() => setFocus(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); setFocus(m.id) }
                    if (e.key === ' ') { e.preventDefault(); toggleMethod(m.id) }
                  }}
                >
                  <span className="mfa-method-ic"><Icon name={m.icon} size={16} /></span>
                  <span className="mfa-method-m">
                    <span className="mfa-method-n">{m.name}</span>
                    <span className="mfa-method-f">
                      <Tag tone={strength.tone === 'ok' ? 'acc' : strength.tone === 'bad' ? undefined : undefined}>{strength.label}</Tag>
                      <span className="mfa-method-spec mono">{extra.spec}</span>
                    </span>
                  </span>
                  {/* The switch is the control; the tile is the selector. Two
                      separate gestures, so choosing a factor to read about
                      cannot accidentally turn it off. */}
                  {/* With enforcement off there is nothing to allow, so the
                      switch is genuinely unavailable rather than a live
                      control that answers with a toast. */}
                  <span onClick={(e) => e.stopPropagation()} role="presentation">
                    <Switch
                      checked={on}
                      disabled={!draft.on}
                      onChange={() => toggleMethod(m.id)}
                      label={`Allow ${m.name}`}
                    />
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="mfa-side">
          <Card
            title={active.name}
            sub={STRENGTH[active.strength].label}
            actions={<Pill tone={activeOn ? 'ok' : 'mut'} dot>{activeOn ? 'Allowed' : 'Not allowed'}</Pill>}
          >
            <p className="mfa-how">{(SPEC[active.id] || {}).how}</p>
            <div className="mfa-facts">
              <div><span>Enrolled</span><b className="num">{num(active.enrolled)}</b></div>
              <div><span>Specification</span><b className="mono t-sm">{(SPEC[active.id] || {}).spec}</b></div>
              <div><span>Strength</span><b>{STRENGTH[active.strength].label}</b></div>
            </div>
            {active.strength === 'weakest' && (
              <Banner tone="warn">
                Codes sent over SMS can be intercepted by SIM swap. Keep this as a recovery fallback rather
                than a primary factor.
              </Banner>
            )}
          </Card>

          <Card flush className="mfa-readout">
            <div className="mfa-readout-row">
              <span>Coverage</span>
              <span className="mfa-bar"><i style={{ width: `${coverage}%` }} data-tone={coverage > 70 ? 'ok' : 'warn'} /></span>
              <b className="num">{coverage}%</b>
            </div>
            <div className="mfa-readout-row">
              <span>Phishing-resistant</span>
              <Pill tone={resistant ? 'ok' : 'warn'} dot>{resistant ? 'Available' : 'Not offered'}</Pill>
            </div>
          </Card>
        </div>
      </div>

      <StickyActions
        flow
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
