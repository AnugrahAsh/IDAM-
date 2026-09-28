import Banner from '../../components/primitives/Banner'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import {
  AUTH_TYPES, ENCRYPTION_MODES, PROVIDER_TYPES, RETRY_INTERVALS, authFieldsFor,
} from './emailData'

/* The SMTP configuration, as the fields that make it up.
 *
 * These were the body of a dialog, and the dialog owned the draft: the form
 * published a submit handler upward so a footer outside its subtree could call
 * it. On a page the draft belongs to the page, so these are field groups given
 * the draft to render — which is also what lets one configuration be split
 * across a connection tab and a delivery-rules tab without being two forms
 * editing two copies of it. */

/* `actions` puts a control on the heading line — the health accordions need a
   re-check button beside each section title, and a section that carries one
   should not become a second kind of section. Without it the heading is the
   whole row, exactly as it was. */
export function Section({ icon, title, actions, children }) {
  return (
    <section className="em-fs">
      <div className="em-fs-hr">
        <h3 className="em-fs-h"><Icon name={icon} size={13} />{title}</h3>
        {actions && <div className="em-fs-a">{actions}</div>}
      </div>
      <div className="stack">{children}</div>
    </section>
  )
}

// A qualifier that belongs beside the label rather than under the control: it
// tells you what to type, not what the field means.
export const label = (text, hint) => (hint ? <>{text}<span className="em-lbl-hint">{hint}</span></> : text)

/* Fields whose presence depends on the selected auth method are described as
   data in emailData, so the rendered list cannot drift from the validation that
   reads the same table. */
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

export function SwitchRow({ on, title, body, onChange }) {
  return (
    <div className="em-sw" data-on={on}>
      <Check checked={on} onChange={onChange} label={title} />
      <span className="em-sw-m">
        <span className="em-sw-t">{title}</span>
        <span className="em-sw-s">{body}</span>
      </span>
    </div>
  )
}

/** Where mail goes, how it is secured, and who it comes from. */
export function SmtpFields({ d, set, errors = {} }) {
  const api = d.type === 'API_SENDER'

  return (
    <div className="em-form">
      <Section icon="info" title="Basic info">
        <div className="grid grid-2">
          <Field label="Provider Code" required error={errors.code}>
            <TextInput className="mono" value={d.code} placeholder="e.g. SMTP_PRIMARY" onChange={(e) => set({ code: e.target.value })} />
          </Field>
          <Field label="Provider Name" required error={errors.name}>
            <TextInput value={d.name} placeholder="e.g. Tanflow SMTP Relay" onChange={(e) => set({ name: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section icon="bolt" title="Runtime engine">
        <Field label="Provider Type" required error={errors.type}>
          <Select value={d.type} options={PROVIDER_TYPES} onChange={(e) => set({ type: e.target.value })} />
        </Field>
        {/* An API sender is addressed by URL and a relay by hostname, so the
            field is labelled for the engine that was chosen rather than made to
            cover both. */}
        <Field label={api ? 'API Endpoint' : 'SMTP Host'} required error={errors.host}>
          <TextInput
            className="mono"
            value={d.host}
            placeholder={api ? 'https://email.eu-west-1.amazonaws.com/v2/email/outbound-emails' : 'smtp.tanflow.com'}
            onChange={(e) => set({ host: e.target.value })}
          />
        </Field>
        <div className="grid grid-2">
          <Field label={label('Port', api ? '443 for HTTPS' : '25, 465 or 587')} required error={errors.port}>
            <TextInput type="number" min="1" max="65535" value={d.port} onChange={(e) => set({ port: e.target.value })} />
          </Field>
          <Field label={label('Timeout', 'ms')}>
            <TextInput type="number" min="0" value={d.timeout} onChange={(e) => set({ timeout: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section icon="key" title="Authentication">
        <Field label="Auth Type" required error={errors.auth}>
          <Select value={d.auth} options={AUTH_TYPES} onChange={(e) => set({ auth: e.target.value })} />
        </Field>
        {d.auth !== 'NONE' && (
          <Banner tone="warn">
            Credential is resolved from <code className="code">process.env[ref]</code> — never stored in the database.
          </Banner>
        )}
        <DynFields specs={authFieldsFor(d.auth)} draft={d} errors={errors} onChange={set} />
      </Section>

      <Section icon="lock" title="Encryption">
        <Field label="Transport Security" required error={errors.encryption}>
          <Select value={d.encryption} options={ENCRYPTION_MODES} onChange={(e) => set({ encryption: e.target.value })} />
        </Field>
        {!d.encryption && (
          <Banner tone="warn">
            Mail and credentials travel in the clear. Leave this off only for a relay reachable
            solely on the private network.
          </Banner>
        )}
      </Section>

      <Section icon="at" title="Sender identity">
        <div className="grid grid-2">
          <Field label="From Name" span={2}>
            <TextInput value={d.fromName} placeholder="e.g. Tanflow Identity" onChange={(e) => set({ fromName: e.target.value })} />
          </Field>
          <Field label="From Address" required error={errors.fromAddress}>
            <TextInput value={d.fromAddress} placeholder="no-reply@tanflow.com" onChange={(e) => set({ fromAddress: e.target.value })} />
          </Field>
          <Field label={label('Reply-To', 'optional')} error={errors.replyTo}>
            <TextInput value={d.replyTo} placeholder="support@tanflow.com" onChange={(e) => set({ replyTo: e.target.value })} />
          </Field>
        </div>
      </Section>
    </div>
  )
}

/** What the relay does with a message it could not hand over first time. */
export function DeliveryFields({ d, set }) {
  return (
    <div className="em-form">
      <Field label="Retry attempts" hint="0 leaves a transient rejection as a failure." htmlFor="em-retries">
        <TextInput id="em-retries" type="number" min="0" max="10" value={d.retries} onChange={(e) => set({ retries: e.target.value })} />
      </Field>
      <Field label="Retry interval" hint="Waited between attempts." htmlFor="em-retry-int">
        <Select id="em-retry-int" value={d.retryInterval} options={RETRY_INTERVALS} onChange={(e) => set({ retryInterval: e.target.value })} />
      </Field>
      <Field label="Daily send cap" hint="Messages beyond the cap stay queued until the window resets." htmlFor="em-cap">
        <TextInput id="em-cap" type="number" min="0" value={d.dailyCap} onChange={(e) => set({ dailyCap: e.target.value })} />
      </Field>
      <Field label={label('Connection pool size', 'concurrent connections')} htmlFor="em-pool">
        <TextInput id="em-pool" type="number" min="1" value={d.poolSize} onChange={(e) => set({ poolSize: e.target.value })} />
      </Field>
      <SwitchRow
        on={d.dkim}
        title="DKIM signing"
        body="Sign outbound mail with the tenant selector so it passes DMARC."
        onChange={(v) => set({ dkim: v })}
      />
      <SwitchRow
        on={d.bounceHandling}
        title="Bounce handling"
        body="Parse bounces and mark an address undeliverable after three hard failures."
        onChange={(v) => set({ bounceHandling: v })}
      />
      <SwitchRow
        on={d.sandbox}
        title="Sandbox mode"
        body="Redirect every message to the diagnostic mailbox instead of real recipients."
        onChange={(v) => set({ sandbox: v })}
      />
    </div>
  )
}
