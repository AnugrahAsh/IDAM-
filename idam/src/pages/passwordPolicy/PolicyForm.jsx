import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { statusTone } from '../../lib/format'
import { useState } from 'react'
import { DEFAULT_RULES, LIST_PATH, SPECIALS } from './passwordData'
import StrengthPreview from './StrengthPreview'

export default function PolicyForm({ policy, onCancel, onSubmit }) {
  const [d, setD] = useState(() => (policy ? { ...policy } : { ...DEFAULT_RULES, name: '', description: '', minLength: 12, history: 6, expiryDays: 90, lockoutAttempts: 5, lockoutMins: 15, dictionary: true, mfaRequired: true }))
  const [dirty, setDirty] = useState(false)

  const set = (k, v) => {
    setD((x) => ({ ...x, [k]: v }))
    setDirty(true)
  }

  const ready = String(d.name).trim().length > 0 && d.minLength >= 8 && d.minLength <= d.maxLength

  return (
    <>
      <DetailHeader
        backTo={policy ? `${LIST_PATH}/${policy.id}` : LIST_PATH}
        backLabel={policy ? policy.name : 'Password Policy'}
        eyebrow="Credential policy"
        title={policy ? `Edit ${policy.name}` : 'Add password policy'}
        sub="Rules are enforced at credential set, change and reset. Existing credentials are unaffected until the next change."
        badges={policy ? <Pill tone={statusTone(policy.status)} dot>{policy.status}</Pill> : <Pill tone="acc" dot>Draft</Pill>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Identification" sub="How operators recognise this policy">
              <div className="grid grid-2">
                <Field label="Policy name" required span={2} htmlFor="pp-name">
                  <TextInput id="pp-name" value={d.name} placeholder="Privileged Account Policy" onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="Description" span={2} htmlFor="pp-desc">
                  <TextInput
                    as="textarea"
                    id="pp-desc"
                    rows={2}
                    value={d.description}
                    placeholder="Who this policy governs and why it differs from the baseline."
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Composition" sub="Character classes every credential must satisfy">
              <div className="grid grid-3">
                <Field label="Minimum length" required hint="Fourteen or more is recommended." htmlFor="pp-min">
                  <TextInput id="pp-min" type="number" min="8" max="64" value={d.minLength} onChange={(e) => set('minLength', Number(e.target.value))} />
                </Field>
                <Field label="Maximum length" hint="Long passphrases should not be truncated." htmlFor="pp-max">
                  <TextInput id="pp-max" type="number" min="16" max="256" value={d.maxLength} onChange={(e) => set('maxLength', Number(e.target.value))} />
                </Field>
                <Field label="Repeated characters" hint="Zero disables the check." htmlFor="pp-rep">
                  <TextInput id="pp-rep" type="number" min="0" max="8" value={d.maxRepeat} onChange={(e) => set('maxRepeat', Number(e.target.value))} />
                </Field>
                <Field label="Upper case required" hint="Zero means not required." htmlFor="pp-up">
                  <TextInput id="pp-up" type="number" min="0" max="8" value={d.upper} onChange={(e) => set('upper', Number(e.target.value))} />
                </Field>
                <Field label="Lower case required" hint="Zero means not required." htmlFor="pp-lo">
                  <TextInput id="pp-lo" type="number" min="0" max="8" value={d.lower} onChange={(e) => set('lower', Number(e.target.value))} />
                </Field>
                <Field label="Digits required" hint="Zero means not required." htmlFor="pp-dig">
                  <TextInput id="pp-dig" type="number" min="0" max="8" value={d.digits} onChange={(e) => set('digits', Number(e.target.value))} />
                </Field>
                <Field label="Symbols required" hint={`Accepted symbols: ${SPECIALS.slice(0, 12)}…`} htmlFor="pp-sp">
                  <TextInput id="pp-sp" type="number" min="0" max="8" value={d.special} onChange={(e) => set('special', Number(e.target.value))} />
                </Field>
                <Field label="Alphabetic characters required" hint="Letters of either case. Zero means not required." htmlFor="pp-alpha">
                  <TextInput id="pp-alpha" type="number" min="0" max="32" value={d.alpha == null ? 0 : d.alpha} onChange={(e) => set('alpha', Number(e.target.value))} />
                </Field>
              </div>

              <div className="grid grid-2" style={{ marginTop: 14 }}>
                <Field
                  label="Required characters"
                  hint="Comma separated. Every listed character must appear at least once."
                  htmlFor="pp-req"
                >
                  <TextInput
                    id="pp-req"
                    className="mono"
                    value={d.requiredChars || ''}
                    placeholder="@, #, !"
                    onChange={(e) => set('requiredChars', e.target.value)}
                  />
                </Field>
                <Field
                  label="Characters not allowed"
                  hint="Comma separated. A credential containing any of these is rejected."
                  htmlFor="pp-forbid"
                >
                  <TextInput
                    id="pp-forbid"
                    className="mono"
                    value={d.forbiddenChars || ''}
                    placeholder="&lt;, &gt;, &amp;, space"
                    onChange={(e) => set('forbiddenChars', e.target.value)}
                  />
                </Field>
              </div>

              <div className="row" style={{ marginTop: 16 }}>
                <Switch checked={!!d.startAlphanumeric} onChange={(v) => set('startAlphanumeric', v)} label="Start with an alphanumeric character" />
                <span className="t-sm">Start with an alphanumeric character — some targets reject a leading symbol</span>
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <Switch checked={d.noSequential} onChange={(v) => set('noSequential', v)} label="Reject sequential characters" />
                <span className="t-sm">Reject three sequential characters such as abc or 321</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <Switch checked={d.noUsername} onChange={(v) => set('noUsername', v)} label="Reject the username" />
                <span className="t-sm">Reject a credential containing the username</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <Switch checked={d.noName !== false} onChange={(v) => set('noName', v)} label="Reject the name" />
                <span className="t-sm">Reject a credential containing the first or last name</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <Switch checked={d.noEmail !== false} onChange={(v) => set('noEmail', v)} label="Reject the email address" />
                <span className="t-sm">Reject a credential containing the email local part</span>
              </div>
            </Card>

            <Card title="Lifetime and history" sub="How long a credential survives">
              <div className="grid grid-3">
                <Field label="Expiry" hint="Days. Zero means the credential never expires." htmlFor="pp-exp">
                  <TextInput id="pp-exp" type="number" min="0" max="365" value={d.expiryDays} onChange={(e) => set('expiryDays', Number(e.target.value))} />
                </Field>
                <Field label="History remembered" hint="Previous credentials that cannot be reused." htmlFor="pp-hist">
                  <TextInput id="pp-hist" type="number" min="0" max="24" value={d.history} onChange={(e) => set('history', Number(e.target.value))} />
                </Field>
                <Field label="Minimum age" hint="Hours between changes. Stops history cycling." htmlFor="pp-age">
                  <TextInput id="pp-age" type="number" min="0" max="168" value={d.minAgeHours} onChange={(e) => set('minAgeHours', Number(e.target.value))} />
                </Field>
                <Field label="Expiry warning" hint="Days before expiry that the identity is notified." htmlFor="pp-warn">
                  <TextInput id="pp-warn" type="number" min="0" max="60" value={d.warnDays} onChange={(e) => set('warnDays', Number(e.target.value))} />
                </Field>
                <Field label="Grace sign-ins" hint="Sign-ins permitted after expiry to set a new credential." htmlFor="pp-grace">
                  <TextInput id="pp-grace" type="number" min="0" max="10" value={d.graceLogins} onChange={(e) => set('graceLogins', Number(e.target.value))} />
                </Field>
                <Field label="Lockout release" hint="How a locked account is returned to service." htmlFor="pp-rel">
                  <Select
                    id="pp-rel"
                    value={d.lockoutReset}
                    options={['Automatic after the window', 'Service desk only', 'Manager approval']}
                    onChange={(e) => set('lockoutReset', e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Lockout and content checks" sub="Failure handling and shared lists">
              <div className="grid grid-2">
                <Field label="Lockout threshold" hint="Failed attempts before the account locks." htmlFor="pp-lock">
                  <TextInput id="pp-lock" type="number" min="1" max="20" value={d.lockoutAttempts} onChange={(e) => set('lockoutAttempts', Number(e.target.value))} />
                </Field>
                <Field label="Lockout window" hint="Minutes the account stays locked." htmlFor="pp-lockmins">
                  <TextInput id="pp-lockmins" type="number" min="1" max="1440" value={d.lockoutMins} onChange={(e) => set('lockoutMins', Number(e.target.value))} />
                </Field>
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <Switch checked={d.dictionary} onChange={(v) => set('dictionary', v)} label="Enforce the password dictionary" />
                <span className="t-sm">Reject any credential containing a forbidden term</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <Switch checked={d.mfaRequired} onChange={(v) => set('mfaRequired', v)} label="Require a second factor" />
                <span className="t-sm">Require a second factor for every identity covered</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <Switch checked={d.selfService} onChange={(v) => set('selfService', v)} label="Permit self-service reset" />
                <span className="t-sm">Permit self-service reset behind a second factor</span>
              </div>

              {d.expiryDays === 0 && (
                <div style={{ marginTop: 14 }}>
                  <Banner tone="warn">
                    Credentials under this policy never expire. Reserve this for service principals whose secrets are
                    rotated by an automated job.
                  </Banner>
                </div>
              )}
              {d.minLength > d.maxLength && (
                <div style={{ marginTop: 14 }}>
                  <Banner tone="bad">
                    The minimum length exceeds the maximum length. No credential can satisfy this policy.
                  </Banner>
                </div>
              )}
            </Card>
          </div>

          <div className="stack">
            <StrengthPreview rules={d} title="Live strength preview" />
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!ready} onClick={() => onSubmit(d)}>
          {policy ? 'Save changes' : 'Create policy'}
        </Button>
      </StickyActions>
    </>
  )
}

