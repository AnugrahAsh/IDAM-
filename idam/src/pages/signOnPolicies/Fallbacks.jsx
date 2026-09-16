import PageBar from '../../components/shell/PageBar'
import EmptyState from '../../components/primitives/EmptyState'
import Button from '../../components/primitives/Button'
import { useApp } from '../../store/AppContext'
import { BASE, MODULE, policyPath } from './signOnPolicyData'

export function PolicyNotFound({ id }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar title="Policy not found" crumbs={[{ label: 'Sign-On Policies', to: BASE }, { label: String(id) }]} />
      <EmptyState
        icon="signon"
        title={`No sign-on policy with id ${id}`}
        body="It may have been deleted, or the identifier in the address is wrong."
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to sign-on policies</Button>}
      />
    </>
  )
}

export function RuleNotFound({ policy, ruleId }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar
        title="Rule not found"
        crumbs={[
          { label: 'Sign-On Policies', to: BASE },
          { label: policy.name, to: policyPath(policy.id, 'rules') },
          { label: String(ruleId) },
        ]}
      />
      <EmptyState
        icon="layers"
        title={`${policy.name} has no rule with id ${ruleId}`}
        body="It may have been deleted, or it belongs to a different policy."
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(policyPath(policy.id, 'rules'))}>Back to the rules</Button>}
      />
    </>
  )
}

/* Hiding a button is not access control: the add and edit screens are
   reachable by address, so each one checks the permission itself. */
export function NoAccess({ title, permission, backTo = BASE, backLabel = 'Sign-On Policies' }) {
  const { navigate, role } = useApp()
  return (
    <>
      <PageBar title={title} crumbs={[{ label: backLabel, to: backTo }, { label: title }]} />
      <EmptyState
        icon="noentry"
        title={`${role.name} cannot open this screen`}
        body={`It needs the ${permission} permission on the ${MODULE} module. Switch back from the account menu, or ask an administrator to grant it.`}
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(backTo)}>Back to {backLabel}</Button>}
      />
    </>
  )
}
