import '../trustReconciliation/ReconciliationPage.css'
import { useMemo, useState } from 'react'
import StickyActions from '../../components/shell/StickyActions'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Icon from '../../components/primitives/Icon'
import Switch from '../../components/primitives/Switch'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import KeyValue from '../../components/primitives/KeyValue'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { APPLICATIONS } from '../../data/seed'
import { StatStrip } from './facetControls'
import {
  MODES, RULE_LIBRARY, SCHEDULES, THRESHOLDS, runTone, runsForSource,
} from '../trustReconciliation/shared'
import {
  CATEGORY, CATEGORY_LABELS, CATEGORY_TONES, DifferenceList, categoryCards, categoryCounts,
  filterByCategory, syncedUsersFor,
} from '../shared/provisioning/reconCategories'

// ---------------------------------------------------------------------------
// Reconciliation tab (client item 7).
//
// Reconciliation reads the target and asks which accounts the platform already
// knows about. That is a property of the connector, so it belongs on the
// application record; the estate-wide view stays at /iam/trustReconciliation
// and this tab links into it rather than duplicating it.
// ---------------------------------------------------------------------------

const RECON_BASE = '/iam/trustReconciliation'

// Runs are seeded against the provisioning register, which keys on the system
// name rather than the merged application id.
const sourceIdFor = (app) => {
  const match = APPLICATIONS.find((a) => a.name === app.provisioning.sourceName)
  return match ? match.id : null
}

// Columns for the synced-accounts register. Declared once, outside the
// component, so the column picker's stored layout is not invalidated on every
// render by a fresh array identity.
const SYNCED_COLUMNS = [
  {
    key: 'account', label: 'Account', locked: true, cls: 'td-main',
    value: (r) => `${r.account} ${r.identity || ''} ${r.identityEmail || ''}`,
    render: (r) => (
      <span className="cell-id">
        <span className="trunc">
          <span className="mono" style={{ display: 'block' }}>{r.account}</span>
          <span className="cell-sub">{r.identity ? `Matched to ${r.identity}` : 'No matching identity'}</span>
        </span>
      </span>
    ),
  },
  {
    key: 'category', label: 'Category',
    value: (r) => CATEGORY_LABELS[r.category],
    render: (r) => <Pill tone={CATEGORY_TONES[r.category]} dot>{CATEGORY_LABELS[r.category]}</Pill>,
  },
  {
    key: 'differences', label: 'What differs', sortable: false,
    value: (r) => r.differences.map((d) => `${d.label} ${d.source} ${d.target}`).join(' '),
    render: (r) => (r.category === CATEGORY.USERNAME
      ? <span className="t-sm">Identifier not found in the identity store</span>
      : <DifferenceList rows={r.differences} />),
  },
  { key: 'department', label: 'Department' },
  { key: 'rule', label: 'Matched by', render: (r) => (r.rule === '—' ? <span className="t-faint">—</span> : <Tag>{r.rule}</Tag>) },
  { key: 'confidence', label: 'Confidence', align: 'right', render: (r) => `${r.confidence}%` },
  { key: 'lastSeen', label: 'Last seen', cls: 'td-mono', optional: true },
]

