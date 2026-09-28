import RoleForm from './RoleForm'
import RoleDetail from './RoleDetail'
import RoleNotFound from './RoleNotFound'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { roleByKey, useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'
import { RoleFormSkeleton } from './RolesSkeleton'

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
  const loading = useLoading(id)

  if (!role) return <RoleNotFound id={id} />
  /* The system-role fallthrough settles on the record's own timer. Holding a
     form skeleton here first would make one navigation settle twice — a shape,
     then a different shape, then the record. */
  if (role.system) {
    return <RoleDetail key={role.id} role={role} onPatch={patch} onDuplicate={duplicate} onDelete={removeRoles} />
  }
  /* The editor waits on the role it edits. Creating one has nothing to fetch,
     so RoleAdd holds no skeleton. */
  if (loading) return <RoleFormSkeleton />

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
