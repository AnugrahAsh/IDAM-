import { useState } from 'react'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Button from '../../components/primitives/Button'
import Banner from '../../components/primitives/Banner'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'

/** Defaults per method, so a newly added factor opens with a usable shape. */
export const blankConfig = (method) => ({
  from: 'no-reply@tanflow.com',
  host: 'smtp.tanflow.internal',
  port: '587',
  ssl: false,
  startTls: true,
  auth: true,
  username: 'svc_idam_mail',
  password: '',
  // Non-email factors carry their own endpoint instead.
  endpoint: '',
  ...(method && method.config ? method.config : {}),
})

/**
 * Configuration for one authentication factor.
 *
 * The email factor is the one the platform itself owns — it has an SMTP
 * connection of its own rather than a vendor behind it — so it gets the full
 * connection form. Everything else is a provider binding.
 */
export default function MethodConfig({ method, value, probe, onChange, onTest }) {
  const [touched, setTouched] = useState({})
  const d = value
  const set = (k, v) => onChange({ ...d, [k]: v })
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }))

  const isEmail = method.id === 'email'

  const problems = {
    from: !String(d.from).trim() ? 'Enter the address the platform sends from.' : '',
    host: !String(d.host).trim() ? 'Enter the SMTP host the platform connects to.' : '',
    username: d.auth && !String(d.username).trim() ? 'Authentication is on, so a username is required.' : '',
    password: d.auth && !String(d.password).trim() && !d.savedPassword ? 'Authentication is on, so a credential is required.' : '',
  }
  const errorFor = (k) => (touched[k] ? problems[k] : '')

  if (!isEmail) {
    return (
      <div className="stack">
        <Banner tone="info">
          {method.name} is delivered by a provider. Its endpoint and credentials are held on the provider record;
          this form controls how the platform offers the factor.
        </Banner>
        <Field label="Provider endpoint" hint="Where the platform sends the challenge." htmlFor="mc-endpoint">
          <TextInput
            id="mc-endpoint"
            className="mono"
            value={d.endpoint}
            placeholder="https://api.provider.example/v2/challenge"
            onChange={(e) => set('endpoint', e.target.value)}
          />
        </Field>
        <TestBlock probe={probe} onTest={onTest} label={method.name} />
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field label="From" required error={errorFor('from')} hint="The address recipients see." htmlFor="mc-from">
          <TextInput id="mc-from" value={d.from} onBlur={() => blur('from')} onChange={(e) => set('from', e.target.value)} />
        </Field>
        <Field label="Host" required error={errorFor('host')} htmlFor="mc-host">
          <TextInput id="mc-host" className="mono" value={d.host} onBlur={() => blur('host')} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label="Port" htmlFor="mc-port">
          <Select id="mc-port" value={d.port} options={['25', '465', '587', '2525']} onChange={(e) => set('port', e.target.value)} />
        </Field>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <Switch
            checked={d.ssl}
            label="Enable SSL"
            onChange={(v) => onChange({ ...d, ssl: v, startTls: v ? false : d.startTls })}
          />
          <span className="t-sm">Enable SSL — the connection is encrypted from the first byte, normally on port 465.</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Switch
            checked={d.startTls}
            label="Enable StartTLS"
            onChange={(v) => onChange({ ...d, startTls: v, ssl: v ? false : d.ssl })}
          />
          <span className="t-sm">Enable StartTLS — the connection starts in clear and is upgraded, normally on port 587.</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <Switch checked={d.auth} label="Authentication" onChange={(v) => set('auth', v)} />
          <span className="t-sm">Authentication — the platform signs in to the relay before sending.</span>
        </div>
      </div>

      {!d.ssl && !d.startTls && (
        <Banner tone="warn">
          Neither SSL nor StartTLS is on. The credential below and every one-time code travel in clear text.
        </Banner>
      )}

      {d.auth && (
        <div className="grid grid-2">
          <Field label="Username" required error={errorFor('username')} htmlFor="mc-user">
            <TextInput id="mc-user" className="mono" value={d.username} onBlur={() => blur('username')} onChange={(e) => set('username', e.target.value)} />
          </Field>
          <Field
            label="Password"
            required
            error={errorFor('password')}
            hint={d.savedPassword ? 'Leave blank to keep the stored credential.' : 'Held in the platform secret store, never shown again.'}
            htmlFor="mc-pass"
          >
            <TextInput
              id="mc-pass"
              type="password"
              autoComplete="off"
              value={d.password}
              placeholder={d.savedPassword ? 'Unchanged' : 'Relay credential'}
              onChange={(e) => set('password', e.target.value)}
            />
          </Field>
        </div>
      )}

      <TestBlock probe={probe} onTest={onTest} label="Email" />

      <KeyValue
        cols={1}
        rows={[
          { k: 'Transport', v: d.ssl ? 'SSL (implicit TLS)' : d.startTls ? 'StartTLS' : 'Clear text', icon: 'shield' },
          { k: 'Endpoint', v: <span className="mono">{d.host}:{d.port}</span>, icon: 'server' },
          { k: 'Authenticates as', v: d.auth ? d.username : 'Anonymous relay', icon: 'key' },
        ]}
      />
    </div>
  )
}

/** The verdict has to outlive the toast that announced it. */
function TestBlock({ probe, onTest, label }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        <Button icon="play" onClick={onTest}>Test connection</Button>
        <span className="t-xs t-mut">Opens the connection and sends a test message. Nothing is written.</span>
      </div>
      {probe && (
        <div className="banner" data-tone={probe.ok ? 'ok' : 'bad'}>
          <Icon name={probe.ok ? 'checkC' : 'warn'} size={15} />
          <div>
            <b>{label} {probe.ok ? 'connection succeeded' : 'connection failed'}</b> at {probe.at}
            <div className="t-xs" style={{ marginTop: 2, opacity: 0.9 }}>{probe.detail}</div>
          </div>
        </div>
      )}
    </div>
  )
}
