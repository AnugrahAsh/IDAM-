import RuleBuilder from './RuleBuilder'
import { NoAccess, PolicyNotFound, RuleNotFound } from './Fallbacks'
import { policyPath } from './signOnPolicyData'
import { policyByKey, usePolicies } from './signOnPolicyStore'
import { PERMS, usePolicyAccess } from './signOnPolicyAccess'

/** Edit one rule of a policy. */
export default function RuleEdit({ id, ruleId }) {
  const policy = policyByKey(usePolicies(), id)
  const access = usePolicyAccess()

  if (!policy) return <PolicyNotFound id={id} />
  const rule = policy.rules.find((r) => String(r.id) === String(ruleId))
  if (!rule) return <RuleNotFound policy={policy} ruleId={ruleId} />
  if (!access.editRule) {
    return (
      <NoAccess
        title={`Edit ${rule.name}`}
        permission={PERMS.editRule}
        backTo={policyPath(policy.id, 'rules')}
        backLabel={policy.name}
      />
    )
  }
  return <RuleBuilder key={`${policy.id}-${rule.id}`} policy={policy} rule={rule} />
}
