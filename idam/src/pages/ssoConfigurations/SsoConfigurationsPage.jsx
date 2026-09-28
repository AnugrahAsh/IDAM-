import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import KeyValue from '../../components/primitives/KeyValue'
import PageBar from '../../components/shell/PageBar'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import {
  Skeleton, SkeletonCard, SkeletonForm, SkeletonKeyValue, SkeletonPageBar,
} from '../../components/primitives/Skeleton'
import { SSO_APPS } from '../../data/seed'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import './SsoConfigurationsPage.css'
import Switch from '../../components/primitives/Switch'
import AdminApplicationForm from './AdminApplicationForm'

const METHODS = [
  { id: 'LOCAL', label: 'LOCAL', icon: 'lock', title: 'Local authentication', sub: 'Credentials are held and verified by the platform itself.' },
  { id: 'SAML', label: 'SAML', icon: 'certify', title: 'SAML 2.0 federation', sub: 'Assertions are issued by an external identity provider.' },
  { id: 'OAUTH', label: 'OAUTH', icon: 'key', title: 'OAuth 2.0 / OpenID Connect', sub: 'Tokens are issued by an external authorisation server.' },
]

const CERTIFICATE = [
  '-----BEGIN CERTIFICATE-----',
  'MIIDazCCAlOgAwIBAgIUZ2xvYmFsLXRhbmZsb3ctaWRhbS1zc28wDQYJKoZIhvcN',
  'AQELBQAwRTELMAkGA1UEBhMCSU4xEjAQBgNVBAgMCVVUVEFSQUtIRDEQMA4GA1UE',
  'CgwHVGFuZmxvdzEQMA4GA1UEAwwHc3NvLWlkcDAeFw0yNjA0MTgwOTMwMDBaFw0y',
  'NzA0MTgwOTMwMDBaMEUxCzAJBgNVBAYTAklOMRIwEAYDVQQIDAlVVFRBUkFLSEQx',
  'EDAOBgNVBAoMB1RhbmZsb3cxEDAOBgNVBAMMB3Nzby1pZHAwggEiMA0GCSqGSIb3',
  'DQEBAQUAA4IBDwAwggEKAoIBAQC7Qm5vdC1hLXJlYWwta2V5LWZvci1kZW1vLXVz',
  'ZS1vbmx5LXRhbmZsb3ctaWRhbS1zc28tY29uZmlndXJhdGlvbi1zY3JlZW4tMDAx',
  '-----END CERTIFICATE-----',
].join('\n')

const DEFAULTS = {
  loginUrl: 'https://login.tanflow.com/saml2/sso',
  logoutUrl: 'https://login.tanflow.com/saml2/slo',
  certificate: CERTIFICATE,
  authorizationEndpoint: 'https://login.tanflow.com/oauth2/v1/authorize',
  tokenEndpoint: 'https://login.tanflow.com/oauth2/v1/token',
  userInfoEndpoint: 'https://login.tanflow.com/oauth2/v1/userinfo',
  clientId: 'tanflow-idam-console',
  clientSecret: 'rotate-this-placeholder-secret',
  scope: 'openid profile email groups',
  forceSso: true,
  adminFallback: true,
  jitProvisioning: false,
}

const ENTITY_ID = 'https://sso.tanflow.com/idam'

const METADATA_URL = 'https://sso.tanflow.com/idam/metadata.xml'

const acsFor = (method) => (method === 'OAUTH'
  ? 'https://sso.tanflow.com/oauth2/idam/callback'
  : 'https://sso.tanflow.com/saml2/idam/acs')

