import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import IconButton from '../../components/primitives/IconButton'
import StickyActions from '../../components/shell/StickyActions'
import {
  AUTH_TYPES, ENCRYPTION_ALGORITHMS, HTTP_METHODS, PROVIDER_TYPES, RESPONSE_CHECKS, SAMPLE_SEND,
  SERIALIZERS, SIG_ALGORITHMS, SIG_SOURCES, SIG_TARGETS, SMS_TEMPLATE, TEMPLATE_CODES,
  TEMPLATE_TYPES, authFieldsFor, authType, blankClient, blankProvider, blankSigInput, blankTemplate,
  checkFieldsFor, clientErrors, connectionTestLog, encryptionShort, fromProviderDraft,
  fromTemplateDraft, isSignatureAuth, previewBody, previewHeaders, previewRequestLine,
  providerErrors, providerType, resolveTokens, serializerShort, smsSegments, successRule,
  templateErrors, toProviderDraft, toggleStatus,
} from './smsData'

/**
 * These were modal bodies, each with its own scroller and its own action bar
 * because the shared Modal owns a footer that closes on every press — which
 * cannot stay open when a draft fails validation.
 *
 * On a page none of that applies: the page scrolls, and the actions dock at
 * the bottom of the viewport the way every other record editor's do. What the
 * shell adds is the frame the fields were missing: every group is a card with
 * a title and a line saying what the group decides, the way the email relay's
 * configuration is drawn, rather than bare controls on the canvas.
 */
function FormShell({ children, saveLabel, onSave, onCancel, dirty = true, message }) {
  return (
    <>
      <div className="sms-form">{children}</div>
      <StickyActions dirty={dirty} message={message}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={onSave}>{saveLabel}</Button>
      </StickyActions>
    </>
  )
}

/* A group inside a card, for the rare case where one card holds two questions
   that are not the same question. The card header carries the name of the
   group; this carries the name of the part.

   Exported because the health accordions reuse it: a client's panel has to be
   the same two sections, drawn the same way, as the default gateway's cards
   above it, and a second copy of this markup would stop being the same the
   first time either was edited. The heading row is always present so a section
   with a control and one without still line up. */
export function Section({ icon, title, actions, children }) {
  return (
    <section className="sms-fs">
      <div className="sms-fs-hr">
        <h3 className="sms-fs-h"><Icon name={icon} size={13} />{title}</h3>
        {actions && <div className="sms-fs-a">{actions}</div>}
      </div>
      <div className="stack">{children}</div>
    </section>
  )
}

// A qualifier that belongs beside the label rather than under the control: it
// tells you what to type, not what the field means.
const label = (text, hint) => (hint ? <>{text}<span className="sms-lbl-hint">{hint}</span></> : text)

/* A boolean that changes what the binding does, with the sentence that says
   what switching it costs. The checkbox carries the accessible name and the
   sentence beside it is text, not a second control — which is what the
   encryption row got wrong when it drew its own label next to a labelled
   checkbox. */
function SwitchRow({ on, title, body, badge, onChange }) {
  return (
    <div className="sms-sw" data-on={on}>
      <Check checked={on} onChange={onChange} label={title} />
      <span className="sms-sw-m">
        <span className="sms-sw-t">{title}</span>
        <span className="sms-sw-s">{body}</span>
      </span>
      {badge}
    </div>
  )
}

/* A labelled block of computed text — a request line, a set of headers, a
   body. Read, never typed, so it is set in the mono face at the field's own
   label size rather than dressed up as an input. */
function CodeBlock({ title, children }) {
  return (
    <div className="sms-blk">
      <span className="sms-blk-k">{title}</span>
      <pre className="sms-code">{children}</pre>
    </div>
  )
}

/* Fields whose presence depends on the selected auth or detection method are
   described as data in smsData, so the two lists cannot drift from the
   validation that reads the same table.

   `cols` is one where the group sits in a card that is itself half the width:
   the page's two-column grid only folds below 960px, so a two-column group
   nested inside a two-column card spends the 960-1200px range squeezing an
   environment variable name into 150 pixels. */
