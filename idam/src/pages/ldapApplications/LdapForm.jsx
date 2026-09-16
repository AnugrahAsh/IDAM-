import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import Select from '../../components/primitives/Select'
import { PASSWORD_POLICIES } from '../../data/seed'
import { GLOBAL_DEFAULTS, connectionDefaults, emptyApp } from './ldapModel'

export function LdapConnectionForm({ app, onCancel, onSubmit }) {
  const base = useMemo(() => app || emptyApp(), [app])
  // connectionDefaults derives host and port from the URL but does not carry the
  // URL itself, and this form is written against d.url throughout — validation,
  // the probe buttons and the summary all read it. Without it every d.url.trim()
  // threw on first render and the Add and Edit screens white-screened.
  const initial = useMemo(() => ({
    name: base.name,
    displayName: base.displayName,
    description: base.description,
    ...connectionDefaults(base),
    url: base.url || '',
    baseDn: base.baseDn,
  }), [base])

  const { toast, navigate } = useApp()
  const [d, setD] = useState(initial)
  // A field is only judged once the operator has left it, so a message never
  // appears while they are still typing the first character.
  const [touched, setTouched] = useState({})
  // Both probes leave a visible verdict on the form, not only a toast that
  // fades. Attribute mapping is unreachable until the bind actually succeeded,
  // because a mapping cannot be resolved against a directory nobody has read.
  const [probe, setProbe] = useState({ connection: null, auth: null })
  const set = (k, v) => setD((x) => {
    const next = { ...x, [k]: v }
    // Changing where or how the platform binds invalidates any earlier verdict.
    return next
  })
  const setConn = (k, v) => { setProbe({ connection: null, auth: null }); set(k, v) }
  const blur = (k) => setTouched((t) => ({ ...t, [k]: true }))

  const problems = {
    name: !d.name.trim() ? 'Enter the identifier connectors and job logs will use.' : '',
    displayName: !d.displayName.trim() ? 'Enter the name shown across the console.' : '',
    url: !d.url.trim() || d.url.trim() === 'ldaps://'
      ? 'Enter the directory URL, for example ldaps://ldap-01.example.com:636.'
      : !/^ldaps?:\/\/[^\s:/]+(:\d+)?$/i.test(d.url.trim())
        ? 'Use the form ldap://host:port or ldaps://host:port.'
        : '',
  }
  const errorFor = (k) => (touched[k] ? problems[k] : '')
  const dirty = JSON.stringify(d) !== JSON.stringify(initial)
  const ready = !problems.name && !problems.displayName && !problems.url
  const tlsOn = d.url.trim().toLowerCase().startsWith('ldaps://')

  const stamp = () => new Date().toISOString().slice(11, 19)

  const test = () => {
    if (!d.url.trim() || d.url.trim() === 'ldaps://') {
      toast('warn', 'No URL', 'Enter the directory URL before testing the connection.')
      return
    }
    if (app && app.status === 'Failed') {
      setProbe((pr) => ({ ...pr, connection: { ok: false, at: stamp(), detail: `${d.url} did not answer. The host is unreachable or refused the transport.` }, auth: null }))
      toast('bad', 'Connection refused', `${d.displayName || d.name} did not answer on ${d.url}.`)
      return
    }
    setProbe((pr) => ({ ...pr, connection: { ok: true, at: stamp(), detail: `${d.url} answered the anonymous probe on ${tlsOn ? 'LDAPS' : 'LDAP'}. The server is reachable.` } }))
    toast('ok', 'Connection succeeded', `${d.url} answered the anonymous probe. The server is reachable.`)
  }

  const testAuth = () => {
    if (!d.url.trim() || d.url.trim() === 'ldaps://') {
      toast('warn', 'No URL', 'Enter the directory URL before testing authentication.')
      return
    }
    if (!d.bindDn.trim()) {
      toast('warn', 'No bind DN', 'Enter the bind DN before testing authentication.')
      return
    }
    if (!app && !d.bindPassword) {
      toast('warn', 'No credential', 'Enter the bind credential before testing authentication.')
      return
    }
    if (app && app.status === 'Failed') {
      setProbe((pr) => ({ ...pr, auth: { ok: false, at: stamp(), detail: `${d.bindDn} was rejected: the directory did not answer on ${d.url}.` } }))
      toast('bad', 'Authentication failed', `${d.bindDn} was rejected: the directory did not answer on ${d.url}.`)
      return
    }
    setProbe((pr) => ({
      connection: pr.connection || { ok: true, at: stamp(), detail: `${d.url} answered during the authenticated bind.` },
      auth: { ok: true, at: stamp(), detail: `${d.bindDn} authenticated against ${d.url}. The bind account can read the base DN.` },
    }))
    toast('ok', 'Authentication succeeded', `${d.bindDn} authenticated against ${d.url}.`)
  }

  const authOk = !!(probe.auth && probe.auth.ok)

  const openMapping = () => {
    if (!authOk) return
    if (app) { navigate(`/iam/ldapapplications/${app.id}/attributes`); return }
    toast('info', 'Save the directory first', 'Attribute mapping opens on the directory record once it is created.')
  }

  return (
    <>
      <DetailHeader
        backTo={app ? `/iam/ldapapplications/${app.id}` : '/iam/ldapapplications'}
        backLabel={app ? app.displayName : 'LDAP Applications'}
        eyebrow={app ? 'Edit directory connection' : 'New directory connection'}
        title={app ? app.displayName : d.displayName || 'Register a directory'}
        sub="Register the directory the platform binds to and the branch it reads. Nothing is written until the form is saved."
        media={
          <span className="feed-ic" data-tone="acc" style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)' }}>
            <Icon name="directory" size={26} />
          </span>
        }
        badges={<Pill tone={app ? 'acc' : 'warn'} dot>{app ? 'Editing' : 'Draft'}</Pill>}
        meta={
          <>
            <Fact icon="globe" label="URL" value={<span className="mono">{d.url || 'Not set'}</span>} />
            <Fact icon="branch" label="Base DN" value={<span className="mono">{d.baseDn || 'Not set'}</span>} />
            <Fact icon="shield" label="Transport" value={tlsOn ? 'LDAPS' : 'LDAP'} />
            {app && <Fact icon="users" label="Entries" value={num(app.entries)} />}
          </>
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Identity" sub="How this directory is named across the console">
              <div className="grid grid-2">
                <Field label="Name" required hint="Uppercase identifier used by connectors and job logs." htmlFor="ldap-name" error={errorFor('name')}>
                  <TextInput
                    id="ldap-name"
                    className="mono"
                    value={d.name}
                    placeholder="PARTNER_EU"
                    disabled={!!app}
                    onBlur={() => blur('name')}
                    onChange={(e) => set('name', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  />
                </Field>
                <Field label="Display name" required htmlFor="ldap-display" error={errorFor('displayName')}>
                  <TextInput id="ldap-display" value={d.displayName} placeholder="Partner Directory (EU)" onBlur={() => blur('displayName')} onChange={(e) => set('displayName', e.target.value)} />
                </Field>
                <Field label="Description" span={2} htmlFor="ldap-desc">
                  <TextInput
                    as="textarea"
                    id="ldap-desc"
                    rows={2}
                    value={d.description}
                    placeholder="What this directory holds and who depends on it."
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Connection" sub="Where the platform binds and with which credential">
              <div className="grid grid-2">
                <Field label="URL" required span={2} hint="Use ldaps:// wherever the target supports it. The transport is derived from the scheme." htmlFor="ldap-url" error={errorFor('url')}>
                  <TextInput id="ldap-url" className="mono" value={d.url} placeholder="ldaps://ldap-eu.tanflow.io:636" onBlur={() => blur('url')} onChange={(e) => setConn('url', e.target.value)} />
                </Field>
                <div className="ldap-inline-act">
                  <Button size="sm" icon="play" onClick={test}>Test connection</Button>
                  <span className="t-xs t-mut">Probes the URL anonymously. No credential is sent.</span>
                  <ProbeVerdict result={probe.connection} label="Connection" />
                </div>
                <Field label="Base DN" span={2} htmlFor="ldap-base">
                  <TextInput id="ldap-base" className="mono" value={d.baseDn} placeholder="dc=tanflow,dc=com" onChange={(e) => set('baseDn', e.target.value)} />
                </Field>
                <Field label="Bind DN" span={2} htmlFor="ldap-bind">
                  <TextInput id="ldap-bind" className="mono" value={d.bindDn} placeholder="cn=idam,ou=svc,dc=tanflow,dc=com" onChange={(e) => setConn('bindDn', e.target.value)} />
                </Field>
                <Field label="Bind credential" span={2} hint={app ? 'Leave blank to keep the stored credential.' : 'Stored in the platform secret store, never shown again.'} htmlFor="ldap-pw">
                  <TextInput id="ldap-pw" type="password" autoComplete="off" value={d.bindPassword} placeholder={app ? 'Unchanged' : 'Bind credential'} onChange={(e) => setConn('bindPassword', e.target.value)} />
                </Field>
                <div className="ldap-inline-act">
                  <Button size="sm" icon="key" onClick={testAuth}>Test authentication</Button>
                  <span className="t-xs t-mut">Binds with the credentials above to validate LDAP user authentication.</span>
                  <ProbeVerdict result={probe.auth} label="Authentication" />
                </div>
                <div className="ldap-inline-act" style={{ gridColumn: '1 / -1' }}>
                  <Button size="sm" icon="swap" disabled={!authOk} onClick={openMapping}>Attribute mapping</Button>
                  <span className="t-xs t-mut">
                    {authOk
                      ? 'The bind succeeded. Map directory attributes onto the identity schema.'
                      : 'Available once Test authentication succeeds — a mapping cannot be resolved against a directory that has not been read.'}
                  </span>
                </div>
                <Field label="Connection timeout" hint="Seconds." htmlFor="ldap-timeout">
                  <TextInput id="ldap-timeout" type="number" min="1" max="120" value={d.timeout} onChange={(e) => set('timeout', Number(e.target.value))} />
                </Field>
                <Field label="Connection pool size" htmlFor="ldap-pool">
                  <TextInput id="ldap-pool" type="number" min="1" max="64" value={d.poolSize} onChange={(e) => set('poolSize', Number(e.target.value))} />
                </Field>
              </div>
              {!tlsOn && (
                <div style={{ marginTop: 14 }}>
                  <Banner tone="warn">
                    Credentials travel in clear text on plain LDAP. Use an ldaps:// URL wherever the target supports it.
                  </Banner>
                </div>
              )}
            </Card>
          </div>

          <div className="stack">
            <Card title="Summary" sub="What will be written">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Name', v: <span className="mono">{d.name || '—'}</span>, icon: 'tag' },
                  { k: 'Display name', v: d.displayName || '—', icon: 'directory' },
                  { k: 'URL', v: <span className="mono t-xs">{d.url}</span>, icon: 'globe' },
                  { k: 'Transport', v: tlsOn ? 'LDAPS, port 636' : 'LDAP, port 389', icon: 'shield' },
                  { k: 'Base DN', v: <span className="mono t-xs">{d.baseDn || '—'}</span>, icon: 'branch' },
                  { k: 'Bind DN', v: <span className="mono t-xs">{d.bindDn || 'anonymous'}</span>, icon: 'key' },
                ]}
              />
            </Card>
            <Card title="Validation" sub="Checked before the connection is saved">
              <div className="stack" style={{ gap: 9 }}>
                {[
                  { ok: !!d.name.trim(), label: 'Name is set' },
                  { ok: !!d.displayName.trim(), label: 'Display name is set' },
                  { ok: d.url.trim().length > 8, label: 'URL is complete' },
                  { ok: tlsOn, label: 'Transport is encrypted' },
                  { ok: !!d.baseDn.trim(), label: 'Base DN is set' },
                  { ok: !!(probe.connection && probe.connection.ok), label: 'Connection tested' },
                  { ok: authOk, label: 'Authentication tested' },
                ].map((c) => (
                  <div className="row" key={c.label} style={{ gap: 8 }}>
                    <span className="feed-ic" data-tone={c.ok ? 'ok' : 'warn'} style={{ width: 22, height: 22 }}>
                      <Icon name={c.ok ? 'check' : 'warn'} size={11} stroke={2.6} />
                    </span>
                    <span className="t-sm">{c.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            {!app && (
              <Banner tone="info">
                A new directory is registered as degraded until its first successful synchronization. Run a read once the
                connection test passes.
              </Banner>
            )}
          </div>
        </div>

        <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="pri" icon="save" disabled={!ready} onClick={() => onSubmit({ ...d, tls: tlsOn })}>
            {app ? 'Save changes' : 'Create application'}
          </Button>
        </StickyActions>
      </div>
    </>
  )
}

export function LdapDefaultsForm({ count, directories = [], onCancel }) {
  const { toast } = useApp()
  const [d, setD] = useState(GLOBAL_DEFAULTS)
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(d) !== JSON.stringify(GLOBAL_DEFAULTS)

  return (
    <>
      <DetailHeader
        backTo="/iam/ldapapplications"
        backLabel="LDAP Applications"
        eyebrow="LDAP applications"
        title="Configure"
        sub="Connection defaults and password policy mapping, applied to every registered LDAP application that has not overridden the setting on its own connection."
        media={
          <span className="feed-ic" data-tone="acc" style={{ width: 56, height: 56, borderRadius: 'var(--r-lg)' }}>
            <Icon name="sliders" size={26} />
          </span>
        }
        meta={
          <>
            <Fact icon="directory" label="Applies to" value={`${count} directories`} />
            <Fact icon="clock" label="Default timeout" value={`${d.timeout} s`} />
            <Fact icon="layers" label="Default pool size" value={d.poolSize} />
          </>
        }
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Banner tone="info">
              Changing a default does not overwrite a directory that has set its own value. Directories using the default
              pick the new value up on their next bind.
            </Banner>

            <Card title="Connection defaults" sub="Applied when a directory has not set its own value">
              <div className="grid grid-2">
                <Field label="Default pool size" htmlFor="gcfg-pool">
                  <TextInput id="gcfg-pool" type="number" min="1" max="64" value={d.poolSize} onChange={(e) => set('poolSize', Number(e.target.value))} />
                </Field>
                <Field label="Default timeout" hint="Seconds." htmlFor="gcfg-timeout">
                  <TextInput id="gcfg-timeout" type="number" min="1" max="120" value={d.timeout} onChange={(e) => set('timeout', Number(e.target.value))} />
                </Field>
                <Field label="Retries before failure" span={2} htmlFor="gcfg-retries">
                  <TextInput id="gcfg-retries" type="number" min="0" max="10" value={d.retries} onChange={(e) => set('retries', Number(e.target.value))} />
                </Field>
              </div>
            </Card>

            <Card
              title="Password policy mapping"
              sub="Which credential rule set governs identities sourced from each directory"
            >
              <div className="stack">
                <Field
                  label="Default password policy"
                  hint="Applied to every directory that has not been mapped to one of its own below."
                  htmlFor="gcfg-pwd"
                >
                  <Select
                    id="gcfg-pwd"
                    value={d.passwordPolicy}
                    options={PASSWORD_POLICIES.map((p) => p.name)}
                    onChange={(e) => set('passwordPolicy', e.target.value)}
                  />
                </Field>

                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr><th>Directory</th><th>Password policy</th></tr>
                    </thead>
                    <tbody>
                      {directories.map((dir) => (
                        <tr key={dir}>
                          <td className="td-main">{dir}</td>
                          <td>
                            <Select
                              aria-label={`Password policy for ${dir}`}
                              value={d.policyByDirectory[dir] || ''}
                              placeholder={`Use the default · ${d.passwordPolicy}`}
                              options={PASSWORD_POLICIES.map((p) => p.name)}
                              onChange={(e) => set('policyByDirectory', { ...d.policyByDirectory, [dir]: e.target.value })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="t-xs t-mut">
                  A mapped policy governs length, complexity and expiry for identities read from that directory. Directories
                  left unmapped fall back to the default above.
                </div>
              </div>
            </Card>

            <Card title="Policy" sub="Enforced across every LDAP application">
              <div className="stack" style={{ gap: 10 }}>
                {[
                  ['logBinds', 'Write every bind to the audit log'],
                  ['quarantineOnFailure', 'Quarantine a directory after three consecutive failed runs'],
                ].map(([key, label]) => (
                  <div className="row" key={key}>
                    <Switch checked={d[key]} onChange={(v) => set(key, v)} label={label} />
                    <span className="t-sm">{label}</span>
                  </div>
                ))}
              </div>
              {d.logBinds && (
                <div style={{ marginTop: 14 }}>
                  <Banner tone="warn">
                    Bind logging is high volume. Expect a material increase in log retention cost across every directory.
                  </Banner>
                </div>
              )}
            </Card>
          </div>

          <Card title="Effect" sub="What changes when these defaults are saved">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Directories affected', v: `${count} registered applications`, icon: 'directory' },
                { k: 'Applied at', v: 'The next bind, no restart required', icon: 'refresh' },
                { k: 'Overrides', v: 'Per-directory connection settings always win', icon: 'sliders' },
                { k: 'Audit', v: 'The change is recorded against your operator account', icon: 'logs' },
              ]}
            />
          </Card>
        </div>

        <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="pri"
            icon="save"
            disabled={!dirty}
            onClick={() => toast('ok', 'Defaults saved', 'Connection defaults were distributed to every LDAP application.')}
          >
            Save changes
          </Button>
        </StickyActions>
      </div>
    </>
  )
}

/**
 * A probe verdict has to survive the toast that announced it — an operator who
 * looks away must still be able to see whether the last bind worked.
 */
function ProbeVerdict({ result, label }) {
  if (!result) return null
  return (
    <span className="ldap-probe" data-tone={result.ok ? 'ok' : 'bad'} role="status">
      <Icon name={result.ok ? 'checkC' : 'warn'} size={12} />
      <span className="t-xs">
        <b>{label} {result.ok ? 'succeeded' : 'failed'}</b> at {result.at} — {result.detail}
      </span>
    </span>
  )
}
