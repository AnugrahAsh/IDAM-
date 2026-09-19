import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { num } from '../../lib/format'
import {
  EXTRA_OPERATION_SPECS, OPERATION_SPECS, connectionEndpoint, fieldRequired, isCustomApiConnector, kindOf, visibleSpec,
} from './appModel'
import { CLIENT_SECTION_ID, SECTIONS_FOR, defaultsFor } from './ssoFields'

// ---------------------------------------------------------------------------
// The review step.
//
// A review that summarises is not a review. Its whole job is to let the
// operator confirm what they typed, which means every value they supplied has
// to be on this screen, under the heading they supplied it under, in the words
// the form used. The previous version read a handful of fields off the wrong
// object — the SSO step writes to the published field register, not to the
// legacy `saml` record — so an entity ID that had been entered showed as a
// dash, and sixty other settings were never shown at all.
//
// Everything is therefore rendered from the same declarative registers that
// drove the forms. A field cannot appear on a form and be missing here.
// ---------------------------------------------------------------------------

const isBlank = (v) => v === undefined || v === null || String(v).trim() === ''

/* A value as the operator should read it back. Toggles are statements, secrets
   are never echoed, and a multi-line list is shown as its lines rather than as
   one run-on string. */
function ReviewValue({ f, value }) {
  if (f.type === 'toggle') {
    return value
      ? <Pill tone="ok" dot>Enabled</Pill>
      : <span className="t-faint">Off</span>
  }
  if (isBlank(value)) {
    return f.required
      ? <span className="rvw-missing"><Icon name="warn" size={11} />Required, not set</span>
      : <span className="t-faint">Not set</span>
  }
  if (f.secret) return <span className="mono t-mut">••••••••</span>
  if (f.type === 'list') {
    const lines = String(value).split(/[\n,]+/).map((l) => l.trim()).filter(Boolean)
    return (
      <span className="rvw-list">
        {lines.map((l) => <span className="mono" key={l}>{l}</span>)}
      </span>
    )
  }
  if (f.type === 'textarea') {
    return <span className={f.id === 'certificate' ? 'mono rvw-pre' : 'rvw-pre'}>{String(value)}</span>
  }
  const mono = f.mono || f.type === 'number' || /url|uri|id$|Id$|origin|dn|alg/i.test(f.id)
  return (
    <span className={mono ? 'mono rvw-val' : 'rvw-val'}>
      {String(value)}{f.unit ? ` ${f.unit}` : ''}
    </span>
  )
}

/* One reviewable group. `onEdit` returns the operator to the step that owns
   these values, because the point of spotting a mistake here is fixing it. */
function ReviewCard({ title, sub, icon, onEdit, editLabel, children, collapsible, changed, count }) {
  const [open, setOpen] = useState(!collapsible)
  return (
    <Card
      className="rvw-card"
      title={title}
      sub={sub}
      actions={(
        <>
          {collapsible && (
            <button type="button" className="rvw-disclose" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? 'chevD' : 'chevR'} size={12} />
              {open ? 'Hide' : `Show ${count} settings`}
            </button>
          )}
          {onEdit && (
            <Button size="sm" icon="edit" onClick={onEdit}>{editLabel || 'Edit'}</Button>
          )}
        </>
      )}
    >
      {open ? children : (
        <div className="rvw-collapsed">
          <Icon name={icon || 'check'} size={13} />
          {changed > 0
            ? <>{count} settings · <b>{changed}</b> changed from the recommended default.</>
            : <>{count} settings, all held at their recommended defaults.</>}
        </div>
      )}
    </Card>
  )
}

