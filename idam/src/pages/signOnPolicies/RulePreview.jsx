import { Fragment } from 'react'
import Banner from '../../components/primitives/Banner'
import Card from '../../components/primitives/Card'
import { actionMeta, frequencyText, methodsText, operatorMeta, plural, ruleFromDraft, typeMeta } from './signOnPolicyData'
import { ActionPill } from './RuleParts'

const Gap = () => <span className="sop-gap" title="Not set yet">…</span>
const Value = ({ v }) => (v ? <code className="sop-val">{v}</code> : <Gap />)

function ConditionPhrase({ condition: c }) {
  const type = typeMeta(c.type)
  const op = operatorMeta(c.operator)
  let value = <Gap />
  if (op && op.shape === 'range') value = <><Value v={c.values[0]} />{' – '}<Value v={c.values[1]} /></>
  if (op && op.shape === 'list' && c.values.length > 0) {
    value = c.values.map((v, i) => <Fragment key={`${v}-${i}`}>{i > 0 && ', '}<Value v={v} /></Fragment>)
  }
  if (op && op.shape === 'single') value = <Value v={c.values[0]} />
  return (
    <>
      {'the '}
      {type ? <b>{type.noun}</b> : <Gap />}
      {' '}
      {op ? op.phrase : <Gap />}
      {' '}
      {value}
    </>
  )
}

/**
 * The rule read back as one sentence while it is written, and where it lands
 * among the policy's other rules — the two things the previous inline form
 * left the operator to reconstruct from a grid of dropdowns.
 */
export default function RulePreview({ draft, policy, rule, priority, slots }) {
  const r = ruleFromDraft(draft)
  const action = actionMeta(r.action)
  const catchAll = r.conditions.length === 0
  const below = slots - priority
  const belowText = below === 1 ? 'the rule below it never runs' : `the ${below} rules below it never run`

  const ladder = policy.rules.filter((x) => !rule || x.id !== rule.id)
  ladder.splice(priority - 1, 0, { id: 'current', name: r.name || 'This rule', action: r.action, current: true })

  return (
    <>
      <Card title="Rule preview" sub="The rule as it will read in the policy">
        <p className="sop-sentence">
          <b className="sop-verb" data-tone={action.tone}>{action.label}</b>
          {catchAll ? ' for every sign-in that reaches this rule' : ' when '}
          {!catchAll && r.conditions.map((c, i) => (
            <Fragment key={`${c.type}-${i}`}>
              {i > 0 && <>{' '}<b>{r.logic === 'OR' ? 'or' : 'and'}</b>{' '}</>}
              <ConditionPhrase condition={c} />
            </Fragment>
          ))}
          {r.promptMfa && (
            <>
              {r.action === 'ALLOW' ? ', after an MFA challenge (' : ', with an MFA challenge ('}
              {r.mfaMethods.length > 0 ? <b>{methodsText(r.mfaMethods)}</b> : <Gap />}
              {r.frequencyType === 'CUSTOM_INTERVAL' ? `) repeated ${frequencyText(r)}` : ') at every sign-in'}
            </>
          )}
          {r.excludeUsers && (
            <>
              {', unless the identity is one of '}
              <b>{plural(r.excludedUsernames.length, 'excluded user')}</b>
            </>
          )}
          .
        </p>
        {r.action === 'DENY' && !catchAll && (
          <p className="sop-sentence-sub">
            {'Denied sign-ins see '}
            {r.errorMessage ? <q>{r.errorMessage}</q> : <Gap />}
          </p>
        )}
      </Card>

      {catchAll && r.action === 'DENY' && (
        <Banner tone="bad">
          With no conditions, this rule refuses every sign-in that reaches it{below > 0 ? `, and ${belowText}` : ''}.
        </Banner>
      )}
      {catchAll && r.action === 'ALLOW' && below > 0 && (
        <Banner tone="warn">
          With no conditions, this rule matches every sign-in that reaches it, so {belowText}.
        </Banner>
      )}
      {policy.applications.length === 0 && (
        <Banner tone="info">
          No application is attached to {policy.name} yet, so this rule does not run until one is.
        </Banner>
      )}
      {policy.status !== 'Active' && (
        <Banner tone="info">
          {policy.name} is inactive. The rule is saved, but not evaluated until the policy is activated.
        </Banner>
      )}

      <Card title="Evaluation order" sub={`Priority ${priority} of ${slots} in ${policy.name}`}>
        <ol className="sop-order">
          {ladder.map((x, i) => (
            <li key={x.id} data-current={x.current || undefined}>
              <span className="sop-prio">{i + 1}</span>
              <span className="sop-order-m">
                <span className="sop-order-t">{x.name}</span>
                {x.current && <span className="sop-order-s">{rule ? 'Being edited' : 'Being added'}</span>}
              </span>
              <ActionPill action={x.action} />
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
