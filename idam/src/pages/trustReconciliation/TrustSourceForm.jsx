import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { CONNECTOR_TYPES } from '../../data/seed'
import { profileFor } from '../shared/provisioning/shared'
import { ConnectionFields } from '../applications/facetControls'
import TestResult from '../applications/TestResult'
import {
  blankConnection, connectionEndpoint, connectionIssues, kindOf, probeConnection,
} from '../applications/appModel'
import ReadSettings, { jsonIssues } from './ReadSettings'
import TrustMapping from './TrustMapping'
import { blankSource, connectorName, needsReadSettings, sourceLabel, uniqueIssues, withConnector } from './trustModel'

// The registration flow for a trust source. It asks the same three questions
// the Add Application flow asks — what is it, how does the platform reach it,
// and what does each record become — using the same connector controls, so a
// source registered here and an application registered there cannot end up
// describing the same system in two incompatible ways.
const STEPS = [
  { id: 'source', label: 'Source', icon: 'provision', hint: 'What the platform reads from' },
  { id: 'connection', label: 'Connection', icon: 'server', hint: 'How it connects and where the users are' },
  { id: 'attributes', label: 'Attributes', icon: 'sliders', hint: 'Which source field feeds which identity attribute' },
]

export default function TrustSourceForm({ source, onSave, onCancel }) {
  const { toast } = useApp()
  const [step, setStep] = useState(0)
  const [d, setD] = useState(() => withConnector({ ...blankSource(), ...(source || {}) }))
  const [touched, setTouched] = useState(false)
  const [probe, setProbe] = useState(null)
  const [testing, setTesting] = useState(false)

  const set = (patch) => { setD((x) => ({ ...x, ...patch })); setTouched(true) }

  const pickConnector = (c) => {
    setD((x) => {
      const blank = blankConnection(c.id)
      Object.keys(blank).forEach((k) => {
        if (x.connection[k] !== undefined && x.connection[k] !== '') blank[k] = x.connection[k]
      })
      return { ...x, connector: c.id, connection: blank }
    })
    setTouched(true)
    setProbe(null)
  }

  const needsRead = needsReadSettings(d.connector)
  const nameError = touched && !d.application_name.trim() ? 'A source name is required.' : ''
  const connIssues = [...connectionIssues(d.connector, d.connection), ...(needsRead ? jsonIssues(d) : [])]
  const attrIssues = [
    ...(d.mappings.some((a) => !String(a.source || '').trim()) ? ['Every attribute needs a source field, or a manual value.'] : []),
    ...uniqueIssues(d.mappings, d.uniqueAttribute, d.uniqueSourceAttribute),
  ]
  const valid = !!d.application_name.trim() && connIssues.length === 0 && attrIssues.length === 0

  const runTest = () => {
    if (testing) return
    setTesting(true)
    setProbe(null)
    setTimeout(() => { setTesting(false); setProbe(probeConnection(d.connector, d.connection)) }, 850)
  }

  const save = () => {
    setTouched(true)
    if (!d.application_name.trim()) { toast('warn', 'Name required', 'Give the source a name before saving.'); return }
    if (connIssues.length) { toast('warn', 'Connection incomplete', connIssues[0]); return }
    if (attrIssues.length) { toast('warn', 'Attributes incomplete', attrIssues[0]); return }
    onSave(d)
  }

  return (
    <>
      <DetailHeader
        backTo="/iam/trustReconciliation"
        backLabel="Trust Reconciliation"
        eyebrow={source ? 'Edit trust source' : 'New trust source'}
        title={sourceLabel(d)}
        sub="A trust source is a system the platform reads identities out of. Nothing is read until the source is saved and a reconciliation is run."
        badges={<Tag tone="acc">{connectorName(d.connector)}</Tag>}
        meta={
          <>
            <Fact icon="swap" label="Connector" value={connectorName(d.connector)} />
            <Fact icon="server" label="Endpoint" value={connectionEndpoint(d.connector, d.connection)} />
            <Fact icon="sliders" label="Attributes" value={d.mappings.length} />
          </>
        }
        actions={<Button icon="x" onClick={onCancel}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="wizard">
          <div className="wiz-rail">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="wiz-step"
                data-state={i === step ? 'active' : i < step ? 'done' : undefined}
                onClick={() => setStep(i)}
              >
                <span className="wiz-n"><Icon name={i < step ? 'check' : s.icon} size={12} /></span>
                <span className="wiz-m">
                  <span className="wiz-t">{s.label}</span>
                  <span className="wiz-s">{s.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="wiz-body">
            {step === 2 ? (
              <TrustMapping source={d} onPatch={set} />
            ) : (
              <div className="detail-cols">
                <div className="stack">
                  {step === 0 && (
                    <>
                      <Card title="Source" sub="How the source is named, and which connector reads it">
                        <div className="grid grid-2">
                          <Field label="Source name" required error={nameError} hint="Used by jobs and logs." htmlFor="ts-name">
                            <TextInput id="ts-name" className="mono" value={d.application_name} placeholder="workday_hr" onChange={(e) => set({ application_name: e.target.value })} />
                          </Field>
                          <Field label="Display name" hint="Shown across the console." htmlFor="ts-disp">
                            <TextInput id="ts-disp" value={d.display_name} placeholder="Workday HR" onChange={(e) => set({ display_name: e.target.value })} />
                          </Field>
                        </div>
                      </Card>

                      <div className="section-head">
                        <span className="section-title">Choose a connector type</span>
                        <span className="section-sub">The connection settings on the next step change to match the selected connector.</span>
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
                              <span className="feed-ic" data-tone={d.connector === c.id ? 'acc' : 'mut'} style={{ width: 30, height: 30 }}>
                                <Icon name={c.icon} size={15} />
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
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <Card
                        title="Connection settings"
                        sub={`${connectorName(d.connector)} connector — only the fields this connector type actually needs.`}
                      >
                        <ConnectionFields
                          connector={d.connector}
                          value={d.connection}
                          onChange={(patch) => set({ connection: { ...d.connection, ...patch } })}
                          showErrors={touched}
                          idPrefix="ts-conn"
                        />
                      </Card>

                      {needsRead && <ReadSettings value={d} onChange={set} idPrefix="ts" />}

                      <Card
                        title="Connection test"
                        sub="Runs against the values currently in this form, not the saved configuration."
                        actions={
                          <Button size="sm" variant="pri" icon={testing ? 'clock' : 'target'} disabled={testing} onClick={runTest}>
                            {testing ? 'Testing…' : 'Test connection'}
                          </Button>
                        }
                      >
                        <TestResult
                          probe={probe}
                          testing={testing}
                          idle="The connection has not been tested yet. A test resolves the endpoint, opens a transport, authenticates the service credential and reads the first page of user records."
                        />
                      </Card>
                    </>
                  )}
                </div>

                <div className="stack">
                  <Card title="Summary" sub="What will be saved">
                    <KeyValue
                      cols={1}
                      rows={[
                        { k: 'Name', v: d.application_name || '—', icon: 'provision' },
                        { k: 'Connector', v: connectorName(d.connector), icon: 'swap' },
                        { k: 'Connector kind', v: kindOf(d.connector), icon: 'layers' },
                        { k: 'Endpoint', v: connectionEndpoint(d.connector, d.connection), icon: 'server' },
                        needsRead && { k: 'List path', v: d.listPath || '—', icon: 'code' },
                        { k: 'Attributes mapped', v: `${d.mappings.filter((a) => !a.manual).length} read · ${d.mappings.filter((a) => a.manual).length} manual`, icon: 'sliders' },
                      ].filter(Boolean)}
                    />
                  </Card>

                  {touched && connIssues.length > 0 && (
                    <Banner tone="warn">The connection is incomplete, so a reconciliation would have nothing to read. {connIssues[0]}</Banner>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <StickyActions dirty={touched} message={touched ? (valid ? 'Unsaved changes' : 'Unsaved changes · source is incomplete') : 'No changes'}>
          <Button onClick={onCancel}>Cancel</Button>
          {step > 0 && <Button icon="chevL" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button variant="pri" iconRight="chevR" onClick={() => setStep(step + 1)}>Next</Button>
            : <Button variant="pri" icon="save" onClick={save}>{source ? 'Save source' : 'Create source'}</Button>}
        </StickyActions>
      </div>
    </>
  )
}
