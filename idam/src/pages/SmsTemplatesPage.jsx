import './styles/SmsTemplatesPage.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DetailHeader, { Fact } from '../components/shell/DetailHeader'
import StickyActions from '../components/shell/StickyActions'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Tabs from '../components/primitives/Tabs'
import Field from '../components/primitives/Field'
import TextInput from '../components/primitives/TextInput'
import Select from '../components/primitives/Select'
import Switch from '../components/primitives/Switch'
import Banner from '../components/primitives/Banner'
import EmptyState from '../components/primitives/EmptyState'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { APPLICATIONS } from '../data/seed'
import { SMS_PROVIDERS, SMS_TEMPLATES, SMS_CLIENTS, SMS_QUEUE, stamp } from './comms/commsData'

const TYPES = ['REST', 'SMPP', 'SOAP']
const AUTHS = ['Basic', 'Token', 'HMAC', 'SigV4', 'None']
const SERIALIZERS = ['JSON', 'XML', 'FORM']
const ENCRYPTIONS = ['TLS 1.3', 'TLS 1.2', 'None']
const CHECKS = ['HTTP_200', 'BODY_MATCH', 'ACK']
const GATEWAYS = ['Twilio', 'Kaleyra', 'MSG91', 'Gupshup', 'Amazon SNS', 'Custom REST', 'Custom SMPP', 'Custom SOAP']
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Marathi', 'Arabic', 'French']
const SMS_EVENTS = ['mfa.otp', 'mfa.enrolled', 'password.set', 'password.expiring', 'user.created', 'user.locked', 'user.unlocked', 'request.approved', 'request.rejected', 'recert.reminder']
const SMS_TOKENS = ['{{otp}}', '{{code}}', '{{username}}', '{{firstName}}', '{{expiryMinutes}}', '{{actionUrl}}', '{{requestId}}', '{{supportEmail}}']

const gatewayType = (g) => (g === 'Custom SMPP' ? 'SMPP' : g === 'Custom SOAP' ? 'SOAP' : 'REST')

const GSM7 = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r^{}\\[~\]|€]*$/
const segmentInfo = (body = '') => {
  const ucs2 = !GSM7.test(body)
  const single = ucs2 ? 70 : 160
  const multi = ucs2 ? 67 : 153
  const segments = body.length === 0 ? 0 : body.length <= single ? 1 : Math.ceil(body.length / multi)
  return { chars: body.length, segments, encoding: ucs2 ? 'UCS-2' : 'GSM-7', single }
}

// Commit helpers shared by the provider, template and client forms.
export const nextRowId = (list) => list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1
export const addRow = (list, row) => [...list, { ...row, id: nextRowId(list) }]
export const upsertRow = (list, record, patch) => (record
  ? list.map((r) => (r.id === record.id ? { ...r, ...patch } : r))
  : addRow(list, patch))

// Validation — returns null when the draft may be committed.
export const providerErrors = (d) => {
  const e = {}
  if (!String(d.code).trim()) e.code = 'A provider code is required.'
  else if (!/^[A-Z0-9_]+$/.test(d.code)) e.code = 'Use upper-case letters, digits and underscores.'
  if (!String(d.name).trim()) e.name = 'A display name is required.'
  if (!String(d.endpoint).trim()) e.endpoint = 'An endpoint is required.'
  return Object.keys(e).length ? e : null
}
export const templateErrors = (d) => {
  const e = {}
  if (!String(d.name || '').trim()) e.name = 'A template name is required.'
  if (!String(d.body || '').trim()) e.body = 'A message body is required.'
  return Object.keys(e).length ? e : null
}
export const clientErrors = (d) => {
  const e = {}
  if (!String(d.code || '').trim()) e.code = 'A client code is required.'
  if (!String(d.name || '').trim()) e.name = 'A client name is required.'
  return Object.keys(e).length ? e : null
}

const blankProvider = () => ({
  id: null, code: '', name: '', gateway: 'Twilio', type: 'REST', auth: 'Token', serializer: 'JSON',
  encryption: 'TLS 1.3', responseCheck: 'HTTP_200', timeout: 8000, retries: 3,
  status: 'Active', endpoint: '', senderId: '', apiKey: '', apiSecret: '', priority: 10,
})

