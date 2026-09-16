import { useMemo, useState } from 'react'
import Card from '../../components/primitives/Card'
import Toggle from '../settings/Toggle'
import { useSettingsSection, writeSection } from '../settings/settingsStore'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import {
  SAMPLE_USER, USERNAME_MODES, USERNAME_RULES, USERNAME_ATTRIBUTES,
  blankUsernameRule, usernameRule, usernameSample,
} from './generation'
import { EMPLOYEE_TYPES } from './EmployeeTypePanel'
import AttributeSequenceEditor from './AttributeSequenceEditor'
import { MSG, followSharedSeparator, validateSequence } from './rules'

// Username creation is configured per employee type, because a contractor and a
// service account are not named the same way. Each type is either Manual — an
// operator types the name on the identity form — or Dynamic, deriving it from
// one of five fixed rules.
const defaultsFor = (type) => {
  if (type === 'Service Account') return { mode: 'Dynamic', rule: { ...blankUsernameRule('prefix_incremental'), prefix: 'svc', start: 1, padding: 4 } }
  if (type === 'Contractor') return { mode: 'Dynamic', rule: { ...blankUsernameRule('prefix_incremental'), prefix: 'ctr', start: 1, padding: 4 } }
  if (type === 'External') return { mode: 'Dynamic', rule: blankUsernameRule('email') }
  return { mode: 'Dynamic', rule: blankUsernameRule('combination') }
}

// The employee types come from the lookup attached to the employee_type
// attribute, so a type added under Lookups gets a username rule of its own.
const defaultsMap = (list) => Object.fromEntries(list.map((t) => [t, defaultsFor(t)]))

