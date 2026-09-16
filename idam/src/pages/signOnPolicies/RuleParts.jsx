import { Fragment } from 'react'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { actionMeta, conditionText, frequencyText, mfaMeta, plural, typeMeta } from './signOnPolicyData'

const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function ActionPill({ action }) {
  const a = actionMeta(action)
  return <Pill tone={a.tone} icon={a.icon}>{a.short}</Pill>
}

/* A rule's conditions as chips, with the join between them spelled out. The
   previous rules table printed the condition set as one run of raw text. */
export function ConditionChips({ rule, cap = 3 }) {
  if (rule.conditions.length === 0) return <span className="t-mut">Every sign-in</span>
  return (
    <span className="sop-chips">
      {rule.conditions.map((c, i) => {
        const type = typeMeta(c.type)
        return (
          <Fragment key={`${c.type}-${c.operator}-${i}`}>
            {i > 0 && <span className="sop-join-word">{rule.logic === 'OR' ? 'or' : 'and'}</span>}
            <span className="sop-chip" title={sentence(conditionText(c))}>
              <Icon name={type ? type.icon : 'filter'} size={11} />
              <span className="trunc">{conditionText(c, { short: true, cap })}</span>
            </span>
          </Fragment>
        )
      })}
    </span>
  )
}

export function MfaSummary({ rule }) {
  if (!rule.promptMfa) return <span className="t-mut">None</span>
  return (
    <span className="sop-mfa">
      <span className="sop-mfa-methods">
        {rule.mfaMethods.map((m) => {
          const meta = mfaMeta(m)
          return meta ? <Tag key={m}><Icon name={meta.icon} size={10} />{meta.short}</Tag> : null
        })}
      </span>
      <span className="cell-sub">{sentence(frequencyText(rule))}</span>
    </span>
  )
}

export function ExcludedSummary({ rule }) {
  if (!rule.excludeUsers) return <span className="t-mut">—</span>
  return <Tag tone="acc"><Icon name="users" size={10} />{plural(rule.excludedUsernames.length, 'user')}</Tag>
}
