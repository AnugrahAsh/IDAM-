import { useMemo } from 'react'
import SharedConditionBuilder from '../shared/conditions/ConditionBuilder'
import { buildAttributes } from '../shared/conditions/conditionModel'
import { OPERATORS, attributes as policyAttributes, matchUsers } from './policyPageData'
import { num } from '../../lib/format'

/**
 * The dynamic-policy condition editor.
 *
 * There is one condition builder in the console — this supplies the attribute
 * register it works over and the sentence it speaks in. Two hand-written
 * builders previously drifted apart: one grew grouping and an expression mode,
 * the other did not, and the same operator meant different things in each.
 */
export default function ConditionBuilder({ model, onChange, ...rest }) {
  // Read at render so an attribute defined in Configurations is usable here
  // immediately, without this screen being reloaded.
  const catalog = useMemo(() => buildAttributes(policyAttributes()), [])
  const matched = useMemo(() => matchUsers(model).length, [model])

  return (
    <SharedConditionBuilder
      model={model}
      onChange={onChange}
      catalog={catalog}
      operators={OPERATORS}
      noun="condition"
      nounPlural="conditions"
      idPrefix="pol-cond"
      countFor={(m) => matchUsers(m).length}
      countNoun="identities"
      summary={(
        <span className="t-xs t-mut">
          <b className="num">{num(matched)}</b> {matched === 1 ? 'identity matches' : 'identities match'} right now
        </span>
      )}
      {...rest}
    />
  )
}
