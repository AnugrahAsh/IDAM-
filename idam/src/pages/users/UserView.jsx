import IdentityDetail from './IdentityDetail'
import { useApp } from '../../store/AppContext'
import { patchUser, removeUsers, useUsers, userByKey } from './usersStore'
import UserNotFound from './UserNotFound'

/** One identity's record. */
export default function UserView({ id }) {
  const { toast, confirm, navigate } = useApp()
  const rows = useUsers()
  const record = userByKey(rows, id)

  if (!record) return <UserNotFound id={id} />

  return (
    <IdentityDetail
      key={record.id}
      user={record}
      onPatch={(patch, message) => {
        patchUser(record.id, patch)
        if (message) toast('ok', message, record.username)
      }}
      onDelete={() => confirm({
        title: `Delete ${record.username}?`,
        body: 'The identity is removed from the register and de-provisioned from every target it holds an account on at the next run. This cannot be undone.',
        confirmLabel: 'Delete identity',
        onConfirm: () => {
          removeUsers([record.id])
          toast('ok', 'Identity deleted', `${record.username} removed from the directory.`)
          navigate('/iam/users')
        },
      })}
    />
  )
}
