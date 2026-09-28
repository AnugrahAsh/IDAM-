import { useEffect, useMemo, useRef, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { Skeleton } from '../../components/primitives/Skeleton'
import { useLoading } from '../../lib/useLoading'
import { RunPanelSkeleton } from './ReconciliationSkeleton'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import AppLogo from '../../components/primitives/AppLogo'
import Meter from '../../components/primitives/Meter'
import Switch from '../../components/primitives/Switch'
import Tabs from '../../components/primitives/Tabs'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { num, pct, duration } from '../../lib/format'
import { USERS } from '../../data/seed'
import { brandFor, cap } from '../shared/provisioning/shared'
import {
  ACTIONS, RULE_TYPES, THRESHOLDS, TYPES, UNMATCHED, actionFor, confidenceTone,
  phasesFor, rulesFor, runTone, runsForSource, stateTone, unmatchedIdentitiesFor,
} from './shared'

const TABS = ['results', 'identities', 'rules', 'summary']

const RESULT_VIEWS = [
  { id: 'all', label: 'All accounts' },
  { id: 'matched', label: 'Matched' },
  { id: 'unmatched', label: 'Unmatched accounts' },
]

const PHASE_TONE = { done: 'ok', failed: 'bad', running: 'acc', skipped: 'mut', pending: undefined }
const PHASE_ICON = { done: 'check', failed: 'x', running: 'play', skipped: 'minus', pending: 'clock' }

const IDENTITY_OPTIONS = [...new Map(USERS.map((u) => [u.username, u])).values()]
  .slice(0, 60)
  .map((u) => ({ value: u.username, label: `${u.username} · ${u.email}` }))

function AddCandidatePanel({ run, onAdd, onClose }) {
  const [draft, setDraft] = useState({ account: '', employeeType: TYPES[0], matchedTo: UNMATCHED, confidence: 90 })
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const matched = draft.matchedTo !== UNMATCHED
  const confidence = matched ? draft.confidence : Math.min(45, draft.confidence)
  const valid = draft.account.trim().length > 2

  return (
    <Card
      title="Add an account to these results"
      sub={`Held outside ${run.source} or created out of band. It joins this run's result set and follows the same link, create or ignore path.`}
      actions={<IconButton icon="x" label="Close" onClick={onClose} />}
    >
      <div className="grid grid-2">
        <Field label="Target account" required span={2} htmlFor="cand-account" hint={`Identifier as it exists on ${run.source}.`}>
          <TextInput
            id="cand-account"
            className="mono"
            value={draft.account}
            placeholder={`svc_batch@${run.sourceName.toLowerCase()}`}
            autoComplete="off"
            spellCheck="false"
            onChange={(e) => set({ account: e.target.value })}
          />
        </Field>
        <Field label="Account type" htmlFor="cand-type">
          <Select id="cand-type" value={draft.employeeType} options={TYPES} onChange={(e) => set({ employeeType: e.target.value })} />
        </Field>
        <Field label="Matched identity" htmlFor="cand-match" hint="Leave unmatched to create a new governed identity when the account is resolved.">
          <Select
            id="cand-match"
            value={draft.matchedTo}
            options={[UNMATCHED, ...IDENTITY_OPTIONS.map((o) => o.value)]}
            onChange={(e) => set({ matchedTo: e.target.value })}
          />
        </Field>
        <Field
          label="Match confidence"
          span={2}
          htmlFor="cand-conf"
          hint={`Proposed action: ${actionFor(matched, confidence)}. Accounts at or above ${THRESHOLDS.link}% link automatically.`}
        >
          <TextInput
            id="cand-conf"
            type="number"
            min="0"
            max="100"
            className="mono"
            value={draft.confidence}
            onChange={(e) => set({ confidence: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
          />
        </Field>
      </div>
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="pri"
          icon="plus"
          disabled={!valid}
          onClick={() => {
            const user = matched ? USERS.find((u) => u.username === draft.matchedTo) : null
            onAdd({
              account: draft.account.trim(),
              employeeType: draft.employeeType,
              department: user ? user.department : '—',
              userId: user ? user.id : null,
              matchedTo: user ? user.username : null,
              matchedEmail: user ? user.email : null,
              matchState: user ? 'Matched' : 'Unmatched',
              confidence,
              changed: false,
              deltaFields: [],
              rule: user ? 'Manual entry' : '—',
              firstSeen: run.started,
              lastSeen: user ? user.lastLogin : '—',
              action: actionFor(!!user, confidence),
            })
          }}
        >
          Add account
        </Button>
      </div>
    </Card>
  )
}

function RulesTab({ run }) {
  const { toast, confirm } = useApp()
  const initial = useMemo(() => ({ rules: rulesFor(run), link: THRESHOLDS.link, review: THRESHOLDS.review }), [run])
  const [rules, setRules] = useState(initial.rules)
  const [link, setLink] = useState(initial.link)
  const [review, setReview] = useState(initial.review)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(null)

  const dirty = JSON.stringify({ rules, link, review }) !== JSON.stringify(initial)
  const weight = rules.filter((r) => r.enabled).reduce((a, r) => a + r.weight, 0)
  const bands = {
    link: run.candidates.filter((c) => c.confidence >= link).length,
    review: run.candidates.filter((c) => c.confidence >= review && c.confidence < link).length,
    create: run.candidates.filter((c) => c.confidence < review).length,
  }
  const thresholdError = review >= link ? 'The review threshold must be lower than the auto-link threshold.' : null

  const move = (id, dir) => setRules((rs) => {
    const i = rs.findIndex((r) => r.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= rs.length) return rs
    const out = [...rs]
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
    return out.map((r, k) => ({ ...r, order: k + 1 }))
  })

  const startAdd = () => {
    setEditing('new')
    setDraft({ id: 'new', name: '', target: '', idam: '', type: RULE_TYPES[0], weight: 10, enabled: true, description: '', hits: 0 })
  }

  const commit = () => {
    if (!draft.name.trim() || !draft.target.trim() || !draft.idam.trim()) return
    if (editing === 'new') {
      setRules((rs) => [...rs, {
        ...draft,
        id: rs.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1,
        order: rs.length + 1,
        name: draft.name.trim(),
        target: draft.target.trim(),
        idam: draft.idam.trim(),
      }])
      toast('ok', 'Rule added', `${draft.name.trim()} evaluates from the next run.`)
    } else {
      setRules((rs) => rs.map((r) => (r.id === editing ? { ...r, ...draft } : r)))
      toast('ok', 'Rule updated', draft.name)
    }
    setEditing(null)
    setDraft(null)
  }

  const remove = (r) => confirm({
    title: `Delete the ${r.name} rule?`,
    body: 'Accounts already scored keep their confidence until the next run. Future runs stop evaluating this rule.',
    confirmLabel: 'Delete rule',
    onConfirm: () => {
      setRules((rs) => rs.filter((x) => x.id !== r.id).map((x, k) => ({ ...x, order: k + 1 })))
      toast('ok', 'Rule deleted', r.name)
    },
  })

  const editorRow = (key) => (
    <tr key={key}>
      <td className="td-num t-faint">—</td>
      <td>
        <TextInput value={draft.name} placeholder="Rule name" onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
      </td>
      <td>
        <TextInput className="mono" value={draft.target} placeholder="targetAttribute" spellCheck="false" onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} />
      </td>
      <td>
        <TextInput className="mono" value={draft.idam} placeholder="idamAttribute" spellCheck="false" onChange={(e) => setDraft((d) => ({ ...d, idam: e.target.value }))} />
      </td>
      <td>
        <Select value={draft.type} options={RULE_TYPES} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))} />
      </td>
      <td>
        <TextInput type="number" min="1" max="100" className="mono" value={draft.weight} onChange={(e) => setDraft((d) => ({ ...d, weight: Math.max(1, Math.min(100, Number(e.target.value) || 0)) }))} />
      </td>
      <td className="td-num t-faint">—</td>
      <td>
        <Switch checked={draft.enabled} onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} label="Enabled" />
      </td>
      <td className="td-act">
        <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
          <IconButton icon="check" size="sm" label="Save rule" onClick={commit} />
          <IconButton icon="x" size="sm" label="Cancel" onClick={() => { setEditing(null); setDraft(null) }} />
        </span>
      </td>
    </tr>
  )

  return (
    <>
      <div className="stack">
        <div className="stack">
          {weight === 0 && (
            <Banner tone="bad">
              Every correlation rule is disabled. The next run will classify all {num(run.total)} accounts as unmatched.
            </Banner>
          )}
          <Card
            title="Matching rules"
            sub={`Which attributes correlate a target account to an identity. Evaluated in order until the accumulated weight resolves the account. Total active weight ${weight}.`}
            flush
            actions={
              <>
                <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', `${rules.length} rules queued for export.`)}>Export</Button>
                <Button size="sm" variant="pri" icon="plus" disabled={editing === 'new'} onClick={startAdd}>Add rule</Button>
              </>
            }
            footer={
              <>
                <span>{rules.filter((r) => r.enabled).length} of {rules.length} rules active</span>
                <span className="spacer" />
                <span className="t-faint">Rule set {run.ruleSet}</span>
              </>
            }
          >
            <div className="wb-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 54 }}>Order</th>
                    <th>Rule</th>
                    <th>Target attribute</th>
                    <th>IDAM attribute</th>
                    <th style={{ width: 150 }}>Match type</th>
                    <th style={{ width: 92 }}>Weight</th>
                    <th className="td-num" style={{ width: 80 }}>Hits</th>
                    <th style={{ width: 74 }}>Active</th>
                    <th className="td-act" />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r, i) => (
                    editing === r.id ? editorRow(r.id) : (
                      <tr key={r.id}>
                        <td>
                          <span className="row" style={{ gap: 2 }}>
                            <span className="num" style={{ width: 14 }}>{i + 1}</span>
                            <IconButton icon="chevU" size="sm" label="Move up" disabled={i === 0} onClick={() => move(r.id, -1)} />
                            <IconButton icon="chevD" size="sm" label="Move down" disabled={i === rules.length - 1} onClick={() => move(r.id, 1)} />
                          </span>
                        </td>
                        <td className="td-main">
                          <span className="trunc">
                            <span style={{ display: 'block' }}>{r.name}</span>
                            <span className="cell-sub" style={{ whiteSpace: 'normal' }}>{r.description}</span>
                          </span>
                        </td>
                        <td className="td-mono">{r.target}</td>
                        <td className="td-mono">{r.idam}</td>
                        <td><Tag>{r.type}</Tag></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, width: 74 }}>
                            <span style={{ flex: 1 }}><Meter value={r.weight} tone={r.enabled ? undefined : 'mut'} /></span>
                            <span className="num t-xs">{r.weight}</span>
                          </span>
                        </td>
                        <td className="td-num">{r.enabled ? num(r.hits) : <span className="t-faint">—</span>}</td>
                        <td>
                          <Switch
                            checked={r.enabled}
                            label={`${r.name} enabled`}
                            onChange={(v) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))}
                          />
                        </td>
                        <td className="td-act">
                          <span className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                            <IconButton icon="edit" size="sm" label={`Edit ${r.name}`} onClick={() => { setEditing(r.id); setDraft({ ...r }) }} />
                            <IconButton icon="trash" size="sm" label={`Delete ${r.name}`} onClick={() => remove(r)} />
                          </span>
                        </td>
                      </tr>
                    )
                  ))}
                  {editing === 'new' && editorRow('new')}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="grid grid-2">
          <Card title="Confidence thresholds" sub="Where the platform stops asking a human.">
            <div className="stack">
              <Field label="Auto-link at or above" htmlFor="th-link" hint="Accounts at or above this score bind to the identity without review.">
                <TextInput id="th-link" type="number" min="1" max="100" className="mono" value={link} onChange={(e) => setLink(Math.max(1, Math.min(100, Number(e.target.value) || 0)))} />
              </Field>
              <Field label="Manual review at or above" htmlFor="th-review" error={thresholdError || undefined} hint={thresholdError ? undefined : 'Below this score the account is proposed as a new identity.'}>
                <TextInput id="th-review" type="number" min="0" max="100" className="mono" value={review} onChange={(e) => setReview(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </Field>
              <div className="stack" style={{ gap: 9 }}>
                <div className="row-between">
                  <span className="t-xs"><Pill tone="ok" dot>Link to identity</Pill></span>
                  <span className="t-sm num">{num(bands.link)}</span>
                </div>
                <Meter value={run.total ? (bands.link / run.total) * 100 : 0} tone="ok" />
                <div className="row-between">
                  <span className="t-xs"><Pill tone="warn" dot>Manual review</Pill></span>
                  <span className="t-sm num">{num(bands.review)}</span>
                </div>
                <Meter value={run.total ? (bands.review / run.total) * 100 : 0} tone="warn" />
                <div className="row-between">
                  <span className="t-xs"><Pill tone="bad" dot>Create identity</Pill></span>
                  <span className="t-sm num">{num(bands.create)}</span>
                </div>
                <Meter value={run.total ? (bands.create / run.total) * 100 : 0} tone="bad" />
              </div>
              <div className="t-xs t-mut">
                Recomputed live against the {num(run.total)} accounts in this run. Saving re-scores the results.
              </div>
            </div>
          </Card>

          <Card title="Scope">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Rule set', v: run.ruleSet, icon: 'policy' },
                { k: 'Source system', v: run.source, icon: 'server' },
                { k: 'Connector method', v: run.method, icon: 'swap' },
                { k: 'Applies to', v: 'Every run on this source', icon: 'layers' },
              ]}
            />
          </Card>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved rule changes apply from the next run' : 'No changes'}>
        <Button disabled={!dirty} onClick={() => { setRules(initial.rules); setLink(initial.link); setReview(initial.review) }}>Discard</Button>
        <Button
          variant="pri"
          icon="save"
          disabled={!dirty || !!thresholdError}
          onClick={() => toast('ok', 'Matching rules saved', `${rules.filter((r) => r.enabled).length} active rules apply from the next run on ${run.source}.`)}
        >
          Save matching rules
        </Button>
      </StickyActions>
    </>
  )
}

