import { atPath, atRecord, atRecordPath, atRoot, renderScreen } from '../lib/moduleRouter'
import UsersList from './directory/UsersList'
import UserAdd from './directory/UserAdd'
import UserEdit from './directory/UserEdit'
import UserView from './directory/UserView'

/**
 * Users.
 *
 * A router, nothing else. Each screen owns its own file, its own state and its
 * own imports; the register is not constructed to render the add form, and the
 * add form is not carried in the bundle the register needs.
 *
 * Order is specificity order — `/add` before the record match, or an identity
 * called "add" would shadow it.
 */
const SCREENS = [
  { match: atRoot(), render: () => <UsersList /> },
  { match: atPath('add'), render: () => <UserAdd /> },
  { match: atRecordPath('edit'), render: ({ id }) => <UserEdit id={id} /> },
  { match: atRecord(), render: ({ id }) => <UserView id={id} /> },
]

export default function DirectoryPage({ segments = [] }) {
  return renderScreen(SCREENS, segments, () => <UsersList />)
}
