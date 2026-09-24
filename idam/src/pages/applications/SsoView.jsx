import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import AppLogo from '../../components/primitives/AppLogo'
import { num } from '../../lib/format'
import { CertificateCard } from './facetControls'
import { PROTOCOL_SECTIONS, SECTIONS_FOR } from './ssoFields'
import { brandOf, clientScopeOf, specNameFor, specValuesFor, ssoEndpoints } from './appModel'

/**
 * The SSO application, read.
 *
 * Viewing and editing used to be the same screen: every field was an input,
 * whether or not anyone intended to change it, so reading a configuration back
 * meant scanning forty text boxes for the one that mattered and there was no
 * state in which the record was simply stated. This page states it. Editing is
 * a deliberate move to its own screen, reached by the button in the header.
 *
 * Every field the Add Application flow asked for is shown, under the heading
 * it was asked for under — the basics, the protocol and client identifier,
 * then each section of the protocol's published register, including the
 * fields left at their defaults, because "what is this application actually
 * configured with" is the question the page exists to answer. Attribute
 * configuration is not here: it has a section of its own on the record.
 */

/** How one field of the register reads when it is not being edited. */
export function specDisplay(field, value) {
  if (field.type === 'toggle') return value ? 'On' : 'Off'
  if (field.type === 'list') {
    const list = String(value || '').split('\n').map((v) => v.trim()).filter(Boolean)
    if (!list.length) return '—'
    return <span className="sso-view-list">{list.map((v) => <span className="mono t-xs" key={v}>{v}</span>)}</span>
  }
  if (field.type === 'metadata') {
    return value ? 'An SP descriptor is loaded' : 'No descriptor loaded'
  }
  if (field.type === 'textarea') {
    const text = String(value || '').trim()
    if (!text) return '—'
    return <span className="mono t-xs sso-view-block">{text}</span>
  }
  const text = String(value ?? '').trim()
  if (!text) return '—'
  if (field.type === 'number') return field.unit ? `${text} ${field.unit}` : text
  return <span className="mono t-xs">{text}</span>
}

/** The specification a protocol is read against, as a phrase. */
const specLabel = (specName) => {
  if (specName === 'SAML') return 'SAML 2.0 service provider'
  if (specName === 'JWT') return 'JWT delivery'
  if (specName === 'Link') return 'Catalog link — no assertion issued'
  return 'OpenID Connect client'
}

