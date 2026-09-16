import PolicyForm from './PolicyForm'
import { NoAccess, PolicyNotFound } from './Fallbacks'
import { useApp } from '../../store/AppContext'
import { policyPath } from './signOnPolicyData'
import { policyByKey, usePolicies } from './signOnPolicyStore'
import { usePolicyActions } from './usePolicyActions'
import { PERMS, usePolicyAccess } from './signOnPolicyAccess'

/** Edit a sign-on policy — its name, description and status. */
export default function PolicyEdit({ id }) {
  const { navigate } = useApp()
  const policies = usePolicies()
  const policy = policyByKey(policies, id)
  const access = usePolicyAccess()
  const { savePolicy } = usePolicyActions()

  if (!policy) return <PolicyNotFound id={id} />
  if (!access.edit) {
    return <NoAccess title={`Edit ${policy.name}`} permission={PERMS.edit} backTo={policyPath(policy.id)} backLabel={policy.name} />
  }
  return (
    <PolicyForm
      key={policy.id}
      policy={policy}
      policies={policies}
      canChangeStatus={access.status}
      onSave={(draft) => savePolicy(policy, draft)}
      onCancel={() => navigate(policyPath(policy.id))}
    />
  )
}
