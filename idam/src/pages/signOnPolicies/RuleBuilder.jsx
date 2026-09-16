import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { ACTIONS, actionMeta, issueCount, policyPath, ruleDraft, ruleFromDraft, ruleIssues } from './signOnPolicyData'
import { usePolicyActions } from './usePolicyActions'
import { ActionPill } from './RuleParts'
import ConditionEditor from './ConditionEditor'
import MfaEditor from './MfaEditor'
import ExclusionEditor from './ExclusionEditor'
import RulePreview from './RulePreview'

/**
 * The rule builder.
 *
 * A page of its own rather than the panel that used to open under the rules
 * table: a rule carries conditions, a message, an MFA requirement and an
 * exclusion list, and it reads back as a sentence beside the form while it is
 * being written.
 *
 * Save never does nothing. The previous form moved focus to a Type field and
 * stopped, with no message anywhere. Here every problem is named under its
 * field and counted in the action bar, and the first one takes focus.
 */
export default function RuleBuilder({ policy, rule }) {
  const { navigate, toast } = useApp()
  const { createRule, saveRule } = usePolicyActions()
  const index = rule ? policy.rules.findIndex((r) => r.id === rule.id) : -1
  const slots = rule ? policy.rules.length : policy.rules.length + 1
  /* There is no priority field. A new rule joins the end of the policy and an
     edited rule keeps its place; the order is changed by dragging a row on the
     rules tab, where the whole ladder is in view. */
  const priority = rule ? index + 1 : slots
  const [draft, setDraft] = useState(() => ruleDraft(rule))
  const [attempted, setAttempted] = useState(false)

  const baseline = useMemo(() => JSON.stringify(ruleFromDraft(ruleDraft(rule))), [rule])
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const siblings = policy.rules.filter((r) => !rule || r.id !== rule.id)
  const issues = ruleIssues(draft, siblings)
  const count = issueCount(issues)
  const shown = attempted ? issues : {}
  const dirty = JSON.stringify(ruleFromDraft(draft)) !== baseline
  const action = actionMeta(draft.action)
  const back = policyPath(policy.id, 'rules')

  const save = () => {
    setAttempted(true)
    if (count > 0) {
      toast('warn', 'Rule not saved', `${count === 1 ? 'One field needs' : `${count} fields need`} attention. Each problem is described under its field.`)
      // A task rather than an animation frame: the errors are committed by the
      // time it runs, and it still runs in a tab that is not being painted.
      setTimeout(() => {
        const first = document.querySelector('.sop-builder [data-invalid="true"], .sop-builder [data-issue]')
        if (!first) return
        const control = first.querySelector('[role="button"]:not([aria-disabled="true"]), input:not([disabled]), select:not([disabled]), textarea, button:not([disabled])')
        first.scrollIntoView({ block: 'center', behavior: 'smooth' })
        ;(control || first).focus({ preventScroll: true })
      }, 0)
      return
    }
    const payload = ruleFromDraft(draft)
    if (rule) saveRule(policy, rule.id, payload, priority)
    else createRule(policy, payload, priority)
  }

  const message = attempted && count > 0
    ? `${count === 1 ? '1 field needs' : `${count} fields need`} attention`
    : dirty ? 'Unsaved changes' : 'No changes'

  return (
    <>
      <DetailHeader
        backTo={back}
        backLabel={policy.name}
        eyebrow={rule ? 'Edit rule' : 'New rule'}
        title={draft.name.trim() || (rule ? rule.name : 'Untitled rule')}
        sub="Rules are evaluated top-to-bottom by priority. The first rule whose conditions match allows or denies the sign-in."
        media={(
          <span className="feed-ic" data-tone={action.tone} style={{ width: 44, height: 44 }}>
            <Icon name={action.icon} size={20} />
          </span>
        )}
        badges={(
          <>
            <ActionPill action={draft.action} />
            {draft.promptMfa && <Tag tone="acc">MFA</Tag>}
          </>
        )}
        meta={(
          <>
            <Fact icon="signon" label="Policy" value={policy.name} />
            <Fact icon="apps" label="Applications" value={num(policy.applications.length)} />
          </>
        )}
        actions={<Button icon="x" onClick={() => navigate(back)}>Cancel</Button>}
      />

      <div className="detail-body sop-builder">
        <div className="detail-cols">
          <div className="stack">
            <Card title="Rule" sub="What the rule is called and what it decides">
              <div className="stack">
                <Field
                  label="Rule name"
                  required
                  htmlFor="sop-rule-name"
                  error={shown.name}
                  hint="Unique within the policy. A short identifier reads best in the rules table."
                >
                  <TextInput
                    id="sop-rule-name"
                    value={draft.name}
                    placeholder="e.g. office-network-chrome"
                    autoComplete="off"
                    spellCheck="false"
                    onChange={(e) => set({ name: e.target.value })}
                  />
                </Field>
                <Field label="Action" required>
                  <div className="cfg-rules sop-actions" role="radiogroup" aria-label="Action">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        role="radio"
                        aria-checked={draft.action === a.value}
                        className="cfg-rule sop-action"
                        data-on={draft.action === a.value || undefined}
                        data-tone={a.tone}
                        onClick={() => set({ action: a.value })}
                      >
                        <span className="sop-action-t"><Icon name={a.icon} size={14} /><span className="cfg-rule-t">{a.label}</span></span>
                        <span className="cfg-rule-s">{a.sub}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </Card>

            <ConditionEditor
              conditions={draft.conditions}
              logic={draft.logic}
              issues={shown.conditions || []}
              scopeError={shown.scope}
              onChange={(conditions) => set({ conditions })}
              onLogic={(logic) => set({ logic })}
            />

            <Card title="When access is denied" sub="What the identity is told">
              <Field
                label="Denied message"
                required={draft.conditions.length > 0}
                htmlFor="sop-rule-message"
                error={shown.errorMessage}
                hint="Required whenever the rule has conditions. Say what to do next, not only what failed."
              >
                <TextInput
                  as="textarea"
                  id="sop-rule-message"
                  rows={2}
                  value={draft.errorMessage}
                  placeholder="Message shown when access is denied"
                  onChange={(e) => set({ errorMessage: e.target.value })}
                />
              </Field>
            </Card>

            <MfaEditor draft={draft} issues={shown} onChange={set} />
            <ExclusionEditor draft={draft} issue={shown.excludedUsernames} onChange={set} />
          </div>

          <div className="stack">
            <RulePreview draft={draft} policy={policy} rule={rule} priority={priority} slots={slots} />
          </div>
        </div>

        <StickyActions dirty={dirty} message={message}>
          <Button onClick={() => navigate(back)}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={save}>Save rule</Button>
        </StickyActions>
      </div>
    </>
  )
}
