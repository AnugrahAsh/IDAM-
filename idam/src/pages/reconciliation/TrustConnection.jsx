import { useEffect, useMemo, useRef, useState } from 'react'
import StickyActions from '../../components/shell/StickyActions'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import { useApp } from '../../store/AppContext'
import { statusTone } from '../../lib/format'
import { ConnectionFields, ErrorClassification } from '../applications/facetControls'
import TestResult from '../applications/TestResult'
import {
  CONNECTORS, blankConnection, connectionEndpoint, connectionIssues, kindOf, probeConnection,
} from '../applications/appModel'
import ReadSettings, { jsonIssues } from './ReadSettings'
import { needsReadSettings, sourceLabel } from './trustModel'

// ---------------------------------------------------------------------------
// Connection settings for a trust source.
//
// Deliberately the same shape as the Provisioning tab: pick a connector type,
// fill the fields that type declares, test the connection against the form
// rather than against what is saved. The controls are the ones the provisioning
// side already owns, so a source and an application cannot drift into asking
// for the same credential in two different ways.
// ---------------------------------------------------------------------------

const CONNECTOR_OPTIONS = Object.values(CONNECTORS).map((c) => ({ value: c.id, label: `${c.name} · ${c.kind}` }))

export default function TrustConnection({ source, onSave }) {
  const { toast } = useApp()
  const initial = useMemo(() => ({
    connector: source.connector,
    connection: { ...source.connection },
    get_token_api_http_method: source.get_token_api_http_method || 'POST',
    get_token_api_auth_method: source.get_token_api_auth_method || 'noAuth',
    get_token_api_url: source.get_token_api_url || '',
    get_token_api_headers: source.get_token_api_headers || '',
    get_token_api_payload: source.get_token_api_payload || '',
    users_data_api_http_method: source.users_data_api_http_method || 'GET',
    users_data_api_auth_method: source.users_data_api_auth_method || 'Bearer',
    users_data_api_headers: source.users_data_api_headers || '',
    users_data_api_payload: source.users_data_api_payload || '',
    listPath: source.listPath || '',
    detailPath: source.detailPath || '',
  }), [source])

  const [draft, setDraft] = useState(initial)
  const [probe, setProbe] = useState(null)
  const [testing, setTesting] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const changeConnector = (id) => {
    setDraft((d) => {
      const blank = blankConnection(id)
      // A value the new connector also asks for is carried across, so switching
      // a database source between engines does not clear the host and password
      // the operator just typed.
      Object.keys(blank).forEach((k) => {
        if (d.connection[k] !== undefined && d.connection[k] !== '') blank[k] = d.connection[k]
      })
      return { ...d, connector: id, connection: blank }
    })
    setProbe(null)
  }

  const needsRead = needsReadSettings(draft.connector)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const issues = [
    ...connectionIssues(draft.connector, draft.connection),
    ...(needsRead ? jsonIssues(draft) : []),
  ]

  const runTest = () => {
    if (testing) return
    setTesting(true)
    setProbe(null)
    timer.current = setTimeout(() => {
      setTesting(false)
      setProbe(probeConnection(draft.connector, draft.connection))
    }, 850)
  }

  const save = () => {
    onSave(draft)
    toast('ok', 'Connection saved', `${sourceLabel(source)} is read with the new settings from the next reconciliation.`)
  }

  const message = dirty
    ? (issues.length > 0
      ? `Unsaved connection changes · ${issues.length} item${issues.length === 1 ? '' : 's'} need attention`
      : 'Unsaved connection changes')
    : 'Connection settings are up to date'

  return (
    <div className="stack">
      <div className="detail-cols">
        <div className="stack">
          <Card
            title="Connection settings"
            sub={`${CONNECTORS[draft.connector] ? CONNECTORS[draft.connector].name : draft.connector} connector — the fields below match the selected connector type.`}
          >
            <div className="grid grid-2" style={{ marginBottom: 14 }}>
              <Field label="Connector type" htmlFor="tc-type" hint="Changing the type swaps the connection fields to match.">
                <Select id="tc-type" value={draft.connector} options={CONNECTOR_OPTIONS} onChange={(e) => changeConnector(e.target.value)} />
              </Field>
            </div>
            <ConnectionFields
              connector={draft.connector}
              value={draft.connection}
              onChange={(patch) => set({ connection: { ...draft.connection, ...patch } })}
              showErrors
              idPrefix="tc-conn"
            />
            {kindOf(draft.connector) === 'Custom' && (
              <div style={{ marginTop: 20 }}>
                <div className="section-head" style={{ marginBottom: 10 }}>
                  <span className="section-title">Error classification</span>
                  <span className="section-sub">
                    Conditions are matched in order against the error key above. A validation error rejects the record
                    and the run continues; an authentication error stops the read.
                  </span>
                </div>
                <ErrorClassification
                  rows={draft.connection.errorClasses || []}
                  onChange={(next) => set({ connection: { ...draft.connection, errorClasses: next } })}
                />
              </div>
            )}
          </Card>

          {needsRead && <ReadSettings value={draft} onChange={set} idPrefix="tc" />}

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
        </div>

        <div className="stack">
          <Card title="Record">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Endpoint', v: <span className="mono t-xs">{connectionEndpoint(draft.connector, draft.connection)}</span>, icon: 'server' },
                { k: 'Connector', v: CONNECTORS[draft.connector] ? CONNECTORS[draft.connector].name : draft.connector, icon: 'swap' },
                { k: 'Status', node: <Pill tone={statusTone(source.status)} dot>{source.status || 'Draft'}</Pill>, icon: 'activity' },
                { k: 'Attributes mapped', v: (source.mappings || []).length, icon: 'sliders' },
                { k: 'Last run', v: source.lastRun || 'Never run', icon: 'history' },
              ]}
            />
          </Card>
          <Banner tone="info">
            Only the core connection fields are mandatory. Page sizes and retry backoff are managed by the platform; the
            request timeout is on the form because it is a property of the source, not of the platform.
          </Banner>
        </div>
      </div>

      <StickyActions dirty={dirty} message={message}>
        <Button disabled={!dirty} onClick={() => { setDraft(initial); setProbe(null) }}>Discard</Button>
        <Button variant="pri" icon="save" disabled={!dirty || issues.length > 0} onClick={save}>Save changes</Button>
      </StickyActions>
    </div>
  )
}
