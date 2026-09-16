import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import IconButton from '../../components/primitives/IconButton'
import StickyActions from '../../components/shell/StickyActions'
import {
  AUTH_TYPES, ENCRYPTION_ALGORITHMS, HTTP_METHODS, PROVIDER_TYPES, RESPONSE_CHECKS,
  SERIALIZERS, SIG_ALGORITHMS, SIG_SOURCES, SIG_TARGETS, SMS_TEMPLATE, TEMPLATE_CODES,
  TEMPLATE_TYPES, authFieldsFor, blankClient, blankProvider, blankSigInput, blankTemplate,
  checkFieldsFor, clientErrors, fromProviderDraft, fromTemplateDraft, isSignatureAuth,
  providerErrors, templateErrors, toProviderDraft,
} from './smsData'

/**
 * These were modal bodies, each with its own scroller and its own action bar
 * because the shared Modal owns a footer that closes on every press — which
 * cannot stay open when a draft fails validation.
 *
 * On a page none of that applies: the page scrolls, and the actions dock at
 * the bottom of the viewport the way every other record editor's do.
 */
function FormShell({ children, saveLabel, onSave, onCancel, dirty = true, message }) {
  return (
    <>
      <div className="sms-form">
        <div className="sms-form-b">{children}</div>
      </div>
      <StickyActions dirty={dirty} message={message}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={onSave}>{saveLabel}</Button>
      </StickyActions>
    </>
  )
}

function Section({ icon, title, children }) {
  return (
    <section className="sms-fs">
      <h3 className="sms-fs-h"><Icon name={icon} size={13} />{title}</h3>
      <div className="stack">{children}</div>
    </section>
  )
}

// A qualifier that belongs beside the label rather than under the control: it
// tells you what to type, not what the field means.
const label = (text, hint) => (hint ? <>{text}<span className="sms-lbl-hint">{hint}</span></> : text)

/* Fields whose presence depends on the selected auth or detection method are
   described as data in smsData, so the two lists cannot drift from the
   validation that reads the same table. */
