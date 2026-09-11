import './styles/UsefulLinksPage.css'
import './styles/UsefulLinksManagementPage.css'
import QuickLinksList from './usefulLinksMgmt/QuickLinksList'
import QuickLinksRegister from './usefulLinksMgmt/QuickLinksRegister'

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
