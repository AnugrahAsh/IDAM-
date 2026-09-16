import './UsefulLinksPage.css'
import './UsefulLinksManagementPage.css'
import QuickLinksList from './QuickLinksList'
import QuickLinksRegister from './QuickLinksRegister'

/**
 * Quick Links.
 *
 * The published shortcut list and the screen that authors it are one page now:
 * the list is what every identity sees, and `/manage` is the full-page
 * register behind the Manage button, offered only to a role that may publish.
 */
export default function UsefulLinksPage({ segments = [] }) {
  if (segments[0] === 'manage') return <QuickLinksRegister segments={segments.slice(1)} />
  return <QuickLinksList />
}