export default function SsoConfigurationsPage() {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const [method, setMethod] = useState('SAML')
  const [form, setForm] = useState(DEFAULTS)
  const [errors, setErrors] = useState({})
  const [dirty, setDirty] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [adminApp, setAdminApp] = useState('workspace')

  /* Everything on this screen is the tenant's submitted configuration read
     back — the endpoints, the signing material, the metadata the provider is
     given. It settles once, on arrival.

     Changing the method deliberately does not settle again. The three methods
     are three faces of one record the page already holds, and re-running the
     wait would blank fields an administrator may be part way through typing
     into for the sake of a round trip that never happened. */
  const loading = useLoading()

  const active = useMemo(() => METHODS.find((m) => m.id === method), [method])
  const admin = useMemo(() => SSO_APPS.find((a) => a.name === adminApp), [adminApp])
  const federated = useMemo(() => SSO_APPS.filter((a) => a.enabled).length, [])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e))
    setDirty(true)
  }

  const copy = (label, value) => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value)
    toast('ok', 'Copied', `${label} is on the clipboard.`)
  }

  const chooseMethod = (next) => {
    if (next === method) return
    if (next === 'LOCAL' && method !== 'LOCAL') {
      confirm({
        title: 'Switch to local authentication?',
        body: 'Federated sign-in stops at the next request and every identity falls back to the password stored by the platform. Sessions already established are not revoked.',
        confirmLabel: 'Use local authentication',
        onConfirm: () => { setMethod('LOCAL'); setErrors({}); setDirty(true) },
      })
      return
    }
    setMethod(next)
    setErrors({})
    setDirty(true)
  }

  const submit = () => {
    const next = {}
    if (method === 'SAML') {
      if (!form.loginUrl.trim()) next.loginUrl = 'The SSO login URL is required.'
      if (!form.certificate.trim()) next.certificate = 'Paste the signing certificate published by the identity provider.'
    }
    if (method === 'OAUTH') {
      if (!form.authorizationEndpoint.trim()) next.authorizationEndpoint = 'The authorization endpoint is required.'
      if (!form.tokenEndpoint.trim()) next.tokenEndpoint = 'The token endpoint is required.'
      if (!form.clientId.trim()) next.clientId = 'The client identifier is required.'
      if (!form.clientSecret.trim()) next.clientSecret = 'The client secret is required.'
      if (!form.scope.trim()) next.scope = 'At least the openid scope is required.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast('warn', 'Configuration incomplete', 'Resolve the highlighted fields before submitting.')
      return
    }
    setDirty(false)
    toast('ok', 'Configuration submitted', `${active.title} is now the authentication method for this tenant.`)
  }

  const reset = () => confirm({
    title: 'Discard changes?',
    body: 'Every unsaved field returns to the last submitted configuration.',
    confirmLabel: 'Discard changes',
    onConfirm: () => { setForm(DEFAULTS); setErrors({}); setDirty(false); toast('ok', 'Changes discarded', 'The last submitted configuration was restored.') },
  })

  const openAdminApplication = () => setDrawer({
    title: 'Admin application',
    sub: 'The federated client the administration console signs in through',
    children: (
      <AdminApplicationForm
        current={adminApp}
        onCancel={() => setDrawer(null)}
        onSubmit={(app) => {
          setAdminApp(app.name)
          setDrawer(null)
          toast('ok', 'Admin application set', `${app.displayName} now brokers administrator sign-in.`)
        }}
      />
    ),
  })

  if (loading) {
    return (
      /* One announcing region for the screen; every shape inside it is
         decoration and says nothing of its own. */
      <Skeleton label="Loading the single sign-on configuration" className="sso-skel">
        <SkeletonPageBar actions={3} crumbs={1} />
        {/* The rail of facts under the title. The shared masthead shape has no
            rail, and without this row the skeleton is a tag shorter than the
            bar it stands in for. */}
        <div className="sso-skel-rail" aria-hidden="true">
          <span className="skel" style={{ width: 148 }} />
          <span className="skel" style={{ width: 172 }} />
          <span className="skel" style={{ width: 196 }} />
          <span className="skel" style={{ width: 164 }} />
        </div>

        <div className="stack">
          {/* Authentication method: a pill over the three switch rows. Neither
              shape is in the kit, so they are drawn at the heights
              components.css gives .pill and .switch. */}
          <SkeletonCard>
            <div className="sso-skel-body">
              <div><span className="skel sso-skel-pill" /><span className="skel" style={{ width: '46%', height: 9 }} /></div>
              <div><span className="skel sso-skel-sw" /><span className="skel" style={{ width: '38%', height: 9 }} /></div>
              <div><span className="skel sso-skel-sw" /><span className="skel" style={{ width: '52%', height: 9 }} /></div>
              <div><span className="skel sso-skel-sw" /><span className="skel" style={{ width: '44%', height: 9 }} /></div>
            </div>
          </SkeletonCard>

          {/* The endpoint editor. SAML opens by default and is the taller of
              the two, so the shape is drawn to it: three stacked fields, the
              last one the certificate box. */}
          <SkeletonCard>
            <SkeletonForm fields={2} cols={1} actions={false} />
            <div className="sso-skel-cert">
              <span className="skel" style={{ width: '32%', height: 8 }} />
              <span className="skel sso-skel-pem" />
            </div>
          </SkeletonCard>

          <SkeletonCard foot>
            <SkeletonKeyValue cols={1} rows={6} />
          </SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  return (
    <>
      <PageBar
        title="SSO Configurations"
        sub="The authentication method this tenant presents at sign-in, and the identity provider settings the platform trusts."
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Metadata ready', 'Service provider metadata is downloading as metadata.xml.')}>Export Metadata</Button>
            <Button icon="sso" onClick={openAdminApplication}>Admin Application</Button>
            <Button variant="pri" icon="save" onClick={submit}>Submit</Button>
          </>
        }
        rail={
          <>
            <Tag tone="acc"><span className="sso-fact"><Icon name={active.icon} size={12} />{active.title}</span></Tag>
            <Tag><span className="sso-fact"><Icon name="sso" size={12} />{federated} federated applications</span></Tag>
            <Tag><span className="sso-fact"><Icon name="user" size={12} />Admin via {admin ? admin.displayName : 'local credentials'}</span></Tag>
            <Tag><span className="sso-fact"><Icon name="certify" size={12} />Certificate valid to 2027-04-18</span></Tag>
          </>
        }
      />

      <div className="stack">
        {dirty && (
          <Banner tone="warn">
            <b>Unsaved changes.</b> The tenant still authenticates with the last submitted configuration until you press Submit.
          </Banner>
        )}

        <Card
          title="Authentication method"
          sub="Applies to every identity that is not exempted by a network restriction policy."
          actions={
            <div className="seg" role="tablist" aria-label="Authentication method">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={m.id === method}
                  data-on={m.id === method}
                  onClick={() => chooseMethod(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Pill tone="acc" icon={active.icon}>{active.title}</Pill>
            <span className="t-sm t-mut">{active.sub}</span>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <Switch checked={form.forceSso} onChange={(v) => set('forceSso', v)} label="Force single sign-on" disabled={method === 'LOCAL'} />
            <span className="t-sm">Force single sign-on for every identity</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Switch checked={form.adminFallback} onChange={(v) => set('adminFallback', v)} label="Allow local fallback for administrators" />
            <span className="t-sm">Allow local password fallback for global administrators</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <Switch checked={form.jitProvisioning} onChange={(v) => set('jitProvisioning', v)} label="Provision identities on first sign-in" disabled={method === 'LOCAL'} />
            <span className="t-sm">Create an identity on first successful assertion</span>
          </div>

          {!form.adminFallback && (
            <div style={{ marginTop: 14 }}>
              <Banner tone="warn">
                With no local fallback, an identity provider outage locks every administrator out of this console.
              </Banner>
            </div>
          )}
        </Card>

        {method === 'LOCAL' && (
          <Card
            title="Local authentication"
            sub="No external identity provider is contacted at sign-in."
            actions={<Tag>No federation</Tag>}
            footer={
              <>
                <Icon name="info" size={12} />
                <span>Credential rules and second factors are governed outside this screen.</span>
                <span className="spacer" />
                <Button size="sm" icon="lock" onClick={() => navigate('passwordPolicy')}>Password policy</Button>
                <Button size="sm" icon="shield" onClick={() => navigate('mfa')}>Multi-factor authentication</Button>
              </>
            }
          >
            <Banner tone="info">
              Identities authenticate against the credential held by the platform. Password length, history, expiry and
              lockout come from the password policy assigned to the identity organization, and any second factor comes
              from the multi-factor authentication configuration. Federated applications continue to work, but the
              platform is the identity provider rather than the service provider.
            </Banner>

            <div style={{ marginTop: 16 }}>
              <KeyValue
                cols={2}
                rows={[
                  { k: 'Credential store', v: 'Platform database, Argon2id', icon: 'db' },
                  { k: 'Session lifetime', v: '8 hours, sliding', icon: 'clock' },
                  { k: 'Second factor', v: 'Governed by the MFA configuration', icon: 'shield' },
                  { k: 'Federated applications', v: `${federated} continue to trust this platform`, icon: 'sso' },
                ]}
              />
            </div>
          </Card>
        )}

        {method === 'SAML' && (
          <Card
            title="SAML configuration"
            sub="Endpoints and signing material published by the identity provider."
            actions={<Tag tone="acc">SAML 2.0</Tag>}
          >
            <div className="grid grid-2">
              <Field label="SSO Login URL" required error={errors.loginUrl} span={2} hint="Where the platform redirects the browser to obtain an assertion." htmlFor="saml-login">
                <TextInput id="saml-login" className="mono" value={form.loginUrl} placeholder="https://login.example.com/saml2/sso" onChange={(e) => set('loginUrl', e.target.value)} />
              </Field>
              <Field label="SSO Logout URL" span={2} hint="Leave blank to end the platform session only." htmlFor="saml-logout">
                <TextInput id="saml-logout" className="mono" value={form.logoutUrl} placeholder="https://login.example.com/saml2/slo" onChange={(e) => set('logoutUrl', e.target.value)} />
              </Field>
              <Field label="Public Certificate" required error={errors.certificate} span={2} hint="PEM encoded. Used to verify the signature on every incoming assertion." htmlFor="saml-cert">
                <TextInput
                  as="textarea"
                  id="saml-cert"
                  className="mono"
                  rows={10}
                  spellCheck="false"
                  value={form.certificate}
                  onChange={(e) => set('certificate', e.target.value)}
                  style={{ minHeight: 190 }}
                />
              </Field>
            </div>

            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <Button size="sm" icon="copy" onClick={() => copy('The signing certificate', form.certificate)}>Copy certificate</Button>
              <Button size="sm" icon="play" onClick={() => toast('info', 'Test assertion posted', 'A signed test assertion was posted to the configured login URL.')}>Test sign-in</Button>
            </div>
          </Card>
        )}

        {method === 'OAUTH' && (
          <Card
            title="OAuth 2.0 configuration"
            sub="Authorisation server endpoints and the client credentials issued to this platform."
            actions={<Tag tone="acc">OAuth 2.0</Tag>}
          >
            <div className="grid grid-2">
              <Field label="Authorization Endpoint" required error={errors.authorizationEndpoint} span={2} htmlFor="oauth-auth">
                <TextInput id="oauth-auth" className="mono" value={form.authorizationEndpoint} placeholder="https://login.example.com/oauth2/v1/authorize" onChange={(e) => set('authorizationEndpoint', e.target.value)} />
              </Field>
              <Field label="Token Endpoint" required error={errors.tokenEndpoint} span={2} htmlFor="oauth-token">
                <TextInput id="oauth-token" className="mono" value={form.tokenEndpoint} placeholder="https://login.example.com/oauth2/v1/token" onChange={(e) => set('tokenEndpoint', e.target.value)} />
              </Field>
              <Field label="UserInfo Endpoint" span={2} hint="Queried after the token exchange to resolve identity claims." htmlFor="oauth-userinfo">
                <TextInput id="oauth-userinfo" className="mono" value={form.userInfoEndpoint} placeholder="https://login.example.com/oauth2/v1/userinfo" onChange={(e) => set('userInfoEndpoint', e.target.value)} />
              </Field>
              <Field label="Client ID" required error={errors.clientId} htmlFor="oauth-client">
                <TextInput id="oauth-client" className="mono" value={form.clientId} onChange={(e) => set('clientId', e.target.value)} />
              </Field>
              <Field label="Client Secret" required error={errors.clientSecret} hint="Stored encrypted. Rotate it whenever an administrator leaves." htmlFor="oauth-secret">
                <div className="row" style={{ gap: 6 }}>
                  <TextInput
                    id="oauth-secret"
                    className="mono"
                    style={{ flex: 1 }}
                    type={revealed ? 'text' : 'password'}
                    autoComplete="off"
                    value={form.clientSecret}
                    onChange={(e) => set('clientSecret', e.target.value)}
                  />
                  <IconButton
                    icon={revealed ? 'eyeoff' : 'eye'}
                    label={revealed ? 'Hide client secret' : 'Reveal client secret'}
                    onClick={() => setRevealed((v) => !v)}
                  />
                </div>
              </Field>
              <Field label="Scope" required error={errors.scope} span={2} hint="Space separated. The openid scope is mandatory for identity claims." htmlFor="oauth-scope">
                <TextInput id="oauth-scope" className="mono" value={form.scope} onChange={(e) => set('scope', e.target.value)} />
              </Field>
            </div>

            <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
              <Button size="sm" icon="refresh" onClick={() => toast('ok', 'Discovery complete', 'Endpoints were re-read from the published discovery document.')}>Reload discovery</Button>
              <Button size="sm" icon="play" onClick={() => toast('info', 'Authorisation test started', 'An authorisation code round trip was started against the configured endpoints.')}>Test sign-in</Button>
            </div>
          </Card>
        )}

        <Card
          title="Identity provider metadata"
          sub="What the identity provider needs in order to trust this platform."
          actions={
            <Button size="sm" icon="copy" onClick={() => copy('The metadata bundle', `${ENTITY_ID}\n${acsFor(method)}\n${METADATA_URL}`)}>Copy all</Button>
          }
          footer={
            <>
              <Icon name="certify" size={12} />
              <span>Service provider certificate expires 2027-04-18</span>
              <span className="spacer" />
              <Button size="sm" icon="download" onClick={() => toast('ok', 'Metadata ready', 'Service provider metadata is downloading as metadata.xml.')}>Export Metadata</Button>
            </>
          }
        >
          <KeyValue
            cols={1}
            rows={[
              {
                k: 'Entity ID',
                icon: 'at',
                node: (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="mono trunc">{ENTITY_ID}</span>
                    <IconButton icon="copy" size="sm" label="Copy entity ID" onClick={() => copy('The entity ID', ENTITY_ID)} />
                  </span>
                ),
              },
              {
                k: method === 'OAUTH' ? 'Redirect URI' : 'ACS URL',
                icon: 'globe',
                node: (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="mono trunc">{acsFor(method)}</span>
                    <IconButton icon="copy" size="sm" label="Copy ACS URL" onClick={() => copy(method === 'OAUTH' ? 'The redirect URI' : 'The ACS URL', acsFor(method))} />
                  </span>
                ),
              },
              {
                k: 'Metadata document',
                icon: 'file',
                node: (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="mono trunc">{METADATA_URL}</span>
                    <IconButton icon="copy" size="sm" label="Copy metadata URL" onClick={() => copy('The metadata URL', METADATA_URL)} />
                  </span>
                ),
              },
              { k: 'Name identifier format', v: method === 'OAUTH' ? 'sub, mapped from email' : 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress', icon: 'user' },
              { k: 'Signature algorithm', v: 'RSA-SHA256', icon: 'shield' },
              { k: 'Admin application', v: admin ? `${admin.displayName} · ${admin.protocol}` : 'Local credentials', icon: 'sso' },
            ]}
          />
        </Card>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button icon="refresh" disabled={!dirty} onClick={reset}>Discard changes</Button>
          <Button icon="sso" onClick={() => navigate('ssoApplications')}>SSO applications</Button>
          <Button variant="pri" icon="save" onClick={submit}>Submit</Button>
        </div>
      </div>
    </>
  )
}