function IdentitiesTab({ run, onTab, loading = false }) {
  const { navigate, toast, confirm } = useApp()
  const [ignored, setIgnored] = useState(() => new Set())
  const [provisioned, setProvisioned] = useState(() => new Set())

  const rows = useMemo(() => unmatchedIdentitiesFor(run).map((u) => ({
    ...u,
    name: `${u.firstName} ${u.lastName}`,
    state: provisioned.has(u.id) ? 'Provisioning' : ignored.has(u.id) ? 'Ignored' : 'Open',
  })), [run, ignored, provisioned])

  const open = rows.filter((r) => r.state === 'Open').length

  const markProvisioned = (ids, clear) => {
    setProvisioned((s) => new Set([...s, ...ids]))
    toast('ok', 'Provisioning queued', `${ids.length} account${ids.length === 1 ? '' : 's'} queued for creation on ${run.source}.`)
    if (clear) clear()
  }

  const markIgnored = (ids, clear) => confirm({
    title: ids.length === 1 ? 'Ignore this identity?' : `Ignore ${ids.length} identities?`,
    body: `The selected ${ids.length === 1 ? 'identity is' : 'identities are'} excluded from the unmatched report for ${run.source} until the next full reconciliation.`,
    confirmLabel: ids.length === 1 ? 'Ignore identity' : `Ignore ${ids.length}`,
    onConfirm: () => {
      setIgnored((s) => new Set([...s, ...ids]))
      toast('ok', 'Identities ignored', `${ids.length} excluded from the unmatched report.`)
      if (clear) clear()
    },
  })

  const columns = [
    {
      key: 'name', label: 'Identity', locked: true, cls: 'td-main',
      value: (r) => `${r.name} ${r.username}`,
      render: (r) => (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.name}</span>
          <span className="cell-sub mono">{r.username}</span>
        </span>
      ),
    },
    { key: 'email', label: 'Email', cls: 'td-mono' },
    { key: 'department', label: 'Department' },
    { key: 'employeeType', label: 'Type', render: (r) => <Tag>{r.employeeType}</Tag> },
    { key: 'lastLogin', label: 'Last sign-in', cls: 'td-mono' },
    {
      key: 'state', label: 'State',
      render: (r) => <Pill tone={r.state === 'Open' ? 'warn' : r.state === 'Provisioning' ? 'ok' : 'mut'} dot>{r.state}</Pill>,
    },
  ]

  return (
    <div className="stack">
      {!loading && (
        <div className="stat-strip">
          <div className="stat-cell">
            <span className="stat-k"><Icon name="user" size={12} />Unmatched identities</span>
            <span className="stat-v" style={{ color: open > 0 ? 'var(--warn-core)' : undefined }}>{num(open)}</span>
            <span className="t-xs t-mut">Active in the identity store, no account on {run.source}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k"><Icon name="provision" size={12} />Provisioning queued</span>
            <span className="stat-v">{num(rows.filter((r) => r.state === 'Provisioning').length)}</span>
            <span className="t-xs t-mut">Account creation requested on the target</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k"><Icon name="ban" size={12} />Ignored</span>
            <span className="stat-v">{num(rows.filter((r) => r.state === 'Ignored').length)}</span>
            <span className="t-xs t-mut">Excluded until the next full reconciliation</span>
          </div>
        </div>
      )}

      {!loading && open > 0 && (
        <Banner tone="info">
          These identities are expected to hold an account on {run.source} but none was found in the inventory.
          Provision an account, or ignore the identity if it legitimately has no access here.{' '}
          <button className="link" onClick={() => onTab('rules')}>Review matching rules</button>
        </Banner>
      )}

      <DataWorkbench
        id={`reconciliation-identities-${run.id}`}
        rows={rows}
        columns={columns}
        loading={loading}
        selectable
        searchPlaceholder="Search by name, username, email or department…"
        bulkActions={(ids, clear) => (
          <>
            <Button size="sm" icon="provision" onClick={() => markProvisioned(ids.map(Number), clear)}>Provision accounts</Button>
            <Button size="sm" icon="ban" onClick={() => markIgnored(ids.map(Number), clear)}>Ignore</Button>
          </>
        )}
        rowActions={(r) => [
          { id: 'prov', label: 'Provision account on target', icon: 'provision', disabled: r.state !== 'Open', onSelect: () => markProvisioned([r.id]) },
          { id: 'open', label: 'Open identity', icon: 'user', onSelect: () => navigate(`/iam/users/${r.id}`) },
          { divider: true },
          { id: 'ignore', label: 'Ignore', icon: 'ban', disabled: r.state !== 'Open', onSelect: () => markIgnored([r.id]) },
        ]}
        emptyTitle="No unmatched identities"
        emptyBody="Every identity in scope holds a correlated account on this target, or the current filters exclude them all."
        emptyIcon="user"
        footNote={`Compared against ${num(run.scanned)} accounts read from ${run.source}`}
      />
    </div>
  )
}

