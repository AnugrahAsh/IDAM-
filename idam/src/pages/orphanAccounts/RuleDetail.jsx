import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tabs from '../../components/primitives/Tabs'
import Tag from '../../components/primitives/Tag'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { duration, num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useMemo, useState } from 'react'
import { ACCOUNT_ATTRIBUTES, BASE, NOW_STAMP, RULES_BASE, SWEEP, ageDays, changeLog, countRules, matchAccounts, modelText, sweepHistory, unresolvedRules } from './orphanedData'
import AccountsTable from './AccountsTable'
import ConditionBuilder from './ConditionBuilder'

export default function RuleDetail({ rule, tab, accounts, setRules, actions }) {
  const { toast, confirm, navigate } = useApp()
  const [pending, setPending] = useState(null)

  const model = pending || rule.model
  const registered = useMemo(() => accounts.filter((a) => a.rule === rule.name), [accounts, rule.name])
  const evaluated = useMemo(() => matchAccounts(rule.model, accounts, rule.scope), [rule.model, rule.scope, accounts])
  const draftMatched = useMemo(() => matchAccounts(model, accounts, rule.scope), [model, rule.scope, accounts])
  const dirty = pending != null && modelText(pending) !== modelText(rule.model)
  const open = registered.filter((a) => a.status === 'Open')
  const sweeps = useMemo(() => sweepHistory(rule, registered.length), [rule, registered.length])

  const goTab = (t) => navigate(t === 'overview' ? `${RULES_BASE}/${rule.id}` : `${RULES_BASE}/${rule.id}/${t}`, { replace: true })

  const patch = (changes, title, body, tone) => {
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, ...changes } : r)))
    toast(tone || 'ok', title, body)
  }

  const riskMix = ['critical', 'high', 'medium', 'low']
    .map((band) => ({ label: band, value: registered.filter((a) => a.risk === band).length, color: band === 'critical' ? 'var(--sev-crit)' : band === 'high' ? 'var(--sev-high)' : band === 'medium' ? 'var(--sev-med)' : 'var(--s1)' }))
    .filter((r) => r.value > 0)

  const appMix = [...new Set(registered.map((a) => a.application))]
    .map((label) => ({ label, value: registered.filter((a) => a.application === label).length, color: 'var(--s1)' }))
    .sort((a, b) => b.value - a.value)

  const statusMix = ['Open', 'Claimed', 'Disabled', 'Suppressed']
    .map((s) => ({ label: s, value: registered.filter((a) => a.status === s).length, color: s === 'Open' ? 'var(--sev-high)' : 'var(--s1)' }))
    .filter((r) => r.value > 0)

  const saveConditions = () => {
    if (!modelText(model)) {
      toast('warn', 'No conditions', 'Add at least one condition before saving the rule.')
      return
    }
    patch({ model, modifiedOn: NOW_STAMP, modifiedBy: 'admin' }, 'Conditions saved', `${rule.name} uses the new condition set on the next sweep.`)
    setPending(null)
  }

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Orphan Accounts"
        eyebrow="Orphan detection rule"
        title={rule.name}
        sub={rule.description}
        badges={
          <>
            <Pill tone={rule.active ? 'ok' : 'mut'} dot>{rule.active ? 'Enabled' : 'Disabled'}</Pill>
            <Tag>{countRules(rule.model)} conditions</Tag>
            {open.length > 0 && <Pill tone="warn" dot>{num(open.length)} open</Pill>}
          </>
        }
        meta={
          <>
            <Fact icon="provision" label="Scope" value={rule.scope} />
            <Fact icon="orphan" label="Register" value={num(registered.length)} />
            <Fact icon="history" label="Last run" value={rule.lastRun || 'Never run'} />
            <Fact icon="user" label="Owner" value={rule.owner} />
          </>
        }
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `${rule.name} matches queued for export.`)}>Export matches</Button>
            <Button
              icon={rule.active ? 'eyeoff' : 'checkC'}
              onClick={() => patch({ active: !rule.active }, rule.active ? 'Rule disabled' : 'Rule enabled',
                rule.active ? 'Skipped by the detection sweep. Accounts already surfaced stay in the register.' : 'Included in the next detection sweep.',
                rule.active ? 'warn' : 'ok')}
            >
              {rule.active ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => actions.deleteRules([rule], () => navigate(BASE))}>Delete</Button>
            <Button icon="edit" onClick={() => navigate(`${RULES_BASE}/${rule.id}/edit`)}>Edit rule</Button>
            <Button variant="pri" icon="refresh" onClick={() => confirm({
              title: `Run ${rule.name} now?`,
              body: `Every account discovered on ${rule.scope} is re-evaluated against the ${countRules(rule.model)} conditions in this rule.`,
              confirmLabel: 'Run detection',
              tone: 'acc',
              onConfirm: () => {
                patch({ lastRun: NOW_STAMP }, 'Detection queued', `${rule.name} evaluated across ${rule.scope} · ${num(evaluated.length)} accounts currently match.`)
              },
            })}>Run detection</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={goTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'conditions', label: 'Conditions', icon: 'policy', count: countRules(rule.model) },
              { id: 'accounts', label: 'Matched accounts', icon: 'orphan', count: registered.length },
              { id: 'history', label: 'Run history', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {tab === 'overview' && (
          <div className="detail-cols">
            <div className="stack">
              <div className="stat-strip">
                <div className="stat-cell"><span className="stat-k"><Icon name="orphan" size={12} />Accounts in register</span><span className="stat-v">{num(registered.length)}</span></div>
                <div className="stat-cell"><span className="stat-k"><Icon name="warn" size={12} />Open</span><span className="stat-v" style={{ color: open.length ? 'var(--warn-core)' : undefined }}>{num(open.length)}</span></div>
                <div className="stat-cell"><span className="stat-k"><Icon name="clock" size={12} />Oldest</span><span className="stat-v">{registered.reduce((m, a) => Math.max(m, ageDays(a.discovered)), 0)}d</span></div>
              </div>

              <Card title="What this rule detects" sub="Plain reading of the saved definition">
                <div className="stack">
                  <p className="t-sm">{rule.description}</p>
                  <div className="chain">
                    <div className="chain-step" data-state="done">
                      <span className="cs-n" style={{ background: 'var(--accent-solid)' }}>1</span>
                      <div className="cs-m">
                        <div className="cs-t">Read every account discovered on {rule.scope}</div>
                        <div className="cs-s">Reconciliation feeds the account inventory before the rule is evaluated.</div>
                      </div>
                    </div>
                    <div className="chain-step" data-state="done">
                      <span className="cs-n" style={{ background: 'var(--accent-solid)' }}>2</span>
                      <div className="cs-m">
                        <div className="cs-t">Keep the accounts that satisfy the conditions</div>
                        <div className="cs-s">{countRules(rule.model)} {countRules(rule.model) === 1 ? 'condition' : 'conditions'}, {rule.model.join === 'OR' ? 'any of which may match' : 'all of which must match'}</div>
                      </div>
                      <span className="cs-r"><Tag tone="acc">{num(evaluated.length)} match now</Tag></span>
                    </div>
                    <div className="chain-step" data-state={rule.active ? 'done' : 'future'}>
                      <span className="cs-n" style={{ background: rule.active ? 'var(--ok-solid)' : 'var(--mut-solid)' }}>3</span>
                      <div className="cs-m">
                        <div className="cs-t">Record the account in the orphan register for triage</div>
                        <div className="cs-s">
                          {rule.active
                            ? `Runs on the ${SWEEP ? SWEEP.cron : '30 3 * * *'} sweep. Suppression window: ${rule.suppression}.`
                            : 'Disabled. Nothing new is surfaced until the rule is enabled.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid">
                <Card title="Detection health" sub="Condition set against live data">
                  <div className="stack">
                    <div className="row-between">
                      <span className="t-sm t-mut">Accounts matching right now</span>
                      <span className="t-h2 num">{num(evaluated.length)}</span>
                    </div>
                    <Meter value={accounts.length ? Math.round((evaluated.length / accounts.length) * 100) : 0} tone="warn" height={8} />
                    <KeyValue
                      cols={1}
                      rows={[
                        { k: 'Recorded by the last sweep', v: num(registered.length), icon: 'history' },
                        { k: 'Matching the saved condition now', v: num(evaluated.length), icon: 'policy' },
                        { k: 'Unresolved conditions', v: num(unresolvedRules(rule.model).length), icon: 'warn' },
                        { k: 'Suppression window', v: rule.suppression, icon: 'eyeoff' },
                      ]}
                    />
                    {registered.length !== evaluated.length && (
                      <div className="t-xs t-mut">
                        The register reflects the last sweep. The live count differs because accounts have been claimed,
                        disabled or suppressed since {rule.lastRun || 'the rule was created'}.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            <div className="stack">
              <Card title="Definition">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'State', node: <Pill tone={rule.active ? 'ok' : 'mut'} dot>{rule.active ? 'Enabled' : 'Disabled'}</Pill>, icon: 'power' },
                    { k: 'Scope', v: rule.scope, icon: 'provision' },
                    { k: 'Conditions', v: `${countRules(rule.model)} ${countRules(rule.model) === 1 ? 'condition' : 'conditions'}`, icon: 'policy' },
                    { k: 'Match mode', v: rule.model.join === 'OR' ? 'Match any condition' : 'Match all conditions', icon: 'swap' },
                    { k: 'Risk override', v: rule.risk, icon: 'warn' },
                  ]}
                />
              </Card>

              <Card title="Provenance">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Rule owner', v: rule.owner, icon: 'user' },
                    { k: 'Created on', v: rule.createdOn, icon: 'history' },
                    { k: 'Created by', v: rule.createdBy, icon: 'user' },
                    { k: 'Last modified', v: `${rule.modifiedOn} · ${rule.modifiedBy}`, icon: 'edit' },
                    { k: 'Change record', v: rule.ticket, icon: 'file' },
                  ]}
                />
              </Card>

              <Card title="Detection sweep">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Scheduler', v: SWEEP ? SWEEP.name : 'Orphan detection sweep', icon: 'clock' },
                    { k: 'Cron', v: SWEEP ? SWEEP.cron : '30 3 * * *', icon: 'code' },
                    { k: 'Scheduler state', node: <Pill tone={SWEEP && SWEEP.status === 'Active' ? 'ok' : 'warn'} dot>{SWEEP ? SWEEP.status : 'Unknown'}</Pill>, icon: 'power' },
                    { k: 'Last sweep', v: rule.lastRun || 'Never run', icon: 'history' },
                    { k: 'Average duration', v: SWEEP ? `${SWEEP.avgMins} min` : '—', icon: 'activity' },
                  ]}
                />
                {SWEEP && SWEEP.status !== 'Active' && (
                  <div style={{ marginTop: 12 }}>
                    <Banner tone="warn">
                      The orphan detection sweep is {SWEEP.status.toLowerCase()} and its last result was {SWEEP.lastResult.toLowerCase()}.
                      No rule is running until it is resumed.{' '}
                      <button type="button" className="link" onClick={() => navigate('schedulers')}>Open scheduler</button>
                    </Banner>
                  </div>
                )}
              </Card>

              <Card title="Linked records">
                <div className="stack" style={{ gap: 7 }}>
                  <button type="button" className="link" onClick={() => navigate('trustReconciliation')}><Icon name="recon" size={12} />Trust reconciliation</button>
                  <button type="button" className="link" onClick={() => navigate('provisionapplications')}><Icon name="provision" size={12} />Provisioned applications</button>
                  <button type="button" className="link" onClick={() => navigate('schedulers')}><Icon name="clock" size={12} />Orphan detection sweep</button>
                  <button type="button" className="link" onClick={() => navigate('recertification')}><Icon name="certify" size={12} />Attestation campaigns</button>
                  <button type="button" className="link" onClick={() => navigate('syslogs')}><Icon name="logs" size={12} />Reconciliation audit trail</button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'conditions' && (
          <>
            <div className="detail-cols">
              <div className="stack">
                <ConditionBuilder model={model} onChange={setPending} />
                {unresolvedRules(model).length > 0 && (
                  <Banner tone="warn">
                    {unresolvedRules(model).length} {unresolvedRules(model).length === 1 ? 'condition references an attribute' : 'conditions reference attributes'} the
                    account schema does not expose. They are treated as true until the connector supplies the field.
                  </Banner>
                )}
              </div>
              <div className="stack">
                <Card title="Live evaluation" sub={`Scope: ${rule.scope}`}>
                  <div className="stack">
                    <div className="row-between">
                      <span className="t-sm t-mut">Accounts matching</span>
                      <span className="t-h2 num">{num(draftMatched.length)}</span>
                    </div>
                    <Meter value={accounts.length ? Math.round((draftMatched.length / accounts.length) * 100) : 0} tone="warn" height={8} />
                    <div className="t-xs t-mut">
                      The saved condition matches {num(evaluated.length)}. Unsaved edits are not used by the detection sweep.
                    </div>
                  </div>
                </Card>
                <Card title="Sample matches" sub="First eight accounts in the result set">
                  {draftMatched.length === 0 ? (
                    <EmptyState size="sm" icon="orphan" title="No matches" body="Loosen a condition to widen the result set." />
                  ) : (
                    <div className="feed">
                      {draftMatched.slice(0, 8).map((a) => (
                        <div className="feed-it" key={a.id}>
                          <span className="feed-ic" data-tone="mut"><Icon name="orphan" size={13} /></span>
                          <div className="feed-m">
                            <div className="feed-t mono">{a.account}</div>
                            <div className="feed-s"><span>{a.application}</span><SeverityBadge level={a.risk}>{a.risk}</SeverityBadge></div>
                          </div>
                          <span className="feed-time">{ageDays(a.discovered)}d</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card title="Attribute reference" sub={`${ACCOUNT_ATTRIBUTES.length} account attributes`}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 5 }}>
                    {ACCOUNT_ATTRIBUTES.map((a) => <span className="tag mono" key={a.id}>{a.id}</span>)}
                  </div>
                </Card>
              </div>
            </div>
            <StickyActions dirty={dirty} message={dirty ? 'Unsaved condition changes' : 'Conditions match the saved definition'}>
              <Button onClick={() => setPending(null)} disabled={!dirty}>Revert</Button>
              <Button variant="pri" icon="save" disabled={!dirty} onClick={saveConditions}>Save conditions</Button>
            </StickyActions>
          </>
        )}

        {tab === 'accounts' && (
          <div className="stack">
            {registered.length === 0 ? (
              <EmptyState
                icon="checkC"
                title="No account matched this rule"
                body="The last detection sweep surfaced nothing for this rule. Run detection to re-evaluate the accounts in scope."
                actions={<Button variant="pri" icon="refresh" onClick={() => patch({ lastRun: NOW_STAMP }, 'Detection queued', `${rule.name} evaluated across ${rule.scope}.`)}>Run detection</Button>}
              />
            ) : (
              <AccountsTable
                id={`orphan-rule-accounts-${rule.id}`}
                rows={registered}
                onAssign={actions.openAssign}
                onDisable={actions.disable}
                onSuppress={actions.suppress}
                onDelete={actions.deleteAccount}
                footNote={`Surfaced by ${rule.name} · last sweep ${rule.lastRun || 'never'}`}
              />
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="detail-cols">
            <div className="stack">
              <div className="stat-strip">
                <div className="stat-cell"><span className="stat-k">Sweeps recorded</span><span className="stat-v">{num(sweeps.length)}</span></div>
                <div className="stat-cell"><span className="stat-k">Accounts surfaced</span><span className="stat-v">{num(sweeps.reduce((a, s) => a + s.discovered, 0))}</span></div>
                <div className="stat-cell"><span className="stat-k">Accounts cleared</span><span className="stat-v">{num(sweeps.reduce((a, s) => a + s.cleared, 0))}</span></div>
                <div className="stat-cell"><span className="stat-k">Failed sweeps</span><span className="stat-v">{num(sweeps.filter((s) => s.status === 'Failed').length)}</span></div>
              </div>

              <DataWorkbench
                id={`orphan-sweeps-${rule.id}`}
                rows={sweeps}
                columns={[
                  { key: 'runId', label: 'Sweep', locked: true, cls: 'td-main td-mono' },
                  { key: 'started', label: 'Started', cls: 'td-mono' },
                  { key: 'trigger', label: 'Triggered by' },
                  { key: 'scanned', label: 'Accounts read', align: 'right', render: (r) => num(r.scanned) },
                  { key: 'matched', label: 'Matched', align: 'right', render: (r) => num(r.matched) },
                  { key: 'discovered', label: 'Newly surfaced', align: 'right', render: (r) => (r.discovered > 0 ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{r.discovered}</span> : '0') },
                  { key: 'cleared', label: 'Cleared', align: 'right', render: (r) => (r.cleared > 0 ? <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{r.cleared}</span> : '0') },
                  { key: 'durationMs', label: 'Duration', align: 'right', render: (r) => duration(r.durationMs) },
                  { key: 'status', label: 'Result', render: (r) => <Pill tone={r.status === 'Succeeded' ? 'ok' : 'bad'} dot>{r.status}</Pill> },
                ]}
                searchPlaceholder="Search sweeps…"
                rowActions={(r) => [
                  { id: 'log', label: 'Open in logging', icon: 'logs', onSelect: () => toast('info', 'Logging', `Filtered to ${r.runId}.`) },
                  { id: 'export', label: 'Export sweep result', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${r.runId} queued for export.`) },
                ]}
                emptyTitle="No sweeps recorded"
                emptyBody="This rule has not been evaluated yet."
                emptyIcon="history"
                footNote="Sweep records are retained for 400 days"
              />
            </div>

            <div className="stack">
              <Card title="Change log" sub="Definition and scope changes">
                <div className="tl">
                  {changeLog(rule).map((e) => (
                    <div className="tl-it" key={e.id} data-tone={e.tone}>
                      <span className="tl-dot"><Icon name={e.icon} size={8} /></span>
                      <div className="tl-t">{e.title}</div>
                      <div className="tl-s">{e.body}</div>
                      <div className="tl-time">{e.ts} · {e.actor}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

