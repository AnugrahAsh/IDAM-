import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { countPerms } from './roleModel'
import { dropRoles, getRoles, patchRole, writeRoles } from './rolesStore'
import { nextId } from '../../data/seed'

/**
 * The mutations every role screen shares.
 *
 * Held here rather than on the list, because the record screen deletes and
 * duplicates too — and a handler defined on the list is not reachable from a
 * screen the list does not render.
 */
export function useRoleActions() {
  const { toast, confirm, navigate } = useApp()

  const duplicate = (r) => {
    const id = nextId(getRoles())
    writeRoles((rs) => [...rs, {
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
      dropRoles(ids)
      if (done) done()
      toast('ok', 'Role deleted', `${ids.length} ${ids.length === 1 ? 'role' : 'roles'} removed from the catalog.`)
      navigate('/iam/roles')
    },
  })

  const createRole = (draft) => {
    const id = nextId(getRoles())
    writeRoles((rs) => [...rs, {
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
    patchRole(role.id, {
      name: draft.name,
      description: draft.description,
      perms: draft.perms,
      permCount: countPerms(draft.perms),
      moduleCount: Object.keys(draft.perms).length,
    })
    toast('ok', 'Role saved', `${draft.name} now grants ${num(countPerms(draft.perms))} permissions.`)
    navigate(`/iam/roles/${role.id}`)
  }

  return { patch: patchRole, duplicate, removeRoles, createRole, saveRole }
}
