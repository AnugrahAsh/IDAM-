import RoleForm from './RoleForm'
import RoleDetail from './RoleDetail'
import RoleNotFound from './RoleNotFound'
import { useApp } from '../../store/AppContext'
import { roleByKey, useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'

/**
 * Edit a role.
 *
 * A system role has no editable definition, so the address falls through to the
 * record rather than opening a form that refuses every change.
 */
export default function RoleEdit({ id }) {
  const { navigate } = useApp()
  const rows = useRoles()
  const role = roleByKey(rows, id)
  const { patch, duplicate, removeRoles, saveRole } = useRoleActions()

  if (!role) return <RoleNotFound id={id} />
  if (role.system) {
    return <RoleDetail key={role.id} role={role} onPatch={patch} onDuplicate={duplicate} onDelete={removeRoles} />
  }

  return (
    <RoleForm
      key={role.id}
      role={role}
      roles={rows}
      onSave={(draft) => saveRole(role, draft)}
      onCancel={() => navigate(`/iam/roles/${role.id}`)}
    />
  )
}
