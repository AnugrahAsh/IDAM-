import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import DetailHeader from '../../components/shell/DetailHeader'
import Field from '../../components/primitives/Field'
import KeyValue from '../../components/primitives/KeyValue'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import Icon from '../../components/primitives/Icon'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import StickyActions from '../../components/shell/StickyActions'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { Fact } from '../../components/shell/DetailHeader'
import { USERS, nextId } from '../../data/seed'
import { num } from '../../lib/format'
import { BASE, GROUP_TYPES, blankModel, countRules, groupLabel, groupList, groupPhrase, groupRecords, groupsOfType, matchUsers, modelText, parseExpression, resolvable, unresolvedRules } from './policyPageData'
import ExpressionCode from '../shared/conditions/ExpressionCode'
import ConditionBuilder from './ConditionBuilder'
import { useLoading } from '../../lib/useLoading'
import { PolicyBuilderSkeleton } from './PoliciesSkeleton'

export default function PolicyBuilder({ policy, setRows }) {
  const { toast, navigate } = useApp()
  /* Only the edit address settles. A new policy opens on a blank condition
     with nothing to fetch, so the wait is switched off there rather than
     invented: `ms = 0` is how useLoading is told there is no round trip. */
  const loading = useLoading(policy ? policy.id : null, policy ? undefined : 0)
  const [draft, setDraft] = useState(() => ({
    name: policy ? policy.name : '',
    description: policy ? policy.description : '',
    groupType: policy ? policy.groupType : 'Access',
    groups: policy ? groupList(policy) : [],
    active: policy ? policy.active : false,
  }))
  const [model, setModel] = useState(() => (policy ? parseExpression(policy.condition) : blankModel()))
  const [touched, setTouched] = useState(false)

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setTouched(true) }
  const setCondition = (m) => { setModel(m); setTouched(true) }

  const expression = modelText(model)
  const matched = matchUsers(model)
  const targets = groupRecords(draft.groups)
  // A group already on the policy stays selectable even if it has since left
  // the register, so editing a policy never silently drops one of its targets.
  const options = [...new Set([...groupsOfType(draft.groupType), ...draft.groups].filter(Boolean))]
  const flagged = targets.filter((t) => t.sodFlags > 0)
  const nameError = touched && !draft.name.trim() ? 'A policy name is required.' : ''
  const groupError = touched && draft.groups.length === 0 ? 'Select at least one group to assign.' : ''
  const valid = draft.name.trim() && draft.groups.length > 0 && expression

  const save = () => {
    setTouched(true)
    if (!valid) {
      toast('warn', 'Policy incomplete', 'A name, at least one target group and at least one predicate are required.')
      return
    }
    if (policy) {
      setRows((rs) => rs.map((r) => (r.id === policy.id
        ? { ...r, name: draft.name.trim(), description: draft.description.trim(), condition: expression, groupType: draft.groupType, group: draft.groups, active: draft.active }
        : r)))
      toast('ok', 'Policy saved', `${draft.name} takes effect at the next evaluation.`)
      navigate(`${BASE}/${policy.id}`)
      return
    }
    let created = null
    setRows((rs) => {
      created = {
        id: nextId(rs),
        name: draft.name.trim(),
        description: draft.description.trim(),
        condition: expression,
        groupType: draft.groupType,
        group: draft.groups,
        active: draft.active,
        matched: matched.length,
        lastRun: '—',
      }
      return [...rs, created]
    })
    toast('ok', 'Policy created', `${draft.name} matches ${num(matched.length)} identities today and assigns ${groupPhrase(draft.groups)}. Simulate before activating.`)
    if (created) navigate(`${BASE}/${created.id}`)
  }

  if (loading) return <PolicyBuilderSkeleton />

  return (
    <>
      <DetailHeader
        backTo={policy ? `${BASE}/${policy.id}` : BASE}
        backLabel={policy ? policy.name : 'Dynamic Policies'}
        eyebrow={policy ? 'Edit dynamic policy' : 'New dynamic policy'}
        title={draft.name || (policy ? policy.name : 'Untitled policy')}
        sub="Assign an entitlement automatically from identity attributes. Nothing is written until the policy is activated and the next evaluation cycle runs."
        badges={
          <>
            <Pill tone={draft.active ? 'ok' : 'mut'} dot>{draft.active ? 'Will be active' : 'Inactive on save'}</Pill>
            <Tag>{countRules(model)} predicates</Tag>
          </>
        }
        meta={
          <>
            <Fact icon="users" label="Matches today" value={num(matched.length)} />
            <Fact icon="group" label={draft.groups.length > 1 ? 'Targets' : 'Target'} value={groupLabel(draft.groups)} />
          </>
        }
        actions={<Button icon="x" onClick={() => navigate(policy ? `${BASE}/${policy.id}` : BASE)}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Identification" sub="How the policy is described to approvers and auditors">
              <div className="grid grid-2">
                <Field label="Policy name" required error={nameError} span={2} htmlFor="pol-name">
                  <TextInput id="pol-name" value={draft.name} placeholder="Contractor 90-day expiry" onChange={(e) => set({ name: e.target.value })} />
                </Field>
                <Field label="Description" span={2} hint="Shown wherever the policy explains why an identity holds an entitlement." htmlFor="pol-desc">
                  <TextInput id="pol-desc" as="textarea" rows={3} value={draft.description} placeholder="What this policy grants and why." onChange={(e) => set({ description: e.target.value })} />
                </Field>
              </div>
            </Card>

            <Card title="Condition" sub="Identities that satisfy this expression receive the target group">
              <ConditionBuilder model={model} onChange={setCondition} showResolvedExpression={false} />
            </Card>

            <Card title="Target" sub="What matching identities receive">
              <div className="grid grid-2">
                <Field label="Group type" hint="Groups of one type are assigned together." htmlFor="pol-type">
                  <Select
                    id="pol-type"
                    value={draft.groupType}
                    // A group belongs to exactly one register, so a change of
                    // type invalidates every group already picked.
                    onChange={(e) => set({ groupType: e.target.value, groups: [] })}
                    options={GROUP_TYPES}
                  />
                </Field>
                <Field
                  label="Target groups"
                  required
                  error={groupError}
                  hint={draft.groups.length > 1
                    ? `Every match receives all ${draft.groups.length} groups on each cycle.`
                    : 'One or more groups of this type. Every match receives all of them.'}
                  htmlFor="pol-group"
                >
                  <SearchSelect
                    id="pol-group"
                    multiple
                    value={draft.groups}
                    options={options}
                    placeholder="Select groups"
                    searchPlaceholder="Search groups…"
                    emptyLabel="No group of this type matches"
                    onChange={(e) => set({ groups: e.target.value.map(String) })}
                  />
                </Field>
              </div>
              {targets.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="feed">
                    {targets.map((t) => (
                      <div className="feed-it" key={t.name}>
                        <span className="feed-ic" data-tone={t.sodFlags > 0 ? 'warn' : 'acc'}><Icon name="group" size={13} /></span>
                        <div className="feed-m">
                          <div className="feed-t">{t.name}</div>
                          <div className="feed-s">
                            <span>{t.application}</span>
                            <span>{num(t.members)} members</span>
                            {t.sodFlags > 0 && <span>{t.sodFlags} SoD {t.sodFlags === 1 ? 'rule' : 'rules'}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {flagged.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Banner tone="warn">
                        {flagged.map((t) => t.name).join(', ')} {flagged.length === 1 ? 'appears' : 'appear'} in
                        segregation-of-duties rules. Assigning {flagged.length === 1 ? 'it' : 'them'} by policy can
                        create conflicts that surface on the next scan.
                      </Banner>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="stack">
            <Card title="Live evaluation" sub="Recomputed as you edit">
              <div className="stack">
                <div className="row-between">
                  <span className="t-sm t-mut">Matching identities</span>
                  <span className="t-h2 num">{num(matched.length)}</span>
                </div>
                <Meter value={Math.round((matched.length / USERS.length) * 100)} tone={matched.length > USERS.length * 0.6 ? 'warn' : 'ok'} height={8} />
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Contractors matched', v: num(matched.filter((u) => u.employeeType === 'Contractor').length), icon: 'tag' },
                    { k: 'Service accounts matched', v: num(matched.filter((u) => u.employeeType === 'Service Account').length), icon: 'server' },
                    { k: 'Departments reached', v: num(new Set(matched.map((u) => u.department)).size), icon: 'building' },
                    { k: 'Unresolved predicates', v: num(unresolvedRules(model).length), icon: 'warn' },
                  ]}
                />
              </div>
            </Card>

            <Card title="Resolved expression" sub="Rewritten live as you edit the builder">
              <ExpressionCode model={model} isUnknown={(id) => !resolvable().has(id)} emptyLabel="No predicates defined" />
            </Card>

          </div>
        </div>

        <StickyActions dirty={touched} message={touched ? 'Unsaved changes' : 'No changes'}>
          <Button onClick={() => navigate(policy ? `${BASE}/${policy.id}` : BASE)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={save}>{policy ? 'Save changes' : 'Create policy'}</Button>
        </StickyActions>
      </div>
    </>
  )
}
