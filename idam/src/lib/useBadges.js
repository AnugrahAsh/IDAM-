import { useMemo } from 'react'
import { APPLICATIONS, JOBS, LOGS, NOTIFICATIONS, ORPHANS, REQUESTS, SOD_VIOLATIONS, CAMPAIGNS } from '../data/seed'

export function useBadges() {
  return useMemo(() => {
    const pendingReq = REQUESTS.filter((r) => r.status === 'Pending' || r.status === 'Escalated')
    const breached = pendingReq.filter((r) => r.sla === 'breached').length
    const openSod = SOD_VIOLATIONS.filter((v) => v.status === 'Open')
    const critSod = openSod.filter((v) => v.severity === 'critical').length
    const openOrphans = ORPHANS.filter((o) => o.status === 'Open')
    const failedJobs = JOBS.filter((j) => j.status === 'Failed').length
    const dueCampaigns = CAMPAIGNS.filter((c) => c.status === 'Active' && c.dueIn <= 7).length
    const errors = LOGS.filter((l) => l.level === 'ERROR').length
    const work = pendingReq.length + CAMPAIGNS.filter((c) => c.status === 'Active').length

    return {
      approvals: { count: pendingReq.length, dot: breached ? 'crit' : 'warn', tone: breached ? 'alert' : null },
      work: { count: work, dot: breached ? 'crit' : 'warn' },
      sod: { count: openSod.length, dot: critSod ? 'crit' : 'warn', tone: critSod ? 'alert' : null },
      orphan: { count: openOrphans.length, dot: openOrphans.some((o) => o.risk === 'critical') ? 'crit' : 'warn' },
      jobs: { count: failedJobs, dot: failedJobs ? 'crit' : JOBS.some((j) => j.status === 'Running') ? 'live' : null, tone: failedJobs ? 'alert' : null },
      recert: { count: dueCampaigns, dot: dueCampaigns ? 'warn' : null },
      logs: { count: 0, dot: errors ? 'crit' : null },
      notifications: { count: NOTIFICATIONS.filter((n) => n.unread).length, dot: NOTIFICATIONS.some((n) => n.unread && n.severity === 'critical') ? 'crit' : null },
      provisioning: { count: 0, dot: APPLICATIONS.some((a) => a.status === 'Failed') ? 'crit' : null },
    }
  }, [])
}
