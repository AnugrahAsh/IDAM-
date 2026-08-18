import './styles/EmailManagementPage.css'
import PageBar from '../components/shell/PageBar'
import Tabs from '../components/primitives/Tabs'
import StatChip from '../components/primitives/StatChip'
import EmailsPage from './EmailsPage'
import EmailConfigurationPage from './EmailConfigurationPage'
import EmailTemplatesPage from './EmailTemplatesPage'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { OUTBOX, SMTP_DEFAULTS, TEMPLATES } from './comms/commsData'

const SECTIONS = [
  { id: 'emails', label: 'Emails', icon: 'mail' },
  { id: 'configuration', label: 'Email Configuration', icon: 'sliders' },
  { id: 'templates', label: 'Email Templates', icon: 'file' },
]

export default function EmailManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  const tab = SECTIONS.some((s) => s.id === segments[0]) ? segments[0] : 'emails'
  const rest = SECTIONS.some((s) => s.id === segments[0]) ? segments.slice(1) : segments

  return (
    <>
      <PageBar
        title="Email Management"
        crumbs={[{ label: 'Emails' }, { label: 'Email Management' }]}
        sub="The outbound queue, the SMTP connection it sends through, and the templates it renders."
        rail={
          <>
            <StatChip icon="mail" active={tab === 'emails'} onClick={() => navigate('/iam/emails')}>
              {num(OUTBOX.length)} in outbox
            </StatChip>
            <StatChip icon="clock" active={tab === 'emails'} onClick={() => navigate('/iam/emails')}>
              {num(OUTBOX.filter((m) => m.status === 'Queued').length)} queued
            </StatChip>
            <StatChip icon="file" active={tab === 'templates'} onClick={() => navigate('/iam/emails/templates')}>
              {num(TEMPLATES.length)} templates
            </StatChip>
            <StatChip icon="sliders" active={tab === 'configuration'} onClick={() => navigate('/iam/emails/configuration')}>
              {SMTP_DEFAULTS.host}
            </StatChip>
          </>
        }
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={(id) => navigate(id === 'emails' ? '/iam/emails' : `/iam/emails/${id}`)}
          tabs={SECTIONS}
        />
        {tab === 'emails' && <EmailsPage segments={rest} embedded />}
        {tab === 'configuration' && <EmailConfigurationPage embedded />}
        {tab === 'templates' && <EmailTemplatesPage segments={rest} embedded />}
      </div>
    </>
  )
}
