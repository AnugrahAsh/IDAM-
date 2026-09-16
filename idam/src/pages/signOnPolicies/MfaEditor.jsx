import Banner from '../../components/primitives/Banner'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import NavLink from '../../components/shell/NavLink'
import { FREQUENCY_TYPES, FREQUENCY_UNITS, MFA_OPTIONS, mfaMeta, tenantOffers } from './signOnPolicyData'

/**
 * MFA for one rule: whether to challenge, with which methods, and how often.
 * The previous form laid these out as three unrelated rows; they are one
 * decision, so they sit in one card.
 */
export default function MfaEditor({ draft, issues, onChange }) {
  const custom = draft.frequencyType === 'CUSTOM_INTERVAL'
  const switchedOff = draft.mfaMethods.filter((m) => !tenantOffers(m)).map((m) => mfaMeta(m).short)
  const unit = FREQUENCY_UNITS.find((u) => u.value === draft.frequencyUnit) || FREQUENCY_UNITS[1]
  const n = Number(draft.frequencyInterval)
  const interval = n >= 1 ? `${n} ${n === 1 ? unit.one : unit.many}` : 'the interval set above'

  // Kept in catalogue order, so the same selection always reads the same way.
  const toggle = (value) => {
    const next = draft.mfaMethods.includes(value)
      ? draft.mfaMethods.filter((m) => m !== value)
      : [...draft.mfaMethods, value]
    onChange({ mfaMethods: MFA_OPTIONS.map((m) => m.value).filter((m) => next.includes(m)) })
  }

  return (
    <Card
      title="Multi-factor authentication"
      sub="Challenge a matching sign-in for a second factor"
      actions={(
        <label className="sop-switch">
          <span className="t-sm">Require MFA</span>
          <Switch checked={draft.promptMfa} label="Require MFA" onChange={(v) => onChange({ promptMfa: v })} />
        </label>
      )}
    >
      {!draft.promptMfa ? (
        <div className="sop-off"><Icon name="shield" size={14} />This rule does not ask for a second factor.</div>
      ) : (
        <div className="stack">
          <Field label="Methods" required error={issues.mfaMethods} hint="Selected methods are offered as alternatives.">
            <div className="cfg-rules sop-methods" role="group" aria-label="MFA methods">
              {MFA_OPTIONS.map((m) => {
                const on = draft.mfaMethods.includes(m.value)
                return (
                  <button
                    key={m.value}
                    type="button"
                    className="cfg-rule sop-method"
                    data-on={on || undefined}
                    aria-pressed={on}
                    onClick={() => toggle(m.value)}
                  >
                    <span className="sop-method-h">
                      <Icon name={m.icon} size={14} />
                      <span className="cfg-rule-t">{m.label}</span>
                      <span className="check" data-on={on} aria-hidden="true"><Icon name="check" size={10} stroke={3} /></span>
                    </span>
                    <span className="cfg-rule-s">{m.sub}</span>
                    {!tenantOffers(m.value) && (
                      <span className="sop-method-off"><Icon name="warn" size={11} />Switched off for this tenant</span>
                    )}
                  </button>
                )
              })}
            </div>
          </Field>

          {switchedOff.length > 0 && (
            <Banner tone="warn">
              {switchedOff.join(' and ')} {switchedOff.length === 1 ? 'is' : 'are'} switched off in the tenant’s
              Multi-Factor Authentication settings, so {switchedOff.length === 1 ? 'it is' : 'they are'} not offered
              at sign-in until enabled there.{' '}
              <NavLink to="mfa" className="link">Multi-Factor Authentication</NavLink>
            </Banner>
          )}

          <div className="sop-freq">
            <Field label="MFA frequency" htmlFor="sop-mfa-frequency">
              <Select
                id="sop-mfa-frequency"
                value={draft.frequencyType}
                options={FREQUENCY_TYPES}
                onChange={(e) => onChange({ frequencyType: e.target.value })}
              />
            </Field>
            {custom && (
              <>
                <Field label="Interval" required htmlFor="sop-mfa-interval" error={issues.frequencyInterval}>
                  <TextInput
                    id="sop-mfa-interval"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={draft.frequencyInterval}
                    placeholder="8"
                    onChange={(e) => onChange({ frequencyInterval: e.target.value })}
                  />
                </Field>
                <Field label="Unit" htmlFor="sop-mfa-unit">
                  <Select
                    id="sop-mfa-unit"
                    value={draft.frequencyUnit}
                    options={FREQUENCY_UNITS}
                    onChange={(e) => onChange({ frequencyUnit: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
          <div className="t-xs t-mut">
            {custom
              ? `After a successful challenge, the identity is not asked again for ${interval}.`
              : 'The identity is challenged at every sign-in this rule matches.'}
          </div>
        </div>
      )}
    </Card>
  )
}
