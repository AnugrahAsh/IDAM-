import IdentityForm from './IdentityForm'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import { stampStr } from './identityData'
import { useUsers, writeUsers } from './usersStore'

const attrsOf = (payload) => {
  const out = {}
  Object.entries(payload || {}).forEach(([k, v]) => { out[k] = v })
  return out
}

/** Create one identity. Nothing of the register is constructed to do it. */
export default function UserAdd() {
  const { toast, navigate } = useApp()
  const existing = useUsers()

  const createIdentity = (payload) => {
    const attrs = attrsOf(payload)
    const username = String(attrs.username || '').trim().toUpperCase()
    const id = nextId(existing)
    const created = {
      ...attrs,
      id,
      username,
      status: attrs.status || 'Active',
      createdOn: stampStr(0),
      createdBy: 'SHUBHAM_JAIN',
      lastLogin: '',
    }
    writeUsers((rs) => [created, ...rs])
    toast('ok', 'Identity created', `${username} added and queued for provisioning.`)
    navigate(`/iam/users/${id}`)
  }

  return (
    <IdentityForm
      key="add"
      existing={existing}
      onCreate={createIdentity}
      onCancel={() => navigate('/iam/users')}
    />
  )
}
