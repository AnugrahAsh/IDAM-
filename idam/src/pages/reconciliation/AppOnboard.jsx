import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import AppLogo from '../../components/primitives/AppLogo'
import Meter from '../../components/primitives/Meter'
import Switch from '../../components/primitives/Switch'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import { num } from '../../lib/format'
import { APPLICATIONS } from '../../data/seed'
import { brandFor } from '../provisioning/shared'
import { IDAM_ATTRIBUTES, MODES, RULE_TYPES, SCHEDULES, defaultConfig } from './shared'

const STEPS = [
  { id: 'application', label: 'Application', icon: 'provision', hint: 'Which target joins reconciliation' },
  { id: 'connection', label: 'Target & connection', icon: 'server', hint: 'How the account inventory is read' },
  { id: 'matching', label: 'Matching rules', icon: 'policy', hint: 'How accounts correlate to identities' },
]

const blankRule = (order) => ({
  id: `custom-${order}-${Date.now()}`,
  order,
  name: '',
  target: '',
  idam: IDAM_ATTRIBUTES[0],
  type: RULE_TYPES[0],
  weight: 10,
  enabled: true,
  description: 'Custom correlation rule.',
})

export default function AppOnboard({ app, onboardedIds = [], onSave, onCancel }) {
  const editing = !!app
  const available = useMemo(
    () => APPLICATIONS.filter((a) => !onboardedIds.includes(a.id)),
    [onboardedIds],
  )

  const [step, setStep] = useState(editing ? 1 : 0)
  const [appId, setAppId] = useState(editing ? app.appId : (available[0] ? available[0].id : null))
  const [draft, setDraft] = useState(() => (editing
    ? { mode: app.mode, schedule: app.schedule, rules: app.rules.map((r) => ({ ...r })), link: app.link, review: app.review }
    : { mode: 'Delta', schedule: SCHEDULES[1], rules: defaultConfig(APPLICATIONS[0]).rules, link: 85, review: 70 }))

  const chosen = editing
    ? APPLICATIONS.find((a) => a.id === app.appId)
    : APPLICATIONS.find((a) => a.id === appId)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setRule = (id, patch) => set({ rules: draft.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const removeRule = (id) => set({ rules: draft.rules.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i + 1 })) })
  const addRule = () => set({ rules: [...draft.rules, blankRule(draft.rules.length + 1)] })
  const moveRule = (id, dir) => {
    const i = draft.rules.findIndex((r) => r.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= draft.rules.length) return
    const out = [...draft.rules]
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
    set({ rules: out.map((r, k) => ({ ...r, order: k + 1 })) })
  }

  const activeRules = draft.rules.filter((r) => r.enabled)
  const incompleteRules = draft.rules.filter((r) => !r.name.trim() || !r.target.trim() || !r.idam.trim())
  const thresholdError = draft.review >= draft.link ? 'The review threshold must be lower than the auto-link threshold.' : null

  const stepValid = [
    !!chosen,
    true,
    activeRules.length > 0 && incompleteRules.length === 0 && !thresholdError,
  ]
  const canFinish = stepValid.every(Boolean)

  const finish = () => {
    if (!canFinish || !chosen) return
    onSave({
      ...defaultConfig(chosen),
      mode: draft.mode,
      schedule: draft.schedule,
      rules: draft.rules.map((r, i) => ({ ...r, order: i + 1, name: r.name.trim(), target: r.target.trim(), idam: r.idam.trim() })),
      link: draft.link,
      review: draft.review,
    })
  }

  return (
    <>
      <DetailHeader
        backTo="/iam/trustReconciliation"
        backLabel="Trust Reconciliation"
        eyebrow={editing ? 'Reconciliation setup' : 'Onboard an application'}
        title={editing ? chosen.displayName : 'Add application to reconciliation'}
        sub={editing
          ? 'Adjust how the account inventory is read and how accounts correlate to identities. Changes apply from the next run.'
          : 'Pick the application, confirm the target connection, then define the matching rules that correlate its accounts to identities in the store.'}
        media={chosen
          ? <AppLogo brand={brandFor(chosen)} name={chosen.displayName} size={56} />
          : (
            <span className="feed-ic" data-tone="acc" style={{ width: 56, height: 56 }}>
              <Icon name="recon" style={{ width: 24, height: 24 }} />
            </span>
          )}
        badges={
          <>
            {chosen && <Tag>{chosen.method}</Tag>}
            <Tag tone="acc">{activeRules.length} matching {activeRules.length === 1 ? 'rule' : 'rules'}</Tag>
            <Tag>{draft.mode} mode</Tag>
          </>
        }
        meta={
          <>
            {chosen && <Fact icon="server" label="Target" value={chosen.host} />}
            {chosen && <Fact icon="users" label="Accounts on target" value={num(chosen.accounts)} />}
            <Fact icon="clock" label="Schedule" value={draft.schedule} />
            <Fact icon="target" label="Auto-link at" value={`${draft.link}%`} />
          </>
        }
        actions={<Button icon="x" onClick={onCancel}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="stack">
          <div className="rec-steps">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="rec-step"
                data-on={step === i || undefined}
                data-done={(step > i && stepValid[i]) || undefined}
                disabled={!editing && i > 0 && !stepValid[0]}
                onClick={() => (!editing || i > 0 ? setStep(i) : null)}
              >
                <span className="rec-step-n">{step > i && stepValid[i] ? <Icon name="check" size={11} stroke={3} /> : i + 1}</span>
                <span className="rec-step-m">
                  <span className="rec-step-t">{s.label}</span>
                  <span className="rec-step-s">{s.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="detail-cols">
            <div className="stack">
              {step === 0 && (
                <Card
                  title="Application"
                  sub="Provisioned targets that are not yet onboarded for reconciliation"
                >
                  {editing ? (
                    <Banner tone="info">The application cannot be changed once onboarded. Remove it from reconciliation and onboard again to switch targets.</Banner>
                  ) : available.length === 0 ? (
                    <EmptyState
                      icon="provision"
                      title="Every application is already onboarded"
                      body="All provisioned targets are reconciled. Remove one from reconciliation to onboard it again with a different configuration."
                    />
                  ) : (
                    <div className="app-pick">
                      {available.map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          className="app-pick-it"
                          data-on={appId === a.id || undefined}
                          onClick={() => setAppId(a.id)}
                        >
                          <AppLogo brand={brandFor(a)} name={a.displayName} size={30} />
                          <span className="app-pick-m">
                            <span className="app-pick-t trunc">{a.displayName}</span>
                            <span className="app-pick-s trunc mono">{a.host}</span>
                          </span>
                          <span className="app-pick-r">
                            <Tag>{a.method}</Tag>
                            <span className="t-xs t-mut num">{num(a.accounts)} accounts</span>
                          </span>
                          <span className="rec-radio" data-on={appId === a.id || undefined}>
                            {appId === a.id && <Icon name="check" size={10} stroke={3} />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {step === 1 && chosen && (
                <>
                  <Card title="Target connection" sub="Read from the existing provisioning connector. Reconciliation never writes to the target.">
                    <KeyValue
                      cols={2}
                      rows={[
                        { k: 'Application', v: chosen.displayName, icon: 'provision' },
                        { k: 'Connector method', v: chosen.method, icon: 'swap' },
                        { k: 'Endpoint', v: `${chosen.host}:${chosen.port}`, icon: 'globe' },
                        { k: 'Connector health', node: <Pill tone={chosen.status === 'Healthy' ? 'ok' : chosen.status === 'Failed' ? 'bad' : 'warn'} dot>{chosen.status}</Pill>, icon: 'activity' },
                        { k: 'Accounts on target', v: num(chosen.accounts), icon: 'users' },
                        { k: 'Owning team', v: chosen.owner, icon: 'building' },
                      ]}
                    />
                    {chosen.status !== 'Healthy' && (
                      <div style={{ marginTop: 12 }}>
                        <Banner tone="warn">
                          The connector behind this target is {chosen.status.toLowerCase()}. Runs may fail or read a partial
                          inventory until the connector recovers.
                        </Banner>
                      </div>
                    )}
                  </Card>

                  <Card title="Run behaviour" sub="How and when the account inventory is read">
                    <div className="grid grid-2">
                      <Field label="Reconciliation mode" htmlFor="ob-mode" hint="Full reads every account. Delta reads only accounts changed since the last run.">
                        <Select id="ob-mode" value={draft.mode} options={MODES} onChange={(e) => set({ mode: e.target.value })} />
                      </Field>
                      <Field label="Schedule" htmlFor="ob-sched" hint="Runs can also be triggered manually at any time.">
                        <Select id="ob-sched" value={draft.schedule} options={SCHEDULES} onChange={(e) => set({ schedule: e.target.value })} />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {step === 2 && (
                <>
                  <Card
                    title="Matching rules"
                    sub="Evaluated in order. Each hit adds its weight to the candidate's confidence score."
                    flush
                    actions={<Button size="sm" icon="plus" onClick={addRule}>Add rule</Button>}
                    footer={
                      <>
                        <span>{activeRules.length} of {draft.rules.length} rules active</span>
                        <span className="spacer" />
                        <span className="t-faint">Total active weight {activeRules.reduce((a, r) => a + r.weight, 0)}</span>
                      </>
                    }
                  >
                    <div className="wb-scroll">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th style={{ width: 62 }}>Order</th>
                            <th>Rule</th>
                            <th>Target attribute</th>
                            <th>IDAM attribute</th>
                            <th style={{ width: 140 }}>Match type</th>
                            <th style={{ width: 84 }}>Weight</th>
                            <th style={{ width: 70 }}>Active</th>
                            <th className="td-act" />
                          </tr>
                        </thead>
                        <tbody>
                          {draft.rules.map((r, i) => (
                            <tr key={r.id}>
                              <td>
                                <span className="row" style={{ gap: 2 }}>
                                  <span className="num" style={{ width: 14 }}>{i + 1}</span>
                                  <IconButton icon="chevU" size="sm" label="Move up" disabled={i === 0} onClick={() => moveRule(r.id, -1)} />
                                  <IconButton icon="chevD" size="sm" label="Move down" disabled={i === draft.rules.length - 1} onClick={() => moveRule(r.id, 1)} />
                                </span>
                              </td>
                              <td>
                                <TextInput value={r.name} placeholder="Rule name" aria-label={`Rule ${i + 1} name`} onChange={(e) => setRule(r.id, { name: e.target.value })} />
                              </td>
                              <td>
                                <TextInput className="mono" value={r.target} placeholder="targetAttribute" spellCheck="false" aria-label={`Rule ${i + 1} target attribute`} onChange={(e) => setRule(r.id, { target: e.target.value })} />
                              </td>
                              <td>
                                <Select value={IDAM_ATTRIBUTES.includes(r.idam) ? r.idam : IDAM_ATTRIBUTES[0]} options={IDAM_ATTRIBUTES} aria-label={`Rule ${i + 1} IDAM attribute`} onChange={(e) => setRule(r.id, { idam: e.target.value })} />
                              </td>
                              <td>
                                <Select value={r.type} options={RULE_TYPES} aria-label={`Rule ${i + 1} match type`} onChange={(e) => setRule(r.id, { type: e.target.value })} />
                              </td>
                              <td>
                                <TextInput type="number" min="1" max="100" className="mono" value={r.weight} aria-label={`Rule ${i + 1} weight`} onChange={(e) => setRule(r.id, { weight: Math.max(1, Math.min(100, Number(e.target.value) || 0)) })} />
                              </td>
                              <td>
                                <Switch checked={r.enabled} label={`Rule ${i + 1} enabled`} onChange={(v) => setRule(r.id, { enabled: v })} />
                              </td>
                              <td className="td-act">
                                <IconButton icon="trash" size="sm" label={`Remove rule ${i + 1}`} onClick={() => removeRule(r.id)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {activeRules.length === 0 && (
                    <Banner tone="bad">Every matching rule is disabled. Runs would classify all accounts as unmatched.</Banner>
                  )}
                  {incompleteRules.length > 0 && (
                    <Banner tone="warn">
                      {incompleteRules.length} {incompleteRules.length === 1 ? 'rule is' : 'rules are'} missing a name or an attribute mapping.
                    </Banner>
                  )}

                  <Card title="Confidence thresholds" sub="Where the platform stops asking a human">
                    <div className="grid grid-2">
                      <Field label="Auto-link at or above" htmlFor="ob-link" hint="Accounts scoring at or above this bind to the identity without review.">
                        <TextInput id="ob-link" type="number" min="1" max="100" className="mono" value={draft.link} onChange={(e) => set({ link: Math.max(1, Math.min(100, Number(e.target.value) || 0)) })} />
                      </Field>
                      <Field label="Manual review at or above" htmlFor="ob-review" error={thresholdError || undefined} hint={thresholdError ? undefined : 'Below this score the account is proposed as a new identity.'}>
                        <TextInput id="ob-review" type="number" min="0" max="100" className="mono" value={draft.review} onChange={(e) => set({ review: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                      </Field>
                    </div>
                  </Card>
                </>
              )}
            </div>

            <div className="stack">
              <Card title="Summary" sub="What gets onboarded">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Application', v: chosen ? chosen.displayName : 'Not selected', icon: 'provision' },
                    { k: 'Connection', v: chosen ? `${chosen.method} · ${chosen.host}` : '—', icon: 'server' },
                    { k: 'Mode', v: `${draft.mode} reconciliation`, icon: 'refresh' },
                    { k: 'Schedule', v: draft.schedule, icon: 'clock' },
                    { k: 'Matching rules', v: `${activeRules.length} active of ${draft.rules.length}`, icon: 'policy' },
                    { k: 'Auto-link threshold', v: `${draft.link}%`, icon: 'target' },
                    { k: 'Review threshold', v: `${draft.review}%`, icon: 'eye' },
                  ]}
                />
              </Card>

              <Card title="Rule order" sub="Strongest bindings first">
                {activeRules.length === 0 ? (
                  <EmptyState size="sm" icon="policy" title="No active rules" body="Enable at least one matching rule." />
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    {activeRules.map((r, i) => (
                      <div className="row" key={r.id} style={{ gap: 8 }}>
                        <span className="num t-xs" style={{ width: 14, color: 'var(--mut)' }}>{i + 1}</span>
                        <span className="t-sm trunc" style={{ flex: 1 }}>{r.name.trim() || 'Untitled rule'}</span>
                        <span style={{ width: 64 }}><Meter value={r.weight} /></span>
                        <span className="num t-xs" style={{ width: 22, textAlign: 'right' }}>{r.weight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="What happens next">
                <div className="t-sm t-mut" style={{ lineHeight: 1.6 }}>
                  Once onboarded, the first reconciliation reads the full account inventory from the target,
                  correlates every account against the identity store using these rules, and publishes the results —
                  matched accounts, unmatched accounts and unmatched identities — for review.
                </div>
              </Card>
            </div>
          </div>
        </div>

        <StickyActions
          dirty
          message={editing
            ? 'Changes apply from the next reconciliation run'
            : chosen ? `Onboarding ${chosen.displayName} for reconciliation` : 'Select an application to onboard'}
        >
          <Button onClick={onCancel}>Cancel</Button>
          {step > (editing ? 1 : 0) && <Button icon="chevL" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button variant="pri" iconRight="chevR" disabled={!stepValid[step]} onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button variant="pri" icon="check" disabled={!canFinish} onClick={finish}>
              {editing ? 'Save configuration' : 'Onboard application'}
            </Button>
          )}
        </StickyActions>
      </div>
    </>
  )
}