export default function WizardReview({
  d, capLabel, ssoSpec, isOauth, hasProv, hasSso, onEdit, invalidSteps,
}) {
  const values = d.ssoSpec || {}
  const defaults = ssoSpec ? defaultsFor(ssoSpec) : {}
  // The client identifier is reviewed in the Federation card beside the
  // protocol, as it was entered, rather than as a one-field card of its own.
  const sections = ssoSpec ? SECTIONS_FOR(ssoSpec).filter((sec) => sec.id !== CLIENT_SECTION_ID) : []
  const isLink = d.protocol === 'Link'
  const link = d.link || {}

  const changedIn = (sec) => sec.fields.filter((f) => {
    const v = values[f.id]
    if (f.type === 'toggle') return !!v !== !!defaults[f.id]
    return !isBlank(v) && String(v) !== String(defaults[f.id] ?? '')
  }).length

  const rowsFor = (sec) => sec.fields.map((f) => ({
    k: f.label,
    icon: f.type === 'toggle' ? 'power' : 'info',
    node: <ReviewValue f={f} value={values[f.id]} />,
  }))

  // Only the fields this connector actually shows, so a hidden conditional
  // field is not reviewed as an empty one. The operations are passed because
  // they decide whether the Create, Update and Delete sections exist at all.
  const connSpec = hasProv && d.connector ? visibleSpec(d.connector, d.connection, { operations: d.operations }) : []
  const customApi = hasProv && isCustomApiConnector(d.connector)
  const conn = d.connection || {}
  const ops = d.operations || {}

  /* What the Custom API connection holds beyond its scalar fields: the extra
     authentication pairs, the error keywords and one mapping per operation. */
  const customRows = customApi ? [
    { k: 'Extra authentication fields', icon: 'key', node: <ReviewValue f={{ id: 'authExtras' }} value={(conn.authExtras || []).length ? `${conn.authExtras.length} configured` : ''} /> },
    { k: 'Error classification keywords', icon: 'flag', node: <ReviewValue f={{ id: 'errorClasses' }} value={(conn.errorClasses || []).length ? `${conn.errorClasses.length} configured` : ''} /> },
    { k: 'Get User attribute mapping', icon: 'swap', node: <ReviewValue f={{ id: 'getUserMappings' }} value={(conn.getUserMappings || []).length ? `${conn.getUserMappings.length} attributes` : ''} /> },
    ops.create && { k: 'Create attribute mapping', icon: 'swap', node: <ReviewValue f={{ id: 'createMappings' }} value={(conn.createMappings || []).length ? `${conn.createMappings.length} attributes` : ''} /> },
    ops.update && { k: 'Update attribute mapping', icon: 'swap', node: <ReviewValue f={{ id: 'updateMappings' }} value={(conn.updateMappings || []).length ? `${conn.updateMappings.length} attributes` : ''} /> },
    ops.remove && { k: 'Delete attribute mapping', icon: 'swap', node: <ReviewValue f={{ id: 'deleteMappings' }} value={(conn.deleteMappings || []).length ? `${conn.deleteMappings.length} attributes` : ''} /> },
  ].filter(Boolean) : [
    // The account key is written to the record, not to the connection, so it
    // is reviewed here beside the connector it belongs to rather than left
    // off the screen entirely. A Custom API connection carries the pair as
    // fields of its own and they are reviewed with the rest of the spec.
    { k: 'Unique app attribute', icon: 'key', node: <ReviewValue f={{ id: 'uniqueTargetAttribute', mono: true }} value={d.uniqueTargetAttribute} /> },
    { k: 'Unique IDAM attribute', icon: 'key', node: <ReviewValue f={{ id: 'uniqueAttribute', mono: true }} value={d.uniqueAttribute} /> },
    { k: 'Attribute mappings', icon: 'swap', node: <ReviewValue f={{ id: 'mappings' }} value={`${(d.mappings || []).length} configured`} /> },
  ]

  const allOps = [...OPERATION_SPECS, ...EXTRA_OPERATION_SPECS]
  const enabledOps = allOps.filter((o) => d.operations && d.operations[o.id])

  return (
    <div className="stack rvw">
      {invalidSteps.length > 0 && (
        <Banner tone="warn">
          <b>
            {invalidSteps.length} step{invalidSteps.length === 1 ? '' : 's'} still
            {invalidSteps.length === 1 ? ' has' : ' have'} required fields missing
          </b>
          {': '}
          {invalidSteps.map((s) => (
            <button type="button" className="link rvw-jump" key={s.id} onClick={() => onEdit(s.id)}>{s.title}</button>
          ))}
          . The application cannot be created until they are filled.
        </Banner>
      )}

      <ReviewCard
        title="Registration"
        sub="What is written when the application is created."
        onEdit={() => onEdit('basics')}
        editLabel="Edit basics"
      >
        <KeyValue
          cols={2}
          rows={[
            { k: 'Application name', icon: 'apps', node: <ReviewValue f={{ id: 'displayName', required: true }} value={d.displayName} /> },
            { k: 'Organization', icon: 'building', node: <ReviewValue f={{ id: 'org', required: true }} value={d.org} /> },
            { k: 'Capability', icon: 'layers', node: <Tag tone="acc">{capLabel}</Tag> },
            { k: 'Description', icon: 'file', node: <ReviewValue f={{ id: 'description', type: 'textarea' }} value={d.description} /> },
            { k: 'Application image', icon: 'file', node: <ReviewValue f={{ id: 'logo' }} value={d.logo} /> },
          ]}
        />
      </ReviewCard>

      {hasProv && (
        <>
          <ReviewCard
            title="Connector and connection"
            sub={`${d.method || 'No connector chosen'}${d.connector ? ` · ${kindOf(d.connector)} connector` : ''}`}
            onEdit={() => onEdit('provisioning')}
            editLabel="Edit connector"
          >
            <KeyValue
              cols={2}
              rows={[
                { k: 'Connector type', icon: 'provision', node: <ReviewValue f={{ id: 'connector', required: true }} value={d.method} /> },
                { k: 'Resolved endpoint', icon: 'server', node: <ReviewValue f={{ id: 'endpoint', mono: true }} value={connectionEndpoint(d.connector, d.connection)} /> },
                ...connSpec.map((f) => ({
                  k: f.label,
                  icon: f.secret ? 'lock' : 'sliders',
                  node: <ReviewValue f={{ ...f, required: fieldRequired(f, conn, { operations: ops }) }} value={conn[f.id]} />,
                })),
                ...customRows,
              ]}
            />
          </ReviewCard>

          <ReviewCard
            title="Operations"
            sub="What this connector is permitted to do on the target. Anything not enabled is never attempted."
            onEdit={() => onEdit('operations')}
            editLabel="Edit operations"
          >
            {enabledOps.length === 0 && (
              <div style={{ marginBottom: 'var(--sp-3)' }}>
                <Banner tone="warn">
                  No operation is enabled, so this connector will read the target but never write to it.
                </Banner>
              </div>
            )}
            <KeyValue
              cols={2}
              rows={allOps.map((o) => ({
                k: o.label,
                icon: 'power',
                node: <ReviewValue f={{ id: o.id, type: 'toggle' }} value={d.operations && d.operations[o.id]} />,
              }))}
            />
          </ReviewCard>
        </>
      )}

      {hasSso && (
        <>
          <ReviewCard
            title="Federation"
            sub={`Protocol and signing material for ${d.displayName || 'this application'}.`}
            onEdit={() => onEdit('sso')}
            editLabel="Edit SSO"
          >
            <KeyValue
              cols={2}
              rows={[
                { k: 'Protocol', icon: 'sso', node: d.protocol ? <Tag tone="acc">{d.protocol}</Tag> : <ReviewValue f={{ id: 'protocol', required: true }} value="" /> },
                {
                  k: 'Specification',
                  icon: 'layers',
                  node: <span>{!ssoSpec ? '—' : ssoSpec === 'SAML' ? 'SAML 2.0 service provider' : ssoSpec === 'JWT' ? 'JWT delivery' : ssoSpec === 'Link' ? 'Catalog link — no assertion issued' : 'OpenID Connect client'}</span>,
                },
                // One identifier for every type, asked for beside the protocol.
                { k: 'Client identifier', icon: 'key', node: <ReviewValue f={{ id: 'clientId', mono: true, required: !!d.protocol && !isLink }} value={values.clientId} /> },
              ]}
            />
          </ReviewCard>

          {isLink && (
            <ReviewCard
              title="Destination"
              sub="What the catalog tile opens."
              onEdit={() => onEdit('sso')}
              editLabel="Edit"
            >
              <KeyValue
                cols={2}
                rows={[
                  { k: 'Target URL', icon: 'globe', node: <ReviewValue f={{ id: 'targetUrl', mono: true, required: true }} value={link.targetUrl} /> },
                ].filter(Boolean)}
              />
            </ReviewCard>
          )}

          {/* Every section of the published register, in the order the form
              presented them. Advanced sections stay collapsed but say how many
              of their settings the operator actually changed. */}
          {sections.map((sec) => (
            <ReviewCard
              key={sec.id + sec.title}
              title={sec.title}
              sub={sec.sub}
              onEdit={() => onEdit('sso')}
              editLabel="Edit"
              collapsible={sec.advanced}
              count={sec.fields.length}
              changed={changedIn(sec)}
            >
              <KeyValue cols={2} rows={rowsFor(sec)} />
            </ReviewCard>
          ))}

        </>
      )}

      <div className="rvw-foot">
        <Icon name="info" size={12} />
        <span>
          {hasSso && sections.length
            ? <>Showing every setting from the {ssoSpec === 'SAML' ? 'SAML' : ssoSpec === 'JWT' ? 'JWT' : 'OpenID Connect'} specification, including
              those left at their recommended defaults, so nothing is written that you have not seen.</>
            : <>Showing every value that will be written for this application.</>}
        </span>
        <span className="spacer" />
        <span>
          <b className="num">{num(sections.reduce((a, s) => a + s.fields.length, 0) + connSpec.length)}</b> settings reviewed
        </span>
      </div>
    </div>
  )
}