export default function UsernameConfigPanel({ types: typesProp }) {
  const { toast } = useApp()
  const types = typesProp && typesProp.length ? typesProp : EMPLOYEE_TYPES
  const [cfg, setCfg] = useState(() => defaultsMap(types))
  const [type, setType] = useState(types[0])
  const DEFAULTS = useMemo(() => defaultsMap(types), [types])

  const current = cfg[type] || defaultsFor(type)
  const rule = current.rule
  const def = usernameRule(rule.type)
  const uses = (field) => !!def && def.fields.includes(field)

  const setMode = (mode) => setCfg((c) => ({ ...c, [type]: { ...(c[type] || defaultsFor(type)), mode } }))
  const setRule = (patch) => setCfg((c) => ({ ...c, [type]: { ...(c[type] || defaultsFor(type)), rule: { ...(c[type] || defaultsFor(type)).rule, ...patch } } }))
  // The shared separator is only the default for each attribute's trailing text:
  // the ones following it move with it, an override stays where it was put.
  const setSeparator = (next) => setRule({ separator: next, attributes: followSharedSeparator(rule.attributes || [], rule.separator, next) })
  const setRuleType = (id) => setCfg((c) => ({ ...c, [type]: { ...(c[type] || defaultsFor(type)), rule: { ...blankUsernameRule(id), ...(c[type] || defaultsFor(type)).rule, type: id } } }))

  const sample = useMemo(() => usernameSample(rule, SAMPLE_USER), [rule])
  const noMapping = current.mode === 'Dynamic' && uses('attributes') && (rule.attributes || []).length === 0
  const seqErrors = uses('attributes') ? validateSequence(rule.attributes) : {}
  const badAttr = Object.keys(seqErrors)[0]
  const incomplete = current.mode === 'Dynamic' && (
    (uses('prefix') && rule.type === 'prefix_incremental' && !String(rule.prefix).trim())
    || noMapping
    || !!badAttr
  )
  const mappingError = noMapping
    ? MSG.atleastOneMapping
    : badAttr
      ? `${(USERNAME_ATTRIBUTES.find((a) => a.value === badAttr) || {}).label || badAttr}: ${seqErrors[badAttr]}`
      : 'Fill in what the selected rule needs before saving.'

  /* Casing is a property of a username, so it is configured where usernames
     are configured. It sat under Settings → General, which is a screen about
     the tenant rather than about this rule, and an operator setting up how a
     username is built had no reason to look there for how it is folded. */
  const general = useSettingsSection('general')
  const setUppercase = (v) => {
    writeSection('general', { ...general, usernameUppercase: v })
    toast('ok', v ? 'Usernames folded to upper case' : 'Username casing preserved',
      v
        ? 'Every username is stored and matched in upper case from now on.'
        : 'Usernames keep the case they are created with.')
  }

  return (
    <div className="cfg-split">
      <Card
        title="Username creation"
        sub="Configured for each employee type. A type set to Manual is typed on the identity form; a dynamic type is derived by the rule below."
        footer={
          <span className="row" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button icon="refresh" onClick={() => { setCfg(DEFAULTS); toast('ok', 'Configuration reset', 'Username creation restored to platform defaults.') }}>Reset to defaults</Button>
            <Button
              variant="pri"
              icon="save"
              onClick={() => (incomplete
                // The platform's own wording, spelling included: an operator
                // searching for the message will find this screen.
                ? toast('bad', 'Configuration not saved', mappingError)
                : toast('ok', 'Username configuration saved', `${type} identities are now created ${current.mode === 'Manual' ? 'with a username typed on the form' : `as ${sample || '—'}`}.`))}
            >
              Save configuration
            </Button>
          </span>
        }
      >
        <div style={{ marginBottom: 14 }}>
          <Toggle
            title="Username uppercase"
            body="Applies to every employee type. Folds every username to upper case on creation and on sign-in, so DEV_AABHROY and dev_aabhroy are the same identity."
            badge={general.usernameUppercase ? 'Upper case' : 'As typed'}
            badgeTone={general.usernameUppercase ? 'acc' : undefined}
            checked={general.usernameUppercase}
            onChange={setUppercase}
          />
        </div>

        <Field label="Employee type" hint="Each type carries its own username rule." htmlFor="un-type">
          <Select id="un-type" value={type} options={types} onChange={(e) => setType(e.target.value)} />
        </Field>

        <div className="seg" role="radiogroup" aria-label="How the username is created" style={{ marginTop: 14 }}>
          {USERNAME_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={current.mode === m}
              data-on={current.mode === m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {current.mode === 'Manual' ? (
          <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
            <div>
              The username field is shown on the Add User form for {type} identities and the operator types it. Uniqueness is
              still checked against the directory before the identity is written.
            </div>
          </div>
        ) : (
          <>
            <div className="section-head" style={{ margin: '18px 0 8px' }}>
              <span className="section-title">Rule</span>
              <span className="section-sub">How the username is derived for {type} identities.</span>
            </div>

            <div className="cfg-rules">
              {USERNAME_RULES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="cfg-rule"
                  data-on={rule.type === r.id || undefined}
                  aria-pressed={rule.type === r.id}
                  onClick={() => setRuleType(r.id)}
                >
                  <span className="cfg-rule-t">{r.label}</span>
                  <span className="cfg-rule-s">{r.sub}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              {uses('prefix') && (
                <Field label="Prefix" required={rule.type === 'prefix_incremental'} hint="Fixed text the username starts with." htmlFor="un-prefix">
                  <TextInput id="un-prefix" className="mono" value={rule.prefix} placeholder="svc" onChange={(e) => setRule({ prefix: e.target.value })} />
                </Field>
              )}
              {uses('separator') && (
                <Field label="Separator" hint="Placed between each part." htmlFor="un-sep">
                  <Select id="un-sep" value={rule.separator} options={['_', '.', '-', '']} onChange={(e) => setSeparator(e.target.value)} />
                </Field>
              )}
              {uses('attributes') && (
                <AttributeSequenceEditor
                  id="un-attrs"
                  label="Attributes"
                  required
                  hint="Joined in the order selected."
                  value={rule.attributes}
                  options={USERNAME_ATTRIBUTES}
                  separator={rule.separator}
                  withSequence
                  onChange={(attributes) => setRule({ attributes })}
                />
              )}
              {uses('start') && (
                <Field label="Start from" hint="First number issued." htmlFor="un-start">
                  <TextInput id="un-start" type="number" min="0" value={rule.start} onChange={(e) => setRule({ start: Number(e.target.value) })} />
                </Field>
              )}
              {uses('padding') && (
                <Field label="Number width" hint="Zero padded to this many digits." htmlFor="un-pad">
                  <TextInput id="un-pad" type="number" min="1" max="10" value={rule.padding} onChange={(e) => setRule({ padding: Number(e.target.value) })} />
                </Field>
              )}
              {uses('emailPart') && (
                <Field label="Use" span={2} hint="Whether the domain is kept." htmlFor="un-email">
                  <Select id="un-email" value={rule.emailPart} options={['Local part', 'Full address']} onChange={(e) => setRule({ emailPart: e.target.value })} />
                </Field>
              )}
            </div>

            {uses('stripCountryCode') && (
              <div className="row" style={{ marginTop: 14, gap: 10 }}>
                <Switch checked={rule.stripCountryCode} onChange={(v) => setRule({ stripCountryCode: v })} label="Drop the country code" />
                <span className="t-sm">Drop the country code and keep the last ten digits</span>
              </div>
            )}
            {uses('sequence') && (
              <div className="row" style={{ marginTop: 10, gap: 10 }}>
                <Switch checked={rule.sequence} onChange={(v) => setRule({ sequence: v })} label="Append a sequence" />
                <span className="t-sm">Append a sequence number so two identical combinations stay unique</span>
              </div>
            )}
          </>
        )}
      </Card>

      <div className="stack">
        <Card title="Live preview" sub={`Sample identity · ${SAMPLE_USER.firstName} ${SAMPLE_USER.lastName} (${SAMPLE_USER.empCode})`}>
          <div className="cfg-preview">
            <span className="t-xs t-mut">{type} username</span>
            <span className="cfg-preview-id mono">
              {current.mode === 'Manual' ? 'typed by the operator' : (sample || '—')}
            </span>
            <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {current.mode === 'Manual'
                ? <Pill tone="mut" dot>Manual</Pill>
                : <Pill tone={incomplete ? 'warn' : 'ok'} dot>{incomplete ? 'Rule incomplete' : def.label}</Pill>}
            </span>
          </div>
        </Card>

        <Card title="Every employee type" sub="What each type is configured to do">
          <KeyValue
            cols={1}
            rows={types.map((t) => ({
              k: t,
              icon: cfg[t].mode === 'Manual' ? 'edit' : 'bolt',
              node: cfg[t].mode === 'Manual'
                ? <Tag>Manual</Tag>
                : <span className="row" style={{ gap: 6 }}>
                  <Tag>{usernameRule(cfg[t].rule.type).label}</Tag>
                  <span className="mono t-xs t-mut">{usernameSample(cfg[t].rule, SAMPLE_USER)}</span>
                </span>,
            }))}
          />
        </Card>
      </div>
    </div>
  )
}
