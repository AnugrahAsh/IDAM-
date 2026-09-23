import {
  APPLICATIONS, CAMPAIGNS, JOBS, LICENSE, ORPHANS, REQUESTS, SIGNIN_SERIES, SOD_VIOLATIONS, USERS,
} from '../../data/seed'
import { NOW_MS } from '../../lib/clock'
import { isDormant, isPrivileged, mfaOf } from '../users/posture'
import { BLOCKED_IPS, DETECTION_RULES, ITDR_ALERTS, isActiveBlock } from '../identityThreatDetection/itdrData'

/* ---------------------------------------------------------------------------
   The dashboard reads.

   Every figure here is derived from the same records the registers render —
   the same seed, the same posture rules the Users page applies, the same alert
   list Identity Threat Detection shows — so a number on the dashboard and the
   count on the page it links to can never disagree.
   ------------------------------------------------------------------------- */

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

/* The platform clock's hour decides the greeting, as it decides every time on
   the console. */
export const greetingFor = (d = new Date(NOW_MS)) => {
  const h = d.getUTCHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const longDate = (d = new Date(NOW_MS)) => d.toLocaleDateString('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
})

export const identityStats = () => {
  const human = USERS.filter((u) => u.employeeType !== 'Service Account')
  const statusCount = (s) => USERS.filter((u) => u.status === s).length
  const gaps = human.filter((u) => mfaOf(u).state === 'none')
  return {
    total: USERS.length,
    statuses: [
      { name: 'Active', value: statusCount('Active'), color: 'var(--st-good)' },
      { name: 'Pending', value: statusCount('Pending'), color: 'var(--s1)' },
      { name: 'Locked', value: statusCount('Locked'), color: 'var(--st-warn)' },
      { name: 'Disabled', value: statusCount('Disabled'), color: 'var(--st-crit)' },
    ],
    active: statusCount('Active'),
    locked: statusCount('Locked'),
    service: USERS.length - human.length,
    privileged: USERS.filter(isPrivileged).length,
    dormant: USERS.filter(isDormant).length,
    unowned: USERS.filter((u) => !u.manager).length,
    mfaPct: pct(human.length - gaps.length, human.length),
    mfaGaps: gaps.length,
    privilegedGaps: gaps.filter(isPrivileged).length,
  }
}

export const signinStats = () => {
  const success = SIGNIN_SERIES.reduce((a, p) => a + p.success, 0)
  const failed = SIGNIN_SERIES.reduce((a, p) => a + p.failed, 0)
  const blocked = SIGNIN_SERIES.reduce((a, p) => a + p.blocked, 0)
  const peak = SIGNIN_SERIES.reduce((m, p) => (p.success > m.success ? p : m), SIGNIN_SERIES[0])
  return {
    labels: SIGNIN_SERIES.map((p) => p.t),
    success: SIGNIN_SERIES.map((p) => p.success),
    failed: SIGNIN_SERIES.map((p) => p.failed),
    blockedSeries: SIGNIN_SERIES.map((p) => p.blocked),
    totals: { success, failed, blocked, attempts: success + failed + blocked },
    successRate: pct(success, success + failed + blocked),
    peak,
  }
}

export const requestStats = () => {
  const by = (s) => REQUESTS.filter((r) => r.status === s).length
  const pending = REQUESTS.filter((r) => r.status === 'Pending' || r.status === 'Escalated')
  return {
    total: REQUESTS.length,
    pending: pending.length,
    breached: pending.filter((r) => r.sla === 'breached').length,
    rows: [
      { name: 'Pending', value: by('Pending'), tone: 'warn' },
      { name: 'Escalated', value: by('Escalated'), tone: 'bad' },
      { name: 'Approved', value: by('Approved'), tone: 'ok' },
      { name: 'Rejected', value: by('Rejected'), tone: 'mut' },
    ],
  }
}

export const governanceStats = () => {
  const openSod = SOD_VIOLATIONS.filter((v) => v.status === 'Open')
  const openOrphans = ORPHANS.filter((o) => o.status === 'Open')
  const sevCount = (list, key, level) => list.filter((x) => x[key] === level).length
  return {
    sodOpen: openSod.length,
    sodBySeverity: ['critical', 'high', 'medium', 'low'].map((l) => ({ level: l, value: sevCount(openSod, 'severity', l) })),
    orphansOpen: openOrphans.length,
    orphansByRisk: ['critical', 'high', 'medium', 'low'].map((l) => ({ level: l, value: sevCount(openOrphans, 'risk', l) })),
    campaigns: CAMPAIGNS.filter((c) => c.status === 'Active').map((c) => ({
      id: c.id, name: c.name, progress: c.progress, dueIn: c.dueIn, revoked: c.revoked,
    })),
  }
}

