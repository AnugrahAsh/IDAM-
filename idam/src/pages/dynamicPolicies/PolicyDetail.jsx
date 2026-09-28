import './ConditionStudio.css'
import { useMemo, useState } from 'react'
import { useApp } from '../../store/AppContext'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import DetailHeader from '../../components/shell/DetailHeader'
import Pill from '../../components/primitives/Pill'
import StickyActions from '../../components/shell/StickyActions'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import { Fact } from '../../components/shell/DetailHeader'
import { num } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { PolicyPanelSkeleton, PolicyRecordSkeleton } from './PoliciesSkeleton'
import { BASE, CYCLE, NOW_MS, assignedIds, countRules, fmtStamp, groupLabel, groupList, groupPhrase, groupRecords, matchUsers, metaFor, modelText, parseExpression } from './policyPageData'
import ConditionBuilder from './ConditionBuilder'
import EvaluationPanel from './EvaluationPanel'
import ExpressionPanel from './ExpressionPanel'
import HistoryTab from './HistoryTab'
import OverviewTab from './OverviewTab'
import SimulationTab from './SimulationTab'

export default function PolicyDetail({ policy, tab, setRows, onDelete }) {
  const { toast, confirm, navigate } = useApp()
  const [pending, setPending] = useState(null)

  const saved = useMemo(() => parseExpression(policy.condition), [policy.condition])
  const model = pending || saved
  const matched = useMemo(() => matchUsers(saved), [saved])
  const assigned = useMemo(() => assignedIds(policy, matched), [policy, matched])
  const meta = metaFor(policy)
  const targets = groupRecords(policy)
  const dirty = pending != null && modelText(pending) !== modelText(saved)
  /* Two scopes off one timer. `arriving` is the record — masthead, tab strip
     and panel resolve on the same tick. `settling` is the panel alone, which
     is all a tab change fetches: the tab bar is chrome and stays put. */
  const arriving = useLoading(policy.id)
  const settling = useLoading(`${policy.id}:${tab}`)

  const goTab = (t) => navigate(t === 'overview' ? `${BASE}/${policy.id}` : `${BASE}/${policy.id}/${t}`, { replace: true })

  const patch = (changes, title, body, tone) => {
    setRows((rs) => rs.map((r) => (r.id === policy.id ? { ...r, ...changes } : r)))
    toast(tone || 'ok', title, body)
  }

  const runNow = () => confirm({
    title: `Run ${policy.name} now?`,
    body: `${num(matched.length)} identities will be reconciled against ${groupPhrase(policy)} immediately instead of waiting for the six-hour cycle.`,
    confirmLabel: 'Run policy',
    tone: 'acc',
    onConfirm: () => patch({ lastRun: fmtStamp(NOW_MS), matched: matched.length }, 'Policy applied', `${policy.name} reconciled ${num(matched.length)} identities against ${groupPhrase(policy)}.`),
  })

  const saveCondition = () => {
    const expression = modelText(model)
    if (!expression) {
      toast('warn', 'No predicates', 'Add at least one predicate before saving the condition.')
      return
    }
    patch({ condition: expression }, 'Condition saved', `${policy.name} takes effect at the next evaluation.`)
    setPending(null)
  }

  if (arriving) return <PolicyRecordSkeleton tab={tab} />

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Dynamic Policies"
        eyebrow="Dynamic policy"
        title={policy.name}
        sub={policy.description || 'No description supplied.'}
        badges={
          <>
            <Pill tone={policy.active ? 'ok' : 'mut'} dot>{policy.active ? 'Active' : 'Paused'}</Pill>
            <Tag>{policy.groupType} {groupList(policy).length > 1 ? 'groups' : 'group'}</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="group" label={groupList(policy).length > 1 ? 'Targets' : 'Target'} value={groupLabel(policy)} />
            <Fact icon="users" label="Matched" value={num(matched.length)} />
            <Fact icon="history" label="Last run" value={policy.lastRun || 'Never'} />
            <Fact icon="clock" label="Next run" value={CYCLE ? CYCLE.nextRun : 'Unscheduled'} />
          </>
        }
        actions={
          <>
            <Button icon={policy.active ? 'ban' : 'checkC'} onClick={() => patch({ active: !policy.active }, policy.active ? 'Policy paused' : 'Policy activated', policy.active ? 'Skipped from the next evaluation. Existing assignments are retained.' : `Evaluates at the next cycle and will assign ${groupPhrase(policy)}.`, policy.active ? 'warn' : 'ok')}>
              {policy.active ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => onDelete([policy.id], `Delete ${policy.name}?`, () => navigate(BASE))}>Delete</Button>
            <Button icon="edit" onClick={() => navigate(`${BASE}/${policy.id}/edit`)}>Edit</Button>
            <Button variant="pri" icon="play" onClick={runNow}>Run now</Button>
          </>
        }
        tabs={
          <Tabs
            value={tab}
            onChange={goTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'condition', label: 'Condition builder', icon: 'policy', count: countRules(saved) },
              { id: 'simulation', label: 'Simulation', icon: 'play' },
              { id: 'history', label: 'Run history', icon: 'history' },
            ]}
          />
        }
      />

      <div className="detail-body">
        {/* The card tabs are redrawn as shapes while they settle; simulation
            and history keep their own controls and settle their rows. */}
        {settling && (tab === 'overview' || tab === 'condition') && <PolicyPanelSkeleton tab={tab} />}

        {tab === 'overview' && !settling && <OverviewTab policy={policy} model={saved} matched={matched} assigned={assigned} meta={meta} targets={targets} />}

        {tab === 'condition' && !settling && (
          <>
            <div className="cstudio">
              <div className="cstudio-pair">
                <Card
                  title="Builder"
                  sub="Who this policy reaches — groups combine top to bottom"
                  actions={<Tag>{countRules(model)} {countRules(model) === 1 ? 'condition' : 'conditions'}</Tag>}
                >
                  <ConditionBuilder
                    model={model}
                    onChange={setPending}
                    expressionMode={false}
                    showResolvedExpression={false}
                    summary={null}
                  />
                </Card>
                <ExpressionPanel model={model} />
              </div>
              <EvaluationPanel model={model} savedCount={matched.length} dirty={dirty} onSimulate={() => goTab('simulation')} />
            </div>
            <StickyActions dirty={dirty} message={dirty ? 'Unsaved condition changes' : 'Condition matches the saved definition'}>
              <Button onClick={() => setPending(null)} disabled={!dirty}>Revert</Button>
              <Button variant="pri" icon="save" disabled={!dirty} onClick={saveCondition}>Save condition</Button>
            </StickyActions>
          </>
        )}

        {tab === 'simulation' && (
          <SimulationTab policy={policy} model={saved} loading={settling} />
        )}

        {tab === 'history' && <HistoryTab policy={policy} matchedCount={matched.length} loading={settling} />}
      </div>
    </>
  )
}