export function ProviderDetail({ record, onSave, onCancel, onDelete, base = '/iam/smsTemplates' }) {
  const { toast } = useApp()
  const [form, setForm] = useState(() => ({ gateway: 'Custom REST', apiKey: '', apiSecret: '', priority: 10, ...record }))
  const [tab, setTab] = useState('connection')
  const [dirty, setDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const creating = record.id == null

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true) }

  const runTest = () => {
    setTesting(true); setResult(null)
    setTimeout(() => {
      setTesting(false)
      const ok = form.status === 'Active' && String(form.endpoint).trim() !== ''
      setResult({
        ok,
        lines: [
          ['dim', `resolve ${form.endpoint || '(no endpoint)'}`],
          ok ? ['ok', 'TCP established · 42 ms'] : ['bad', 'no endpoint configured'],
          ['dim', `handshake ${form.encryption}`],
          ok ? ['ok', `auth ${form.auth} accepted`] : ['warn', 'auth skipped'],
          ['dim', `serializer ${form.serializer} · response check ${form.responseCheck}`],
          ok ? ['ok', `probe message accepted · sender ${form.senderId || 'unset'}`] : ['bad', 'probe not sent'],
          [ok ? 'ok' : 'bad', ok ? `Gateway healthy · round trip 214 ms (timeout ${form.timeout} ms)` : 'Gateway unreachable with the current configuration'],
        ],
      })
    }, 700)
  }

  const submit = () => {
    const next = providerErrors(form)
    setErrors(next || {})
    if (next) { toast('bad', 'Cannot save', 'Fix the highlighted fields.'); return }
    onSave({ ...form, timeout: Number(form.timeout) || 8000, retries: Number(form.retries) || 0, priority: Number(form.priority) || 10 })
  }

  const boundTemplates = SMS_TEMPLATES.filter((t) => t.provider === record.code)
  const boundClients = SMS_CLIENTS.filter((c) => c.provider === record.code)

  return (
    <>
      <DetailHeader
        backTo={base}
        backLabel={base.startsWith('/iam/sms/') || base === '/iam/sms' ? 'SMS Management' : 'Sms Templates'}
        eyebrow={creating ? 'New provider' : 'SMS provider'}
        title={form.name || 'Untitled provider'}
        sub={`${form.type} gateway using ${form.auth} authentication and a ${form.serializer} payload.`}
        badges={
          <>
            <Pill tone={form.status === 'Active' ? 'ok' : 'mut'} dot>{form.status}</Pill>
            <span className="code">{form.code || 'CODE'}</span>
          </>
        }
        meta={
          !creating && (
            <>
              <Fact icon="clock" label="Timeout" value={`${record.timeout} ms`} />
              <Fact icon="refresh" label="Retries" value={record.retries} />
            </>
          )
        }
        actions={
          <>
            <Button icon="activity" onClick={runTest} disabled={testing}>{testing ? 'Testing…' : 'Test connection'}</Button>
            {!creating && (
              <Button icon={form.status === 'Active' ? 'ban' : 'checkC'} onClick={() => {
                setForm((f) => ({ ...f, status: f.status === 'Active' ? 'Inactive' : 'Active' })); setDirty(true)
              }}>{form.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
            )}
            {!creating && <Button variant="danger" icon="trash" onClick={() => onDelete(record)}>Delete</Button>}
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'connection', label: 'Connection', icon: 'server' },
              { id: 'behavior', label: 'Behavior', icon: 'sliders' },
              { id: 'usage', label: 'Usage', icon: 'activity' },
              { id: 'bindings', label: 'Bindings', icon: 'link', count: boundTemplates.length + boundClients.length },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'connection' && (
          <div className="detail-cols">
            <Card title="Gateway endpoint" sub="Where messages are posted.">
              <div className="stack">
                <div className="grid grid-2">
                  <Field label="Provider code" required error={errors.code} hint="Immutable identifier used in routing rules.">
                    <TextInput value={form.code} onChange={set('code')} placeholder="TWILIO" />
                  </Field>
                  <Field label="Display name" required error={errors.name}>
                    <TextInput value={form.name} onChange={set('name')} />
                  </Field>
                </div>
                <Field label="Endpoint" required error={errors.endpoint}>
                  <TextInput value={form.endpoint} onChange={set('endpoint')} placeholder="https://api.example.com/messages" />
                </Field>
                <div className="grid grid-2">
                  <Field label="Gateway type" hint="Preset for the carrier gateway this binding talks to.">
                    <Select
                      value={form.gateway}
                      options={GATEWAYS}
                      onChange={(e) => { setForm((f) => ({ ...f, gateway: e.target.value, type: gatewayType(e.target.value) })); setDirty(true) }}
                    />
                  </Field>
                  <Field label="Protocol"><Select value={form.type} options={TYPES} onChange={set('type')} /></Field>
                </div>
                <div className="grid grid-2">
                  <Field label="Sender ID" hint="Alphanumeric header shown on the handset."><TextInput value={form.senderId} onChange={set('senderId')} /></Field>
                  <Field label="Priority" hint="Lower numbers are tried first when routing.">
                    <TextInput type="number" min="1" max="99" value={form.priority} onChange={set('priority')} />
                  </Field>
                </div>
                <div className="grid grid-2">
                  <Field label="Authentication"><Select value={form.auth} options={AUTHS} onChange={set('auth')} /></Field>
                  <Field label="Encryption"><Select value={form.encryption} options={ENCRYPTIONS} onChange={set('encryption')} /></Field>
                </div>
                <div className="grid grid-2">
                  <Field label="API key / Account SID" hint="Stored in the platform vault. Demo placeholder only.">
                    <TextInput className="mono" value={form.apiKey} autoComplete="off" placeholder="AC••••••••••••" onChange={set('apiKey')} />
                  </Field>
                  <Field label="API secret / Auth token" hint="Never displayed again after saving.">
                    <TextInput className="mono" type="password" value={form.apiSecret} autoComplete="new-password" placeholder="••••••••••••" onChange={set('apiSecret')} />
                  </Field>
                </div>
                <div className="row">
                  <Switch
                    checked={form.status === 'Active'}
                    onChange={(v) => { setForm((f) => ({ ...f, status: v ? 'Active' : 'Inactive' })); setDirty(true) }}
                    label="Provider enabled"
                  />
                  <span className="t-sm">Enabled — messages may be routed through this gateway</span>
                </div>
                {form.encryption === 'None' && (
                  <Banner tone="warn">
                    This binding sends credentials and message bodies in the clear. Only acceptable on a
                    private circuit that is encrypted at another layer.
                  </Banner>
                )}
              </div>
            </Card>

            <Card
              title="Connection test"
              sub="Runs a live probe without charging a message."
              actions={<Button size="sm" icon="activity" onClick={runTest} disabled={testing}>Run</Button>}
            >
              {testing && <div className="t-sm t-mut">Probing {form.endpoint || 'the endpoint'}…</div>}
              {!testing && !result && <div className="t-sm t-mut">No test has been run in this session.</div>}
              {!testing && result && (
                <>
                  <Banner tone={result.ok ? 'ok' : 'bad'}>{result.ok ? 'Gateway reachable and authenticated.' : 'The gateway did not accept this configuration.'}</Banner>
                  <div className="log-view" style={{ marginTop: 12 }}>
                    {result.lines.map((l, i) => <div key={i} className={`lg-${l[0]}`}>{l[1]}</div>)}
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {tab === 'behavior' && (
          <div className="grid grid-2">
            <Card title="Payload" sub="How the request is built and validated.">
              <div className="stack">
                <Field label="Serializer"><Select value={form.serializer} options={SERIALIZERS} onChange={set('serializer')} /></Field>
                <Field label="Response check" hint="How a successful send is recognized.">
                  <Select value={form.responseCheck} options={CHECKS} onChange={set('responseCheck')} />
                </Field>
              </div>
            </Card>
            <Card title="Resilience" sub="Timeout and retry behavior on this binding.">
              <div className="stack">
                <Field label="Timeout (ms)"><TextInput value={form.timeout} onChange={set('timeout')} /></Field>
                <Field label="Retries" hint="Attempts after the first failure before the message is marked failed.">
                  <TextInput value={form.retries} onChange={set('retries')} />
                </Field>
                <Banner tone="info">
                  Worst-case latency for a single message is {((Number(form.timeout) || 0) * ((Number(form.retries) || 0) + 1) / 1000).toFixed(1)} seconds
                  with the current timeout and retry count.
                </Banner>
              </div>
            </Card>
          </div>
        )}

        {tab === 'usage' && (
          <div className="grid grid-2">
            <Card title="Volume" sub="Last 30 days">
              <div className="stat-strip">
                <div className="stat-cell"><span className="stat-k">In queue</span><span className="stat-v">{SMS_QUEUE.filter((q) => q.provider === record.code).length}</span></div>
              </div>
            </Card>
            <Card title="Recent traffic" sub="Messages routed through this provider" flush>
              {(() => {
                const rows = SMS_QUEUE.filter((q) => q.provider === record.code)
                if (!rows.length) return <EmptyState icon="sms" title="No traffic" body="Nothing has been routed through this provider yet." size="sm" />
                return (
                  <table className="tbl">
                    <thead><tr><th>Template</th><th>Recipient</th><th>Status</th><th>Sent</th></tr></thead>
                    <tbody>
                      {rows.map((q) => (
                        <tr key={q.id}>
                          <td className="td-main">{q.template}</td>
                          <td>{q.username}</td>
                          <td><Pill tone={q.status === 'Sent' ? 'ok' : q.status === 'Failed' ? 'bad' : 'warn'} dot>{q.status}</Pill></td>
                          <td className="td-mono">{q.sent || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </Card>
          </div>
        )}

        {tab === 'bindings' && (
          <div className="grid grid-2">
            <Card title="Templates using this provider" sub={`${boundTemplates.length} bound`} flush>
              {boundTemplates.length === 0
                ? <EmptyState icon="file" title="No templates" body="No template routes through this provider." size="sm" />
                : (
                  <table className="tbl">
                    <thead><tr><th>Template</th><th>Event</th><th>Status</th></tr></thead>
                    <tbody>
                      {boundTemplates.map((t) => (
                        <tr key={t.id}>
                          <td className="td-main">{t.name}</td>
                          <td className="td-mono">{t.event}</td>
                          <td><Pill tone={t.status === 'Active' ? 'ok' : 'mut'} dot>{t.status}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </Card>
            <Card title="Clients on this provider" sub={`${boundClients.length} bound`} flush>
              {boundClients.length === 0
                ? <EmptyState icon="users" title="No clients" body="No client routes through this provider." size="sm" />
                : (
                  <table className="tbl">
                    <thead><tr><th>Client</th><th>Rate limit</th><th>Status</th></tr></thead>
                    <tbody>
                      {boundClients.map((c) => (
                        <tr key={c.id}>
                          <td className="td-main">{c.name}</td>
                          <td className="td-num">{c.rateLimit} {c.window}</td>
                          <td><Pill tone={c.status === 'Active' ? 'ok' : 'mut'} dot>{c.status}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </Card>
          </div>
        )}
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>{creating ? 'Add Provider' : 'Save changes'}</Button>
      </StickyActions>
    </>
  )
}

export function TemplateFormBody({ draft, providers, onChange }) {
  const [d, setD] = useState(() => ({ ...draft }))
  const set = (patch) => {
    const next = { ...d, ...patch }
    setD(next)
    onChange(next)
  }
  const info = segmentInfo(d.body)
  return (
    <div className="stack">
      <Field label="Name" required><TextInput value={d.name} placeholder="OTP verification" onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field
        label="Message body"
        required
        hint={`${info.chars} characters · ${info.segments} segment${info.segments === 1 ? '' : 's'} · ${info.encoding} encoding (${info.single} chars per single segment)`}
      >
        <TextInput as="textarea" rows={5} value={d.body} placeholder="{{otp}} is your verification code." onChange={(e) => set({ body: e.target.value })} />
      </Field>
      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 6 }}>Insert a variable placeholder — resolved at send time</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {SMS_TOKENS.map((t) => (
            <button key={t} type="button" className="chip mono" style={{ cursor: 'pointer' }}
              onClick={() => set({ body: `${d.body}${d.body && !d.body.endsWith(' ') ? ' ' : ''}${t}` })}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {info.segments > 1 && (
        <Banner tone="warn">
          This body spans {info.segments} segments, so every send is billed {info.segments} times. Keep it under {info.single} characters to stay in one segment.
        </Banner>
      )}
      <div className="grid grid-2">
        <Field label="Event / trigger" hint="The platform event that renders this template.">
          <Select value={d.event} options={SMS_EVENTS} onChange={(e) => set({ event: e.target.value })} />
        </Field>
        <Field label="Provider">
          <Select value={d.provider} options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label="Language">
          <Select value={d.language} options={LANGUAGES} onChange={(e) => set({ language: e.target.value })} />
        </Field>
        <Field label="Enabled" hint="A disabled template stops its event from sending.">
          <div className="row" style={{ paddingTop: 5 }}>
            <Switch checked={d.status === 'Active'} onChange={(v) => set({ status: v ? 'Active' : 'Inactive' })} label="Template enabled" />
            <span className="t-sm">{d.status === 'Active' ? 'Enabled' : 'Disabled'}</span>
          </div>
        </Field>
      </div>
    </div>
  )
}

export function ClientFormBody({ draft, providers, onChange }) {
  const [d, setD] = useState(() => ({ ...draft }))
  const set = (patch) => {
    const next = { ...d, ...patch }
    setD(next)
    onChange(next)
  }
  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field label="Client code" required hint="Immutable routing identifier."><TextInput value={d.code} placeholder="CORP-IN" onChange={(e) => set({ code: e.target.value })} /></Field>
        <Field label="Client name" required><TextInput value={d.name} placeholder="Corporate India" onChange={(e) => set({ name: e.target.value })} /></Field>
      </div>
      <div className="grid grid-2">
        <Field label="Application" hint="The application whose traffic routes through this client.">
          <Select value={d.application} placeholder="Platform-wide" options={APPLICATIONS.map((a) => a.displayName)} onChange={(e) => set({ application: e.target.value })} />
        </Field>
        <Field label="Provider">
          <Select value={d.provider} options={providers.map((p) => p.code)} onChange={(e) => set({ provider: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label="Allotted quota" hint="Messages per month before sends are refused.">
          <TextInput type="number" min="0" value={d.quota} onChange={(e) => set({ quota: e.target.value })} />
        </Field>
        <Field label="Rate limit" hint="Messages per minute.">
          <TextInput type="number" min="0" value={d.rateLimit} onChange={(e) => set({ rateLimit: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-2">
        <Field label="Countries"><TextInput value={d.countries} placeholder="IN, SG" onChange={(e) => set({ countries: e.target.value })} /></Field>
        <Field label="Status"><Select value={d.status} options={['Active', 'Inactive']} onChange={(e) => set({ status: e.target.value })} /></Field>
      </div>
    </div>
  )
}

export default function SmsTemplatesPage({ segments = [], embedded, base = '/iam/smsTemplates' }) {
  const { navigate, toast, confirm, setDrawer } = useApp()
  const [providers, setProviders] = useState(() => SMS_PROVIDERS.map((p) => ({ ...p, priority: p.priority || (p.id * 10), gateway: p.gateway || 'Custom REST', apiKey: '', apiSecret: '' })))
  const [templates, setTemplates] = useState(() => SMS_TEMPLATES.map((t) => ({ ...t, language: t.language || 'English' })))
  const [clients, setClients] = useState(() => SMS_CLIENTS.map((c) => ({ ...c, application: c.application || '', quota: c.quota || 25000 })))
  const draftRef = useRef(null)
  const initialTab = ['providers', 'templates', 'clients'].includes(segments[0]) ? segments[0] : 'providers'
  const [tab, setTab] = useState(initialTab)
  const [activeOnly, setActiveOnly] = useState(false)

  useEffect(() => { setTab(initialTab) }, [initialTab])

  const isProviderRoute = segments[0] === 'providers'
  const providerKey = isProviderRoute ? segments[1] : null

  const providerRecord = useMemo(
    () => (providerKey && providerKey !== 'add' ? providers.find((p) => String(p.id) === String(providerKey)) : null),
    [providerKey, providers],
  )

  const backToList = () => navigate(embedded ? `${base}/providers` : base)

  if (isProviderRoute && providerKey === 'add') {
    return (
      <ProviderDetail
        record={blankProvider()}
        base={embedded ? `${base}/providers` : base}
        onCancel={backToList}
        onDelete={() => {}}
        onSave={(v) => {
          setProviders((ps) => addRow(ps, v))
          toast('ok', 'Provider added', `${v.name} is ${v.status === 'Active' ? 'enabled and available for routing' : 'saved but disabled'}.`)
          backToList()
        }}
      />
    )
  }

  if (isProviderRoute && providerKey) {
    if (!providerRecord) {
      return (
        <>
          <PageBar
            title="Provider not found"
            sub="The gateway may have been removed in this session, or the link may be stale."
            crumbs={[{ label: 'Sms Templates', to: 'smsTemplates' }, { label: 'Not found' }]}
          />
          <Card><EmptyState icon="server" title="No such provider" body={`Provider ${providerKey} does not exist.`} actions={<Button variant="pri" onClick={backToList}>Back</Button>} /></Card>
        </>
      )
    }
    return (
      <ProviderDetail
        record={providerRecord}
        base={embedded ? `${base}/providers` : base}
        onCancel={backToList}
        onSave={(v) => { setProviders((ps) => ps.map((p) => (p.id === v.id ? v : p))); toast('ok', 'Provider saved', v.name); backToList() }}
        onDelete={(p) => confirm({
          title: `Delete ${p.name}?`,
          body: 'Templates and clients bound to this provider stop sending until they are re-pointed.',
          confirmLabel: 'Delete provider',
          onConfirm: () => { setProviders((ps) => ps.filter((x) => x.id !== p.id)); toast('ok', 'Provider deleted', p.name); backToList() },
        })}
      />
    )
  }

  const templateForm = (record) => {
    const draft = record
      ? { ...record }
      : { name: '', body: '', event: 'mfa.otp', provider: providers[0]?.code || '', language: 'English', status: 'Active' }
    draftRef.current = { ...draft }
    setDrawer({
      title: record ? 'Edit template' : 'Add Template',
      sub: 'Short transactional text. Keep it under 160 characters to stay in one segment.',
      size: 'wide',
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={() => {
            const d = draftRef.current
            const bad = templateErrors(d)
            if (bad) { toast('bad', 'Cannot save', Object.values(bad).join(' ')); return }
            const info = segmentInfo(d.body)
            setTemplates((ts) => upsertRow(ts, record, { ...d, updated: stamp(0) }))
            setDrawer(null)
            toast('ok', record ? 'Template saved' : 'Template added', `${d.name} · ${info.segments} segment${info.segments === 1 ? '' : 's'} · fires on ${d.event}.`)
          }}>{record ? 'Save changes' : 'Add template'}</Button>
        </>
      ),
      children: (
        <TemplateFormBody
          draft={draft}
          providers={providers}
          onChange={(d) => { draftRef.current = d }}
        />
      ),
    })
  }

  const clientForm = (record) => {
    const draft = record
      ? { ...record }
      : { code: '', name: '', application: '', provider: providers[0]?.code || '', quota: 25000, rateLimit: 100, window: 'per minute', status: 'Active', countries: 'IN' }
    draftRef.current = { ...draft }
    setDrawer({
      title: record ? 'Edit client' : 'Add Client',
      sub: 'A routing bucket with its own quota and rate limit.',
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={() => {
            const d = draftRef.current
            const bad = clientErrors(d)
            if (bad) { toast('bad', 'Cannot save', Object.values(bad).join(' ')); return }
            const clean = { ...d, rateLimit: Number(d.rateLimit) || 0, quota: Number(d.quota) || 0 }
            setClients((cs) => upsertRow(cs, record, clean))
            setDrawer(null)
            toast('ok', record ? 'Client saved' : 'Client added', `${clean.name} · ${num(clean.quota)} messages per month via ${clean.provider}.`)
          }}>{record ? 'Save changes' : 'Add client'}</Button>
        </>
      ),
      children: (
        <ClientFormBody
          draft={draft}
          providers={providers}
          onChange={(d) => { draftRef.current = d }}
        />
      ),
    })
  }

  const setProviderStatus = (list, status, clear) => {
    const s = new Set(list.map((r) => String(r.id)))
    setProviders((ps) => ps.map((p) => (s.has(String(p.id)) ? { ...p, status } : p)))
    if (clear) clear()
    toast('ok', status === 'Active' ? 'Providers activated' : 'Providers deactivated', `${list.length} updated.`)
  }

  const providerPath = (sfx) => `${base}/providers/${sfx}`

  const providerColumns = [
    { key: 'code', label: 'Provider code', cls: 'td-main td-mono', locked: true, render: (r) => <span className="link" onClick={() => navigate(providerPath(r.id))}>{r.code}</span> },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', render: (r) => <Tag>{r.type}</Tag> },
    { key: 'priority', label: 'Priority', align: 'right', render: (r) => <span className="num">{r.priority ?? '—'}</span> },
    { key: 'auth', label: 'Auth', render: (r) => <Tag>{r.auth}</Tag> },
    { key: 'serializer', label: 'Serializer', cls: 'td-mono' },
    { key: 'encryption', label: 'Encryption', render: (r) => <Pill tone={r.encryption === 'None' ? 'bad' : 'ok'} dot>{r.encryption}</Pill> },
    { key: 'responseCheck', label: 'Response check', cls: 'td-mono' },
    { key: 'timeout', label: 'Timeout', align: 'right', render: (r) => `${num(r.timeout)} ms` },
    { key: 'retries', label: 'Retries', align: 'right' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill> },
  ]

  const active = providers.filter((p) => p.status === 'Active')

  return (
    <>
      {!embedded && (
        <PageBar
          title="Sms Templates"
          sub="The gateways that carry text messages, the templates they render, and the clients that route through them."
          crumbs={[{ label: 'Sms Templates' }]}
          actions={
            tab === 'providers'
              ? <Button variant="pri" icon="plus" onClick={() => navigate(providerPath('add'))}>Add Provider</Button>
              : tab === 'templates'
                ? <Button variant="pri" icon="plus" onClick={() => templateForm(null)}>Add Template</Button>
                : <Button variant="pri" icon="plus" onClick={() => clientForm(null)}>Add Client</Button>
          }
          rail={
            <>
              <StatChip icon="server" active={tab === 'providers' && !activeOnly} onClick={() => { setTab('providers'); setActiveOnly(false) }}>
                {providers.length} providers
              </StatChip>
              <StatChip
                icon="checkC"
                active={tab === 'providers' && activeOnly}
                onClick={() => { setTab('providers'); setActiveOnly((v) => !v) }}
                title="Show only the gateways currently accepting traffic"
              >
                {active.length} active
              </StatChip>
              <StatChip icon="file" active={tab === 'templates'} onClick={() => setTab('templates')}>
                {templates.length} templates
              </StatChip>
              <StatChip icon="users" active={tab === 'clients'} onClick={() => setTab('clients')}>
                {clients.length} clients
              </StatChip>
            </>
          }
        />
      )}

      <div className="stack">
        {!embedded && (
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'providers', label: 'Providers', icon: 'server', count: providers.length },
              { id: 'templates', label: 'Templates', icon: 'file', count: templates.length },
              { id: 'clients', label: 'Clients', icon: 'users', count: clients.length },
            ]}
          />
        )}

        {tab === 'providers' && (
          <DataWorkbench
            id="sms-providers"
            rows={providers}
            filter={activeOnly ? (p) => p.status === 'Active' : undefined}
            columns={providerColumns}
            selectable
            searchPlaceholder="Search by code, name or type…"
            toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => navigate(providerPath('add'))}>Add Provider</Button>}
            onRowClick={(r) => navigate(providerPath(r.id))}
            bulkActions={(ids, clear) => {
              const list = providers.filter((p) => ids.map(String).includes(String(p.id)))
              return (
                <>
                  <Button size="sm" icon="checkC" onClick={() => setProviderStatus(list, 'Active', clear)}>Activate</Button>
                  <Button size="sm" icon="ban" onClick={() => setProviderStatus(list, 'Inactive', clear)}>Deactivate</Button>
                  <Button size="sm" variant="danger" icon="trash" onClick={() => confirm({
                    title: `Delete ${list.length} providers?`,
                    body: 'Templates and clients bound to them stop sending until re-pointed.',
                    confirmLabel: `Delete ${list.length}`,
                    onConfirm: () => {
                      const s = new Set(list.map((r) => String(r.id)))
                      setProviders((ps) => ps.filter((p) => !s.has(String(p.id))))
                      clear(); toast('ok', 'Providers deleted', `${list.length} removed.`)
                    },
                  })}>Delete</Button>
                </>
              )
            }}
            rowActions={(r) => [
              { id: 'open', label: 'Open provider', icon: 'eye', onSelect: () => navigate(providerPath(r.id)) },
              { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => navigate(providerPath(r.id)) },
              { id: 'test', label: 'Test connection', icon: 'activity', onSelect: () => toast('ok', 'Probe queued', `${r.code} responded in 214 ms.`) },
              {
                id: 'toggle', label: r.status === 'Active' ? 'Deactivate' : 'Activate',
                icon: r.status === 'Active' ? 'ban' : 'checkC',
                onSelect: () => setProviderStatus([r], r.status === 'Active' ? 'Inactive' : 'Active'),
              },
              { divider: true },
              {
                id: 'del', label: 'Delete', icon: 'trash', danger: true,
                onSelect: () => confirm({
                  title: `Delete ${r.name}?`,
                  body: 'Templates and clients bound to this provider stop sending until re-pointed.',
                  confirmLabel: 'Delete provider',
                  onConfirm: () => { setProviders((ps) => ps.filter((x) => x.id !== r.id)); toast('ok', 'Provider deleted', r.name) },
                }),
              },
            ]}
            emptyTitle="No providers"
            emptyBody="Add a gateway before any text message can leave the platform."
            emptyIcon="server"
          />
        )}

        {tab === 'templates' && (
          <DataWorkbench
            id="sms-templates"
            rows={templates}
            columns={[
              { key: 'name', label: 'Template', cls: 'td-main', locked: true },
              { key: 'body', label: 'Body', render: (r) => <span className="trunc" style={{ display: 'block', maxWidth: 380 }}>{r.body}</span> },
              { key: 'event', label: 'Event', cls: 'td-mono' },
              { key: 'provider', label: 'Provider', render: (r) => <Tag>{r.provider}</Tag> },
              { key: 'language', label: 'Language', render: (r) => r.language || 'English' },
              {
                key: 'segments', label: 'Segments', align: 'right', sortable: false,
                render: (r) => { const s = segmentInfo(r.body); return <span className="num">{s.chars} ch · {s.segments}</span> },
              },
              { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill> },
              { key: 'updated', label: 'Updated', cls: 'td-mono' },
            ]}
            selectable
            searchPlaceholder="Search templates…"
            toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => templateForm(null)}>Add Template</Button>}
            rowActions={(r) => [
              { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => templateForm(r) },
              { id: 'test', label: 'Send test', icon: 'sms', onSelect: () => toast('ok', 'Test queued', `${r.name} sent to your registered number.`) },
              { divider: true },
              {
                id: 'del', label: 'Delete', icon: 'trash', danger: true,
                onSelect: () => confirm({
                  title: `Delete ${r.name}?`,
                  body: 'The event bound to this template stops sending text messages.',
                  confirmLabel: 'Delete template',
                  onConfirm: () => { setTemplates((ts) => ts.filter((x) => x.id !== r.id)); toast('ok', 'Template deleted', r.name) },
                }),
              },
            ]}
            emptyTitle="No templates" emptyBody="Add a template so an event can render a message." emptyIcon="file"
          />
        )}

        {tab === 'clients' && (
          <DataWorkbench
            id="sms-clients"
            rows={clients}
            columns={[
              { key: 'code', label: 'Client code', cls: 'td-main td-mono', locked: true },
              { key: 'name', label: 'Name' },
              { key: 'application', label: 'Application', render: (r) => (r.application ? r.application : <span className="t-faint">Platform-wide</span>) },
              { key: 'provider', label: 'Provider', render: (r) => <Tag>{r.provider}</Tag> },
              { key: 'quota', label: 'Allotted quota', align: 'right', render: (r) => (r.quota ? <span className="num">{num(r.quota)} / mo</span> : '—') },
              { key: 'rateLimit', label: 'Rate limit', align: 'right', render: (r) => `${num(r.rateLimit)} ${r.window}` },
              { key: 'countries', label: 'Countries', cls: 'td-mono' },
              { key: 'status', label: 'Status', render: (r) => <Pill tone={r.status === 'Active' ? 'ok' : 'mut'} dot>{r.status}</Pill> },
            ]}
            selectable
            searchPlaceholder="Search clients…"
            toolbar={<Button size="sm" variant="pri" icon="plus" onClick={() => clientForm(null)}>Add Client</Button>}
            rowActions={(r) => [
              { id: 'edit', label: 'Edit', icon: 'edit', onSelect: () => clientForm(r) },
              { divider: true },
              {
                id: 'del', label: 'Delete', icon: 'trash', danger: true,
                onSelect: () => confirm({
                  title: `Delete ${r.name}?`,
                  body: 'Traffic in this routing bucket falls back to the default provider.',
                  confirmLabel: 'Delete client',
                  onConfirm: () => { setClients((cs) => cs.filter((x) => x.id !== r.id)); toast('ok', 'Client deleted', r.name) },
                }),
              },
            ]}
            emptyTitle="No clients" emptyBody="Add a client to route traffic with its own rate limit." emptyIcon="users"
          />
        )}
      </div>
    </>
  )
}
