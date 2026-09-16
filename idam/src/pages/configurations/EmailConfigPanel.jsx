import { useMemo, useState } from 'react'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import { SAMPLE_USER, USERNAME_ATTRIBUTES, USERNAME_MODES, emailSample } from './generation'
import { EMPLOYEE_TYPES } from './EmployeeTypePanel'
import AttributeSequenceEditor from './AttributeSequenceEditor'
import { followSharedSeparator, normaliseSequence, validateSequence } from './rules'

const DOMAINS = ['tanflow.co.in', 'tanflow.com', 'contractors.tanflow.co.in', 'partners.tanflow.co.in']
const CASE_MODES = ['lowercase', 'As entered']

// Email follows the same manual-or-dynamic shape as the username, but there is
// only one dynamic rule: a prefix, one or more attribute values, and the domain.
// Each attribute carries its own settings (rules.js); email has no sequence
// anchor, so the entries have no sequence_with.
const SEQ = { withSequence: false }
const blankRule = () => ({
  prefix: '',
  attributes: normaliseSequence(['firstName', 'lastName'], '.', SEQ),
  separator: '.',
  domain: DOMAINS[0],
  caseMode: 'lowercase',
})

const defaultsFor = (type) => {
  if (type === 'Contractor') return { mode: 'Dynamic', rule: { ...blankRule(), domain: 'contractors.tanflow.co.in' } }
  if (type === 'External') return { mode: 'Manual', rule: { ...blankRule(), domain: 'partners.tanflow.co.in' } }
  if (type === 'Service Account') return { mode: 'Dynamic', rule: { ...blankRule(), prefix: 'svc', attributes: normaliseSequence(['empCode'], '.', SEQ) } }
  return { mode: 'Dynamic', rule: blankRule() }
}

// As with usernames, the type list is the employee_type lookup's options.
const defaultsMap = (list) => Object.fromEntries(list.map((t) => [t, defaultsFor(t)]))

export default function EmailConfigPanel({ types: typesProp }) {
  const { toast } = useApp()
  const types = typesProp && typesProp.length ? typesProp : EMPLOYEE_TYPES
  const DEFAULTS = useMemo(() => defaultsMap(types), [types])
  const [cfg, setCfg] = useState(() => defaultsMap(types))
  const [type, setType] = useState(types[0])
  const [provisionMailbox, setProvisionMailbox] = useState(true)

  const current = cfg[type] || defaultsFor(type)
  const rule = current.rule
  const setMode = (mode) => setCfg((c) => ({ ...c, [type]: { ...(c[type] || defaultsFor(type)), mode } }))
  const setRule = (patch) => setCfg((c) => ({ ...c, [type]: { ...(c[type] || defaultsFor(type)), rule: { ...(c[type] || defaultsFor(type)).rule, ...patch } } }))

  const setSeparator = (next) => setRule({ separator: next, attributes: followSharedSeparator(rule.attributes || [], rule.separator, next) })

  const sample = useMemo(() => emailSample(rule, SAMPLE_USER), [rule])
  const seqErrors = validateSequence(rule.attributes)
  const badAttr = Object.keys(seqErrors)[0]
  const incomplete = current.mode === 'Dynamic' && (
    ((rule.attributes || []).length === 0 && !String(rule.prefix).trim())
    || !!badAttr
  )

  return (
    <div className="cfg-split">
      <Card
        title="Email creation"
        sub="Configured for each employee type. A type set to Manual has the address typed on the identity form; a dynamic type builds it from a prefix, attribute values and a domain."
        footer={
          <span className="row" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button icon="refresh" onClick={() => { setCfg(DEFAULTS); toast('ok', 'Configuration reset', 'Email creation restored to platform defaults.') }}>Reset to defaults</Button>
            <Button
              variant="pri"
              icon="save"
              disabled={incomplete}
              onClick={() => toast('ok', 'Email configuration saved', `${type} identities are now created ${current.mode === 'Manual' ? 'with an address typed on the form' : `as ${sample || '—'}`}.`)}
            >
              Save configuration
            </Button>
          </span>
        }
      >
        <Field label="Employee type" hint="Each type carries its own email rule." htmlFor="em-type">
          <Select id="em-type" value={type} options={types} onChange={(e) => setType(e.target.value)} />
        </Field>

        <div className="seg" role="radiogroup" aria-label="How the address is created" style={{ marginTop: 14 }}>
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
              The email field is shown on the Add User form for {type} identities and the operator types it. The address is
              still checked for uniqueness before the identity is written.
            </div>
          </div>
        ) : (
          <>
            <div className="section-head" style={{ margin: '18px 0 8px' }}>
              <span className="section-title">Rule</span>
              <span className="section-sub">Prefix, attribute values and domain, joined in that order.</span>
            </div>
            <div className="grid grid-2">
              <Field label="Prefix" hint="Fixed text the local part starts with. Leave blank for none." htmlFor="em-prefix">
                <TextInput id="em-prefix" className="mono" value={rule.prefix} placeholder="svc" onChange={(e) => setRule({ prefix: e.target.value })} />
              </Field>
              <Field label="Separator" hint="Placed between each part." htmlFor="em-sep">
                <Select id="em-sep" value={rule.separator} options={['.', '_', '-', '']} onChange={(e) => setSeparator(e.target.value)} />
              </Field>
              <AttributeSequenceEditor
                id="em-attrs"
                label="Attribute values"
                hint="Joined in the order selected."
                value={rule.attributes}
                options={USERNAME_ATTRIBUTES}
                separator={rule.separator}
                withSequence={false}
                onChange={(attributes) => setRule({ attributes })}
              />
              <Field label="Domain" required htmlFor="em-domain">
                <Select id="em-domain" value={rule.domain} options={DOMAINS} onChange={(e) => setRule({ domain: e.target.value })} />
              </Field>
              <Field label="Case handling" htmlFor="em-case">
                <Select id="em-case" value={rule.caseMode} options={CASE_MODES} onChange={(e) => setRule({ caseMode: e.target.value })} />
              </Field>
            </div>
          </>
        )}

        <div className="row" style={{ marginTop: 16, gap: 10 }}>
          <Switch checked={provisionMailbox} onChange={setProvisionMailbox} label="Provision a mailbox" />
          <span className="t-sm">Provision a mailbox on the mail connector when the identity is created</span>
        </div>
      </Card>

      <div className="stack">
        <Card title="Live preview" sub={`Sample identity · ${SAMPLE_USER.firstName} ${SAMPLE_USER.lastName} (${SAMPLE_USER.empCode})`}>
          <div className="cfg-preview">
            <span className="t-xs t-mut">{type} email</span>
            <span className="cfg-preview-id mono">
              {current.mode === 'Manual' ? 'typed by the operator' : (sample || '—')}
            </span>
            <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {current.mode === 'Manual'
                ? <Pill tone="mut" dot>Manual</Pill>
                : <Pill tone={incomplete ? 'warn' : 'ok'} dot>{incomplete ? 'Rule incomplete' : rule.domain}</Pill>}
            </span>
          </div>
        </Card>

        <Card title="Every employee type" sub="What each type is configured to do">
          <KeyValue
            cols={1}
            rows={types.map((t) => ({
              k: t,
              icon: cfg[t].mode === 'Manual' ? 'edit' : 'at',
              node: cfg[t].mode === 'Manual'
                ? <Tag>Manual</Tag>
                : <span className="mono t-xs t-mut">{emailSample(cfg[t].rule, SAMPLE_USER)}</span>,
            }))}
          />
        </Card>
      </div>
    </div>
  )
}
