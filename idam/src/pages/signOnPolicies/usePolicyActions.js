import { useApp } from '../../store/AppContext'
import { BASE, appById, plural, policyPath } from './signOnPolicyData'
import {
  attachApplications, deletePolicies, deleteRule, detachApplications, insertPolicy, insertRule,
  reorderRules, replaceRule, setPolicyStatus, updatePolicy,
} from './signOnPolicyStore'

/**
 * The mutations every sign-on policy screen shares, each with the confirmation
 * and the toast that belong to it.
 *
 * Held here rather than on the list, because the record deletes and changes
 * status too — and a handler defined on the list is not reachable from a screen
 * the list does not render.
 */
export function usePolicyActions() {
  const { toast, confirm, navigate } = useApp()

  const createPolicy = (draft) => {
    const id = insertPolicy(draft)
    toast('ok', 'Sign-on policy created', `${draft.name} has no rules yet. Add its rules, then attach the applications it governs.`)
    navigate(policyPath(id, 'rules'))
  }

  const savePolicy = (policy, draft) => {
    updatePolicy(policy.id, draft)
    toast('ok', 'Sign-on policy saved', draft.name !== policy.name
      ? `Renamed from ${policy.name}. Its rules and attached applications are unchanged.`
      : `${draft.name} was updated.`)
    navigate(policyPath(policy.id))
  }

  const applyStatus = (ids, status, done) => {
    setPolicyStatus(ids, status)
    if (done) done()
    const subject = ids.length === 1 ? 'Policy' : `${ids.length} policies`
    toast('ok', `${subject} ${status === 'Active' ? 'activated' : 'deactivated'}`, status === 'Active'
      ? 'Rules are evaluated for every attached application.'
      : 'Rules are kept but no longer evaluated.')
  }

  /* Deactivating lifts every restriction a policy places on its applications,
     so it is confirmed whenever there is something in force to lift. */
  const changeStatus = (policies, status, done) => {
    const ids = policies.map((p) => p.id)
    const enforcing = policies.filter((p) => p.status === 'Active' && p.rules.length > 0 && p.applications.length > 0)
    if (status === 'Active' || enforcing.length === 0) {
      applyStatus(ids, status, done)
      return
    }
    const apps = new Set(enforcing.flatMap((p) => p.applications.map((m) => m.appId))).size
    confirm({
      title: policies.length === 1 ? `Deactivate ${policies[0].name}?` : `Deactivate ${policies.length} policies?`,
      body: `Rules stop being evaluated for ${plural(apps, 'attached application')}. They are kept, and apply again when the policy is activated.`,
      tone: 'warn',
      icon: 'power',
      confirmLabel: 'Deactivate',
      onConfirm: () => applyStatus(ids, status, done),
    })
  }

  const removePolicies = (policies, done) => {
    const rules = policies.reduce((n, p) => n + p.rules.length, 0)
    const apps = policies.reduce((n, p) => n + p.applications.length, 0)
    const one = policies.length === 1
    confirm({
      title: one ? `Delete ${policies[0].name}?` : `Delete ${policies.length} policies?`,
      body: `${plural(rules, 'rule')} and ${plural(apps, 'application attachment')} are deleted with ${one ? 'it' : 'them'}. This cannot be undone.`,
      confirmLabel: one ? 'Delete policy' : `Delete ${policies.length} policies`,
      onConfirm: () => {
        deletePolicies(policies.map((p) => p.id))
        if (done) done()
        toast('ok', one ? 'Policy deleted' : 'Policies deleted', one ? policies[0].name : `${policies.length} policies removed.`)
        navigate(BASE)
      },
    })
  }

  const createRule = (policy, rule, priority) => {
    insertRule(policy.id, rule, priority)
    toast('ok', 'Rule created', `${rule.name} is evaluated at priority ${priority} of ${policy.rules.length + 1}.`)
    navigate(policyPath(policy.id, 'rules'))
  }

  const saveRule = (policy, ruleId, rule, priority) => {
    replaceRule(policy.id, ruleId, rule, priority)
    toast('ok', 'Rule saved', `${rule.name} is evaluated at priority ${priority} of ${policy.rules.length}.`)
    navigate(policyPath(policy.id, 'rules'))
  }

  const removeRule = (policy, rule) => confirm({
    title: `Delete ${rule.name}?`,
    body: 'Rules below it move up one priority. This cannot be undone.',
    confirmLabel: 'Delete rule',
    onConfirm: () => {
      deleteRule(policy.id, rule.id)
      toast('ok', 'Rule deleted', `${policy.name} now has ${plural(policy.rules.length - 1, 'rule')}.`)
    },
  })

  const saveOrder = (policy, ruleIds) => {
    reorderRules(policy.id, ruleIds)
    toast('ok', 'Priorities saved', `${policy.name} evaluates its ${plural(ruleIds.length, 'rule')} in the new order.`)
  }

  const attach = (policy, appIds) => {
    attachApplications(policy.id, appIds)
    const label = appIds.length === 1 ? (appById(appIds[0]) || {}).displayName : plural(appIds.length, 'application')
    toast('ok', appIds.length === 1 ? 'Application attached' : 'Applications attached', policy.rules.length > 0
      ? `Sign-ins to ${label} are now evaluated against ${policy.name}.`
      : `${label} attached. ${policy.name} has no rules yet, so nothing is evaluated until one is added.`)
  }

  const detach = (policy, mappings, done) => {
    const names = mappings.map((m) => (appById(m.appId) || {}).displayName).filter(Boolean)
    const one = mappings.length === 1
    confirm({
      title: one ? `Detach ${names[0]}?` : `Detach ${mappings.length} applications?`,
      body: `Sign-ins to ${one ? 'it' : 'them'} are no longer evaluated against ${policy.name}. The ${one ? 'application itself is' : 'applications themselves are'} not changed.`,
      confirmLabel: one ? 'Detach application' : `Detach ${mappings.length}`,
      onConfirm: () => {
        detachApplications(policy.id, mappings.map((m) => m.mappingId))
        if (done) done()
        toast('ok', one ? 'Application detached' : 'Applications detached', `${names.join(', ')} ${one ? 'is' : 'are'} no longer governed by ${policy.name}.`)
      },
    })
  }

  return {
    createPolicy, savePolicy, changeStatus, removePolicies,
    createRule, saveRule, removeRule, saveOrder, attach, detach,
  }
}
