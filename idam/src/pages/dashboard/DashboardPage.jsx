import './DashboardPage.css'
import { useMemo } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Meter from '../../components/primitives/Meter'
import AppLogo from '../../components/primitives/AppLogo'
import { AreaChart, BarChart, RingGauge, SegBar, Sparkline } from '../../components/viz/Charts'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { ME } from '../../data/seed'
import { brandFor } from '../shared/provisioning/shared'
import DashboardSkeleton from './DashboardSkeleton'
import {
  appStats, governanceStats, greetingFor, identityStats, insights, jobStats, licenceStats, longDate,
  requestStats, signinStats, threatStats,
} from './dashboardData'

const SEV_TONE = { critical: 'bad', high: 'bad', medium: 'warn', low: undefined }
const SEV_COLOR = { critical: 'var(--sev-crit)', high: 'var(--sev-high)', medium: 'var(--warn-core)', low: 'var(--sev-low)' }
const SEV_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
const APP_TONE = { Healthy: 'ok', Degraded: 'warn', Failed: 'bad' }

/* One headline figure. The tile is a button because every figure on the
   dashboard is a door onto the register that holds it. */
function Tile({ icon, tone, label, value, unit, foot, spark, onClick }) {
  return (
    <button type="button" className="dash-tile" onClick={onClick}>
      <span className="dash-tile-ic" data-tone={tone}><Icon name={icon} size={17} /></span>
      <span className="dash-tile-m">
        <span className="dash-tile-v num">
          {value}
          {unit && <span className="dash-tile-u">{unit}</span>}
        </span>
        <span className="dash-tile-k">{label}</span>
        {foot && <span className="dash-tile-s trunc">{foot}</span>}
      </span>
      {spark && <span className="dash-tile-spark">{spark}</span>}
    </button>
  )
}

function MeterRow({ label, value, max, tone, display }) {
  return (
    <div className="meter-row">
      <span className="m-label" title={label}>{label}</span>
      <Meter value={max ? (value / max) * 100 : 0} tone={tone} />
      <span className="m-val">{display != null ? display : num(value)}</span>
    </div>
  )
}

function Legend({ items }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span className="lg-it" key={it.name}>
          <span className="lg-sw" style={{ background: it.color }} />
          {it.name}
          {it.value != null && <b className="num">{num(it.value)}</b>}
        </span>
      ))}
    </div>
  )
}

/**
 * The IAM dashboard.
 *
 * The administrator's first screen: how the directory stands today, what the
 * sign-in stream looks like, and the handful of findings worth acting on. It
 * holds no data of its own — every figure is read from the registers it links
 * to, so it can never tell a different story from the page behind it.
 */
