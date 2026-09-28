import './ApplicationsPage.css'
import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import { Skeleton } from '../../components/primitives/Skeleton'
import { TODAY } from '../../data/seed'
import AppLogo from '../../components/primitives/AppLogo'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { AppPanelSkeleton } from './ApplicationsSkeleton'
import { num, statusTone } from '../../lib/format'
import { StatStrip, UrlConfigCard } from './facetControls'
import ProvisioningTab from './ProvisioningTab'
import ReconciliationTab from './ReconciliationTab'
import SsoView from './SsoView'
import { openImageEditor } from './ImageField'
import SsoEdit from './SsoEdit'
import AttributesTab from './AttributesTab'
import ClientScope from './ClientScope'
import {
  BASE, CONNECTORS, brandOf, capabilitiesOf, clientScopeOf, healthOf, isDualCapability, specValuesFor, withClientScope,
} from './appModel'

/**
 * The addresses this application has already published in its own protocol
 * configuration. A URL configuration launches at one of them rather than at a
 * pattern typed from memory.
 */
const publishedUrls = (facet) => {
  /* Read through the same mapping the SSO tab edits, so a record written before
     the register existed still offers the addresses it actually holds. */
  const spec = specValuesFor(facet) || {}
  return [spec.applicationUrl, spec.rootUrl, spec.homeUrl, spec.acsUrl, spec.masterSamlProcessingUrl]
    .map((u) => String(u || '').trim())
    .filter(Boolean)
}

/* Accounts correlate on the mail address, which is the one value both a
   federated assertion and a provisioned account always carry. */
const MATCH_ATTR = 'email'

/* The tabs whose panel is cards and fields, and so has a shape of its own to
   hold while the record settles. Attribute Configuration and Client Scope are
   missing on purpose: they are registers and settle their own rows. */
const PANEL_SHAPES = ['overview', 'provisioning', 'reconciliation', 'sso', 'urls', 'linkage']