function DynFields({ specs, draft, errors, onChange, cols = 2 }) {
  if (!specs.length) return null
  return (
    <div className={cols === 1 ? 'stack' : 'grid grid-2'}>
      {specs.map((f) => (
        <Field
          key={f.key}
          label={label(f.label, f.labelHint)}
          required={f.required}
          error={errors[f.key]}
          span={cols === 1 ? undefined : f.span}
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

  const signed = inputs.filter((x) => x.field.trim()).map((x) => `{${x.field.trim()}}`).join(d.sigSeparator || '')
  const target = String(d.sigOutputTarget || 'PAYLOAD').toLowerCase()
  const outField = String(d.sigOutputField || '').trim() || 'signature'
  // The digest is the auth type, so its readable name comes off the same list
  // the algorithm control is drawn from rather than out of the auth register.
  const algo = (SIG_ALGORITHMS.find((a) => a.value === d.auth) || {}).label || d.auth

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
        {/* The rows are three unlabelled controls in a line, and which is which
            is not guessable from a select full of sources. The captions run
            once above the list rather than on every row. */}
        <div className="sig-head" aria-hidden="true">
          <span className="sig-row-n">#</span>
          <span>Source</span>
          <span>Field name or literal value</span>
          <span className="sig-head-a">Order</span>
        </div>
        <div className="sig-rows">
          {inputs.map((row, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className="sig-row" key={i}>
              <span className="sig-row-n mono">{i + 1}</span>
              <Select
                value={row.source}
                options={SIG_SOURCES}
                aria-label={`Input ${i + 1} source`}
                onChange={(e) => patch(i, { source: e.target.value })}
              />
              <TextInput
                className="mono"
                value={row.field}
                aria-label={`Input ${i + 1} field or value`}
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
            thing an operator cannot infer from four separate controls. The
            string that is hashed, then where the digest of it ends up. */}
        <div className="sig-preview">
          <span className="sig-preview-k">Signed string</span>
          <span className="sig-preview-v mono">{signed || '(nothing to hash)'}</span>
        </div>
        <div className="sig-preview">
          <span className="sig-preview-k">Digest lands in</span>
          <span className="sig-preview-v mono">{algo} → {target}.{outField}</span>
        </div>
      </div>
    </div>
  )
}

/* The seeded send, drawn the way a handset draws it. A provider binding is
   read as transport, and it is easy to sign off on one without ever picturing
   the text that arrives — including whether it is one message or two, which is
   what the carrier bills. */
function MessagePreview() {
  const seg = smsSegments(SAMPLE_SEND.message)
  return (
    <div className="sms-phone">
      <span className="sms-phone-from">{SAMPLE_SEND.sender} · to {SAMPLE_SEND.to}</span>
      <p className="sms-bubble">{SAMPLE_SEND.message}</p>
      <div className="sms-phone-f">
        <span><b className="num">{seg.chars}</b> characters</span>
        <span><b className="num">{seg.segments}</b> {seg.segments === 1 ? 'segment' : 'segments'}</span>
        <span>{seg.encoding} · {seg.single} per segment</span>
      </div>
    </div>
  )
}

export function ProviderForm({ record, onSave, onCancel, onStatusChange }) {
  const { toast } = useApp()
  // A new provider starts with the algorithm pre-filled but encryption off, so
  // the draft is only derived from a record when there is one to derive from.
  const [d, setD] = useState(() => (record ? toProviderDraft(record) : blankProvider()))
  const [errors, setErrors] = useState({})
  // Session-local, like the email relay's handshake: a test proves the draft in
  // hand, so it is not carried with the record.
  const [testLog, setTestLog] = useState(null)
  const set = (patch) => setD((p) => ({ ...p, ...patch }))

  const active = d.status === 'Active'

  /* Status is not a draft field waiting on Save. The record page above this
     form draws its own pill from the *stored* provider and its header is
     sticky, so a status held in the draft would leave two pills on screen
     contradicting each other from the press until the save. It is committed
     the moment it is pressed — to the store and the draft together, the way
     the email relay does it — which is also what the register's kebab does,
     so both entry points mean the same thing. */
  const flipStatus = () => {
    const status = toggleStatus(d.status)
    set({ status })
    if (onStatusChange) onStatusChange(status)
  }

  const submit = () => {
    const next = providerErrors(d)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(fromProviderDraft(d))
  }

  const runTest = () => {
    setTestLog(connectionTestLog(d))
    toast(
      active ? 'ok' : 'warn',
      active ? 'Gateway reachable' : 'Provider inactive',
      active
        ? `${d.method} · ${serializerShort(d.serializer)} · ${d.auth === 'NONE' ? 'no auth' : authType(d.auth).short}`
        : 'The binding answers, but an inactive provider dispatches nothing.',
    )
  }

  return (
    <FormShell
      saveLabel="Save Provider"
      onSave={submit}
      onCancel={onCancel}
      message={record ? `Editing ${record.code} · saving replaces the stored binding` : 'New gateway binding'}
    >
      <Card
        title="Provider identity"
        sub="The code templates and clients point at, and the name this gateway is known by."
        actions={(
          <>
            <Pill tone={active ? 'ok' : 'mut'} dot>{d.status}</Pill>
            <Button
              size="sm"
              icon={active ? 'ban' : 'checkC'}
              onClick={flipStatus}
            >
              {active ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        )}
      >
        <div className="grid grid-2">
          <Field label="Provider Code" required error={errors.code} hint="Letters, digits and underscores. Templates and clients refer to the gateway by this code.">
            <TextInput className="mono" value={d.code} placeholder="e.g. BESCOM" autoComplete="off" onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Provider Name" required error={errors.name} hint="Read by an operator in the register and on the health page.">
            <TextInput value={d.name} placeholder="e.g. BESCOM HMAC Gateway" onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card
        title="Routing"
        sub="Which engine builds the request, how the body is serialised, and how long the platform waits before it gives up."
      >
        <div className="stack">
          <Field
            label="Provider Type"
            required
            error={errors.type}
            hint={`${providerType(d.type).label}: ${d.type === 'ENCRYPTED_PAYLOAD'
              ? 'the body is encrypted before it is sent, whatever the serializer says.'
              : d.type === 'GENERIC_JSON'
                ? 'the payload is posted exactly as the template writes it.'
                : 'the platform builds the request from the template and the fields below.'}`}
          >
            <Select value={d.type} options={PROVIDER_TYPES} onChange={(e) => set({ type: e.target.value })} />
          </Field>
          <div className="grid grid-2">
            <Field label="Serializer Type" hint="Sets the Content-Type, unless payload encryption overrides it.">
              <Select value={d.serializer} options={SERIALIZERS} onChange={(e) => set({ serializer: e.target.value })} />
            </Field>
            <Field label="HTTP Method">
              <Select value={d.method} options={HTTP_METHODS} onChange={(e) => set({ method: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-2">
            <Field label={label('Timeout', 'ms')} hint="A gateway that has not answered by then counts as a failure.">
              <TextInput type="number" min="0" className="num" value={d.timeout} onChange={(e) => set({ timeout: e.target.value })} />
            </Field>
            <Field label={label('Retry Count', '0 = no retries')} hint="Applied only to a transport failure, never to a rejection the gateway spelled out.">
              <TextInput type="number" min="0" className="num" value={d.retries} onChange={(e) => set({ retries: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Credentials are kept away from routing on purpose: the two are changed
          by different people for different reasons, and a secret rotation
          should never require reading a timeout. */}
      <Card
        title="Credentials"
        sub="How the gateway is told the request is ours. No secret is stored here — a key is named by the environment variable that holds it."
      >
        <div className="stack">
          <Field
            label="Auth Type"
            required
            error={errors.auth}
            hint="The bracketed prefix says what you have to supply: a static key, a token, a credential pair, or a signing secret."
          >
            <Select value={d.auth} options={AUTH_TYPES} onChange={(e) => set({ auth: e.target.value })} />
          </Field>
          {d.auth === 'NONE' ? (
            <Banner tone="warn">
              The gateway accepts anonymous posts. Leave this only for an endpoint reachable solely on the private network.
            </Banner>
          ) : (
            <Banner tone="info">
              Key is resolved from <code className="code">process.env[ref]</code> — never stored in the database.
            </Banner>
          )}
          <DynFields specs={authFieldsFor(d.auth)} draft={d} errors={errors} onChange={set} />
          {isSignatureAuth(d.auth) && (
            <Section icon="key" title="Signature">
              <SignatureBuilder d={d} set={set} errors={errors} />
            </Section>
          )}
        </div>
      </Card>

      <div className="grid grid-2">
        <Card
          title="Payload encryption"
          sub="For a gateway that takes ciphertext rather than a readable body."
        >
          <div className="stack">
            <SwitchRow
              on={d.encryptionOn}
              title="Enable payload encryption"
              body="The JSON body is encrypted and posted as text/plain. The Content-Type is overridden automatically."
              badge={d.encryptionOn ? <Pill tone="acc">Active</Pill> : null}
              onChange={(v) => set({ encryptionOn: v })}
            />
            {d.encryptionOn ? (
              <div className="stack">
                <Field label="Algorithm" required error={errors.encryption}>
                  <Select value={d.encryption} options={ENCRYPTION_ALGORITHMS} onChange={(e) => set({ encryption: e.target.value })} />
                </Field>
                <Field label={label('Key Env Ref', 'env var name')} required error={errors.encryptionKeyRef}>
                  <TextInput className="mono" value={d.encryptionKeyRef} placeholder="e.g. UPCL_AES_KEY" autoComplete="off" onChange={(e) => set({ encryptionKeyRef: e.target.value })} />
                </Field>
              </div>
            ) : (
              <p className="t-sm t-mut">
                Bodies leave as {serializerShort(d.serializer)}. Transport security is still whatever the endpoint's
                own scheme provides.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Response success detection"
          sub="A gateway that answers 200 with a failure in the body is common enough that the status code alone cannot decide."
        >
          <div className="stack">
            <Field label="Success Detection Method" required error={errors.responseCheck}>
              <Select value={d.responseCheck} options={RESPONSE_CHECKS} onChange={(e) => set({ responseCheck: e.target.value })} />
            </Field>
            <DynFields specs={checkFieldsFor(d.responseCheck)} draft={d} errors={errors} onChange={set} cols={1} />
            <Field
              label={label('Message ID Field', 'optional')}
              hint="The field to lift out of the answer and record against the message in the delivery log."
            >
              <TextInput className="mono" value={d.messageIdField} placeholder="e.g. msgId, messageId, id" onChange={(e) => set({ messageIdField: e.target.value })} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Message preview" sub="A sample send, as the recipient's handset renders it">
          <MessagePreview />
        </Card>

        <Card
          title="Connection test"
          sub="Negotiates and authenticates without handing over a message"
          actions={<Button size="sm" icon="activity" onClick={runTest}>Run test</Button>}
        >
          {testLog ? (
            <div className="log-view">
              {/* eslint-disable-next-line react/no-array-index-key */}
              {testLog.map((l, i) => <div className={`lg-${l.tone}`} key={i}>{l.text}</div>)}
            </div>
          ) : (
            <p className="t-sm t-mut">
              No test has been run in this session. The test reads the draft above, so it answers for the
              settings on screen rather than the stored binding.
            </p>
          )}
        </Card>
      </div>

      {/* The request, assembled. Five groups of controls decide one HTTP call
          between them, and no single group says what the call looks like. */}
      <Card
        title="Outbound request"
        sub="What this binding hands the gateway, built from the settings above. The endpoint itself belongs to the template."
      >
        <div className="stack">
          <div className="sms-prev">
            <CodeBlock title="Request line and headers">
              {[previewRequestLine(d), ...previewHeaders(d).map(([k, v]) => `${k}: ${v}`)].join('\n')}
            </CodeBlock>
            <CodeBlock title={d.encryptionOn ? `Body · ${encryptionShort(d.encryption)}` : `Body · ${serializerShort(d.serializer)}`}>
              {previewBody(d)}
            </CodeBlock>
          </div>
          <Banner tone="info">{successRule(d)}</Banner>
        </div>
      </Card>
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
  const bound = providers.find((p) => p.code === d.provider) || null

  const submit = () => {
    const next = templateErrors(d)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave(fromTemplateDraft(d))
  }

  return (
    <FormShell
      saveLabel="Save Template"
      onSave={submit}
      onCancel={onCancel}
      message={record ? `Editing ${record.code} · saving replaces the stored template` : 'New template'}
    >
      <Card
        title="Template identity"
        sub="Which gateway carries it, which event it answers, and what kind of body it holds."
      >
        <div className="stack">
          <div className="grid grid-2">
            <Field label="Provider" required error={errors.provider} hint={bound ? `${bound.name} · ${providerType(bound.type).label}` : 'The gateway this template posts through.'}>
              <Select value={d.provider} placeholder="Select a provider" options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
            </Field>
            <Field label="Template Code" required error={errors.code} hint="The event the send pipeline looks this template up by.">
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
        </div>
      </Card>

      <Card title="Endpoint" sub="Where the rendered message is posted.">
        <div className="stack">
          <div className="grid grid-2">
            <Field label="API URL" required error={errors.apiUrl} span={2}>
              <TextInput className="mono" value={d.apiUrl} placeholder="https://provider.com/api/send" onChange={(e) => set({ apiUrl: e.target.value })} />
            </Field>
            <Field label="HTTP Method">
              <Select value={d.method} options={HTTP_METHODS} onChange={(e) => set({ method: e.target.value })} />
            </Field>
          </div>
          <CodeBlock title="Request line">{`${d.method} ${d.apiUrl || '(no endpoint yet)'}`}</CodeBlock>
        </div>
      </Card>

      {/* Headers and payload sit side by side because they are read together:
          a token injected into a header has to match the field the payload
          leaves empty for it. */}
      <Card
        title="Request"
        sub="Sent verbatim, with every {{placeholder}} substituted at send time."
      >
        <div className="stack">
          <div className="grid grid-2">
            <Field label={label('Headers', 'JSON — use {{token}} for token injection')} required error={errors.headers}>
              <TextInput as="textarea" rows={8} className="mono" value={d.headers} onChange={(e) => set({ headers: e.target.value })} />
            </Field>
            <Field label={label('Payload Structure', 'JSON — use {{fieldName}} as placeholders')} required error={errors.payload}>
              <TextInput as="textarea" rows={8} className="mono" value={d.payload} onChange={(e) => set({ payload: e.target.value })} />
            </Field>
          </div>
          {/* The JSON in the field is never the JSON that leaves, so the
              substituted version is shown against a seeded send. */}
          <CodeBlock title="Payload with a sample send substituted">{resolveTokens(d.payload)}</CodeBlock>
          <Banner tone="info">
            For HMAC providers, leave the computed field (e.g. <code className="code">"key": ""</code>) in the payload
            structure. The AuthenticationStage will overwrite it at runtime. For encrypted providers, configure plain
            JSON — encryption is applied automatically.
          </Banner>
        </div>
      </Card>
    </FormShell>
  )
}

/* ---------------------------------------------------------------------------
   The client editor.

   A client is three fields, and three fields never justified a page of their
   own: opening one replaced the register the operator was reading, and closing
   it put them back at the top of it. It is a drawer now — the register stays
   behind it, and a save lands in the row that is already on screen.
   --------------------------------------------------------------------------- */

/** The fields themselves, so the drawer body and its validation stay one thing. */
function ClientFields({ d, set, errors, providers }) {
  const bound = providers.find((p) => p.code === d.provider) || null

  return (
    <div className="stack">
      <Banner tone="info">
        A client routes one caller's traffic through a gateway. The code is what the caller sends; the provider
        is where that traffic goes.
      </Banner>

      {/* One column rather than two: the drawer is a fixed 35rem whatever the
          viewport is, and a pair of half-width inputs inside it is narrower
          than either field deserves. */}
      <Field label="Client Code" required error={errors.code} hint="Quoted by the caller on every request.">
        <TextInput className="mono" value={d.code} placeholder="e.g. BESCOM" autoComplete="off" onChange={(e) => set({ code: e.target.value })} />
      </Field>
      <Field label="Client Name" required error={errors.name}>
        <TextInput value={d.name} placeholder="e.g. Bangalore Electricity Supply Company" onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Provider" required error={errors.provider} hint="Every message this client sends leaves through this gateway.">
        <Select value={d.provider} placeholder="Select a provider" options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
      </Field>

      {/* What was chosen, read back. A provider code says nothing about what
          that gateway does, and the choice is the whole point of the record. */}
      {bound && (
        <Section icon="server" title="Routes through">
          <KeyValue
            dense
            cols={2}
            rows={[
              { k: 'Gateway', icon: 'server', v: bound.name },
              {
                k: 'Engine',
                icon: 'bolt',
                v: `${providerType(bound.type).label} · ${serializerShort(bound.serializer)}`,
              },
              {
                k: 'Auth',
                icon: 'key',
                v: bound.auth && bound.auth !== 'NONE' ? authType(bound.auth).short : 'None',
              },
              {
                k: 'Status',
                icon: 'activity',
                node: <Pill tone={bound.status === 'Active' ? 'ok' : 'mut'} dot>{bound.status}</Pill>,
              },
            ]}
          />
          {bound.status !== 'Active' && (
            <Banner tone="warn">
              {bound.code} is inactive, so nothing this client sends will be dispatched until the gateway is switched on.
            </Banner>
          )}
        </Section>
      )}
    </div>
  )
}

/**
 * The drawer body.
 *
 * The draft lives here rather than in the drawer configuration so that typing
 * re-renders this subtree and nothing else: re-raising the drawer on every
 * keystroke would re-run the shell's focus trap and take the caret out of the
 * field being typed into. The footer sits outside this subtree, so it is given
 * a handle to call instead — assigned on each render, which is the only way it
 * can see the draft as it stands now.
 */
function ClientDrawerBody({ handle, record, providers, onCommit, onInvalid }) {
  const [d, setD] = useState(() => ({ ...blankClient(providers[0] ? providers[0].code : ''), ...record }))
  const [errors, setErrors] = useState({})
  const set = (patch) => setD((p) => ({ ...p, ...patch }))

  handle.submit = () => {
    const next = clientErrors(d)
    setErrors(next || {})
    if (next) { onInvalid(); return }
    onCommit(d)
  }

  return <ClientFields d={d} set={set} errors={errors} providers={providers} />
}

/**
 * Raise the client editor.
 *
 * `record` null adds; a record edits. Both go through the same drawer, so
 * there is one shape to learn and the register never leaves the screen.
 */
export function openClientDrawer({ record, providers, setDrawer, toast, onSave }) {
  const handle = { submit: () => {} }

  setDrawer({
    title: record ? 'Edit client' : 'Add client',
    sub: record
      ? `${record.code} · saving replaces the stored routing`
      : 'Routes one caller’s traffic through a provider.',
    children: (
      <ClientDrawerBody
        handle={handle}
        record={record}
        providers={providers}
        onInvalid={() => toast('bad', 'Cannot save', 'Fix the highlighted fields.')}
        onCommit={(v) => { setDrawer(null); onSave(v) }}
      />
    ),
    footer: (
      <>
        <Button onClick={() => setDrawer(null)}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={() => handle.submit()}>
          {record ? 'Save Client' : 'Add Client'}
        </Button>
      </>
    ),
  })
}
