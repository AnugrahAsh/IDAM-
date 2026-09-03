import PageBar from '../../components/shell/PageBar'
import EmptyState from '../../components/primitives/EmptyState'
import Button from '../../components/primitives/Button'
import { useApp } from '../../store/AppContext'

export default function RoleNotFound({ id }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar title="Role not found" crumbs={[{ label: 'Roles', to: '/iam/roles' }, { label: String(id) }]} />
      <EmptyState
        icon="roles"
        title={`No role with id ${id}`}
        body="It may have been deleted, or the identifier in the address is wrong."
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate('/iam/roles')}>Back to roles</Button>}
      />
    </>
  )
}
