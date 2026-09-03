import '../styles/RolesPage.css'
import PageBar from '../../components/shell/PageBar'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import EmptyState from '../../components/primitives/EmptyState'
import StatCards from '../../components/workbench/StatCards'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'

/** The role catalog. */
export default function RoleList() {
  const { navigate } = useApp()
  const rows = useRoles()
  const { removeRoles: onDelete } = useRoleActions()

  return (
    <>
      <PageBar
        title="Roles"
        crumbs={[{ label: 'Roles' }]}
        sub="Named sets of permissions granted to identities. A role is the unit access is requested, approved and reviewed in."
        actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>}
      />

      <StatCards
        items={[
          { key: 'roles', icon: 'roles', label: 'Roles', value: rows.length, chip: `${rows.filter((r) => r.system).length} system`, sub: 'permission sets that can be granted' },
          { key: 'members', icon: 'users', label: 'Identities holding a role', value: rows.reduce((a, r) => a + r.members, 0), chip: 'assigned', chipTone: 'ok', sub: 'across every role' },
          { key: 'perms', icon: 'key', label: 'Permissions granted', value: rows.reduce((a, r) => a + r.permCount, 0), chip: 'in total', sub: 'summed across the roles' },
          { key: 'empty', icon: 'warn', label: 'Held by nobody', value: rows.filter((r) => r.members === 0).length, chip: rows.some((r) => r.members === 0) ? 'unused' : 'none', chipTone: rows.some((r) => r.members === 0) ? 'warn' : undefined, sub: 'defined but not assigned' },
        ]}
        label="Role summary"
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="roles"
          title="No roles defined"
          body="Add a role to start granting permissions to identities."
          actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>}
        />
      ) : (
        <div className="grid grid-3 role-grid">
          {rows.map((r) => (
            <Card
              key={r.id}
              className="role-card"
              title={r.name}
              sub={r.description}
              footer={(
                <>
                  <Button size="sm" icon="eye" onClick={() => navigate(`/iam/roles/${r.id}`)}>View</Button>
                  <span className="spacer" />
                  <Button
                    size="sm"
                    variant="danger"
                    icon="trash"
                    disabled={r.system}
                    title={r.system ? 'System roles cannot be deleted' : undefined}
                    onClick={() => onDelete([r.id], `Delete ${r.name}?`)}
                  >
                    Delete
                  </Button>
                </>
              )}
            >
              <div className="role-stats">
                <div className="role-stat">
                  <span className="role-stat-k"><Icon name="users" size={13} />Users</span>
                  <span className="role-stat-v">{num(r.members)}</span>
                </div>
                <div className="role-stat">
                  <span className="role-stat-k"><Icon name="key" size={13} />Permissions</span>
                  <span className="role-stat-v">{num(r.permCount)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