function DynFields({ specs, draft, errors, onChange }) {
  if (!specs.length) return null
  return (
    <div className="grid grid-2">
      {specs.map((f) => (
        <Field
          key={f.key}
          label={label(f.label, f.labelHint)}
          required={f.required}
          error={errors[f.key]}
          span={f.span}
        >
          <TextInput
            className={f.mono ? 'mono' : ''}
            value={draft[f.key] || ''}
            placeholder={f.placeholder}
            autoComplete="off"
            onChange={(e) => onChange({ [f.key]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  )
}

/**
 * How a signature is computed and where it is put.
 *
 * The parts are hashed in the order they are listed, joined by the separator,
 * and the digest is written to the named field. Order matters and is not
 * recoverable from a set, so the rows are a list the operator arranges rather
 * than a bag of checkboxes; and each part names its source, because `content`
 * read from the payload and `content` after the serializer has rewritten it
 * are different strings that hash differently.
 */
function SignatureBuilder({ d, set, errors }) {
  const inputs = d.sigInputs && d.sigInputs.length ? d.sigInputs : [blankSigInput()]

  const write = (next) => set({ sigInputs: next })
  const patch = (i, p) => write(inputs.map((x, k) => (k === i ? { ...x, ...p } : x)))
  const add = () => write([...inputs, blankSigInput()])
  // The list never empties: a signature with no inputs is not a state worth
  // being able to reach, and an empty list gives nothing to type into.
  const drop = (i) => write(inputs.length === 1 ? [blankSigInput()] : inputs.filter((_, k) => k !== i))
  const move = (i, by) => {
    const to = i + by
    if (to < 0 || to >= inputs.length) return
    const next = [...inputs]
    const [row] = next.splice(i, 1)
    next.splice(to, 0, row)
    write(next)
  }

  return (
    <div className="sig">
      <Banner tone="info">
        Signature is computed at runtime from the configured inputs and injected into the payload or headers
        before serialization.
      </Banner>

      <div className="grid grid-2">
        <Field label="Algorithm" hint="The digest this binding signs with.">
          <Select value={d.auth} options={SIG_ALGORITHMS} onChange={(e) => set({ auth: e.target.value })} />
        </Field>
        <Field label={label('Separator', 'between inputs')}>
          <TextInput
            className="mono"
            value={d.sigSeparator}
            placeholder={'default: "" (concatenate)'}
            onChange={(e) => set({ sigSeparator: e.target.value })}
          />
        </Field>
        <Field label={label('Output Field Name', 'e.g. key, signature')} required error={errors.sigOutputField}>
          <TextInput
            className="mono"
            value={d.sigOutputField}
            placeholder="key"
            onChange={(e) => set({ sigOutputField: e.target.value })}
          />
        </Field>
        <Field label="Output Target" hint="Where the computed digest is written.">
          <Select value={d.sigOutputTarget} options={SIG_TARGETS} onChange={(e) => set({ sigOutputTarget: e.target.value })} />
        </Field>
      </div>

      <div className="sig-inputs">
        <div className="sig-inputs-h">
          <span className="sig-inputs-t">{label('Hash Inputs', 'concatenated in order')}</span>
          <Button size="sm" variant="pri" icon="plus" onClick={add}>Add Input</Button>
        </div>
        {errors.sigInputs && <div className="sig-err" role="alert"><Icon name="warn" size={12} />{errors.sigInputs}</div>}
        <div className="sig-rows">
          {inputs.map((row, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="sig-row" key={i}>
              <span className="sig-row-n mono">{i + 1}</span>
              <Select
                value={row.source}
                options={SIG_SOURCES}
                onChange={(e) => patch(i, { source: e.target.value })}
              />
              <TextInput
                className="mono"
                value={row.field}
                placeholder={row.source === 'STATIC' ? 'literal value' : 'field name (e.g. content)'}
                onChange={(e) => patch(i, { field: e.target.value })}
              />
              <span className="sig-row-a">
                <IconButton size="sm" icon="arrowUp" label={`Move input ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)} />
                <IconButton size="sm" icon="arrowDown" label={`Move input ${i + 1} later`} disabled={i === inputs.length - 1} onClick={() => move(i, 1)} />
                <IconButton size="sm" icon="trash" className="sig-row-del" label={`Remove input ${i + 1}`} onClick={() => drop(i)} />
              </span>
            </div>
          ))}
        </div>
        {/* What the gateway will actually be handed, spelled out — the one
            thing an operator cannot infer from four separate controls. */}
        <div className="sig-preview">
          <span className="sig-preview-k">Signed string</span>
          <span className="sig-preview-v mono">
            {inputs.filter((x) => x.field.trim()).map((x) => `{${x.field.trim()}}`).join(d.sigSeparator || '') || '(nothing to hash)'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ProviderForm({ record, onSave, onCancel }) {
  const { toast } = useApp()
  // A new provider starts with the algorithm pre-filled but encryption off, so
  // the draft is only derived from a record when there is one to derive from.
  const [d, setD] = useState(() => (record ? toProviderDraft(record) : blankProvider()))
  const [errors, setErrors] = useState({})
  const set = (patch) => setD((p) => ({ ...p, ...patch }))

  const submit = () => {
    const next = providerErrors(d)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(fromProviderDraft(d))
  }

  return (
    <FormShell saveLabel="Save Provider" onSave={submit} onCancel={onCancel}>
      <Section icon="info" title="Basic info">
        <div className="grid grid-2">
          <Field label="Provider Code" required error={errors.code}>
            <TextInput className="mono" value={d.code} placeholder="e.g. BESCOM" onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Provider Name" required error={errors.name}>
            <TextInput value={d.name} placeholder="e.g. BESCOM HMAC Gateway" onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section icon="bolt" title="Runtime engine">
        <Field label="Provider Type" required error={errors.type}>
          <Select value={d.type} options={PROVIDER_TYPES} onChange={(e) => set({ type: e.target.value })} />
        </Field>
        <div className="grid grid-2">
          <Field label="Serializer Type">
            <Select value={d.serializer} options={SERIALIZERS} onChange={(e) => set({ serializer: e.target.value })} />
          </Field>
          <Field label="HTTP Method">
            <Select value={d.method} options={HTTP_METHODS} onChange={(e) => set({ method: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-2">
          <Field label={label('Timeout', 'ms')}>
            <TextInput type="number" min="0" value={d.timeout} onChange={(e) => set({ timeout: e.target.value })} />
          </Field>
          <Field label={label('Retry Count', '0 = no retries')}>
            <TextInput type="number" min="0" value={d.retries} onChange={(e) => set({ retries: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section icon="key" title="Authentication">
        <Field label="Auth Type" required error={errors.auth}>
          <Select value={d.auth} options={AUTH_TYPES} onChange={(e) => set({ auth: e.target.value })} />
        </Field>
        {d.auth !== 'NONE' && (
          <Banner tone="warn">
            Key is resolved from <code className="code">process.env[ref]</code> — never stored in the database.
          </Banner>
        )}
        <DynFields specs={authFieldsFor(d.auth)} draft={d} errors={errors} onChange={set} />
        {isSignatureAuth(d.auth) && <SignatureBuilder d={d} set={set} errors={errors} />}
      </Section>

      <Section icon="lock" title="Payload encryption">
        <div className="sms-enc" data-on={d.encryptionOn}>
          <Check checked={d.encryptionOn} onChange={(v) => set({ encryptionOn: v })} label="Enable payload encryption" />
          <span className="sms-enc-l">Enable Payload Encryption</span>
          {d.encryptionOn && <Pill tone="acc">ACTIVE</Pill>}
        </div>
        {d.encryptionOn && (
          <>
            <Banner tone="info">
              JSON payload is encrypted then sent as <code className="code">text/plain</code>. Content-Type is overridden automatically.
            </Banner>
            <div className="grid grid-2">
              <Field label="Algorithm" required error={errors.encryption}>
                <Select value={d.encryption} options={ENCRYPTION_ALGORITHMS} onChange={(e) => set({ encryption: e.target.value })} />
              </Field>
              <Field label={label('Key Env Ref', 'env var name')} required error={errors.encryptionKeyRef}>
                <TextInput className="mono" value={d.encryptionKeyRef} placeholder="e.g. UPCL_AES_KEY" autoComplete="off" onChange={(e) => set({ encryptionKeyRef: e.target.value })} />
              </Field>
            </div>
          </>
        )}
      </Section>

      <Section icon="checkC" title="Response success detection">
        <Field label="Success Detection Method" required error={errors.responseCheck}>
          <Select value={d.responseCheck} options={RESPONSE_CHECKS} onChange={(e) => set({ responseCheck: e.target.value })} />
        </Field>
        <DynFields specs={checkFieldsFor(d.responseCheck)} draft={d} errors={errors} onChange={set} />
        <Field label={label('Message ID Field', 'optional — field to extract as messageId')}>
          <TextInput className="mono" value={d.messageIdField} placeholder="e.g. msgId, messageId, id" onChange={(e) => set({ messageIdField: e.target.value })} />
        </Field>
      </Section>
    </FormShell>
  )
}

/**
 * `linkHolder` is the template that carries the password creation link today,
 * excluding this one. The form cannot see the register, but it is the only
 * place the operator can be warned before the role is taken off another
 * template — a toast after the fact is too late to reconsider.
 */
export function TemplateForm({ record, providers, linkHolder, onSave, onCancel }) {
  const { toast } = useApp()
  const [d, setD] = useState(() => ({ ...blankTemplate(providers[0] ? providers[0].code : ''), ...record }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setD((p) => ({ ...p, ...patch }))
  const isSms = d.type === SMS_TEMPLATE
  // Held before this edit: the warning about giving the role up is only honest
  // if the record actually had it when the form opened.
  const heldOnOpen = !!(record && record.passwordCreationLinkSms)

  const submit = () => {
    const next = templateErrors(d)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(fromTemplateDraft(d))
  }

  return (
    <FormShell saveLabel="Save Template" onSave={submit} onCancel={onCancel}>
      <div className="grid grid-2">
        <Field label="Provider" required error={errors.provider}>
          <Select value={d.provider} placeholder="Select a provider" options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
        </Field>
        <Field label="Template Code" required error={errors.code}>
          <Select value={d.code} options={TEMPLATE_CODES} onChange={(e) => set({ code: e.target.value })} />
        </Field>
      </div>
      <Field label="Template Name" required error={errors.name}>
        <TextInput value={d.name} placeholder="e.g. OTP SMS" onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field
        label="Template Type"
        required
        error={errors.type}
        hint="An OTP template carries a one-time code. An SMS template carries any other message, including a password creation link."
      >
        <Select value={d.type} options={TEMPLATE_TYPES} onChange={(e) => set({ type: e.target.value })} />
      </Field>
      {heldOnOpen && !isSms && (
        <Banner tone="warn">
          This template carries password creation links today. Saving it as an OTP template gives up that role,
          and no template will carry the link until one is switched on.
        </Banner>
      )}
      {isSms && (
        <Field
          label="Send Password Creation Link by SMS"
          hint="The link a new identity uses to set a password is sent with this template. Only one template can hold the role."
        >
          <div className="sms-tog" data-on={d.passwordCreationLinkSms}>
            <span className="sms-tog-l">
              {d.passwordCreationLinkSms
                ? 'Password creation links use this template.'
                : 'Password creation links do not use this template.'}
            </span>
            <Switch
              checked={d.passwordCreationLinkSms}
              label="Send password creation link by SMS"
              onChange={(v) => set({ passwordCreationLinkSms: v })}
            />
          </div>
        </Field>
      )}
      {isSms && d.passwordCreationLinkSms && linkHolder && (
        <Banner tone="warn">
          {linkHolder.name} on {linkHolder.provider} carries password creation links today. Saving moves the role
          to this template, and that one stops sending the link.
        </Banner>
      )}
      <div className="grid grid-2">
        <Field label="API URL" required error={errors.apiUrl} span={2}>
          <TextInput className="mono" value={d.apiUrl} placeholder="https://provider.com/api/send" onChange={(e) => set({ apiUrl: e.target.value })} />
        </Field>
        <Field label="HTTP Method">
          <Select value={d.method} options={HTTP_METHODS} onChange={(e) => set({ method: e.target.value })} />
        </Field>
      </div>
      <Field label={label('Headers', 'JSON — use {{token}} for token injection')} required error={errors.headers}>
        <TextInput as="textarea" rows={4} className="mono" value={d.headers} onChange={(e) => set({ headers: e.target.value })} />
      </Field>
      <Field label={label('Payload Structure', 'JSON — use {{fieldName}} as placeholders')} required error={errors.payload}>
        <TextInput as="textarea" rows={6} className="mono" value={d.payload} onChange={(e) => set({ payload: e.target.value })} />
      </Field>
      <Banner tone="info">
        For HMAC providers, leave the computed field (e.g. <code className="code">"key": ""</code>) in the payload
        structure. The AuthenticationStage will overwrite it at runtime. For encrypted providers, configure plain
        JSON — encryption is applied automatically.
      </Banner>
    </FormShell>
  )
}

export function ClientForm({ record, providers, onSave, onCancel }) {
  const { toast } = useApp()
  const [d, setD] = useState(() => ({ ...blankClient(providers[0] ? providers[0].code : ''), ...record }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setD((p) => ({ ...p, ...patch }))

  const submit = () => {
    const next = clientErrors(d)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(d)
  }

  return (
    <FormShell saveLabel="Save Client" onSave={submit} onCancel={onCancel}>
      <Field label="Client Code" required error={errors.code}>
        <TextInput className="mono" value={d.code} placeholder="e.g. BESCOM" onChange={(e) => set({ code: e.target.value })} />
      </Field>
      <Field label="Client Name" required error={errors.name}>
        <TextInput value={d.name} placeholder="e.g. Bangalore Electricity Supply Company" onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Provider" required error={errors.provider}>
        <Select value={d.provider} placeholder="Select a provider" options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
      </Field>
    </FormShell>
  )
}