export default function SsoView({ app, onEdit, onTab, onChangeImage }) {
  const facet = app.sso

  if (!facet) {
    return (
      <Banner tone="info">
        This application has no SSO facet. Link one from the Linkage tab, or add federation from the Add Application flow.
      </Banner>
    )
  }

  const link = facet.protocol === 'Link'
  const saml = facet.protocol === 'SAML'
  const specName = specNameFor(facet.protocol)
  const values = specValuesFor(facet)
  const sections = SECTIONS_FOR(specName)
  const visible = PROTOCOL_SECTIONS(specName, values)
  const endpoints = ssoEndpoints(facet.sourceName)
  const scope = clientScopeOf(facet)
  const settingCount = sections.reduce((a, s) => a + s.fields.length, 0)

  return (
    <div className="stack">
      <div className="detail-cols">
        <div className="stack">
          {/* The fields Basics asked for, stated first: what the application is
              called and who it belongs to come before how it federates. */}
          <Card
            title="Basics"
            sub="Name, organization and description, as registered."
            actions={<Button size="sm" variant="pri" icon="edit" onClick={onEdit}>Edit</Button>}
          >
            <KeyValue
              cols={2}
              rows={[
                { k: 'Display name', v: app.displayName, icon: 'apps' },
                { k: 'Organization', v: app.org, icon: 'building' },
                { k: 'Description', v: app.description || '—', icon: 'file' },
                {
                  k: 'Application image',
                  icon: 'file',
                  node: (
                    <span className="sso-basics-media">
                      <AppLogo src={app.logoSrc} brand={brandOf(app)} name={app.displayName} size={22} />
                      <span className="t-xs t-mut">{app.logo || (brandOf(app) ? 'Vendor mark' : 'Generated from the name')}</span>
                      {onChangeImage && (
                        <button type="button" className="link" onClick={onChangeImage}>
                          <Icon name="edit" size={11} />
                          Change
                        </button>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          <Card
            title="Federation"
            sub={link
              ? 'A link application asserts nothing. It puts a tile in the catalog that opens a URL.'
              : `Configured against the published ${specLabel(specName)} specification.`}
          >
            <KeyValue
              cols={2}
              rows={[
                { k: 'Protocol', node: <Tag tone="acc">{facet.protocol}</Tag>, icon: 'sso' },
                { k: 'Client identifier', v: <span className="mono t-xs">{values.clientId || facet.clientId || '—'}</span>, icon: 'key' },
                {
                  k: 'Federated sign-in',
                  node: <Pill tone={facet.enabled ? 'ok' : 'mut'} dot>{facet.enabled ? 'Accepted' : 'Not accepted'}</Pill>,
                  icon: 'activity',
                },
                { k: 'Specification', v: link ? specLabel(specName) : `${visible.length} sections, ${settingCount} settings`, icon: 'layers' },
              ]}
            />
          </Card>

          {link ? (
            <Card title="Destination" sub="What the catalog tile opens.">
              <KeyValue
                cols={2}
                rows={[
                  { k: 'Target URL', v: <span className="mono t-xs">{facet.link?.targetUrl || '—'}</span>, icon: 'globe' },
                ]}
              />
            </Card>
          ) : visible.map((sec) => (
            <Card key={sec.id} title={sec.title} sub={sec.sub}>
              <KeyValue
                cols={2}
                rows={sec.fields.map((f) => ({ k: f.label, node: specDisplay(f, values[f.id]), icon: f.type === 'toggle' ? 'power' : 'tag' }))}
              />
            </Card>
          ))}
        </div>

        <div className="stack">
          {/* A SAML application's certificate is the Certificate field of its
              endpoint settings, read above; a second card holding the same
              material read as a second certificate. OIDC and JWT applications
              have no such field, so the signing certificate is stated here. */}
          {!link && !saml && (
            <CertificateCard
              cert={facet.cert && facet.cert.source === 'Platform signing certificate' ? null : facet.cert}
              sub="Signing certificate published in the key set and used to sign every token."
              readOnly
            />
          )}

          <Card title="Published endpoints" sub="Copy these into the service provider.">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Identity provider Entity ID', v: <span className="mono t-xs">{endpoints.entityId}</span>, icon: 'at' },
                { k: 'Metadata document', v: <span className="mono t-xs">{endpoints.metadata}</span>, icon: 'file' },
                { k: 'Sign-in endpoint', v: <span className="mono t-xs">{endpoints.login}</span>, icon: 'globe' },
                { k: 'Logout endpoint', v: <span className="mono t-xs">{endpoints.slo}</span>, icon: 'power' },
                { k: 'Key set', v: <span className="mono t-xs">{endpoints.jwks}</span>, icon: 'key' },
              ]}
            />
          </Card>

          <Card title="Assignments" sub="Who reaches this application, and where they are sent.">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Assigned users', v: num(facet.users), icon: 'users' },
                { k: 'URL configuration', v: link ? 'Not applicable' : facet.urls.length ? `${num(facet.urls.length)} configured` : 'Not configured', icon: 'globe' },
                !link && {
                  k: 'Client scope',
                  v: scope.fullScopeAllowed ? 'Full scope — every role' : `${num(scope.scopeRoles.length)} ${scope.scopeRoles.length === 1 ? 'role' : 'roles'} assigned`,
                  icon: 'key',
                },
              ]}
            />
            {!link && (
              <div className="row" style={{ marginTop: 12, gap: 6, flexWrap: 'wrap' }}>
                <Button size="sm" icon="globe" onClick={() => onTab('urls')}>URL Configuration</Button>
                <Button size="sm" icon="key" onClick={() => onTab('scope')}>Client Scope</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
