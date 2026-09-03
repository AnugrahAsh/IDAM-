import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { nextId } from '../../data/seed'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useState } from 'react'
import { BASE, NOW_STAMP, RISK_OVERRIDES, RULES_BASE, SCOPES, ageDays, allRules, blankModel, countRules, flatten, matchAccounts, modelText, needsValue, unresolvedRules } from './orphanedData'
import ConditionBuilder from './ConditionBuilder'

export default function RuleBuilder({ rule, rules, setRules, accounts }) {
  const { toast, navigate } = useApp()
  const [draft, setDraft] = useState(() => ({
    name: rule ? rule.name : '',
    description: rule ? rule.description : '',
    scope: rule ? rule.scope : SCOPES[0],
    risk: rule ? rule.risk : RISK_OVERRIDES[0],
    suppression: rule ? rule.suppression : '30 days',
    owner: rule ? rule.owner : 'IT Operations',
    ticket: rule ? rule.ticket : '',
    active: rule ? rule.active : true,
  }))
  const [model, setModel] = useState(() => (rule ? flatten(rule.model) : blankModel()))
  const [touched, setTouched] = useState(false)

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setTouched(true) }
  const setConditions = (m) => { setModel(m); setTouched(true) }

  const hasConditions = !!modelText(model)
  const matched = matchAccounts(model, accounts, draft.scope)
  const nameError = touched && !draft.name.trim() ? 'A rule name is required.' : ''
  const duplicateName = rules.some((r) => r.id !== (rule ? rule.id : null) && r.name.toLowerCase() === draft.name.trim().toLowerCase())
  const incomplete = allRules(model).filter((r) => needsValue(r.operator) && !String(r.value || '').trim())
  const valid = draft.name.trim() && hasConditions && incomplete.length === 0

  const save = () => {
    setTouched(true)
    if (!draft.name.trim()) { toast('warn', 'Name required', 'Give the rule a name that describes what it detects.'); return }
    if (!hasConditions) { toast('warn', 'No conditions', 'Add at least one condition before saving.'); return }
    if (incomplete.length > 0) {
      toast('warn', 'Incomplete condition', `${incomplete.length} ${incomplete.length === 1 ? 'condition needs' : 'conditions need'} a value.`)
      return
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || 'No description supplied.',
      scope: draft.scope,
      risk: draft.risk,
      suppression: draft.suppression,
      owner: draft.owner,
      ticket: draft.ticket.trim() || 'Not linked',
      active: draft.active,
      model,
      modifiedOn: NOW_STAMP,
      modifiedBy: 'admin',
    }
    if (rule) {
      setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, ...payload } : r)))
      toast('ok', 'Rule updated', `${payload.name} runs with the new definition on the next sweep.`)
      navigate(`${RULES_BASE}/${rule.id}`)
      return
    }
    let created = null
    setRules((rs) => {
      created = { ...payload, id: nextId(rs), createdOn: NOW_STAMP, createdBy: 'admin', lastRun: '' }
      return [...rs, created]
    })
    toast('ok', 'Rule created', `${payload.name} runs on the next detection sweep.`)
    if (created) navigate(`${RULES_BASE}/${created.id}`)
  }

  return (
    <>
      <DetailHeader
        backTo={rule ? `${RULES_BASE}/${rule.id}` : BASE}
        backLabel={rule ? rule.name : 'Orphan Accounts'}
        eyebrow={rule ? 'Edit detection rule' : 'New detection rule'}
        title={draft.name || (rule ? rule.name : 'Untitled rule')}
        sub="Describe the accounts reconciliation should surface as orphaned. The rule is evaluated against every account discovered on the targets in scope."
        badges={<Tag>{countRules(model)} conditions</Tag>}
        meta={
          <>
            <Fact icon="orphan" label="Matches today" value={num(matched.length)} />
            <Fact icon="provision" label="Scope" value={draft.scope} />
          </>
        }
        actions={<Button icon="x" onClick={() => navigate(rule ? `${RULES_BASE}/${rule.id}` : BASE)}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Rule" sub="How the rule is described to whoever triages the accounts it surfaces">
              <div className="grid grid-2">
                <Field label="Name" required error={nameError} span={2} htmlFor="rule-name">
                  <TextInput id="rule-name" value={draft.name} placeholder="Dormant privileged service account" onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label="Description" span={2} hint="What this rule is looking for and why it matters." htmlFor="rule-desc">
                  <TextInput id="rule-desc" as="textarea" rows={3} value={draft.description} placeholder="Privileged service account with no recorded use for six months." onChange={(e) => set({ description: e.target.value })} />
                </Field>
                <Field label="Scope" hint="Targets the rule runs against." htmlFor="rule-scope">
                  <Select id="rule-scope" value={draft.scope} options={SCOPES} onChange={(e) => set({ scope: e.target.value })} />
                </Field>
                <Field label="Rule owner" hint="Accountable for triaging what this rule finds." htmlFor="rule-owner">
                  <Select id="rule-owner" value={draft.owner} options={['IT Operations', 'Security', 'Finance', 'Human Resources', 'Engineering', 'Compliance']} onChange={(e) => set({ owner: e.target.value })} />
                </Field>
              </div>
              {duplicateName && draft.name.trim() && (
                <div style={{ marginTop: 12 }}>
                  <Banner tone="warn">Another rule already uses this name. Matched accounts are labelled by rule name, so duplicates are hard to tell apart in the register.</Banner>
                </div>
              )}
            </Card>

            <Card title="Conditions" sub="Accounts that satisfy these conditions enter the orphan register">
              <ConditionBuilder model={model} onChange={setConditions} />
              {incomplete.length > 0 && touched && (
                <div style={{ marginTop: 12 }}>
                  <Banner tone="warn">
                    {incomplete.length} {incomplete.length === 1 ? 'condition is' : 'conditions are'} missing a value and will be
                    rejected on save.
                  </Banner>
                </div>
              )}
            </Card>

          </div>

          <div className="stack">
            <Card title="Live evaluation" sub={`Scope: ${draft.scope}`}>
              <div className="stack">
                <div className="row-between">
                  <span className="t-sm t-mut">Accounts matching</span>
                  <span className="t-h2 num">{num(matched.length)}</span>
                </div>
                <Meter value={accounts.length ? Math.round((matched.length / accounts.length) * 100) : 0} tone="warn" height={8} />
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Critical risk matched', v: num(matched.filter((a) => a.risk === 'critical').length), icon: 'warn' },
                    { k: 'Applications reached', v: num(new Set(matched.map((a) => a.application)).size), icon: 'provision' },
                    { k: 'Already claimed', v: num(matched.filter((a) => a.status === 'Claimed').length), icon: 'link' },
                    { k: 'Unresolved conditions', v: num(unresolvedRules(model).length), icon: 'policy' },
                  ]}
                />
              </div>
            </Card>

            <Card title="Sample matches">
              {matched.length === 0 ? (
                <EmptyState size="sm" icon="orphan" title="No matches" body="Add or loosen a condition." />
              ) : (
                <div className="feed">
                  {matched.slice(0, 8).map((a) => (
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

          </div>
        </div>

        <StickyActions dirty={touched} message={touched ? (valid ? 'Unsaved changes' : 'Unsaved changes · rule is incomplete') : 'No changes'}>
          <Button onClick={() => navigate(rule ? `${RULES_BASE}/${rule.id}` : BASE)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={save}>{rule ? 'Save rule' : 'Create rule'}</Button>
        </StickyActions>
      </div>
    </>
  )
}

