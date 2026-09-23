import { useMemo } from 'react'
import { APPLICATIONS, JOBS, LOGS, ORPHANS, REQUESTS, SOD_VIOLATIONS, CAMPAIGNS } from '../data/seed'
import { useRead } from '../pages/notificationCenter/readStore'
import { usePublishedAnnouncements } from '../pages/notificationCenter/announcementStore'
import { unreadOf } from '../pages/notificationCenter/inboxModel'
import { ITDR_ALERTS } from '../pages/identityThreatDetection/itdrData'
import { FEDERATIONS } from '../pages/externalUserFederation/federationSeed'

export function useBadges() {
  // Read state is the operator's, not the seed's: marking everything read has
  // to clear the navigation badge, so the badge is derived from it.
  const read = useRead()
  const announcements = usePublishedAnnouncements()
  return useMemo(() => {
    const pendingReq = REQUESTS.filter((r) => r.status === 'Pending' || r.status === 'Escalated')
    const breached = pendingReq.filter((r) => r.sla === 'breached').length
    const openSod = SOD_VIOLATIONS.filter((v) => v.status === 'Open')
    const critSod = openSod.filter((v) => v.severity === 'critical').length
    const openOrphans = ORPHANS.filter((o) => o.status === 'Open')
    const failedJobs = JOBS.filter((j) => j.status === 'Failed').length
    const dueCampaigns = CAMPAIGNS.filter((c) => c.status === 'Active' && c.dueIn <= 7).length
    const errors = LOGS.filter((l) => l.level === 'ERROR').length
    const openThreats = ITDR_ALERTS.filter((a) => a.status === 'Open')
    const critThreat = openThreats.some((a) => a.severity === 'critical')
    const work = pendingReq.length + CAMPAIGNS.filter((c) => c.status === 'Active').length

    return {
      approvals: { count: pendingReq.length, dot: breached ? 'crit' : 'warn', tone: breached ? 'alert' : null },
      work: { count: work, dot: breached ? 'crit' : 'warn' },
      sod: { count: openSod.length, dot: critSod ? 'crit' : 'warn', tone: critSod ? 'alert' : null },
      orphan: { count: openOrphans.length, dot: openOrphans.some((o) => o.risk === 'critical') ? 'crit' : 'warn' },
      jobs: { count: failedJobs, dot: failedJobs ? 'crit' : JOBS.some((j) => j.status === 'Running') ? 'live' : null, tone: failedJobs ? 'alert' : null },
      recert: { count: dueCampaigns, dot: dueCampaigns ? 'warn' : null },
      logs: { count: 0, dot: errors ? 'crit' : null },
      itdr: { count: openThreats.length, dot: critThreat ? 'crit' : openThreats.length ? 'warn' : null, tone: critThreat ? 'alert' : null },
      notifications: (() => {
        // Counted from the same composition the register renders, so the badge,
        // the bell and the UNREAD tile always agree.
        const unread = unreadOf(announcements, read)
        return {
          count: unread.length,
          dot: unread.some((n) => n.severity === 'critical') ? 'crit' : null,
        }
      })(),
      provisioning: { count: 0, dot: APPLICATIONS.some((a) => a.status === 'Failed') ? 'crit' : null },
      federation: { count: 0, dot: FEDERATIONS.some((f) => f.status === 'Failed') ? 'crit' : FEDERATIONS.some((f) => f.status === 'Degraded') ? 'warn' : null },
    }
  }, [read, announcements])
}
