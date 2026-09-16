import RuleBuilder from './RuleBuilder'
import { NoAccess, PolicyNotFound } from './Fallbacks'
import { policyPath } from './signOnPolicyData'
import { policyByKey, usePolicies } from './signOnPolicyStore'
import { PERMS, usePolicyAccess } from './signOnPolicyAccess'

/** Add a rule to a policy. */
export default function RuleAdd({ id }) {
  const policy = policyByKey(usePolicies(), id)
  const access = usePolicyAccess()

  if (!policy) return <PolicyNotFound id={id} />
  if (!access.addRule) {
    return (
      <NoAccess
        title={`Add a rule to ${policy.name}`}
        permission={PERMS.addRule}
        backTo={policyPath(policy.id, 'rules')}
        backLabel={policy.name}
      />
    )
  }
  return <RuleBuilder key={`${policy.id}-new`} policy={policy} />
}
