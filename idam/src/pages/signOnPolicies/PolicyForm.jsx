import { useMemo, useState } from 'react'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import { statusTone } from '../../lib/format'
import { BASE, DESCRIPTION_MAX, NAME_MAX, NAME_MIN, plural, policyIssues, policyPath } from './signOnPolicyData'

const FIELD_IDS = { name: 'sop-name', description: 'sop-description' }

const STEPS = [
  { icon: 'edit', title: 'Name the policy', sub: 'This screen. The policy starts with no rules and no applications.' },
  { icon: 'layers', title: 'Add rules', sub: 'Ordered by priority. The first rule whose conditions match allows or denies the sign-in.' },
  { icon: 'apps', title: 'Attach applications', sub: 'Rules only run for sign-ins to the applications attached to the policy.' },
]

/**
 * Add and edit share one form.
 *
 * Two things the previous screens could not do are here: the name is editable
 * — renaming used to mean deleting the policy, and its rules and attachments
 * with it — and the status can be set, where a policy could previously only be
 * taken out of force by deleting it.
 */
export default function PolicyForm({ policy, policies, canChangeStatus = true, onSave, onCancel }) {
  const initial = useMemo(() => ({
    name: policy ? policy.name : '',
    description: policy ? policy.description : '',
    status: policy ? policy.status : 'Active',
  }), [policy])
  const [draft, setDraft] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const [blurred, setBlurred] = useState({})

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const blur = (k) => setBlurred((b) => ({ ...b, [k]: true }))
  const issues = policyIssues(draft, policies, policy)
  const shown = (k) => ((attempted || blurred[k]) ? issues[k] : undefined)
  const count = Object.keys(issues).length
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const active = draft.status === 'Active'
  const lifting = policy && policy.status === 'Active' && !active && policy.rules.length > 0 && policy.applications.length > 0

  const submit = () => {
    setAttempted(true)
    const first = Object.keys(FIELD_IDS).find((k) => issues[k])
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus()
      return
    }
    onSave({ name: draft.name.trim(), description: draft.description.trim(), status: draft.status })
  }

  const message = attempted && count > 0
    ? `${count === 1 ? '1 field needs' : `${count} fields need`} attention`
    : dirty ? 'Unsaved changes' : 'No changes'

  return (
    <>
      <DetailHeader
        backTo={policy ? policyPath(policy.id) : BASE}
        backLabel={policy ? policy.name : 'Sign-On Policies'}
        eyebrow={policy ? 'Edit sign-on policy' : 'New sign-on policy'}
        title={draft.name.trim() || (policy ? policy.name : 'Untitled policy')}
        sub="A sign-on policy is a named, ordered set of access rules. It takes effect on the SSO applications attached to it."
        media={(
          <span className="feed-ic" data-tone={active ? 'acc' : 'mut'} style={{ width: 44, height: 44 }}>
            <Icon name="signon" size={20} />
          </span>
        )}
        badges={<Pill tone={statusTone(draft.status)} dot>{draft.status}</Pill>}
        actions={<Button icon="x" onClick={onCancel}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Definition" sub="How operators recognise this policy">
              <div className="grid grid-2">
                <Field
                  label="Policy name"
                  required
                  span={2}
                  htmlFor={FIELD_IDS.name}
                  error={shown('name')}
                  hint={policy
                    ? 'Renaming keeps the policy’s rules and attached applications.'
                    : `Between ${NAME_MIN} and ${NAME_MAX} characters, and unique across sign-on policies.`}
                >
                  <TextInput
                    id={FIELD_IDS.name}
                    value={draft.name}
                    placeholder="Workforce baseline"
                    autoComplete="off"
                    onBlur={() => blur('name')}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </Field>
                <Field
                  label="Description"
                  span={2}
                  htmlFor={FIELD_IDS.description}
                  error={shown('description')}
                  hint={`${draft.description.length} / ${DESCRIPTION_MAX} characters`}
                >
                  <TextInput
                    as="textarea"
                    id={FIELD_IDS.description}
                    rows={3}
                    value={draft.description}
                    placeholder="Who this policy governs, and why its rules differ from the baseline."
                    onBlur={() => blur('description')}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Status" sub="Whether the policy’s rules are evaluated at sign-in">
              <div className="stack">
                <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                  <Switch
                    checked={active}
                    disabled={!canChangeStatus}
                    label="Policy active"
                    onChange={(v) => set('status', v ? 'Active' : 'Inactive')}
                  />
                  <div>
                    <div className="t-sm" style={{ fontWeight: 600 }}>{active ? 'Active' : 'Inactive'}</div>
                    <div className="t-xs t-mut">
                      {active
                        ? 'Rules are evaluated for every application attached to the policy.'
                        : 'Rules are kept, but not evaluated until the policy is activated.'}
                    </div>
                    {!canChangeStatus && <div className="t-xs t-mut">Your role does not hold the Change Status permission.</div>}
                  </div>
                </div>
                {lifting && (
                  <Banner tone="warn">
                    Saving deactivates this policy. Its {plural(policy.rules.length, 'rule')} stop being evaluated
                    for {plural(policy.applications.length, 'attached application')}.
                  </Banner>
                )}
              </div>
            </Card>
          </div>

          <div className="stack">
            {policy ? (
              <Card title="This policy" sub="What saving the form leaves in place">
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Rules', v: plural(policy.rules.length, 'rule'), icon: 'layers' },
                    { k: 'Attached applications', v: plural(policy.applications.length, 'application'), icon: 'apps' },
                    { k: 'Created', v: `${policy.createdOn} · ${policy.createdBy}`, icon: 'calendar' },
                    { k: 'Last modified', v: policy.modifiedOn ? `${policy.modifiedOn} · ${policy.modifiedBy}` : 'Never', icon: 'history' },
                  ]}
                />
              </Card>
            ) : (
              <Card title="After you create it" sub="A policy does nothing on its own">
                <div className="feed">
                  {STEPS.map((s, i) => (
                    <div className="feed-it" key={s.title}>
                      <span className="feed-ic" data-tone={i === 0 ? 'acc' : 'mut'}><Icon name={s.icon} size={13} /></span>
                      <div className="feed-m">
                        <div className="feed-t"><b>{s.title}</b></div>
                        <div className="feed-s">{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        <StickyActions dirty={dirty} message={message}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={submit}>{policy ? 'Save changes' : 'Create policy'}</Button>
        </StickyActions>
      </div>
    </>
  )
}
