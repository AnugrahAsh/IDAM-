import './LogsPage.css'
import { useEffect, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Tabs from '../../components/primitives/Tabs'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import { useLoading } from '../../lib/useLoading'
import { useApp } from '../../store/AppContext'
import AuditLogConfig from './AuditLogConfig'
import CaptureRegister from './CaptureRegister'
import SiemTransport from './SiemTransport'

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

/* What the reader is told is on its way, in the words the tab itself uses. */
const WAITING = {
  capture: 'Loading the capture register',
  audit: 'Loading the audit log configuration',
  siem: 'Loading the SIEM transport',
}

export default function LogsPage({ segments = [] }) {
  const { navigate } = useApp()

  // Routed rather than local, so a link to a tab lands on it — the SIEM
  // transport moved here from Settings and existing links redirect to it.
  const tab = TABS.some((t) => t.id === segments[0]) ? segments[0] : 'capture'

  /* One flag for the screen, keyed on the tab: a deployment fetches the panel
     under the tab bar when the tab changes, and nothing above it. `booted`
     only records that the masthead has been painted once — re-drawing the
     title every time someone moves between registers would blink the page's
     identity for no reason, and the tab strip is navigation, not content. */
  const loading = useLoading(tab)
  const [booted, setBooted] = useState(false)
  useEffect(() => { if (!loading) setBooted(true) }, [loading])

  const panel = (
    <>
      {tab === 'capture' && <CaptureRegister globals={GLOBALS} loading={loading} />}
      {tab === 'audit' && <AuditLogConfig loading={loading} />}
      {tab === 'siem' && <SiemTransport loading={loading} />}
    </>
  )

  return (
    <>
      {booted ? (
        <PageBar
          title="Security Events"
          sub="Which security events the platform records, how long it keeps them, and where it ships them."
          crumbs={[{ label: 'Logging' }, { label: 'Security Events' }]}
        />
      ) : (
        <SkeletonPageBar actions={0} crumbs={2} />
      )}

      <div className="stack">
        <Tabs value={tab} onChange={(id) => navigate(`${BASE_PATH}/${id}`)} tabs={TABS} />
        {/* The one announcing region on this screen. It sits around the panel
            rather than the masthead because the panel is what settles on every
            wait, not just the first one; the masthead's shapes above are
            aria-hidden decoration and say nothing of their own. */}
        {loading ? <Skeleton label={WAITING[tab]}>{panel}</Skeleton> : panel}
      </div>
    </>
  )
}
