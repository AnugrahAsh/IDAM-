import './SignOnPolicyPage.css'
import { atPath, atPattern, atRecord, atRecordPath, atRoot, renderScreen } from '../../lib/moduleRouter'
import PolicyList from './PolicyList'
import PolicyAdd from './PolicyAdd'
import PolicyEdit from './PolicyEdit'
import PolicyView from './PolicyView'
import RuleAdd from './RuleAdd'
import RuleEdit from './RuleEdit'

/**
 * Sign-On Policies. A router — each screen owns its own file.
 *
 * The previous console addressed its edit screens as `/edit/:id` and
 * `/:id/rules/edit/:ruleId`. Both still open the same screens, so bookmarks and
 * links pasted into tickets survive the move to `/:id/edit`.
 */
const SCREENS = [
  { match: atRoot(), render: () => <PolicyList /> },
  { match: atPath('add'), render: () => <PolicyAdd /> },
  { match: atPattern('edit/:id'), render: ({ id }) => <PolicyEdit id={id} /> },
  { match: atRecordPath('edit'), render: ({ id }) => <PolicyEdit id={id} /> },
  { match: atRecordPath('rules', 'add'), render: ({ id }) => <RuleAdd id={id} /> },
  { match: atPattern(':id/rules/edit/:ruleId'), render: ({ id, ruleId }) => <RuleEdit id={id} ruleId={ruleId} /> },
  { match: atPattern(':id/rules/:ruleId/edit'), render: ({ id, ruleId }) => <RuleEdit id={id} ruleId={ruleId} /> },
  { match: atRecord(), render: ({ id, tab }) => <PolicyView id={id} tab={tab} /> },
]

export default function SignOnPolicyPage({ segments = [] }) {
  return renderScreen(SCREENS, segments, () => <PolicyList />)
}