function OverviewTab({ app, onTab }) {
  const health = healthOf(app)
  return (
    <div className="stack">
      {/* A record predating the one-capability rule. Both facets keep working;
          saying so is better than leaving an operator to wonder why this record
          looks unlike anything the wizard can now produce. */}
      {isDualCapability(app) && (
        <Banner tone="info">
          This record carries both a provisioning connector and an SSO federation. Applications are now registered with
          one capability each and paired on the Linkage tab; this pairing predates that and continues to work exactly as
          it did.
        </Banner>
      )}
      <StatStrip
        items={[
          { k: 'Capabilities', icon: 'layers', v: capabilitiesOf(app).join(' + ') || 'None' },
          app.provisioning && { k: 'Accounts managed', icon: 'users', v: num(app.provisioning.accounts), sub: `Last sync ${app.provisioning.lastSync}` },
          app.sso && { k: 'Assigned users', icon: 'sso', v: num(app.sso.users), sub: app.sso.enabled ? 'Accepting sign-ins' : 'Sign-ins refused' },
          app.sso && app.sso.cert && { k: 'Certificate', icon: 'certify', v: `${app.sso.cert.daysLeft} days`, sub: `Expires ${app.sso.cert.notAfter}`, tone: app.sso.cert.daysLeft < 30 ? 'bad' : app.sso.cert.daysLeft < 90 ? 'warn' : undefined },
          { k: 'Health', icon: 'activity', v: health.label, tone: health.tone === 'ok' ? undefined : health.tone },
        ]}
      />

      <div className="detail-cols">
        <div className="stack">
          <Card
            title="Provisioning facet"
            sub={app.provisioning ? `${app.provisioning.method} connector owning the account lifecycle on the target.` : 'No provisioning connector is attached to this record.'}
            actions={app.provisioning && <Button size="sm" icon="sliders" onClick={() => onTab('provisioning')}>Open provisioning</Button>}
          >
            {app.provisioning ? (
              <KeyValue
                cols={2}
                rows={[
                  { k: 'Connector', v: CONNECTORS[app.provisioning.connector] ? CONNECTORS[app.provisioning.connector].name : app.provisioning.connector, icon: 'provision' },
                  { k: 'Status', node: <Pill tone={statusTone(app.provisioning.status)} dot>{app.provisioning.status}</Pill>, icon: 'activity' },
                  { k: 'Accounts', v: num(app.provisioning.accounts), icon: 'users' },
                  { k: 'Last sync', v: app.provisioning.lastSync, icon: 'history' },
                ]}
              />
            ) : (
              <div className="row">
                <span className="t-sm t-mut">Attach a connector to bring the application&apos;s accounts under lifecycle management.</span>
                <span className="spacer" />
                <Button size="sm" icon="link" onClick={() => onTab('linkage')}>Link a connector</Button>
              </div>
            )}
          </Card>

          <Card
            title="SSO facet"
            sub={app.sso ? `${app.sso.protocol} relying party federated through the platform.` : 'No federation is attached to this record.'}
            actions={app.sso && <Button size="sm" icon="sso" onClick={() => onTab('sso')}>Open SSO</Button>}
          >
            {app.sso ? (
              <KeyValue
                cols={2}
                rows={[
                  { k: 'Protocol', v: app.sso.protocol, icon: 'sso' },
                  { k: 'Status', node: <Pill tone={app.sso.enabled ? 'ok' : 'mut'} dot>{app.sso.enabled ? 'Active' : 'Disabled'}</Pill>, icon: 'activity' },
                  { k: 'Client identifier', v: <span className="mono t-xs">{app.sso.clientId}</span>, icon: 'key' },
                  { k: 'Attributes released', v: num(app.sso.attrs.length), icon: 'swap' },
                ]}
              />
            ) : (
              <div className="row">
                <span className="t-sm t-mut">Attach a federation so identities reach the application without a local password.</span>
                <span className="spacer" />
                <Button size="sm" icon="link" onClick={() => onTab('linkage')}>Link a federation</Button>
              </div>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Record">
            <KeyValue
              cols={1}
              rows={[
                { k: 'System name', v: <span className="mono">{app.name}</span>, icon: 'tag' },
                { k: 'Organization', v: app.org, icon: 'building' },
                { k: 'Owner', v: app.owner, icon: 'user' },
                { k: 'Created', v: app.createdOn, icon: 'history' },
                { k: 'Description', v: app.description || '—', icon: 'file' },
              ]}
            />
          </Card>
          <Card title="Linkage" sub="Both facets live on this one record.">
            <div className="stack" style={{ gap: 8 }}>
              <div className="row-between">
                <span className="t-sm">Provisioning</span>
                {app.provisioning ? <Pill tone="ok" dot>Attached</Pill> : <Pill tone="mut" dot>Not attached</Pill>}
              </div>
              <div className="row-between">
                <span className="t-sm">SSO / federation</span>
                {app.sso ? <Pill tone="ok" dot>Attached</Pill> : <Pill tone="mut" dot>Not attached</Pill>}
              </div>
              <Button size="sm" icon="link" onClick={() => onTab('linkage')}>Manage linkage</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LinkageTab({ app, rows, onLink, onUnlink }) {
  const { toast, confirm } = useApp()
  const [candidate, setCandidate] = useState('')
  const [synced, setSynced] = useState('')
  const [result, setResult] = useState(null)

  const needs = !app.provisioning ? 'provisioning' : !app.sso ? 'sso' : null
  const candidates = rows.filter((r) => r.id !== app.id
    && (needs === 'provisioning' ? (r.provisioning && !r.sso) : (r.sso && !r.provisioning)))

  const doLink = () => {
    const other = rows.find((r) => String(r.id) === String(candidate))
    if (!other) return
    confirm({
      title: `Link ${other.displayName} into ${app.displayName}?`,
      body: `The ${needs === 'provisioning' ? 'provisioning connector' : 'SSO federation'} moves onto this application record and the standalone record is retired. Revoking access then removes both the sign-in path and the underlying account.`,
      tone: 'pri',
      confirmLabel: 'Link facets',
      onConfirm: () => onLink(app.id, other.id),
    })
  }

  /**
   * Correlating the two facets is the point of linking them: without a run,
   * the pairing is declared but no account is actually matched to a federated
   * identity, and a revocation still leaves the target account behind.
   */
  const doSync = () => {
    const total = app.provisioning ? app.provisioning.accounts : 0
    // The accounts the connector already reports as orphaned are exactly the
    // ones with no identity to correlate to.
    const orphans = app.provisioning ? app.provisioning.orphans || 0 : 0
    const matched = Math.max(0, total - orphans)
    setSynced(`${TODAY} ${String(9 + (app.id % 9)).padStart(2, '0')}:00`)
    setResult({ total, matched, orphans, attribute: MATCH_ATTR })
    toast(
      orphans ? 'warn' : 'ok',
      'Correlation run complete',
      orphans
        ? `${num(matched)} of ${num(total)} accounts matched on ${MATCH_ATTR}. ${num(orphans)} remain unmatched.`
        : `${num(matched)} accounts correlated on ${MATCH_ATTR}.`,
    )
  }

  const doUnlink = () => confirm({
    title: `Unlink the SSO facet from ${app.displayName}?`,
    body: 'The federation is split back onto its own application record. Sign-ins continue, but revocations no longer remove the provisioned account automatically.',
    confirmLabel: 'Unlink facets',
    onConfirm: () => onUnlink(app.id),
  })

  return (
    <div className="stack">
      <Banner tone="info">
        Application Linkage now lives on the application record itself. A record carries a provisioning facet, an SSO
        facet, or both — linking pairs the two so one revocation removes both the sign-in path and the entitlement.
      </Banner>

      <div className="detail-cols">
        <div className="stack">
          <Card title="Linked facets" sub="What this application record carries.">
            <div className="stack" style={{ gap: 0 }}>
              <div className="kv-row app-facet-row">
                <span className="kv-m">
                  <span className="kv-k"><Icon name="provision" size={13} /> Provisioning facet</span>
                  <span className="kv-v">
                    {app.provisioning
                      ? `${app.provisioning.method} · ${num(app.provisioning.accounts)} accounts · last sync ${app.provisioning.lastSync}`
                      : 'Not attached'}
                  </span>
                </span>
                {app.provisioning ? <Pill tone={statusTone(app.provisioning.status)} dot>{app.provisioning.status}</Pill> : <Pill tone="mut" dot>Missing</Pill>}
              </div>
              <div className="kv-row app-facet-row">
                <span className="kv-m">
                  <span className="kv-k"><Icon name="sso" size={13} /> SSO facet</span>
                  <span className="kv-v">
                    {app.sso
                      ? `${app.sso.protocol} · ${num(app.sso.users)} assigned users · client ${app.sso.clientId}`
                      : 'Not attached'}
                  </span>
                </span>
                {app.sso ? <Pill tone={app.sso.enabled ? 'ok' : 'mut'} dot>{app.sso.enabled ? 'Active' : 'Disabled'}</Pill> : <Pill tone="mut" dot>Missing</Pill>}
              </div>
            </div>
          </Card>

          {needs ? (
            <Card
              title="Linked application"
              sub={`Pair this record with a standalone ${needs === 'provisioning' ? 'provisioning connector' : 'SSO application'}. Its facet moves onto this record.`}
            >
              <div className="grid grid-2">
                <Field label={needs === 'provisioning' ? 'Provisioning application' : 'SSO application'} htmlFor="lk-cand">
                  <Select
                    id="lk-cand"
                    value={candidate}
                    placeholder={candidates.length ? 'Select an application' : 'No unlinked applications available'}
                    options={candidates.map((r) => ({ value: String(r.id), label: `${r.displayName} · ${needs === 'provisioning' ? r.provisioning.method : r.sso.protocol}` }))}
                    disabled={candidates.length === 0}
                    onChange={(e) => setCandidate(e.target.value)}
                  />
                </Field>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <span className="spacer" />
                <Button variant="pri" icon="link" disabled={!candidate} onClick={doLink}>Link application</Button>
              </div>
            </Card>
          ) : (
            <Card
              title="Linked application"
              sub="Both facets are paired on this record."
              actions={<Button size="sm" variant="pri" icon="refresh" onClick={doSync}>Sync users</Button>}
            >
              <div className="grid grid-2">
                <Field label="Last correlation run" hint="A sync re-matches every provisioned account against its federated identity.">
                  <div className="t-sm" style={{ height: 30, display: 'flex', alignItems: 'center' }}>
                    {synced || app.provisioning.lastSync}
                  </div>
                </Field>
              </div>

              {result && (
                <div style={{ marginTop: 14 }}>
                  <Banner tone={result.orphans ? 'warn' : 'ok'}>
                    <span>
                      <b>{num(result.matched)}</b> of {num(result.total)} accounts correlated on{' '}
                      <span className="mono">{result.attribute}</span>.{' '}
                      {result.orphans
                        ? `${num(result.orphans)} could not be matched to a federated identity and were left untouched.`
                        : 'Every account resolved to a federated identity.'}
                    </span>
                  </Banner>
                </div>
              )}

              <div className="row" style={{ marginTop: 14 }}>
                <span className="t-xs t-mut">Unlinking splits the federation back onto its own record.</span>
                <span className="spacer" />
                <Button icon="x" onClick={doUnlink}>Unlink SSO facet</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppDetail({ app, rows, tab, sub, onTab, onPatch, onDelete, onLink, onUnlink }) {
  const { toast, setDrawer } = useApp()
  const changeImage = () => openImageEditor({ app, onPatch, setDrawer, toast })
  const health = healthOf(app)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    ...(app.provisioning ? [{ id: 'provisioning', label: 'Provisioning', icon: 'provision' }] : []),
    ...(app.provisioning ? [{ id: 'reconciliation', label: 'Reconciliation', icon: 'recon' }] : []),
    ...(app.sso ? [{ id: 'sso', label: 'SSO', icon: 'sso' }] : []),
    // Attribute configuration is what an administrator edits weekly; it used to
    // sit below forty protocol fields on the SSO tab.
    ...(app.sso && app.sso.protocol !== 'Link'
      ? [{ id: 'attributes', label: 'Attribute Configuration', icon: 'swap', count: app.sso.attrs.length }] : []),
    // No count: an application carries one URL configuration, and a badge of
    // "1" beside the label reads as the first of a list.
    ...(app.sso && app.sso.protocol !== 'Link'
      ? [{ id: 'urls', label: 'URL Configuration', icon: 'globe' }] : []),
    // Every application that asserts or issues something carries roles in
    // it — a SAML assertion and a JWT as much as an OIDC token — so the scope
    // is offered on all of them. A link asserts nothing and has none.
    ...(app.sso && app.sso.protocol !== 'Link'
      ? [{ id: 'scope', label: 'Client Scope', icon: 'key' }] : []),
    { id: 'linkage', label: 'Linkage', icon: 'link' },
  ]
  const active = tabs.some((t) => t.id === tab) ? tab : 'overview'

  /* One flag for the record, keyed on the application and the tab together, so
     the record settles as one thing: arriving at an application is a read, and
     so is opening a different tab, because each tab is a separate read of that
     application rather than another slice of one already in hand.

     The tab bar is not keyed to it — it is passed to the masthead outside the
     conditionals below and stays live throughout — because a control that
     disappears under the pointer that just used it has been taken away
     mid-gesture. Nor is the SSO editor, which is reached from the view beside
     it with the record already on screen. */
  const loading = useLoading(`${app.id}:${active}`)

  // The page owner raises its own confirmation for deletion.
  const remove = () => onDelete(app)

  return (
    <>
      {/* The masthead is the real `DetailHeader` while it settles rather than an
          imitation of one: the crumb row, the gutters, the tab row and every gap
          between them are the component's own, so the application lands in
          exactly the box that was holding its place. Only the record's own
          content greys. */}
      <DetailHeader
        backTo={BASE}
        backLabel="Applications"
        eyebrow="Application"
        title={loading ? <span className="skel app-skel-title" aria-hidden="true" /> : app.displayName}
        sub={loading
          ? <span className="skel app-skel-sub" aria-hidden="true" />
          : app.description || `${capabilitiesOf(app).join(' and ')} application owned by ${app.owner}.`}
        media={loading
          ? <span className="skel app-skel-media" aria-hidden="true" />
          : <AppLogo src={app.logoSrc} brand={brandOf(app)} name={app.displayName} size={56} />}
        badges={loading ? (
          <>
            <span className="skel skel-chip" style={{ width: 72 }} aria-hidden="true" />
            <span className="skel skel-chip" style={{ width: 88 }} aria-hidden="true" />
          </>
        ) : (
          <>
            <Pill tone={health.tone} dot>{health.label}</Pill>
            {app.provisioning && <Tag tone="acc">Provisioning</Tag>}
            {app.sso && <Tag tone="acc">SSO</Tag>}
            <Tag>{app.name}</Tag>
          </>
        )}
        meta={loading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <span className="app-skel-fact" key={i} aria-hidden="true">
                <span className="skel" style={{ width: 94 + (i % 3) * 28, height: 9 }} />
              </span>
            ))}
          </>
        ) : (
          <>
            <Fact icon="building" label="Organization" value={app.org} />
            <Fact icon="user" label="Owner" value={app.owner} />
            {app.provisioning && <Fact icon="users" label="Accounts" value={num(app.provisioning.accounts)} />}
            {app.sso && <Fact icon="sso" label="Assigned" value={num(app.sso.users)} />}
            {app.provisioning && <Fact icon="clock" label="Last sync" value={app.provisioning.lastSync} />}
          </>
        )}
        actions={loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <span className="skel skel-btn" key={i} style={{ width: 92 + (i % 3) * 24 }} aria-hidden="true" />
            ))}
          </>
        ) : (
          <>
            {/* The mark this application is recognised by, changed from the
                record it belongs to rather than from inside a federation
                form. */}
            <Button icon="edit" onClick={changeImage}>Change image</Button>
            {app.provisioning && (
              <Button icon="refresh" disabled={app.provisioning.status === 'Disabled'} onClick={() => toast('ok', 'Sync queued', `A delta sync for ${app.displayName} has been placed on the provisioning queue.`)}>Sync now</Button>
            )}
            {app.sso && (
              <Button icon="download" onClick={() => toast('ok', 'Metadata ready', `${app.sso.protocol} metadata for ${app.displayName} is downloading.`)}>Export metadata</Button>
            )}
            <Button variant="danger" icon="trash" onClick={remove}>Delete</Button>
          </>
        )}
        tabs={<Tabs value={active} onChange={onTab} tabs={tabs} />}
      />

      <div className="detail-body">
        {/* The screen's one announcing region, so the record says once that it
            is on its way. Every shape is decoration — the bars in the masthead
            above and the rows a register draws for itself below — and the
            region is rendered even for the two tabs that have no panel shape of
            their own, because the masthead is still grey while they settle. */}
        {loading && (
          <Skeleton label={`Loading ${app.displayName}`}>
            {PANEL_SHAPES.includes(active) ? <AppPanelSkeleton tab={active} /> : null}
          </Skeleton>
        )}

        {!loading && active === 'overview' && <OverviewTab app={app} onTab={onTab} />}
        {!loading && active === 'provisioning' && <ProvisioningTab app={app} onPatch={onPatch} />}
        {!loading && active === 'reconciliation' && <ReconciliationTab key={`rec-${app.id}`} app={app} onPatch={onPatch} />}
        {!loading && active === 'sso' && (sub === 'edit'
          ? <SsoEdit key={`sso-edit-${app.id}`} app={app} onPatch={onPatch} onDone={() => onTab('sso')} />
          : <SsoView key={`sso-${app.id}`} app={app} onEdit={() => onTab('sso/edit')} onTab={onTab} onChangeImage={changeImage} />)}
        {/* Registers settle their own rows. Handing the flag down leaves the
            toolbar and the search box alive while the rows arrive. */}
        {active === 'attributes' && <AttributesTab key={`attrs-${app.id}`} app={app} onPatch={onPatch} loading={loading} />}
        {active === 'scope' && app.sso && (
          <ClientScope
            key={`scope-${app.id}`}
            appName={app.displayName}
            protocol={app.sso.protocol}
            value={clientScopeOf(app.sso)}
            loading={loading}
            onChange={(patch) => onPatch(app.id, (r) => ({ sso: withClientScope(r.sso, patch) }))}
          />
        )}
        {!loading && active === 'urls' && (
          <div className="stack">
            <Banner tone="info">
              This is the application URL an identity is launched at. Each query parameter carries one attribute this
              application releases, so the application receives the value on the address itself. Both halves are
              chosen from what the record already holds. One URL is configured per application.
            </Banner>
            <UrlConfigCard
              rows={app.sso.urls}
              baseUrls={publishedUrls(app.sso)}
              attributes={app.sso.attrs}
              onChange={(next) => onPatch(app.id, (r) => ({ sso: { ...r.sso, urls: next } }))}
            />
          </div>
        )}
        {!loading && active === 'linkage' && <LinkageTab app={app} rows={rows} onLink={onLink} onUnlink={onUnlink} />}
      </div>
    </>
  )
}
