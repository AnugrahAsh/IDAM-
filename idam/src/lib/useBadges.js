import { useMemo } from 'react'
import { APPLICATIONS, JOBS, LOGS, NOTIFICATIONS, ORPHANS, REQUESTS, SOD_VIOLATIONS, CAMPAIGNS } from '../data/seed'
import { useRead } from '../pages/notifications/readStore'

export function useBadges() {
  // Read state is the operator's, not the seed's: marking everything read has
  // to clear the navigation badge, so the badge is derived from it.
  const read = useRead()
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
      notifications: (() => {
        // The register numbers its rows from 1 in seed order; read state is
        // recorded against those ids.
        const unread = NOTIFICATIONS.filter((n, i) => n.unread && !read.has(String(i + 1)))
        return {
          count: unread.length,
          dot: unread.some((n) => n.severity === 'critical') ? 'crit' : null,
        }
      })(),
      provisioning: { count: 0, dot: APPLICATIONS.some((a) => a.status === 'Failed') ? 'crit' : null },
    }
  }, [read])
}
