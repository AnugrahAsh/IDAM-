import PageBar from '../../components/shell/PageBar'
import EmptyState from '../../components/primitives/EmptyState'
import Button from '../../components/primitives/Button'
import { useApp } from '../../store/AppContext'

/** Shared by the view and edit screens, which fail the same way. */
export default function UserNotFound({ id }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar
        title="Identity not found"
        sub="The record you followed no longer exists, or it was deleted in this session."
        crumbs={[{ label: 'Users', to: '/iam/users' }, { label: 'Not found' }]}
      />
      <EmptyState
        icon="user"
        title={`No identity with id ${id}`}
        body="The identity may have been deleted, or you may be following a stale link. Return to the directory to search for it."
        actions={<Button variant="pri" icon="users" onClick={() => navigate('/iam/users')}>Back to directory</Button>}
      />
    </>
  )
}