function SummaryTab({ run }) {
  const { navigate, toast } = useApp()
  const phases = phasesFor(run)
  const siblings = runsForSource(run.applicationId).filter((r) => r.id !== run.id)

  return (
    <div className="detail-cols">
      <div className="stack">
        <Card title="Run phases" sub={`Five phases, ${duration(run.durationMs)} total`}>
          <div className="tl">
            {phases.map((p) => (
              <div className="tl-it" key={p.id} data-tone={PHASE_TONE[p.state]}>
                <span className="tl-dot"><Icon name={PHASE_ICON[p.state]} size={8} stroke={3} /></span>
                <div className="tl-t">{p.label}</div>
                <div className="tl-s">{p.detail}</div>
                <div className="tl-time">{p.ms ? `${duration(p.ms)}` : cap(p.state)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Earlier runs on this application"
          sub={`${siblings.length} runs retained for ${run.source}`}
          flush
          footer={<span className="t-faint">Retention follows the platform job policy</span>}
        >
          <div className="wb-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Mode</th>
                  <th>Started</th>
                  <th className="td-num">Scanned</th>
                  <th className="td-num">Unmatched</th>
                  <th>Outcome</th>
                  <th className="td-act" />
                </tr>
              </thead>
              <tbody>
                {siblings.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/iam/trustReconciliation/${r.id}`)}>
                    <td className="td-main mono">{r.id}</td>
                    <td><Tag>{r.mode}</Tag></td>
                    <td className="td-mono">{r.started}</td>
                    <td className="td-num">{num(r.scanned)}</td>
                    <td className="td-num">{num(r.fresh)}</td>
                    <td><Pill tone={runTone(r.status)} dot>{r.status}</Pill></td>
                    <td className="td-act"><Icon name="chevR" size={13} style={{ color: 'var(--faint)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="stack">
        <Card title="Provenance">
          <KeyValue
            cols={1}
            rows={[
              { k: 'Run identifier', v: run.id, icon: 'tag' },
              { k: 'Source system', v: run.source, icon: 'server' },
              { k: 'System name', v: run.sourceName, icon: 'code' },
              { k: 'Endpoint', v: run.host, icon: 'globe' },
              { k: 'Connector method', v: run.method, icon: 'swap' },
              { k: 'Mode', v: `${run.mode} reconciliation`, icon: 'refresh' },
              { k: 'Started', v: run.started, icon: 'clock' },
              { k: 'Duration', v: duration(run.durationMs), icon: 'history' },
              { k: 'Triggered by', v: run.triggeredBy, icon: 'user' },
              { k: 'Rule set', v: run.ruleSet, icon: 'policy' },
              { k: 'Owning team', v: run.owner, icon: 'building' },
            ]}
          />
        </Card>

        <Card title="Downstream">
          <div className="stack" style={{ gap: 8 }}>
            <Button icon="provision" onClick={() => navigate(`/iam/provisionapplications/${run.applicationId}`)}>Open the connector record</Button>
            <Button icon="orphan" onClick={() => navigate('/iam/orphanedpolicy')}>Review orphaned accounts</Button>
            <Button icon="jobs" onClick={() => navigate('/iam/jobs')}>Open the job log</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `${run.id} results queued for CSV export.`)}>Export this run</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function RunDetail({ run, tab, onTab }) {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const active = TABS.includes(tab) ? tab : 'results'
  const [view, setView] = useState('all')
  const [running, setRunning] = useState(false)
  const [ignored, setIgnored] = useState(() => new Set())
  const [imported, setImported] = useState(() => new Set())
  const [removed, setRemoved] = useState(() => new Set())
  const [links, setLinks] = useState({})
  const [added, setAdded] = useState([])
  const [adding, setAdding] = useState(false)
  const timer = useRef(null)

  /* One flag for the record, keyed on the run and the tab together, so the run
     settles as one thing: arriving at a run is a read, and so is opening a
     different tab, because each tab is a separate read of that run rather than
     another slice of one already in hand.

     The tab bar is not keyed to it — it is passed to the masthead outside the
     conditionals below and stays live throughout — because a control that
     disappears under the pointer that just used it has been taken away
     mid-gesture. `running` below is a different thing entirely: a re-run the
     operator asked for, which the results register already reports. */
  const settling = useLoading(`${run.id}:${active}`)

  useEffect(() => () => clearTimeout(timer.current), [])

  const rows = useMemo(() => {
    const base = [...added, ...run.candidates]
    return base
      .filter((c) => !removed.has(c.id))
      .map((c) => {
        const relink = links[c.id]
        const merged = relink
          ? { ...c, matchedTo: relink.username, matchedEmail: relink.email, userId: relink.id, matchState: 'Matched', confidence: 100, rule: 'Manual link', action: ACTIONS[0] }
          : c
        return { ...merged, state: imported.has(c.id) ? 'Imported' : ignored.has(c.id) ? 'Suppressed' : 'Open' }
      })
  }, [run, added, removed, links, imported, ignored])

  const stats = useMemo(() => ({
    fresh: rows.filter((r) => !r.matchedTo).length,
    matched: rows.filter((r) => r.matchedTo).length,
    modified: rows.filter((r) => r.changed).length,
    unresolved: rows.filter((r) => r.matchedTo && r.confidence < THRESHOLDS.review).length,
    ready: rows.filter((r) => r.confidence >= THRESHOLDS.link && r.state === 'Open').length,
    imported: rows.filter((r) => r.state === 'Imported').length,
    suppressed: rows.filter((r) => r.state === 'Suppressed').length,
  }), [rows])

  const shownRows = useMemo(() => (
    view === 'matched' ? rows.filter((r) => r.matchedTo)
      : view === 'unmatched' ? rows.filter((r) => !r.matchedTo)
        : rows
  ), [rows, view])

  const identityCount = useMemo(() => unmatchedIdentitiesFor(run).length, [run])

  const rerun = () => {
    if (running) return
    setRunning(true)
    toast('info', 'Reconciliation started', `Reading the account inventory from ${run.source}.`)
    timer.current = setTimeout(() => {
      setRunning(false)
      toast('ok', 'Reconciliation complete', `${rows.length} accounts evaluated against the identity store.`)
    }, 1700)
  }

  const markImported = (ids, clear) => {
    setImported((s) => new Set([...s, ...ids]))
    toast('ok', 'Resolved', `${ids.length} account${ids.length === 1 ? '' : 's'} resolved — an identity is created or the existing match is confirmed.`)
    if (clear) clear()
  }

  const markIgnored = (ids, clear) => {
    setIgnored((s) => new Set([...s, ...ids]))
    toast('ok', 'Accounts ignored', `${ids.length} account${ids.length === 1 ? '' : 's'} suppressed from future reconciliation on this application.`)
    if (clear) clear()
  }

  const openLink = (ids, clear) => {
    let choice = IDENTITY_OPTIONS[0].value
    setDrawer({
      title: ids.length === 1 ? 'Link to an identity' : `Link ${ids.length} accounts`,
      sub: `${run.source} · ${run.method}`,
      children: (
        <Field label="Governed identity" hint="The selected accounts bind to this identity at 100% confidence and are recorded on the audit trail.">
          <Select options={IDENTITY_OPTIONS} defaultValue={choice} onChange={(e) => { choice = e.target.value }} />
        </Field>
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="link"
            onClick={() => {
              const user = USERS.find((u) => u.username === choice)
              if (user) {
                setLinks((l) => {
                  const next = { ...l }
                  ids.forEach((id) => { next[id] = user })
                  return next
                })
              }
              setDrawer(null)
              if (clear) clear()
              toast('ok', 'Accounts linked', `${ids.length} account${ids.length === 1 ? '' : 's'} bound to ${choice}.`)
            }}
          >
            Link {ids.length === 1 ? 'account' : `${ids.length} accounts`}
          </Button>
        </>
      ),
    })
  }

  const removeCandidates = (ids, title, body, clear) => confirm({
    title,
    body,
    confirmLabel: ids.length === 1 ? 'Remove account' : `Remove ${ids.length}`,
    onConfirm: () => {
      setRemoved((s) => new Set([...s, ...ids]))
      setAdded((a) => a.filter((c) => !ids.includes(c.id)))
      if (clear) clear()
      toast('ok', 'Accounts removed', `${ids.length} account${ids.length === 1 ? '' : 's'} removed from this run\u2019s results.`)
    },
  })

  const columns = [
    {
      key: 'account', label: 'Target account', locked: true, cls: 'td-main',
      value: (r) => `${r.account} ${r.id}`,
      render: (r) => (
        <span className="cell-id">
          <span className="trunc">
            <span className="mono" style={{ display: 'block' }}>{r.account}</span>
            <span className="cell-sub">{r.department}</span>
          </span>
        </span>
      ),
    },
    { key: 'employeeType', label: 'Type', render: (r) => <Tag>{r.employeeType}</Tag> },
    {
      key: 'matchedTo', label: 'Matched identity',
      render: (r) => (r.matchedTo ? (
        <span className="trunc">
          <span style={{ display: 'block' }}>{r.matchedTo}</span>
          <span className="cell-sub">{r.matchedEmail}</span>
        </span>
      ) : <Pill tone="warn" dot>Unmatched</Pill>),
    },
    {
      key: 'confidence', label: 'Confidence', align: 'right', width: 140,
      render: (r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 118 }}>
          <span style={{ flex: 1 }}><Meter value={r.confidence} tone={confidenceTone(r.confidence)} /></span>
          <span className="num" style={{ width: 30, textAlign: 'right' }}>{r.confidence}%</span>
        </span>
      ),
    },
    { key: 'rule', label: 'Matched by', render: (r) => (r.rule === '—' ? <span className="t-faint">No rule hit</span> : r.rule) },
    {
      key: 'changed', label: 'Delta',
      render: (r) => (r.changed
        ? <Pill tone="info" dot>{r.deltaFields.length ? `${r.deltaFields.length} attributes` : 'Modified'}</Pill>
        : <span className="t-faint">No change</span>),
    },
    { key: 'firstSeen', label: 'First seen', cls: 'td-mono' },
    { key: 'lastSeen', label: 'Last seen', cls: 'td-mono' },
    {
      key: 'action', label: 'Proposed action',
      render: (r) => (
        <span className="row" style={{ gap: 6 }}>
          <Icon
            name={r.action === ACTIONS[0] ? 'link' : r.action === ACTIONS[2] ? 'plus' : 'eye'}
            size={12}
            style={{ color: 'var(--mut)' }}
          />
          {r.action}
        </span>
      ),
    },
    {
      key: 'matchState', label: 'Result',
      render: (r) => (r.matchedTo
        ? <Pill tone="ok" dot>Matched</Pill>
        : <Pill tone="warn" dot>Unmatched account</Pill>),
    },
    { key: 'state', label: 'Decision', render: (r) => <Pill tone={stateTone(r.state)} dot>{r.state}</Pill> },
  ]

  const rowActions = (r) => [
    { id: 'link', label: r.matchedTo ? 'Link to a different identity' : 'Link account to an identity', icon: 'link', onSelect: () => openLink([r.id]) },
    {
      id: 'create', label: 'Create identity from this account', icon: 'plus',
      disabled: r.state !== 'Open' || !!r.matchedTo, onSelect: () => markImported([r.id]),
    },
    {
      id: 'confirm', label: 'Confirm the match', icon: 'checkC',
      disabled: r.state !== 'Open' || !r.matchedTo, onSelect: () => markImported([r.id]),
    },
    { id: 'profile', label: 'Open matched identity', icon: 'user', disabled: !r.userId, onSelect: () => navigate(`/iam/users/${r.userId}`) },
    { id: 'rules', label: 'Inspect matching rules', icon: 'policy', onSelect: () => onTab('rules') },
    { divider: true },
    {
      id: 'ignore', label: 'Ignore account', icon: 'ban', disabled: r.state !== 'Open',
      onSelect: () => confirm({
        title: `Ignore ${r.account}?`,
        body: 'The account is suppressed from future reconciliation runs on this application until the suppression is cleared.',
        confirmLabel: 'Ignore account',
        onConfirm: () => markIgnored([r.id]),
      }),
    },
    {
      id: 'del', label: 'Remove from results', icon: 'trash', danger: true,
      onSelect: () => removeCandidates(
        [r.id],
        `Remove ${r.account} from these results?`,
        'The account is removed from this run’s result set. The account itself is left untouched on the target and reappears at the next full reconciliation unless it is ignored.',
      ),
    },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <Button size="sm" icon="link" onClick={() => openLink(ids, clear)}>Link to identity</Button>
      <Button size="sm" icon="plus" onClick={() => markImported(ids, clear)}>Create identities</Button>
      <Button size="sm" icon="ban" onClick={() => confirm({
        title: `Ignore ${ids.length} accounts?`,
        body: 'The selected accounts are suppressed from future reconciliation runs on this application.',
        confirmLabel: `Ignore ${ids.length}`,
        onConfirm: () => markIgnored(ids, clear),
      })}>Ignore</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => removeCandidates(
        ids,
        `Remove ${ids.length} accounts from these results?`,
        'The selected accounts are removed from this run’s result set. The accounts themselves are left untouched on the target.',
        clear,
      )}>Remove</Button>
    </>
  )

  const rules = rulesFor(run)

  return (
    <>
      {/* The masthead is the real `DetailHeader` while it settles rather than an
          imitation of one: the crumb row, the gutters, the tab row and every gap
          between them are the component's own, so the run lands in exactly the
          box that was holding its place. Only the run's own content greys. */}
      <DetailHeader
        backTo="/iam/trustReconciliation"
        backLabel="Trust Reconciliation"
        eyebrow={`Reconciliation run · ${run.id}`}
        title={settling ? <span className="skel tr-skel-title" aria-hidden="true" /> : run.source}
        sub={settling
          ? (
            /* Two bars, because the sentence below wraps to two lines inside the
               100ch `.detail-sub` is capped at — for every run in the estate.
               One bar held one line and the tab strip stepped down when the
               sentence landed. */
            <span className="tr-skel-sub" aria-hidden="true">
              <span className="skel" />
              <span className="skel" />
            </span>
          )
          : `${run.mode} reconciliation of ${num(run.scanned)} accounts read from the target, correlated against the identity store with the ${run.ruleSet} matching rules.`}
        media={settling
          ? <span className="skel tr-skel-media" aria-hidden="true" />
          : <AppLogo brand={brandFor({ name: run.sourceName, connector: run.connector })} name={run.source} size={56} />}
        badges={settling ? (
          <>
            <span className="skel skel-chip" style={{ width: 78 }} aria-hidden="true" />
            <span className="skel skel-chip" style={{ width: 56 }} aria-hidden="true" />
          </>
        ) : (
          <>
            <Pill tone={runTone(run.status)} dot>{run.status}</Pill>
            <Tag>{run.mode}</Tag>
            <Tag>{run.sourceName}</Tag>
            {stats.fresh > 0 && <Pill tone="warn" icon="orphan">{num(stats.fresh)} unmatched accounts</Pill>}
            {identityCount > 0 && <Pill tone="warn" icon="user">{num(identityCount)} unmatched identities</Pill>}
          </>
        )}
        meta={settling ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span className="tr-skel-fact" key={i} aria-hidden="true">
                <span className="skel" style={{ width: 92 + (i % 3) * 28, height: 9 }} />
              </span>
            ))}
          </>
        ) : (
          <>
            <Fact icon="server" label="Source" value={`${run.method} · ${run.host}`} />
            <Fact icon="users" label="Scanned" value={num(run.scanned)} />
            <Fact icon="clock" label="Started" value={run.started} />
            <Fact icon="history" label="Duration" value={duration(run.durationMs)} />
            <Fact icon="user" label="Triggered by" value={run.triggeredBy} />
            <Fact icon="policy" label="Matching rules" value={`${rulesFor(run).filter((r) => r.enabled).length} active`} />
          </>
        )}
        actions={settling ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <span className="skel skel-btn" key={i} style={{ width: 86 + (i % 3) * 24 }} aria-hidden="true" />
            ))}
          </>
        ) : (
          <>
            <Button icon="sliders" onClick={() => navigate(`/iam/trustReconciliation/apps/${run.applicationId}`)}>Reconciliation setup</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', `${rows.length} result rows queued for CSV export.`)}>Export</Button>
            <Button icon="plus" disabled={adding} onClick={() => { onTab('results'); setAdding(true) }}>Add account</Button>
            <Button variant="pri" icon={running ? 'clock' : 'refresh'} disabled={running} onClick={rerun}>
              {running ? 'Running…' : 'Re-run'}
            </Button>
          </>
        )}
        tabs={
          <Tabs
            value={active}
            onChange={onTab}
            tabs={[
              { id: 'results', label: 'Account results', icon: 'recon', count: rows.length },
              { id: 'identities', label: 'Unmatched identities', icon: 'user', count: identityCount },
              { id: 'rules', label: 'Matching rules', icon: 'policy', count: rules.length },
              { id: 'summary', label: 'Run history', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {/* The screen's one announcing region, so the run says once that it is
            on its way. Every shape is decoration, including the bars in the
            masthead above and the rows the results register draws for
            itself. */}
        {settling && (
          <Skeleton label={`Loading reconciliation run ${run.id}`}>
            <RunPanelSkeleton tab={active} />
          </Skeleton>
        )}

        {active === 'results' && (
          <div className="stack">
              {!settling && (
              <div className="stat-strip">
                <div className="stat-cell" data-nav="true" role="button" tabIndex={0}
                  onClick={() => setView('matched')} onKeyDown={(e) => e.key === 'Enter' && setView('matched')}
                >
                  <span className="stat-k"><Icon name="checkC" size={12} />Matched accounts</span>
                  <span className="stat-v">{num(stats.matched)}</span>
                  <span className="t-xs t-mut">Correlated to a governed identity by a matching rule</span>
                </div>
                <div className="stat-cell" data-nav="true" role="button" tabIndex={0}
                  onClick={() => setView('unmatched')} onKeyDown={(e) => e.key === 'Enter' && setView('unmatched')}
                >
                  <span className="stat-k"><Icon name="orphan" size={12} />Unmatched accounts</span>
                  <span className="stat-v" style={{ color: stats.fresh > 0 ? 'var(--bad)' : undefined }}>{num(stats.fresh)}</span>
                  <span className="t-xs t-mut">On the target, no owning identity in the store</span>
                </div>
                <div className="stat-cell" data-nav="true" role="button" tabIndex={0}
                  onClick={() => onTab('identities')} onKeyDown={(e) => e.key === 'Enter' && onTab('identities')}
                >
                  <span className="stat-k"><Icon name="user" size={12} />Unmatched identities</span>
                  <span className="stat-v" style={{ color: identityCount > 0 ? 'var(--warn-core)' : undefined }}>{num(identityCount)}</span>
                  <span className="t-xs t-mut">In the store, no account on the target</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="warn" size={12} />Needs review</span>
                  <span className="stat-v">{num(stats.unresolved)}</span>
                  <span className="t-xs t-mut">Matched below the {pct(THRESHOLDS.review)} review threshold</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k"><Icon name="history" size={12} />Resolved</span>
                  <span className="stat-v">{num(stats.imported + stats.suppressed)}</span>
                  <span className="t-xs t-mut">{num(stats.imported)} linked or created · {num(stats.suppressed)} ignored</span>
                </div>
              </div>
            )}

            {!settling && run.status === 'Failed' && (
              <Banner tone="bad">
                <b>This run failed before the inventory was fully read.</b>{' '}
                The results below are partial and should not be acted on until a clean run completes.{' '}
                <button className="link" onClick={() => onTab('summary')}>Open the run history</button>
              </Banner>
            )}

            {!settling && stats.fresh > 0 && run.status !== 'Failed' && (
              <Banner tone="warn">
                <b>{num(stats.fresh)} accounts on {run.source} have no owning identity.</b>{' '}
                Link each one to an existing identity, create an identity from it, or ignore it if it is a legitimate
                service principal.{' '}
                <button className="link" onClick={() => navigate('/iam/orphanedpolicy')}>Orphaned accounts</button>
              </Banner>
            )}

            {!settling && (
              <Card
                title="Matching rules applied to this run"
                sub={`${rules.filter((r) => r.enabled).length} active rules, evaluated in weight order`}
                actions={<Button size="sm" icon="sliders" onClick={() => onTab('rules')}>Edit matching rules</Button>}
              >
                <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
                  {rules.map((r) => (
                    <span className="chip" key={r.id} data-on={r.enabled || undefined}>
                      <Icon name={r.enabled ? 'checkC' : 'ban'} size={12} />
                      {r.name}
                      <span className="t-faint">{r.enabled ? `${num(r.hits)} hits` : 'disabled'}</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {!settling && adding && (
              <AddCandidatePanel
                run={run}
                onClose={() => setAdding(false)}
                onAdd={(candidate) => {
                  const record = { ...candidate, id: `${run.sourceName}-ADD-${String(added.length + 1).padStart(3, '0')}` }
                  setAdded((a) => [record, ...a])
                  setAdding(false)
                  toast('ok', 'Account added', `${record.account} joined this run's result set as an open discrepancy.`)
                }}
              />
            )}

            <DataWorkbench
              id="reconciliation"
              rows={shownRows}
              columns={columns}
              selectable
              loading={running || settling}
              searchPlaceholder="Search by account, matched identity, employee type…"
              bulkActions={bulkActions}
              rowActions={rowActions}
              toolbar={
                <>
                  <div className="seg" role="radiogroup" aria-label="Result view">
                    {RESULT_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={view === v.id}
                        data-on={view === v.id}
                        onClick={() => setView(v.id)}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" icon="plus" disabled={adding} onClick={() => setAdding(true)}>Add</Button>
                  <Button size="sm" icon="refresh" disabled={running} onClick={rerun}>Re-run</Button>
                </>
              }
              emptyTitle="No accounts in this view"
              emptyBody="This application is fully reconciled against the identity store, or the current view, filters or search exclude every account."
              emptyIcon="recon"
              footNote={`${num(shownRows.length)} of ${num(rows.length)} accounts shown · read from ${num(run.scanned)} accounts on ${run.source}`}
            />
          </div>
        )}

        {/* The unmatched-identity register settles its own rows; the figures
            above it are held by the shape in the announcing region. */}
        {active === 'identities' && <IdentitiesTab run={run} onTab={onTab} loading={settling} />}
        {!settling && active === 'rules' && <RulesTab run={run} />}
        {!settling && active === 'summary' && <SummaryTab run={run} />}
      </div>
    </>
  )
}
