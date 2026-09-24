import { useEffect, useMemo, useRef, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import AppLogo from '../../components/primitives/AppLogo'
import ImageField from './ImageField'
import { useApp } from '../../store/AppContext'
import SpecField, { SpecSection } from './SpecFields'
import { PROTOCOL_SECTIONS, cleanPrefill, clientIdField, defaultsFor, missingRequired } from './ssoFields'
import { CONNECTOR_TYPES } from '../../data/seed'
import TestResult from './TestResult'
import WizardReview from './WizardReview'
import {
  AuthExtraFields, ConnectionFields, LinkFields, ManualPayloadField, OperationChecks, UniqueAttributeFields,
} from './facetControls'
import CustomApiFields, { ConnectorMappingEditor } from './customApiFields'
import { brandForConnector } from '../shared/provisioning/shared'
import {
  AUTH_BEARER_TYPE, BASE, BEARER_DYNAMIC, CAPABILITIES, EXTRA_OPERATION_SPECS, ORG_OPTIONS, OPERATION_SPECS, PROTOCOLS,
  REST_API_CONNECTOR, blankConnection, blankLink, blankOidc, blankOperations, blankSaml, capabilityLabel,
  connectionIssues, connectorMappingIssues, defaultUniquePair, defaultUrlConfig, hasProv, hasSso, isCustomApiConnector, linkIssues,
  manualPayloadSupported, operationIssues, probeConnection, profileFor, withLeaverChoice, provMappingsFor, slugify, specFor, specNameFor, systemName,
  uniqueAttributeIssues,
} from './appModel'

export default function AppWizard({ onCancel, onCreate }) {
  const { toast } = useApp()
  const [d, setD] = useState({
    capability: '',
    displayName: '',
    name: '',
    description: '',
    org: '',
    connector: '',
    method: '',
    connection: {},
    mappings: [],
    uniqueAttribute: '',
    uniqueTargetAttribute: '',
    operations: blankOperations(),
    // No protocol until one is chosen: the client identifier and the
    // protocol's own register only appear once the operator has said which
    // specification the application follows.
    protocol: '',
    saml: blankSaml(),
    oidc: blankOidc(),
    // Every field of the chosen specification, already holding its recommended
    // default. Seeded when the protocol is picked, re-seeded if it changes.
    ssoSpec: {},
    link: blankLink(),
    logo: '',
    logoSrc: '',
    cert: null,
  })
  const [attempted, setAttempted] = useState(() => new Set())
  const [step, setStep] = useState(0)
  const [probe, setProbe] = useState(null)
  const [testing, setTesting] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const setSaml = (patch) => setD((x) => ({ ...x, saml: { ...x.saml, ...patch } }))
  const setOidc = (patch) => setD((x) => ({ ...x, oidc: { ...x.oidc, ...patch } }))
  const setLink = (patch) => setD((x) => ({ ...x, link: { ...x.link, ...patch } }))

  const isOauth = ['OIDC', 'OAuth', 'OAuth Mobile'].includes(d.protocol)
  /* Which published specification this protocol is edited against. SAML service
     providers, OAuth/OIDC clients and JWT applications share almost no fields,
     and a link application has only the destination. Nothing until a protocol
     is chosen. */
  const ssoSpec = d.protocol ? specNameFor(d.protocol) : ''
  const isLink = d.protocol === 'Link'
  const specValues = d.ssoSpec || {}
  const clientField = ssoSpec ? clientIdField(ssoSpec) : null
  /* `prefill` carries the fields a metadata import derived from the descriptor,
     written alongside the raw XML in one pass so the form never renders a state
     where the file is loaded and the endpoints it names are not. */
  const setSpec = (id, value, prefill) => set({
    ssoSpec: { ...specValues, [id]: value, ...cleanPrefill(prefill) },
  })
  const specSections = ssoSpec ? PROTOCOL_SECTIONS(ssoSpec, specValues) : []

  /* A Custom API connector designates its account key inside its Create
     section and validates it there, so the facet-level pair is not asked for
     a second time. */
  const customApi = hasProv(d.capability) && isCustomApiConnector(d.connector)
  /* The REST API connector authenticates exactly as Custom API does: a
     dynamic bearer supplies its own authorization value and needs the same
     extra-parameters table Custom API offers beside it. */
  const restDynamicBearer = d.connector === REST_API_CONNECTOR
    && d.connection.authType === AUTH_BEARER_TYPE && d.connection.authMethod === BEARER_DYNAMIC

  const steps = useMemo(() => {
    const s = [
      { id: 'capability', title: 'Capability', sub: 'What this application does' },
      { id: 'basics', title: 'Basics', sub: 'Name, organization, description' },
    ]
    if (hasProv(d.capability)) {
      // Custom API asks for its operations before its connection form, because
      // the ticked operations decide which API sections that form contains.
      if (customApi) {
        s.push({ id: 'provisioning', title: 'Connector', sub: 'Connector type' })
        s.push({ id: 'operations', title: 'Operations', sub: 'What the connector may do on the target' })
        s.push({ id: 'connection', title: 'Connection', sub: 'API configuration for the chosen operations' })
      } else {
        s.push({ id: 'provisioning', title: 'Connector', sub: 'Connector and connection settings' })
        s.push({ id: 'operations', title: 'Operations', sub: 'What the connector may do on the target' })
      }
    }
    // Attribute configuration is not part of onboarding: it is configured on
    // the application record, where the protocol's own mapper types are known
    // and the released values can be tested against a live connection.
    if (hasSso(d.capability)) s.push({ id: 'sso', title: 'SSO / federation', sub: 'Protocol, endpoints, certificate' })
    s.push({ id: 'review', title: 'Review', sub: 'Confirm and create' })
    return s
  }, [d.capability, customApi])

  const idx = Math.min(step, steps.length - 1)
  const current = steps[idx]

  const stepValid = (id) => {
    if (id === 'capability') return !!d.capability
    if (id === 'basics') return !!d.displayName.trim() && !!d.org
    if (id === 'provisioning') {
      return !!d.connector && (customApi || (connectionIssues(d.connector, d.connection, { operations: d.operations }).length === 0
        && connectorMappingIssues(d.mappings).length === 0))
    }
    if (id === 'connection') return connectionIssues(d.connector, d.connection, { operations: d.operations }).length === 0
    if (id === 'operations') return operationIssues(d.operations).length === 0
    // Federation is validated against the published field register rather than
    // a hand-kept list, so a required field added to the specification is
    // enforced without a second edit here.
    if (id === 'sso') {
      if (!d.protocol) return false
      return isLink
        ? linkIssues(d.link).length === 0
        : missingRequired(ssoSpec, d.ssoSpec || {}).length === 0
    }
    return true
  }

  /* Only surfaced once the operator has tried to leave the step, so a form
     they have not reached yet is not already covered in red. */
  const specErrors = useMemo(() => {
    if (!attempted.has('sso') || !ssoSpec) return {}
    return Object.fromEntries(missingRequired(ssoSpec, d.ssoSpec || {}).map((f) => [f.id, `${f.label} is required.`]))
  }, [attempted, ssoSpec, d.ssoSpec])

  /* Both sides of the account key. Surfaced rather than blocking: the pair is
     seeded from the connector, so an empty one is a deliberate clearance and
     the operator is told what it costs at run time. */
  const uniqueIssues = hasProv(d.capability) && d.connector && !customApi
    ? uniqueAttributeIssues(d.mappings, d.uniqueAttribute, d.uniqueTargetAttribute)
    : []

  const requiredSteps = steps.filter((s) => s.id !== 'review')
  const allValid = requiredSteps.every((s) => stepValid(s.id))

  const stateOf = (i) => {
    if (i === idx) return 'active'
    if (i < idx || attempted.has(steps[i].id)) return stepValid(steps[i].id) ? 'done' : 'error'
    return 'future'
  }

  const go = (n) => {
    if (n > idx && !stepValid(current.id)) {
      setAttempted((a) => new Set([...a, current.id]))
      toast('warn', 'Step incomplete', 'Fill the required fields before continuing.')
      return
    }
    setAttempted((a) => new Set([...a, current.id]))
    setStep(Math.max(0, Math.min(steps.length - 1, n)))
  }

  /* One capability per record, so choosing replaces rather than accumulates.
     The steps behind the other capability drop out of the rail immediately. */
  const pickCapability = (id) => set({ capability: id })

  /* The mapping set and the unique pair are properties of the connector, so
     they are seeded the moment one is chosen rather than left for the operator
     to discover on the record after it is created. */
  const pickConnector = (c) => {
    const mappings = provMappingsFor(c.id)
    set({
      connector: c.id,
      method: c.name,
      connection: blankConnection(c.id),
      mappings,
      ...defaultUniquePair(mappings),
    })
    setProbe(null)
  }

  const setDisplayName = (v) => {
    setD((x) => ({ ...x, displayName: v, name: systemName(v) }))
  }

  const runTest = () => {
    if (testing) return
    setTesting(true)
    setProbe(null)
    timer.current = setTimeout(() => {
      setTesting(false)
      setProbe(probeConnection(d.connector, d.connection))
    }, 850)
  }

  const create = () => {
    if (!allValid) {
      toast('warn', 'Registration incomplete', 'Revisit the highlighted steps before creating the application.')
      return
    }
    const name = d.name || systemName(d.displayName)
    const slug = slugify(name)
    const mappings = d.mappings.length ? d.mappings : provMappingsFor(d.connector)
    onCreate({
      name,
      displayName: d.displayName.trim(),
      description: d.description.trim(),
      org: d.org,
      logo: d.logo,
      logoSrc: d.logoSrc,
      owner: 'IT Operations',
      createdOn: '2026-08-13',
      provisioning: hasProv(d.capability) ? {
        sourceName: name,
        connector: d.connector,
        method: d.method,
        status: 'Healthy',
        accounts: 0,
        lastSync: '—',
        host: d.connection.host || '',
        port: d.connection.port || '',
        description: d.description.trim(),
        connection: d.connection,
        operations: d.operations,
        mappings,
        // A Custom API connection names the account key under Create; the
        // facet mirrors that pair so every reader of the record sees one key.
        uniqueAttribute: customApi ? d.connection.uniqueIdamAttribute || '' : d.uniqueAttribute,
        uniqueTargetAttribute: customApi ? d.connection.uniqueAppAttribute || '' : d.uniqueTargetAttribute,
      } : null,
      sso: hasSso(d.capability) ? {
        sourceName: slug,
        sourceDisplayName: d.displayName.trim(),
        protocol: d.protocol,
        clientId: specValues.clientId || `tanflow-${slug.replace(/_/g, '-')}`,
        enabled: true,
        status: 'Active',
        users: 0,
        createdOn: '2026-08-13',
        // The published register is what this step actually collected, so it is
        // what the record carries and what the SSO tab edits afterwards.
        ssoSpec: specValues,
        saml: d.saml,
        oidc: d.oidc,
        link: d.link,
        cert: d.cert,
        // Attribute configuration is done on the record: a new application
        // starts with nothing released rather than with a guess at it.
        attrs: [],
        urls: d.protocol === 'Link' ? [] : [defaultUrlConfig(slug)],
      } : null,
    })
  }

  const capLabel = capabilityLabel(d.capability)

  const connectionCards = (
    <>
      <Card
        title="Connection settings"
        sub={`${d.method} · only the fields this connector type actually needs`}
      >
        {customApi ? (
          <CustomApiFields
            connector={d.connector}
            value={d.connection}
            onChange={(patch) => set({ connection: { ...d.connection, ...patch } })}
            showErrors={attempted.has('connection')}
            idPrefix="aw-conn"
            ctx={{ operations: d.operations }}
          />
        ) : (
          <ConnectionFields
            connector={d.connector}
            value={d.connection}
            onChange={(patch) => set({ connection: { ...d.connection, ...patch } })}
            showErrors={attempted.has('provisioning')}
            idPrefix="aw-conn"
            ctx={{ operations: d.operations }}
            after={restDynamicBearer ? {
              authorization: (
                <div className="capi-block" key="ax">
                  <AuthExtraFields
                    rows={d.connection.authExtras || []}
                    onChange={(next) => set({ connection: { ...d.connection, authExtras: next } })}
                    idPrefix="aw-conn-ax"
                  />
                </div>
              ),
            } : undefined}
          />
        )}
      </Card>
      {!customApi && specFor(d.connector).length > 0 && (
        <Card title="Attribute mapping" sub="The pair an account is matched on, and the attributes this connector writes.">
          <div className="grid grid-2">
            <UniqueAttributeFields
              connector={d.connector}
              rows={d.mappings}
              idamValue={d.uniqueAttribute}
              targetValue={d.uniqueTargetAttribute}
              onChange={(patch) => set(patch)}
              idPrefix="aw-unique"
            />
          </div>
          {uniqueIssues.map((i) => (
            <div style={{ marginTop: 12 }} key={i}><Banner tone="warn">{i}</Banner></div>
          ))}
          {manualPayloadSupported(d.connector) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
              <ManualPayloadField
                connector={d.connector}
                value={d.connection}
                onChange={(patch) => set({ connection: { ...d.connection, ...patch } })}
                idPrefix="aw-manual"
              />
            </div>
          )}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
            <ConnectorMappingEditor
              connector={d.connector}
              rows={d.mappings}
              onChange={(next) => set({ mappings: next })}
              uniqueIdam={d.uniqueAttribute}
              uniqueApp={d.uniqueTargetAttribute}
              idPrefix="aw-map"
            />
          </div>
          {attempted.has('provisioning') && connectorMappingIssues(d.mappings).map((i) => (
            <div style={{ marginTop: 12 }} key={i}><Banner tone="warn">{i}</Banner></div>
          ))}
        </Card>
      )}
      <Card
        title="Connection test"
        sub="Recommended before the application is created. A failed test does not block creation."
        actions={
          <Button size="sm" variant="pri" icon={testing ? 'clock' : 'target'} disabled={testing} onClick={runTest}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
        }
      >
        <TestResult probe={probe} testing={testing} />
      </Card>
    </>
  )

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Applications"
        eyebrow="New application"
        title={d.displayName || 'Add an application'}
        sub="Register one application record with the capability it needs — a provisioning connector or SSO federation. Nothing is written until the final step."
        media={<AppLogo src={d.logoSrc} name={d.displayName || 'New application'} size={56} />}
        badges={
          <>
            <Pill tone="acc" dot>Draft</Pill>
            {!!d.capability && <Tag tone="acc">{capLabel}</Tag>}
          </>
        }
        meta={
          <>
            <Fact icon="layers" label="Step" value={`${idx + 1} of ${steps.length}`} />
            <Fact icon="building" label="Organization" value={d.org || 'Not chosen'} />
            {hasProv(d.capability) && <Fact icon="provision" label="Connector" value={d.method || 'Not chosen'} />}
            {hasSso(d.capability) && <Fact icon="sso" label="Protocol" value={d.protocol || 'Not chosen'} />}
          </>
        }
      />

      <div className="detail-body">
        <div className="wizard">
          <div className="wiz-rail">
            {steps.map((s, i) => (
              <button key={s.id} className="wiz-step" data-state={stateOf(i)} onClick={() => go(i)} style={{ width: '100%', textAlign: 'left' }}>
                <span className="wiz-n">{stateOf(i) === 'done' ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                <span className="wiz-m" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="wiz-t">{s.title}</span>
                  <span className="wiz-s">{s.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="wiz-body stack">
            {current.id === 'capability' && (
              <>
                <div className="section-head">
                  <span className="section-title">What does this application do?</span>
                  <span className="section-sub">
                    Choose one. The capability decides which steps this wizard asks for, and an application record
                    carries a single one.
                  </span>
                </div>
                <div className="grid grid-2" role="radiogroup" aria-label="Application capability">
                  {CAPABILITIES.map((c) => {
                    const on = d.capability === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="card app-cap-card"
                        role="radio"
                        aria-checked={on}
                        data-on={on || undefined}
                        onClick={() => pickCapability(c.id)}
                      >
                        <span className="row" style={{ gap: 9 }}>
                          <span className="app-cap-dot" data-on={on || undefined} aria-hidden="true" />
                          <span className="feed-ic" data-tone={on ? 'acc' : 'mut'} style={{ width: 30, height: 30 }}>
                            <Icon name={c.icon} size={15} />
                          </span>
                          <span className="t-h3">{c.label}</span>
                        </span>
                        <span className="t-sm" style={{ color: 'var(--ink-2)' }}>{c.sub}</span>
                        <span className="t-xs t-mut" style={{ lineHeight: 1.5 }}>{c.detail}</span>
                      </button>
                    )
                  })}
                </div>
                {d.capability ? (
                  <Banner tone="info">
                    An application that needs both a connector and a federation is registered twice, once for each
                    capability, and the two records are paired on the Linkage tab. One revocation then removes both the
                    sign-in path and the provisioned entitlement.
                  </Banner>
                ) : (
                  <Banner tone="warn">
                    Choose a capability. An application record with neither has nothing to configure.
                  </Banner>
                )}
              </>
            )}

            {current.id === 'basics' && (
              <Card title="Application basics" sub="Only the name and organization are mandatory. Everything else can be completed later on the record.">
                <div className="grid grid-2">
                  <Field
                    label="Display name" required htmlFor="aw-display"
                    error={attempted.has('basics') && !d.displayName.trim() ? 'An application name is required.' : undefined}
                  >
                    <TextInput id="aw-display" value={d.displayName} placeholder="Vendor Portal" onChange={(e) => setDisplayName(e.target.value)} />
                  </Field>
                  <Field
                    label="Organization" required htmlFor="aw-org"
                    hint="Scopes who can see and administer this application."
                    error={attempted.has('basics') && !d.org ? 'Choose an organization.' : undefined}
                  >
                    <Select id="aw-org" value={d.org} placeholder="Select an organization" options={ORG_OPTIONS} onChange={(e) => set({ org: e.target.value })} />
                  </Field>
                  <Field label="Description" span={2} htmlFor="aw-desc">
                    <TextInput as="textarea" id="aw-desc" rows={2} value={d.description} placeholder="What the application does and who depends on it." onChange={(e) => set({ description: e.target.value })} />
                  </Field>
                  {/* One image field for every application type, held with the
                      other common fields rather than repeated in each protocol
                      register under a slightly different label. */}
                  <Field label="Application image" span={2} hint="Shown in the register, on the record, on the launchpad and on the sign-in screen. Optional — without one the application takes its vendor mark, or initials from its name.">
                    <ImageField
                      idPrefix="aw-logo"
                      value={{ name: d.logo, src: d.logoSrc }}
                      onChange={(img) => set({ logo: img.name, logoSrc: img.src })}
                    />
                  </Field>
                </div>
              </Card>
            )}

            {current.id === 'provisioning' && (
              <>
                <div className="section-head">
                  <span className="section-title">Choose a connector type</span>
                  <span className="section-sub">The connection settings below change to match the selected connector.</span>
                </div>
                <div className="grid grid-4">
                  {CONNECTOR_TYPES.map((c) => (
                    <div
                      className="tile"
                      key={c.id}
                      data-nav="true"
                      data-tone={d.connector === c.id ? 'ok' : undefined}
                      role="button"
                      tabIndex={0}
                      aria-pressed={d.connector === c.id}
                      onClick={() => pickConnector(c)}
                      onKeyDown={(e) => e.key === 'Enter' && pickConnector(c)}
                    >
                      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                        <span className="tile-logo" data-on={d.connector === c.id || undefined}>
                          <AppLogo brand={brandForConnector(c.id)} name={c.name} size={38} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="t-sm trunc" style={{ fontWeight: 600, display: 'block' }}>{c.name}</span>
                          <span className="t-xs t-mut">{c.kind}</span>
                        </span>
                        {d.connector === c.id && <Icon name="checkC" size={14} style={{ color: 'var(--ok)' }} />}
                      </div>
                      <div className="tile-f">
                        <span className="mono">{profileFor(c.id).port ? `port ${profileFor(c.id).port}` : 'no endpoint'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {customApi && (
                  <Banner tone="info">
                    Custom API is configured in two parts: choose its operations on the next step, then the API
                    configuration for each chosen operation on the Connection step.
                  </Banner>
                )}
                {d.connector && !customApi && connectionCards}
              </>
            )}

            {current.id === 'connection' && connectionCards}

            {current.id === 'operations' && (
              <>
                <Card
                  title="Operation configuration"
                  sub="What this connector is allowed to do once the connection is live. An operation that is not ticked is never attempted, whatever a mapping says."
                >
                  <OperationChecks
                    value={d.operations}
                    onChange={(next) => set({ operations: withLeaverChoice(d.operations, next) })}
                    specs={OPERATION_SPECS}
                    idPrefix="aw-op"
                    disabledIds={['create']}
                  />
                  <div className="section-head" style={{ margin: '20px 0 8px' }}>
                    <span className="section-title">Lifecycle behaviour</span>
                    <span className="section-sub">Applied on top of the operations above.</span>
                  </div>
                  <OperationChecks
                    value={d.operations}
                    onChange={(next) => set({ operations: withLeaverChoice(d.operations, next) })}
                    specs={EXTRA_OPERATION_SPECS}
                    idPrefix="aw-xop"
                  />
                </Card>
                {operationIssues(d.operations).map((i) => <Banner tone="warn" key={i}>{i}</Banner>)}
                <Banner tone="info">
                  <b>Update for existing user</b> decides what happens when the target already holds an account for the
                  identity: adopt and update it, or fail the run and raise it for review.
                </Banner>
              </>
            )}

            {current.id === 'sso' && (
              <>
                <Card
                  title="Federation protocol"
                  sub="How the application consumes the sign-in. Choose this first — it decides which specification the rest of this step follows."
                >
                  <div className="grid grid-2">
                    <Field
                      label="Protocol" required htmlFor="aw-proto"
                      error={attempted.has('sso') && !d.protocol ? 'Choose a protocol.' : undefined}
                    >
                      <Select
                        id="aw-proto"
                        value={d.protocol}
                        placeholder="Select a protocol"
                        options={PROTOCOLS}
                        onChange={(e) => {
                          const next = e.target.value
                          const nextSpec = next ? specNameFor(next) : ''
                          set({
                            protocol: next,
                            // Re-seed rather than carry values the other
                            // specification has no meaning for. The client
                            // identifier and application URL are common to
                            // every type, so they survive the switch.
                            ssoSpec: !nextSpec ? {} : nextSpec === ssoSpec
                              ? specValues
                              : {
                                ...defaultsFor(nextSpec),
                                clientId: specValues.clientId || '',
                                applicationUrl: specValues.applicationUrl || '',
                              },
                          })
                        }}
                      />
                    </Field>
                    {/* One identifier for every application type, asked for
                        the moment the protocol is known rather than inside a
                        card that only one protocol shows. */}
                    {clientField && (
                      <SpecField
                        f={clientField}
                        value={specValues.clientId}
                        error={specErrors.clientId}
                        onChange={setSpec}
                      />
                    )}
                  </div>
                  {!d.protocol && (
                    <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                      <Icon name="info" size={15} />
                      <div>Choose a protocol. The client identifier and the protocol&apos;s own settings appear once it is known.</div>
                    </div>
                  )}
                  {isLink && (
                    <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                      <Icon name="link" size={15} />
                      <div>
                        A link application issues no assertion and no token. It puts a tile in the catalog that opens a
                        URL, so the only thing to configure is the destination.
                      </div>
                    </div>
                  )}
                  {d.protocol === 'JWT' && (
                    <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                      <Icon name="info" size={15} />
                      <div>
                        A JWT application receives a signed token at a redirect URL. Everything else about it — the
                        display name, the organization and the description — is already held in Basics.
                      </div>
                    </div>
                  )}
                </Card>

                {!d.protocol ? null : isLink ? (
                  <Card title="Destination" sub="What the catalog tile opens.">
                    <LinkFields value={d.link} onChange={setLink} attempted={attempted.has('sso')} idPrefix="aw-lk" />
                  </Card>
                ) : (
                  /* Only the sections the chosen configuration method actually
                     shows. Advanced sections stay collapsed on their recommended
                     defaults, and open themselves when one of their fields is at
                     fault. */
                  specSections.map((sec) => (
                    <SpecSection
                      key={sec.id}
                      section={sec}
                      values={specValues}
                      errors={specErrors}
                      onChange={setSpec}
                      forceOpen={sec.fields.some((f) => specErrors[f.id])}
                    />
                  ))
                )}

              </>
            )}

            {current.id === 'review' && (
              <WizardReview
                d={d}
                capLabel={capLabel}
                ssoSpec={ssoSpec}
                isOauth={isOauth}
                hasProv={hasProv(d.capability)}
                hasSso={hasSso(d.capability)}
                invalidSteps={requiredSteps.filter((s) => !stepValid(s.id))}
                onEdit={(id) => {
                  const at = steps.findIndex((x) => x.id === (id === 'provisioning' && customApi ? 'connection' : id))
                  if (at >= 0) setStep(at)
                }}
              />
            )}

          </div>
        </div>

        <StickyActions dirty={!!d.capability} message={`Step ${idx + 1} of ${steps.length} · ${current.title}`}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button icon="chevL" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</Button>
          {idx < steps.length - 1
            ? <Button variant="pri" iconRight="chevR" onClick={() => go(idx + 1)}>Continue</Button>
            : <Button variant="pri" icon="save" disabled={!allValid} onClick={create}>Create application</Button>}
        </StickyActions>
      </div>
    </>
  )
}
