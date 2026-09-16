import { atPath, atRecord, atRecordPath, atRoot, renderScreen } from '../../lib/moduleRouter'
import RoleList from './RoleList'
import RoleAdd from './RoleAdd'
import RoleEdit from './RoleEdit'
import RoleView from './RoleView'

/** Roles. A router — each screen owns its own file. */
const SCREENS = [
  { match: atRoot(), render: () => <RoleList /> },
  { match: atPath('add'), render: () => <RoleAdd /> },
  { match: atRecordPath('edit'), render: ({ id }) => <RoleEdit id={id} /> },
  { match: atRecord(), render: ({ id }) => <RoleView id={id} /> },
]

export default function RolesPage({ segments = [] }) {
  return renderScreen(SCREENS, segments, () => <RoleList />)
}
