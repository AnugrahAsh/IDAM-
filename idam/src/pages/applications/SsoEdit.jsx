import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import ImageField from './ImageField'
import KeyValue from '../../components/primitives/KeyValue'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import StickyActions from '../../components/shell/StickyActions'
import { useApp } from '../../store/AppContext'
import { CertificateCard, LinkFields } from './facetControls'
import SpecField, { SpecSection } from './SpecFields'
import { PROTOCOL_SECTIONS, SECTIONS_FOR, cleanPrefill, clientIdField, missingRequired } from './ssoFields'
import { ORG_OPTIONS, blankLink, linkIssues, specNameFor, specValuesFor } from './appModel'

/**
 * The SSO application, edited.
 *
 * The same fields the Add Application wizard asked for, in the same order —
 * the basics, the protocol with its client identifier, then every section of
 * the protocol's published register — so a field cannot exist on one and not
 * the other, with one exception. The metadata XML upload is an onboarding
 * affordance: it exists to fill a blank form in from an SP descriptor. On an
 * application already configured, re-importing would silently overwrite
 * endpoints somebody has since corrected by hand, so the upload is not offered
 * here and the fields it would have written are edited directly.
 */
export default function SsoEdit({ app, onPatch, onDone }) {
  const { toast } = useApp()
  const facet = app.sso

  const initial = useMemo(() => (facet ? {
    displayName: app.displayName || '',
    org: app.org || '',
    description: app.description || '',
    logo: app.logo || '',
    logoSrc: app.logoSrc || '',
    enabled: facet.enabled,
    spec: specValuesFor(facet),
    link: { ...blankLink(), ...(facet.link || {}) },
    cert: facet.cert || null,
  } : null), [app, facet])
  const [draft, setDraft] = useState(initial)
  const [attempted, setAttempted] = useState(false)

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
  const clientField = clientIdField(specName)
  // Every section the configuration currently shows, less the descriptor upload.
  const visible = PROTOCOL_SECTIONS(specName, draft.spec).filter((sec) => sec.id !== 'metadata')
  const sections = SECTIONS_FOR(specName)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setSpec = (id, value, prefill) => setDraft((d) => ({
    ...d,
    spec: { ...d.spec, [id]: value, ...cleanPrefill(prefill) },
  }))
  const setLink = (patch) => setDraft((d) => ({ ...d, link: { ...d.link, ...patch } }))

  const missing = link ? [] : missingRequired(specName, draft.spec).filter((f) => f.id !== 'metadataXml')
  const specErrors = Object.fromEntries(missing.map((f) => [f.id, `${f.label} is required.`]))
  const basicsIssues = [
    !String(draft.displayName || '').trim() && 'A display name is required.',
    !draft.org && 'Choose an organization.',
  ].filter(Boolean)
  const issues = [
    ...basicsIssues,
    ...(link ? linkIssues(draft.link) : missing.map((f) => `${f.label} is required.`)),
  ]

  const save = () => {
    if (issues.length) {
      setAttempted(true)
      toast('warn', 'Cannot save yet', `${issues[0]}${issues.length > 1 ? ` (${issues.length - 1} more to fix)` : ''}`)
      return
    }
    onPatch(app.id, (r) => ({
      displayName: draft.displayName.trim(),
      org: draft.org,
      description: draft.description.trim(),
      logo: draft.logo,
      logoSrc: draft.logoSrc,
      sso: {
        ...r.sso,
        sourceDisplayName: draft.displayName.trim(),
        clientId: draft.spec.clientId || r.sso.clientId,
        enabled: draft.enabled,
        status: draft.enabled ? 'Active' : 'Disabled',
        ssoSpec: draft.spec,
        link: draft.link,
        cert: draft.cert,
      },
    }))
    toast('ok', 'Application saved', `${draft.displayName.trim()} applies the new settings from the next sign-in.`)
    onDone()
  }

  return (
    <div className="stack">
      <div className="detail-cols">
        <div className="stack">
          <Card title="Basics" sub="Only the name and organization are mandatory.">
            <div className="grid grid-2">
              <Field
                label="Display name" required htmlFor="se-display"
                error={attempted && !String(draft.displayName || '').trim() ? 'A display name is required.' : undefined}
              >
                <TextInput id="se-display" value={draft.displayName} placeholder="Vendor Portal" onChange={(e) => set({ displayName: e.target.value })} />
              </Field>
              <Field
                label="Organization" required htmlFor="se-org"
                hint="Scopes who can see and administer this application."
                error={attempted && !draft.org ? 'Choose an organization.' : undefined}
              >
                <Select id="se-org" value={draft.org} placeholder="Select an organization" options={ORG_OPTIONS} onChange={(e) => set({ org: e.target.value })} />
              </Field>
              <Field label="Description" span={2} htmlFor="se-desc">
                <TextInput as="textarea" id="se-desc" rows={2} value={draft.description} placeholder="What the application does and who depends on it." onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Application image" span={2} hint="Shown in the register, on the record, on the launchpad and on the sign-in screen. Replacing it changes the mark everywhere this application appears.">
                <ImageField
                  idPrefix="se-logo"
                  value={{ name: draft.logo, src: draft.logoSrc }}
                  onChange={(img) => set({ logo: img.name, logoSrc: img.src })}
                />
              </Field>
            </div>
          </Card>

          <Card title="Federation" sub="The protocol this application speaks. Changing it is done by re-registering the application.">
            <div className="grid grid-2">
              <Field label="Protocol" required>
                <div className="row" style={{ minHeight: 31 }}>
                  <Tag tone="acc">{facet.protocol}</Tag>
                  <span className="t-xs t-mut">
                    {link ? 'Catalog link — no assertion issued' : `${sections.length} sections, ${sections.reduce((a, s) => a + s.fields.length, 0)} settings`}
                  </span>
                </div>
              </Field>
              {/* One identifier for every application type, edited beside the
                  protocol exactly as it was entered. */}
              {clientField && (
                <SpecField
                  f={clientField}
                  value={draft.spec.clientId}
                  error={attempted ? specErrors.clientId : undefined}
                  onChange={setSpec}
                />
              )}
            </div>
            <div className="row" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
              <Switch checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} label="Accept federated sign-ins" />
              <span className="t-sm">Accept federated sign-ins from this application</span>
            </div>
          </Card>

          {link ? (
            <Card title="Destination" sub="What the catalog tile opens, and whether the signed-in username travels with it.">
              <LinkFields value={draft.link} onChange={setLink} attempted idPrefix="se" />
            </Card>
          ) : visible.map((sec) => (
            <SpecSection
              key={sec.id}
              section={sec}
              values={draft.spec}
              errors={attempted ? specErrors : {}}
              onChange={setSpec}
              forceOpen={attempted && sec.fields.some((f) => specErrors[f.id])}
            />
          ))}
        </div>

        <div className="stack">
          {/* A SAML application's certificate is the Certificate field of its
              endpoint settings, edited on the left. OIDC and JWT applications
              have no such field, so the signing certificate is managed here. */}
          {!link && !saml && (
            <CertificateCard
              cert={draft.cert && draft.cert.source === 'Platform signing certificate' ? null : draft.cert}
              sub="Signing certificate published in the key set and used to sign every token."
              onChange={(cert) => setDraft((d) => ({ ...d, cert }))}
            />
          )}
          {saml && (
            <Banner tone="info">
              The metadata XML upload is offered when an application is registered, not here: re-importing a descriptor
              would overwrite endpoints that have since been corrected by hand. Edit the fields directly.
            </Banner>
          )}
          {!link && (
            <Card title="Elsewhere on this record" sub="Managed in their own sections.">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Attribute configuration', v: `${facet.attrs.length} mappers`, icon: 'swap' },
                  { k: 'URL configuration', v: facet.urls.length ? `${facet.urls.length} configured` : 'Not configured', icon: 'globe' },
                ]}
              />
            </Card>
          )}
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={dirty
          ? (issues.length ? `Unsaved changes · ${issues[0]}` : 'Unsaved changes')
          : 'No changes'}
      >
        <Button onClick={onDone}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!dirty} onClick={save}>Save changes</Button>
      </StickyActions>
    </div>
  )
}
