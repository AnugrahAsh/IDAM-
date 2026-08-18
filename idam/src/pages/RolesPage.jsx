import './styles/RolesPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import StatChip from '../components/primitives/StatChip'
import EmptyState from '../components/primitives/EmptyState'
import RoleDetail from './roles/RoleDetail'
import RoleForm from './roles/RoleForm'
import { countPerms, decorate } from './roles/roleModel'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { ROLES, nextId } from '../data/seed'

function NotFound({ id, onBack }) {
  return (
    <>
      <PageBar
        title="Role not found"
        sub="The role may have been deleted in this session, or the link may be stale."
        crumbs={[{ label: 'Roles', to: '/iam/roles' }, { label: String(id) }]}
      />
      <EmptyState
        icon="roles"
        title={`No role with id ${id}`}
        body="The role may have been deleted, or the link may be stale. Open the role catalog to find it."
        actions={<Button variant="pri" icon="chevL" onClick={onBack}>Back to roles</Button>}
      />
    </>
  )
}

function RoleList({ rows, onDelete }) {
  const { navigate } = useApp()
  const [chip, setChip] = useState(null)

  const pickChip = (id) => setChip((c) => (c === id ? null : id))

  const stats = useMemo(() => ({
    total: rows.length,
    system: rows.filter((r) => r.system).length,
    custom: rows.filter((r) => !r.system).length,
    privileged: rows.filter((r) => r.risk === 'critical' || r.risk === 'high').length,
  }), [rows])

  const shown = useMemo(() => {
    if (chip === 'system') return rows.filter((r) => r.system)
    if (chip === 'custom') return rows.filter((r) => !r.system)
    if (chip === 'privileged') return rows.filter((r) => r.risk === 'critical' || r.risk === 'high')
    return rows
  }, [rows, chip])

  return (
    <>
      <PageBar
        title="Roles"
        sub="The permission bundles assigned to identities. A role grants the same permissions everywhere it is held, so scope it before you widen it."
        crumbs={[{ label: 'Roles' }]}
        actions={<Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>}
        rail={
          <>
            <StatChip icon="roles" active={!chip} onClick={() => setChip(null)}>{num(stats.total)} roles</StatChip>
            <StatChip icon="lock" active={chip === 'system'} onClick={() => pickChip('system')}>{num(stats.system)} system</StatChip>
            <StatChip icon="edit" active={chip === 'custom'} onClick={() => pickChip('custom')}>{num(stats.custom)} custom</StatChip>
            <StatChip icon="warn" active={chip === 'privileged'} onClick={() => pickChip('privileged')}>{num(stats.privileged)} privileged</StatChip>
          </>
        }
      />

      {shown.length === 0 ? (
        <EmptyState
          icon="roles"
          title={chip ? 'No roles match this filter' : 'No roles defined'}
          body={chip
            ? 'Clear the filter to see the full role catalog.'
            : 'Add a role to start granting permissions to identities.'}
          actions={chip
            ? <Button variant="pri" icon="x" onClick={() => setChip(null)}>Clear filter</Button>
            : <Button variant="pri" icon="plus" onClick={() => navigate('/iam/roles/add')}>Add role</Button>}
        />
      ) : (
        <div className="grid grid-3 role-grid">
          {shown.map((r) => (
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

export default function RolesPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [rows, setRows] = useState(() => ROLES.map(decorate))

  const patch = (id, changes) => setRows((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, ...changes } : r)))

  const duplicate = (r) => {
    const id = nextId(rows)
    setRows((rs) => [...rs, {
      ...r, id, name: `${r.name} (copy)`, system: false, type: 'Custom', members: 0, memberIds: [], reviewedOn: null,
    }])
    toast('ok', 'Role duplicated', `${r.name} (copy) was created with ${num(r.permCount)} permissions and no members.`)
    navigate(`/iam/roles/${id}`)
  }

  const removeRoles = (ids, label, done) => confirm({
    title: label,
    body: 'Every identity holding the role loses its permissions on the next provisioning run. Standing approvals raised against it are canceled.',
    confirmLabel: 'Delete role',
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (done) done()
      toast('ok', 'Role deleted', `${ids.length} ${ids.length === 1 ? 'role' : 'roles'} removed from the catalog.`)
      navigate('/iam/roles')
    },
  })

  const createRole = (draft) => {
    const id = nextId(rows)
    setRows((rs) => [...rs, {
      id,
      name: draft.name,
      description: draft.description,
      system: false,
      type: 'Custom',
      members: 0,
      memberIds: [],
      perms: draft.perms,
      permCount: countPerms(draft.perms),
      moduleCount: Object.keys(draft.perms).length,
      reviewedOn: null,
    }])
    toast('ok', 'Role created', `${draft.name} grants ${num(countPerms(draft.perms))} permissions.`)
    navigate(`/iam/roles/${id}`)
  }

  const saveRole = (role, draft) => {
    patch(role.id, {
      name: draft.name,
      description: draft.description,
      perms: draft.perms,
      permCount: countPerms(draft.perms),
      moduleCount: Object.keys(draft.perms).length,
    })
    toast('ok', 'Role saved', `${draft.name} now grants ${num(countPerms(draft.perms))} permissions.`)
    navigate(`/iam/roles/${role.id}`)
  }

  const mode = segments[0]

  if (mode === 'add') {
    return <RoleForm roles={rows} onSave={createRole} onCancel={() => navigate('/iam/roles')} />
  }

  if (mode) {
    const role = rows.find((r) => String(r.id) === String(mode))
    if (!role) return <NotFound id={mode} onBack={() => navigate('/iam/roles')} />
    if (segments[1] === 'edit') {
      if (role.system) return <RoleDetail key={role.id} role={role} onPatch={patch} onDuplicate={duplicate} onDelete={removeRoles} />
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
    return <RoleDetail key={role.id} role={role} onPatch={patch} onDuplicate={duplicate} onDelete={removeRoles} />
  }

  return (
    <RoleList rows={rows} onDelete={removeRoles} />
  )
}
