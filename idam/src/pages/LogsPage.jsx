import './styles/LogsPage.css'
import PageBar from '../components/shell/PageBar'
import Tabs from '../components/primitives/Tabs'
import { useApp } from '../store/AppContext'
import AuditLogConfig from './logging/AuditLogConfig'
import CaptureRegister from './logging/CaptureRegister'
import SiemTransport from './logging/SiemTransport'

// Security events are three questions, and the tabs are the answers: which
// events the platform captures at all, which operations reach the audit trail,
// and where those events are shipped. Retention is not a fourth question —
// every captured event carries its own rotation and archival period on the
// register, which is where an auditor reads it.
const TABS = [
  { id: 'capture', label: 'Capture Register', icon: 'logs' },
  { id: 'audit', label: 'Audit Log Configurations', icon: 'check' },
  { id: 'siem', label: 'SIEM Transport', icon: 'server' },
]

const BASE_PATH = '/iam/syslogs'

/* The global defaults every event inherits unless it overrides them. Held here
   so the capture register can state what "global" actually means. */
const GLOBALS = { level: 'INFO', target: 'File and Syslog', retentionDays: 90 }

export default function LogsPage({ segments = [] }) {
  const { navigate } = useApp()

  // Routed rather than local, so a link to a tab lands on it — the SIEM
  // transport moved here from Settings and existing links redirect to it.
  const tab = TABS.some((t) => t.id === segments[0]) ? segments[0] : 'capture'

  return (
    <>
      <PageBar
        title="Security Events"
        sub="Which security events the platform records, how long it keeps them, and where it ships them."
        crumbs={[{ label: 'Logging' }, { label: 'Security Events' }]}
      />

      <div className="stack">
        <Tabs value={tab} onChange={(id) => navigate(`${BASE_PATH}/${id}`)} tabs={TABS} />
        {tab === 'capture' && <CaptureRegister globals={GLOBALS} />}
        {tab === 'audit' && <AuditLogConfig />}
        {tab === 'siem' && <SiemTransport />}
      </div>
    </>
  )
}
