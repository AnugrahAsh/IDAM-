import RoleForm from './RoleForm'
import { useApp } from '../../store/AppContext'
import { useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'

/** Create a role. */
export default function RoleAdd() {
  const { navigate } = useApp()
  const rows = useRoles()
  const { createRole } = useRoleActions()
  return <RoleForm roles={rows} onSave={createRole} onCancel={() => navigate('/iam/roles')} />
}
