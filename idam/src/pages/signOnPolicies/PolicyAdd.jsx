import PolicyForm from './PolicyForm'
import { NoAccess } from './Fallbacks'
import { useApp } from '../../store/AppContext'
import { BASE } from './signOnPolicyData'
import { usePolicies } from './signOnPolicyStore'
import { usePolicyActions } from './usePolicyActions'
import { PERMS, usePolicyAccess } from './signOnPolicyAccess'

/** Create a sign-on policy. */
export default function PolicyAdd() {
  const { navigate } = useApp()
  const policies = usePolicies()
  const access = usePolicyAccess()
  const { createPolicy } = usePolicyActions()

  if (!access.add) return <NoAccess title="Add sign-on policy" permission={PERMS.add} />
  return <PolicyForm policies={policies} onSave={createPolicy} onCancel={() => navigate(BASE)} />
}