export const threatStats = () => {
  const open = ITDR_ALERTS.filter((a) => a.status === 'Open')
  const bySeverity = ['critical', 'high', 'medium', 'low'].map((l) => ({ level: l, value: open.filter((a) => a.severity === l).length }))
  const perRule = DETECTION_RULES
    .map((r) => ({ id: r.id, name: r.name, value: ITDR_ALERTS.filter((a) => a.ruleId === r.id).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
  return {
    open: open.length,
    critical: open.filter((a) => a.severity === 'critical').length,
    bySeverity,
    perRule,
    blocked: BLOCKED_IPS.filter(isActiveBlock).length,
    latest: open[0],
  }
}

export const appStats = () => ({
  total: APPLICATIONS.length,
  degraded: APPLICATIONS.filter((a) => a.status !== 'Healthy'),
  accounts: APPLICATIONS.reduce((a, x) => a + (x.accounts || 0), 0),
  rows: APPLICATIONS,
})

export const jobStats = () => ({
  running: JOBS.filter((j) => j.status === 'Running').length,
  succeeded: JOBS.filter((j) => j.status === 'Succeeded').length,
  failed: JOBS.filter((j) => j.status === 'Failed').length,
  total: JOBS.length,
})

export const licenceStats = () => ({
  used: LICENSE.seatsUsed,
  seats: LICENSE.seats,
  utilization: pct(LICENSE.seatsUsed, LICENSE.seats),
  daysRemaining: LICENSE.daysRemaining,
  expires: LICENSE.expires,
  edition: LICENSE.edition,
})

/* ---------------------------------------------------------------------------
   Insights: the handful of findings an administrator should act on today,
   worst first. Each one names its evidence and links to the register that
   holds it.
   ------------------------------------------------------------------------- */
export const insights = () => {
  const id = identityStats()
  const th = threatStats()
  const gov = governanceStats()
  const apps = appStats()
  const req = requestStats()
  const lic = licenceStats()
  const out = []

  if (th.critical) {
    out.push({ tone: 'bad', icon: 'shieldAlert', to: '/iam/itdr/alerts', title: `${th.critical} critical ${th.critical === 1 ? 'threat is' : 'threats are'} open`, body: th.latest ? th.latest.evidence : 'Critical alerts are waiting on a responder.' })
  }
  if (id.privilegedGaps) {
    out.push({ tone: 'bad', icon: 'key', to: 'users', title: `${id.privilegedGaps} privileged ${id.privilegedGaps === 1 ? 'identity has' : 'identities have'} no second factor`, body: `${id.mfaGaps} identities in all are not enrolled in MFA — privileged ones first.` })
  }
  const critSod = gov.sodBySeverity.find((s) => s.level === 'critical').value
  if (gov.sodOpen) {
    out.push({ tone: critSod ? 'bad' : 'warn', icon: 'sod', to: 'segregationofduties', title: `${gov.sodOpen} open segregation-of-duties ${gov.sodOpen === 1 ? 'conflict' : 'conflicts'}`, body: critSod ? `${critSod} at critical severity — identities holding both sides of a toxic combination.` : 'Identities holding both sides of a toxic combination.' })
  }
  if (req.breached) {
    out.push({ tone: 'warn', icon: 'approve', to: 'approvals', title: `${req.breached} access ${req.breached === 1 ? 'request has' : 'requests have'} breached SLA`, body: `${req.pending} requests are waiting on an approver.` })
  }
  if (apps.degraded.length) {
    out.push({ tone: 'warn', icon: 'provision', to: 'applications', title: `${apps.degraded.length} ${apps.degraded.length === 1 ? 'application is' : 'applications are'} degraded`, body: apps.degraded.map((a) => a.displayName).join(', ') })
  }
  const due = gov.campaigns.filter((c) => c.dueIn <= 7).sort((a, b) => a.dueIn - b.dueIn)[0]
  if (due) {
    out.push({ tone: 'info', icon: 'certify', to: 'recertification', title: `${due.name} closes in ${due.dueIn} ${due.dueIn === 1 ? 'day' : 'days'}`, body: `${due.progress}% of decisions made so far.` })
  }
  if (id.dormant) {
    out.push({ tone: 'info', icon: 'clock', to: 'users', title: `${id.dormant} dormant ${id.dormant === 1 ? 'identity' : 'identities'}`, body: 'No sign-in for 14 days or more — candidates for review or deactivation.' })
  }
  out.push({ tone: lic.utilization >= 90 ? 'warn' : 'ok', icon: 'license', to: 'licenses', title: `${lic.utilization}% of licensed seats in use`, body: `${lic.edition} licence, ${lic.daysRemaining} days remaining.` })
  return out
}
