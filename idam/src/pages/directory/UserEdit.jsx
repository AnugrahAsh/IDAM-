import IdentityForm from './IdentityForm'
import { useApp } from '../../store/AppContext'
import { patchUser, useUsers, userByKey } from './usersStore'
import UserNotFound from './UserNotFound'

/** Edit one identity. */
export default function UserEdit({ id }) {
  const { toast, navigate } = useApp()
  const rows = useUsers()
  const record = userByKey(rows, id)

  if (!record) return <UserNotFound id={id} />

  const save = (payload) => {
    const username = String(payload.username || record.username).trim().toUpperCase()
    patchUser(record.id, { ...payload, username })
    toast('ok', 'Identity updated', `${username} saved and queued for provisioning.`)
    navigate(`/iam/users/${record.id}`)
  }

  return (
    <IdentityForm
      key={`edit-${record.id}`}
      user={record}
      existing={rows}
      onSave={save}
      onCancel={() => navigate(`/iam/users/${record.id}`)}
    />
  )
}
