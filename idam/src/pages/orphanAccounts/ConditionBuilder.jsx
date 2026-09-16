import { useMemo } from 'react'
import SharedConditionBuilder from '../shared/conditions/ConditionBuilder'
import { buildAttributes } from '../shared/conditions/conditionModel'
import { ACCOUNT_ATTRIBUTES, OPERATORS, matchAccounts } from './orphanedData'
import { ORPHANS } from '../../data/seed'
import { num } from '../../lib/format'

/**
 * The orphaned-account detection editor.
 *
 * The same builder as Dynamic Policy, over a different register: these rules
 * are written against target *accounts*, not identities, so the attribute list
 * differs even though the grammar and the operators are identical.
 *
 * The raw expression editor is deliberately not offered here. Orphan rules are
 * authored from the builder alone, so a second way to write the same rule was
 * asked to be taken out.
 */
export default function ConditionBuilder({ model, onChange }) {
  const catalog = useMemo(() => buildAttributes(ACCOUNT_ATTRIBUTES), [])
  const matched = useMemo(() => matchAccounts(model, ORPHANS).length, [model])

  return (
    <SharedConditionBuilder
      model={model}
      onChange={onChange}
      catalog={catalog}
      operators={OPERATORS}
      noun="condition"
      nounPlural="conditions"
      idPrefix="orph-cond"
      expressionMode={false}
      summary={(
        <span className="t-xs t-mut">
          <b className="num">{num(matched)}</b> {matched === 1 ? 'account matches' : 'accounts match'} right now
        </span>
      )}
    />
  )
}
