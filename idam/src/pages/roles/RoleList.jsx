import './RolesPage.css'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { useRoles } from './rolesStore'
import { useRoleActions } from './useRoleActions'

/** The role catalog. Presentation is scoped to this page; role actions are unchanged. */
export default function RoleList() {
  const { navigate } = useApp()
  const rows = useRoles()
  const { removeRoles: onDelete } = useRoleActions()
  const systemCount = rows.filter((r) => r.system).length
  const metrics = [
    { icon: 'roles', label: 'Total roles', value: rows.length, detail: `${systemCount} system · ${rows.length - systemCount} custom` },
    { icon: 'users', label: 'Role assignments', value: rows.reduce((sum, r) => sum + r.members, 0), detail: 'Memberships across all roles' },
    { icon: 'key', label: 'Permission grants', value: rows.reduce((sum, r) => sum + r.permCount, 0), detail: 'Permissions summed across roles' },
    { icon: 'roles', label: 'Unassigned roles', value: rows.filter((r) => r.members === 0).length, detail: 'Roles with no members' },
  ]

  return (
    <div className="rl-workspace">
      <PageBar title="Roles"
        sub="Define the permissions that shape access across your organization."
        actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>} />
      <section className="rl-summary" aria-label="Role summary">
        {metrics.map((metric) => <div className="rl-metric" key={metric.label}>
          <div className="rl-metric-label"><span>{metric.label}</span><Icon name={metric.icon} size={16} /></div>
          <strong>{num(metric.value)}</strong><span className="rl-metric-detail">{metric.detail}</span>
        </div>)}
      </section>
      <section className="rl-catalog" aria-label="Role catalog">
        <div className="rl-section-head"><div><h2>Role catalog <span>{num(rows.length)}</span></h2><p>Review permissions, membership, and the purpose of each role.</p></div>
          <span className="rl-governance"><Icon name="shield" size={14} /> Role-based access control</span>
        </div>
        {rows.length === 0 ? <EmptyState icon="roles" title="No roles defined" body="Add a role to start granting permissions to identities." actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>} /> :
          <div className="rl-grid">{rows.map((r) => <article className="rl-card" key={r.id}>
            <div className="rl-card-top"><span className="rl-role-icon"><Icon name={r.system ? 'shield' : 'roles'} size={20} /></span><span className="rl-type" data-system={r.system || undefined}>{r.system && <Icon name="lock" size={11} />}{r.system ? 'System role' : 'Custom role'}</span></div>
            <h3><button onClick={() => navigate(`/iam/roles/${r.id}`)}>{r.name}</button></h3>
            <p className="rl-description">{r.description}</p>
            <dl className="rl-facts"><div><dt><Icon name="users" size={13} />Members</dt><dd>{num(r.members)}</dd></div><div><dt><Icon name="key" size={13} />Permissions</dt><dd>{num(r.permCount)}</dd></div></dl>
            <footer className="rl-card-footer"><Button size="sm" iconRight="chevR" onClick={() => navigate(`/iam/roles/${r.id}`)}>View role</Button>
              <Button size="sm" variant="danger" icon="trash" disabled={r.system} title={r.system ? 'System roles cannot be deleted' : `Delete ${r.name}`} aria-label={`Delete ${r.name}`} onClick={() => onDelete([r.id], `Delete ${r.name}?`)}>Delete</Button>
            </footer>
          </article>)}</div>}
        <p className="rl-note"><Icon name="lock" size={13} />System roles are protected and cannot be deleted.</p>
      </section>
    </div>
  )
}
