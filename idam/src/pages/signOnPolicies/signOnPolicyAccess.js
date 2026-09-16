import { useApp } from '../../store/AppContext'
import { MODULE } from './signOnPolicyData'

/**
 * What the signed-in role may do in this module, one flag per control.
 *
 * The previous console gated only the Edit button on the Policy Information
 * tab. Every write control here asks, and a screen reached by address rather
 * than by a button asks again.
 */
export const PERMS = {
  add: 'Add Sign-On Policy',
  edit: 'Modify Sign-On Policy',
  remove: 'Delete Sign-On Policy',
  status: 'Change Status',
  addRule: 'Add Rule',
  editRule: 'Modify Rule',
  removeRule: 'Delete Rule',
  reorder: 'Reorder Rules',
  attach: 'Attach Application',
  detach: 'Detach Application',
}

export const deniedTitle = (key) => `Your role does not hold the ${PERMS[key]} permission.`

export function usePolicyAccess() {
  const { can } = useApp()
  return Object.fromEntries(Object.entries(PERMS).map(([key, perm]) => [key, can(MODULE, perm)]))
}
