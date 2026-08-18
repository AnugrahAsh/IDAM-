import './styles/SmsManagementPage.css'
import PageBar from '../components/shell/PageBar'
import Tabs from '../components/primitives/Tabs'
import StatChip from '../components/primitives/StatChip'
import SmsPage from './SmsPage'
import SmsTemplatesPage from './SmsTemplatesPage'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { SMS_CLIENTS, SMS_PROVIDERS, SMS_QUEUE, SMS_TEMPLATES } from './comms/commsData'

const SECTIONS = [
  { id: 'sms', label: 'SMS', icon: 'sms' },
  { id: 'providers', label: 'Providers', icon: 'server' },
  { id: 'templates', label: 'Templates', icon: 'file' },
  { id: 'clients', label: 'Clients', icon: 'users' },
]

export default function SmsManagementPage({ segments = [] }) {
  const { navigate } = useApp()
  const tab = SECTIONS.some((s) => s.id === segments[0]) ? segments[0] : 'sms'
  const rest = SECTIONS.some((s) => s.id === segments[0]) ? segments.slice(1) : segments

  return (
    <>
      <PageBar
        title="SMS Management"
        crumbs={[{ label: 'SMS' }, { label: 'SMS Management' }]}
        sub="The outbound queue, the gateways it routes through, and the templates it renders."
        rail={
          <>
            <StatChip icon="sms" active={tab === 'sms'} onClick={() => navigate('/iam/sms')}>
              {num(SMS_QUEUE.length)} in queue
            </StatChip>
            <StatChip icon="server" active={tab === 'providers'} onClick={() => navigate('/iam/sms/providers')}>
              {num(SMS_PROVIDERS.length)} providers
            </StatChip>
            <StatChip icon="file" active={tab === 'templates'} onClick={() => navigate('/iam/sms/templates')}>
              {num(SMS_TEMPLATES.length)} templates
            </StatChip>
            <StatChip icon="users" active={tab === 'clients'} onClick={() => navigate('/iam/sms/clients')}>
              {num(SMS_CLIENTS.length)} clients
            </StatChip>
          </>
        }
      />

      <div className="stack">
        <Tabs
          value={tab}
          onChange={(id) => navigate(id === 'sms' ? '/iam/sms' : `/iam/sms/${id}`)}
          tabs={SECTIONS}
        />
        {tab === 'sms' && <SmsPage segments={rest} embedded />}
        {/* No `key` here on purpose: SmsTemplatesPage syncs its own tab from
            `segments`, and remounting it would discard providers, templates or
            clients added in this session when the user switches tabs. */}
        {tab !== 'sms' && <SmsTemplatesPage segments={[tab, ...rest]} embedded base="/iam/sms" />}
      </div>
    </>
  )
}