export default function ReconciliationTab({ app, onPatch }) {
  const { navigate, toast } = useApp()
  const facet = app.provisioning

  const sourceId = useMemo(() => (facet ? sourceIdFor(app) : null), [app, facet])
  const runs = useMemo(() => (sourceId ? runsForSource(sourceId) : []), [sourceId])
  const latest = runs[0] || null

  const initial = useMemo(() => ({
    onboarded: !!(facet && facet.reconciliation ? facet.reconciliation.onboarded : runs.length > 0),
    mode: (facet && facet.reconciliation && facet.reconciliation.mode) || MODES[0],
    schedule: (facet && facet.reconciliation && facet.reconciliation.schedule) || SCHEDULES[1],
    link: String((facet && facet.reconciliation && facet.reconciliation.link) || THRESHOLDS.link),
    review: String((facet && facet.reconciliation && facet.reconciliation.review) || THRESHOLDS.review),
    rules: (facet && facet.reconciliation && facet.reconciliation.rules) || RULE_LIBRARY.map((r) => ({ ...r })),
  }), [facet, runs.length])

  const [draft, setDraft] = useState(initial)
  // Which slice of the latest run's accounts the register below is showing.
  const [category, setCategory] = useState(CATEGORY.ALL)

  const synced = useMemo(() => syncedUsersFor(latest), [latest])
  const counts = useMemo(() => categoryCounts(synced), [synced])

  if (!facet) {
    return (
      <Banner tone="info">
        Reconciliation reads accounts from a provisioning target. Attach a connector on the Linkage tab to reconcile
        this application.
      </Banner>
    )
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setRule = (id, patch) => setDraft((d) => ({
    ...d,
    rules: d.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }))

  const enabledWeight = draft.rules.filter((r) => r.enabled).reduce((a, r) => a + Number(r.weight || 0), 0)
  const thresholdIssue = Number(draft.link) <= Number(draft.review)
    ? 'The auto-link threshold must sit above the review threshold.'
    : null
  const ruleIssue = draft.rules.some((r) => r.enabled) ? null : 'Enable at least one correlation rule.'
  const issues = [thresholdIssue, ruleIssue].filter(Boolean)

  const save = () => {
    onPatch(app.id, (r) => ({
      provisioning: {
        ...r.provisioning,
        reconciliation: {
          onboarded: draft.onboarded,
          mode: draft.mode,
          schedule: draft.schedule,
          link: Number(draft.link),
          review: Number(draft.review),
          rules: draft.rules,
        },
      },
    }))
    toast('ok', 'Reconciliation settings saved', `${app.displayName} correlates on the new rule set from the next run.`)
  }

  return (
    <div className="stack">
      <StatStrip
        items={[
          { k: 'Last run', icon: 'history', v: latest ? latest.started : 'Never', sub: latest ? `${latest.mode} · ${latest.status}` : 'No run recorded' },
          { k: 'Accounts scanned', icon: 'users', v: latest ? num(latest.scanned) : '—' },
          { k: 'Unmatched', icon: 'orphan', v: latest ? num(latest.fresh) : '—', tone: latest && latest.fresh > 0 ? 'warn' : undefined, sub: 'No identity correlated' },
          { k: 'Ready to link', icon: 'link', v: latest ? num(latest.ready) : '—', sub: `At or above ${draft.link}% confidence` },
          { k: 'Needs review', icon: 'approve', v: latest ? num(latest.unresolved) : '—', tone: latest && latest.unresolved > 0 ? 'warn' : undefined },
        ]}
      />

      {/* The three counts are the filter, not a separate control beside one —
          a category is picked by clicking the number it belongs to. The register
          supplies its own frame, so this is not wrapped in a card. */}
      {latest ? (
        <DataWorkbench
          id="prov-recon-synced"
          header={(
            <div className="sync-head">
              <div className="section-head">
                <span className="section-title">Synced data</span>
                <span className="section-sub">
                  What the {latest.mode.toLowerCase()} run of {latest.started} read from {app.displayName}. Select a
                  category to narrow the register below.
                </span>
              </div>
              <StatCards
                items={categoryCards(counts)}
                value={category}
                onChange={setCategory}
                label="Filter the synced accounts by category"
              />
            </div>
          )}
          rows={filterByCategory(synced, category)}
          columns={SYNCED_COLUMNS}
          searchPlaceholder="Search by account, identity or department…"
          emptyTitle="No accounts in this category"
          emptyBody="Select another category above, or widen the search."
          emptyIcon="recon"
          footNote={`${num(counts.username + counts.data)} of ${num(counts.all)} accounts disagree with the identity store`}
        />
      ) : (
        <Card title="Synced data" sub="No reconciliation run has been recorded against this connector yet.">
          <EmptyState
            icon="recon"
            size="sm"
            title="Nothing synced yet"
            body="Run a reconciliation to read the account inventory and categorise it against the identity store."
          />
        </Card>
      )}

      <div className="detail-cols">
        <div className="stack">
          <Card
            title="Correlation rules"
            sub="Evaluated in weight order. The first rule to resolve a candidate outright wins; the rest contribute to the confidence score."
            flush
            footer={
              <>
                <span><b className="num">{draft.rules.filter((r) => r.enabled).length}</b> enabled</span>
                <span><b className="num">{enabledWeight}</b> total weight</span>
                <span className="spacer" />
                <span>A candidate at or above {draft.link}% is linked without review.</span>
              </>
            }
          >
            <div style={{ overflowX: 'auto' }}><table className="tbl recon-tbl">
              <colgroup>
                <col style={{ width: 220 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 96 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Target attribute</th>
                  <th>Identity attribute</th>
                  <th>Match</th>
                  <th className="map-flag">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {draft.rules.map((r) => (
                  <tr key={r.id}>
                    <td className="td-main">
                      <span className="cell-id">
                        <span className="trunc">
                          <span style={{ display: 'block' }}>{r.name}</span>
                          <span className="cell-sub">{r.description}</span>
                        </span>
                      </span>
                    </td>
                    <td className="td-mono">{r.target}</td>
                    <td className="td-mono">{r.idam}</td>
                    <td><Tag>{r.type}</Tag></td>
                    <td className="map-flag">
                      <Switch checked={r.enabled} onChange={(v) => setRule(r.id, { enabled: v })} label={`Enable ${r.name}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Card>

          <Card
            title="Recent runs"
            sub="Every reconciliation run recorded against this connector."
            flush
            actions={<Button size="sm" icon="external" onClick={() => navigate(RECON_BASE)}>Open Trust Reconciliation</Button>}
          >
            {runs.length === 0 ? (
              <EmptyState
                icon="recon"
                size="sm"
                title="No runs recorded"
                body="This connector has not been reconciled yet. Run one now, or put it on a schedule below."
                actions={<Button size="sm" variant="pri" icon="play" onClick={() => toast('ok', 'Reconciliation queued', `A ${draft.mode.toLowerCase()} run for ${app.displayName} has been queued.`)}>Run reconciliation</Button>}
              />
            ) : (
              <div style={{ overflowX: 'auto' }}><table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Run</th>
                    <th style={{ width: 150 }}>Started</th>
                    <th style={{ width: 90 }}>Mode</th>
                    <th style={{ width: 110 }}>Outcome</th>
                    <th className="td-num" style={{ width: 90 }}>Scanned</th>
                    <th className="td-num" style={{ width: 100 }}>Unmatched</th>
                    <th className="td-act" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="td-main mono">{r.id}</td>
                      <td className="td-mono">{r.started}</td>
                      <td><Tag>{r.mode}</Tag></td>
                      <td><Pill tone={runTone(r.status)} dot>{r.status}</Pill></td>
                      <td className="td-num">{num(r.scanned)}</td>
                      <td className="td-num">{num(r.fresh)}</td>
                      <td className="td-act">
                        <span className="row" style={{ justifyContent: 'flex-end' }}>
                          <Button size="sm" icon="eye" onClick={() => navigate(`${RECON_BASE}/${r.id}`)}>Open</Button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Run configuration" sub="How and how often this connector is reconciled.">
            <div className="grid grid-2">
              <Field label="Mode" htmlFor="rc-mode" hint="A delta run reads only what changed since the last one.">
                <Select id="rc-mode" value={draft.mode} options={MODES} onChange={(e) => set({ mode: e.target.value })} />
              </Field>
              <Field label="Schedule" htmlFor="rc-sched">
                <Select id="rc-sched" value={draft.schedule} options={SCHEDULES} onChange={(e) => set({ schedule: e.target.value })} />
              </Field>
              <Field
                label="Auto-link threshold (%)" htmlFor="rc-link"
                hint="At or above this confidence a candidate is linked without review."
                error={thresholdIssue || undefined}
              >
                <TextInput id="rc-link" className="mono" value={draft.link} onChange={(e) => set({ link: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />
              </Field>
              <Field label="Review threshold (%)" htmlFor="rc-review" hint="Below this a candidate is treated as unmatched.">
                <TextInput id="rc-review" className="mono" value={draft.review} onChange={(e) => set({ review: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })} />
              </Field>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <Switch checked={draft.onboarded} onChange={(v) => set({ onboarded: v })} label="Include in scheduled reconciliation" />
              <span className="t-sm">Include this connector in scheduled reconciliation</span>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <span className="spacer" />
              <Button
                size="sm"
                icon="play"
                onClick={() => toast('ok', 'Reconciliation queued', `A ${draft.mode.toLowerCase()} run for ${app.displayName} has been queued.`)}
              >
                Run now
              </Button>
            </div>
          </Card>

          <Card title="Target">
            <KeyValue
              cols={1}
              rows={[
                { k: 'Connector', v: facet.method, icon: 'provision' },
                { k: 'Accounts managed', v: num(facet.accounts), icon: 'users' },
                { k: 'Last sync', v: facet.lastSync, icon: 'history' },
                { k: 'Rule set', v: latest ? <span className="mono t-xs">{latest.ruleSet}</span> : '—', icon: 'policy' },
              ]}
            />
          </Card>

          <Banner tone="info">
            <Icon name="info" size={14} /> Reconciliation never writes to the target. It reads accounts, correlates them
            against the identity store and queues what it cannot resolve for review.
          </Banner>
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        message={dirty ? (issues.length ? `Unsaved reconciliation changes · ${issues[0]}` : 'Unsaved reconciliation changes') : 'Reconciliation settings are up to date'}
      >
        <Button disabled={!dirty} onClick={() => setDraft(initial)}>Discard</Button>
        <Button variant="pri" icon="save" disabled={!dirty || issues.length > 0} onClick={save}>Save changes</Button>
      </StickyActions>
    </div>
  )
}