export default function DashboardPage() {
  const { navigate } = useApp()
  /* The dashboard is the console's first screen and every figure on it comes
     from a different register, so it is the screen where arriving at a page
     that is already complete reads as a flicker. One flag for the whole thing:
     masthead, tiles and every chart resolve on the same tick, because a page
     whose panels each appeared as they were ready would settle in pieces. */
  const loading = useLoading()
  const data = useMemo(() => ({
    id: identityStats(),
    sig: signinStats(),
    req: requestStats(),
    gov: governanceStats(),
    th: threatStats(),
    apps: appStats(),
    jobs: jobStats(),
    lic: licenceStats(),
    findings: insights(),
  }), [])
  const { id, sig, req, gov, th, apps, jobs, lic, findings } = data

  const sodMax = Math.max(1, ...gov.sodBySeverity.map((s) => s.value))
  const orphanMax = Math.max(1, ...gov.orphansByRisk.map((s) => s.value))
  const reqMax = Math.max(1, ...req.rows.map((r) => r.value))
  const ruleMax = Math.max(1, ...th.perRule.map((r) => r.value))

  if (loading) return <DashboardSkeleton />

  return (
    <>
      <PageBar
        title={`${greetingFor()}, ${ME.firstName}`}
        sub={`${longDate()} · Last sign-in ${ME.lastLogin}`}
        crumbs={[{ label: 'Dashboard' }]}
        actions={(
          <>
            <Button icon="approve" onClick={() => navigate('approvals')}>
              Approvals<span className="dash-count num">{req.pending}</span>
            </Button>
            <Button icon="request" onClick={() => navigate('requests')}>Access Requests</Button>
            <Button icon="report" onClick={() => navigate('reports')}>Reports</Button>
          </>
        )}
      />

      <section className="dash-tiles" aria-label="Key figures">
        <Tile
          icon="users" tone="viol" label="Identities" value={num(id.total)}
          foot={`${num(id.active)} active · ${num(id.locked)} locked`}
          onClick={() => navigate('users')}
        />
        <Tile
          icon="activity" tone="ok" label="Sign-ins today" value={num(sig.totals.success)}
          foot={`${sig.successRate}% successful · ${num(sig.totals.failed)} failed`}
          spark={<Sparkline data={sig.success} w={240} h={34} color="var(--s2)" stretch />}
          onClick={() => navigate('reports')}
        />
        <Tile
          icon="approve" tone="warn" label="Pending approvals" value={num(req.pending)}
          foot={req.breached ? `${req.breached} past SLA` : 'all within SLA'}
          onClick={() => navigate('approvals')}
        />
        <Tile
          icon="shield" tone="info" label="MFA coverage" value={id.mfaPct} unit="%"
          foot={`${id.mfaGaps} ${id.mfaGaps === 1 ? 'identity' : 'identities'} without a factor`}
          onClick={() => navigate('users')}
        />
        <Tile
          icon="shieldAlert" tone="bad" label="Open threats" value={num(th.open)}
          foot={`${th.critical} critical · ${th.blocked} IPs blocked`}
          onClick={() => navigate('/iam/itdr/alerts')}
        />
        <Tile
          icon="provision" tone="teal" label="Applications" value={num(apps.total)}
          foot={apps.degraded.length ? `${apps.degraded.length} degraded` : 'all healthy'}
          onClick={() => navigate('applications')}
        />
      </section>

      <div className="grid-23 dash-row">
        <Card
          title="Sign-in activity"
          sub={`Last 24 hours · peak ${num(sig.peak.success)} at ${sig.peak.t}`}
          actions={<Legend items={[{ name: 'Successful', color: 'var(--s2)' }, { name: 'Failed', color: 'var(--s6)' }]} />}
        >
          <div className="dash-figs">
            <div><span className="dash-fig-k">Attempts</span><span className="dash-fig-v num">{num(sig.totals.attempts)}</span></div>
            <div><span className="dash-fig-k">Successful</span><span className="dash-fig-v num">{num(sig.totals.success)}</span></div>
            <div><span className="dash-fig-k">Failed</span><span className="dash-fig-v num" style={{ color: 'var(--bad)' }}>{num(sig.totals.failed)}</span></div>
            <div><span className="dash-fig-k">Blocked</span><span className="dash-fig-v num">{num(sig.totals.blocked)}</span></div>
            <div><span className="dash-fig-k">Success rate</span><span className="dash-fig-v num">{sig.successRate}%</span></div>
          </div>
          <AreaChart
            labels={sig.labels}
            series={[{ name: 'Successful', data: sig.success, color: 'var(--s2)' }]}
            h={190}
            xEvery={3}
          />
          <div className="dash-sub-h">Failed attempts by hour</div>
          <BarChart labels={sig.labels} values={sig.failed} h={110} color="var(--s6)" xEvery={3} name="Failed" />
        </Card>

        <Card title="Identity posture" sub="How the directory stands today">
          <div className="dash-posture">
            <RingGauge pct={id.mfaPct} size={116} color="var(--accent)" cap="MFA coverage" />
            <div className="dash-posture-m">
              <span className="t-sm" style={{ fontWeight: 600 }}>{num(id.total)} identities</span>
              <SegBar segs={id.statuses} h={10} />
              <Legend items={id.statuses} />
            </div>
          </div>
          <div className="stack dash-meters">
            <MeterRow label="Privileged" value={id.privileged} max={id.total} tone="warn" />
            <MeterRow label="Dormant 14+ days" value={id.dormant} max={id.total} tone="warn" />
            <MeterRow label="No second factor" value={id.mfaGaps} max={id.total} tone="bad" />
            <MeterRow label="Service accounts" value={id.service} max={id.total} />
            <MeterRow label="No owner assigned" value={id.unowned} max={id.total} />
          </div>
        </Card>
      </div>

      <div className="grid-32 dash-row">
        <Card title="Insights" sub="What needs attention today, worst first" flush>
          <ul className="dash-insights">
            {findings.map((f) => (
              <li key={f.title}>
                <button type="button" className="dash-insight" onClick={() => navigate(f.to)}>
                  <span className="dash-insight-ic" data-tone={f.tone}><Icon name={f.icon} size={14} /></span>
                  <span className="dash-insight-m">
                    <span className="dash-insight-t">{f.title}</span>
                    <span className="dash-insight-b">{f.body}</span>
                  </span>
                  <Icon name="chevR" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Governance and risk" sub="Open findings across the control registers">
          <div className="dash-gov">
            <section>
              <div className="dash-sub-h">Segregation-of-duties conflicts · {num(gov.sodOpen)} open</div>
              <div className="stack">
                {gov.sodBySeverity.map((s) => (
                  <MeterRow key={s.level} label={SEV_LABEL[s.level]} value={s.value} max={sodMax} tone={SEV_TONE[s.level]} />
                ))}
              </div>
            </section>
            <section>
              <div className="dash-sub-h">Orphan accounts · {num(gov.orphansOpen)} open</div>
              <div className="stack">
                {gov.orphansByRisk.map((s) => (
                  <MeterRow key={s.level} label={SEV_LABEL[s.level]} value={s.value} max={orphanMax} tone={SEV_TONE[s.level]} />
                ))}
              </div>
            </section>
            <section>
              <div className="dash-sub-h">Access requests · {num(req.total)} this period</div>
              <div className="stack">
                {req.rows.map((r) => (
                  <MeterRow key={r.name} label={r.name} value={r.value} max={reqMax} tone={r.tone === 'mut' ? undefined : r.tone} />
                ))}
              </div>
            </section>
            <section>
              <div className="dash-sub-h">Recertification campaigns</div>
              <div className="stack">
                {gov.campaigns.map((c) => (
                  <MeterRow key={c.id} label={c.name} value={c.progress} max={100} tone={c.dueIn <= 3 ? 'warn' : 'ok'} display={`${c.progress}%`} />
                ))}
              </div>
            </section>
          </div>
        </Card>
      </div>

      <div className="dash-cols dash-row">
        <Card
          title="Threat detection"
          sub={`${num(th.open)} open alerts · ${num(th.blocked)} addresses blocked`}
          actions={<Button size="sm" icon="shieldAlert" onClick={() => navigate('/iam/itdr/alerts')}>Alerts</Button>}
        >
          <SegBar segs={th.bySeverity.filter((s) => s.value).map((s) => ({ name: SEV_LABEL[s.level], value: s.value, color: SEV_COLOR[s.level] }))} h={10} />
          <Legend items={th.bySeverity.filter((s) => s.value).map((s) => ({ name: SEV_LABEL[s.level], value: s.value, color: SEV_COLOR[s.level] }))} />
          <div className="dash-sub-h">Most active rules</div>
          <div className="stack">
            {th.perRule.map((r) => <MeterRow key={r.id} label={r.name} value={r.value} max={ruleMax} tone="bad" />)}
          </div>
        </Card>

        <Card
          title="Application health"
          sub={`${num(apps.accounts)} accounts across ${apps.total} applications`}
          actions={<Button size="sm" icon="provision" onClick={() => navigate('applications')}>Applications</Button>}
          flush
        >
          <ul className="dash-apps">
            {apps.rows.map((a) => (
              <li key={a.id}>
                <AppLogo brand={brandFor(a)} name={a.displayName} size={26} />
                <span className="dash-app-m">
                  <span className="trunc">{a.displayName}</span>
                  <span className="t-xs t-mut trunc">{a.method} · {num(a.accounts)} accounts</span>
                </span>
                <Pill tone={APP_TONE[a.status] || 'mut'} dot>{a.status}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Operations" sub="Background work and entitlement">
          <div className="dash-sub-h" style={{ marginTop: 0 }}>Background jobs · {num(jobs.total)} this cycle</div>
          <div className="dash-figs dash-figs-3">
            <div><span className="dash-fig-k">Running</span><span className="dash-fig-v num">{jobs.running}</span></div>
            <div><span className="dash-fig-k">Succeeded</span><span className="dash-fig-v num" style={{ color: 'var(--ok)' }}>{jobs.succeeded}</span></div>
            <div><span className="dash-fig-k">Failed</span><span className="dash-fig-v num" style={{ color: 'var(--bad)' }}>{jobs.failed}</span></div>
          </div>
          <div className="dash-sub-h">Licensed seats · {lic.edition}</div>
          <MeterRow label={`${num(lic.used)} of ${num(lic.seats)}`} value={lic.utilization} max={100} tone={lic.utilization >= 90 ? 'warn' : 'ok'} display={`${lic.utilization}%`} />
          <div className="t-xs t-mut dash-note">Renews {lic.expires} · {num(lic.daysRemaining)} days remaining</div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button size="sm" icon="jobs" onClick={() => navigate('jobs')}>Background Jobs</Button>
            <Button size="sm" icon="license" onClick={() => navigate('licenses')}>License</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
