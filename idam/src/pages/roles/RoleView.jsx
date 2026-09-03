import RoleDetail from './RoleDetail'
import RoleNotFound from './RoleNotFound'
import { roleByKey, useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'

/** One role's record. */
export default function RoleView({ id }) {
  const role = roleByKey(useRoles(), id)
  const { patch, duplicate, removeRoles } = useRoleActions()
  if (!role) return <RoleNotFound id={id} />
  return <RoleDetail key={role.id} role={role} onPatch={patch} onDuplicate={duplicate} onDelete={removeRoles} />
}
