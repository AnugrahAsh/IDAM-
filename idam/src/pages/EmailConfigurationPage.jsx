import './styles/EmailConfigurationPage.css'
import { useState } from 'react'
import PageBar from '../components/shell/PageBar'
import StickyActions from '../components/shell/StickyActions'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Tabs from '../components/primitives/Tabs'
import Switch from '../components/primitives/Switch'
import Field from '../components/primitives/Field'
import TextInput from '../components/primitives/TextInput'
import Select from '../components/primitives/Select'
import Banner from '../components/primitives/Banner'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { SMTP_DEFAULTS, OUTBOX } from './comms/commsData'
import { DELIVERY_LOG, ME } from '../data/seed'

const ENCRYPTION = ['STARTTLS', 'SSL/TLS', 'None']
const INTERVALS = ['1 minute', '5 minutes', '15 minutes', '1 hour']

export default function EmailConfigurationPage({ embedded }) {
  const { toast } = useApp()
  const [tab, setTab] = useState('smtp')
  const [form, setForm] = useState(() => ({ ...SMTP_DEFAULTS }))
  const [flags, setFlags] = useState({ enabled: true, dkim: true, bounceHandling: true, sandbox: false })
  const [dirty, setDirty] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const [testTo, setTestTo] = useState(ME.email)

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }
  const flag = (k) => (v) => { setFlags((f) => ({ ...f, [k]: v })); setDirty(true) }

  const runTest = () => {
    setTesting(true)
    setResult(null)
    setTimeout(() => {
      setTesting(false)
      setResult({
        ok: flags.enabled && form.host.trim() !== '',
        lines: [
          ['dim', `connect ${form.host}:${form.port}`],
          ['ok', '220 smtp.tanflow.com ESMTP ready'],
          ['dim', 'EHLO idam.tanflow.com'],
          ['ok', `250-STARTTLS  250-AUTH PLAIN LOGIN  250-SIZE 36700160`],
          ['dim', `STARTTLS negotiated · ${form.encryption} · TLS_AES_256_GCM_SHA384`],
          ['ok', `235 authentication succeeded for ${form.username}`],
          flags.dkim ? ['ok', 'DKIM selector tanflow._domainkey resolved'] : ['warn', 'DKIM signing disabled — mail may be marked as spam'],
          ['dim', 'QUIT'],
          [flags.enabled ? 'ok' : 'bad', flags.enabled ? 'Connection healthy · handshake 142 ms' : 'Relay disabled — nothing will be dispatched'],
        ],
      })
    }, 700)
  }

  const sendTest = () => {
    if (!testTo.trim()) { toast('bad', 'Address required', 'Enter a destination for the test message.'); return }
    toast('ok', 'Test message queued', `A diagnostic email is on its way to ${testTo}.`)
  }

  const failed = DELIVERY_LOG.filter((d) => d.status === 'Failed')

  return (
    <>
      {!embedded && (
        <PageBar
          title="Email Configuration"
          sub="The SMTP relay every transactional message passes through, plus retry behavior and diagnostics."
          crumbs={[{ label: 'Email Configuration' }]}
          actions={
            <>
              <Button icon="activity" onClick={runTest}>Test Config</Button>
              <Button variant="pri" icon="save" onClick={() => { setDirty(false); toast('ok', 'Configuration saved', 'The relay will use these settings for the next dispatch.') }}>Submit</Button>
            </>
          }
          rail={
            <>
              <StatChip icon="server">{form.host}</StatChip>
              <StatChip icon="lock">{form.encryption}</StatChip>
              <StatChip icon="mail">{num(OUTBOX.length)} in outbox</StatChip>
              <StatChip icon="warn">{num(failed.length)} failed 30d</StatChip>
            </>
          }
        />
      )}

      <div className="stack">
        {!flags.enabled && (
          <Banner tone="warn">
            Outbound mail is <b>disabled</b>. Messages continue to queue but nothing is dispatched until the relay is re-enabled.
          </Banner>
        )}

        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'smtp', label: 'SMTP', icon: 'server' },
            { id: 'delivery', label: 'Delivery rules', icon: 'sliders' },
            { id: 'test', label: 'Test & diagnostics', icon: 'activity' },
            { id: 'log', label: 'Delivery log', icon: 'logs', count: DELIVERY_LOG.length },
          ]}
        />

        {tab === 'smtp' && (
          <div className="grid grid-2">
            <Card title="Relay connection" sub="Where the platform hands mail off.">
              <div className="stack">
                <div className="grid grid-2">
                  <Field label="Host" required><TextInput value={form.host} onChange={set('host')} /></Field>
                  <Field label="Port" required><TextInput value={form.port} onChange={set('port')} /></Field>
                </div>
                <Field label="Encryption" hint="STARTTLS is required for any relay outside the private network.">
                  <Select value={form.encryption} options={ENCRYPTION} onChange={set('encryption')} />
                </Field>
                <Field label="Username"><TextInput value={form.username} onChange={set('username')} /></Field>
                <Field label="Password" hint="Stored in the platform secret store, never displayed after save.">
                  <TextInput type="password" value={form.password} onChange={set('password')} />
                </Field>
                <Field label="Connection pool size" hint="Concurrent SMTP connections held open.">
                  <TextInput value={form.poolSize} onChange={set('poolSize')} />
                </Field>
              </div>
            </Card>

            <div className="stack">
              <Card title="Sender identity" sub="What recipients see in the From header.">
                <div className="stack">
                  <Field label="From name"><TextInput value={form.fromName} onChange={set('fromName')} /></Field>
                  <Field label="From address" required><TextInput value={form.fromAddress} onChange={set('fromAddress')} /></Field>
                  <Field label="Reply-to"><TextInput value={form.replyTo} onChange={set('replyTo')} /></Field>
                </div>
              </Card>

              <Card title="Relay behavior">
                {[
                  ['enabled', 'Outbound mail enabled', 'Turn off to hold every message in the queue without dispatching.'],
                  ['dkim', 'DKIM signing', 'Sign outbound mail with the tenant selector so it passes DMARC.'],
                  ['bounceHandling', 'Bounce handling', 'Parse bounces and mark the address as undeliverable after three hard failures.'],
                  ['sandbox', 'Sandbox mode', 'Redirect every message to the diagnostic mailbox instead of real recipients.'],
                ].map(([k, title, body]) => (
                  <div className="row-between" style={{ padding: '11px 0', borderTop: '1px solid var(--hair)', gap: 16 }} key={k}>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600 }}>{title}</div>
                      <div className="t-xs t-mut">{body}</div>
                    </div>
                    <Switch checked={flags[k]} onChange={flag(k)} label={title} />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {tab === 'delivery' && (
          <div className="grid grid-2">
            <Card title="Retry policy" sub="Applied to any message the relay rejects with a transient error.">
              <div className="stack">
                <Field label="Retry attempts"><TextInput value={form.retries} onChange={set('retries')} /></Field>
                <Field label="Retry interval"><Select value={form.retryInterval} options={INTERVALS} onChange={set('retryInterval')} /></Field>
                <Field label="Daily send cap" hint="Messages beyond the cap stay queued until the window resets.">
                  <TextInput value={form.dailyCap} onChange={set('dailyCap')} />
                </Field>
              </div>
            </Card>
            <Card title="What happens on failure" sub="Current behavior given the settings above">
              <div className="tl">
                <div className="tl-it" data-tone="warn">
                  <span className="tl-dot"><Icon name="warn" size={8} stroke={3} /></span>
                  <div className="tl-t">Transient rejection</div>
                  <div className="tl-s">Retried up to {form.retries} times, {form.retryInterval} apart.</div>
                </div>
                <div className="tl-it" data-tone="bad">
                  <span className="tl-dot"><Icon name="x" size={8} stroke={3} /></span>
                  <div className="tl-t">Hard bounce</div>
                  <div className="tl-s">{flags.bounceHandling ? 'Address marked undeliverable after three hard failures.' : 'No bounce parsing — the address keeps receiving attempts.'}</div>
                </div>
                <div className="tl-it" data-tone="acc">
                  <span className="tl-dot"><Icon name="check" size={8} stroke={3} /></span>
                  <div className="tl-t">Exhausted</div>
                  <div className="tl-s">Message moves to Failed in the outbox and raises an operations alert.</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'test' && (
          <div className="grid grid-2">
            <Card
              title="Connection test"
              sub="Runs a live SMTP handshake without sending mail."
              actions={<Button size="sm" icon="activity" onClick={runTest} disabled={testing}>{testing ? 'Testing…' : 'Test Config'}</Button>}
            >
              {testing && <div className="t-sm t-mut">Negotiating with {form.host}…</div>}
              {!testing && !result && <div className="t-sm t-mut">No test has been run in this session.</div>}
              {!testing && result && (
                <>
                  <Banner tone={result.ok ? 'ok' : 'bad'}>
                    {result.ok ? 'Relay reachable and authenticated.' : 'The relay did not accept the configuration.'}
                  </Banner>
                  <div className="log-view" style={{ marginTop: 12 }}>
                    {result.lines.map((l, i) => (
                      <div key={i} className={`lg-${l[0]}`}>{l[1]}</div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card title="Send a test message" sub="Delivers a rendered diagnostic email end to end.">
              <div className="stack">
                <Field label="Destination address" required hint="Use an address you control; the message contains no real identity data.">
                  <TextInput value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                </Field>
                <div>
                  <Button variant="pri" icon="mail" onClick={sendTest}>Send test message</Button>
                </div>
                <Banner tone="info">
                  A successful send proves relay, authentication, DKIM and rendering together. A failed
                  connection test with a successful send usually means an egress firewall rule.
                </Banner>
              </div>
            </Card>
          </div>
        )}

        {tab === 'log' && (
          <DataWorkbench
            id="email-config-log"
            rows={DELIVERY_LOG}
            columns={[
              { key: 'ts', label: 'Time', cls: 'td-mono', locked: true },
              { key: 'channel', label: 'Channel', render: (r) => <Tag>{r.channel}</Tag> },
              { key: 'event', label: 'Event', cls: 'td-mono' },
              { key: 'recipient', label: 'Recipient' },
              { key: 'username', label: 'Identity' },
              { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Delivered' ? 'ok' : 'bad'} dot>{r.status}</Pill> },
              { key: 'detail', label: 'Gateway response', cls: 'td-mono' },
            ]}
            searchPlaceholder="Search deliveries…"
            emptyTitle="No deliveries" emptyBody="Nothing dispatched in the retention window." emptyIcon="logs"
          />
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes to the relay configuration' : 'No changes'}>
        <Button onClick={() => { setForm({ ...SMTP_DEFAULTS }); setDirty(false); toast('info', 'Reverted', 'Configuration restored to the last saved values.') }}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={() => { setDirty(false); toast('ok', 'Configuration saved', 'The relay will use these settings for the next dispatch.') }}>Submit</Button>
      </StickyActions>
    </>
  )
}
