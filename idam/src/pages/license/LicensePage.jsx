import './LicensePage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import Menu from '../../components/primitives/Menu'
import Meter from '../../components/primitives/Meter'
import Banner from '../../components/primitives/Banner'
import KeyValue from '../../components/primitives/KeyValue'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { num } from '../../lib/format'
import { APPLICATIONS, LICENCES, LICENSE, ORGANIZATIONS, USERS } from '../../data/seed'
import { RingGauge } from '../../components/viz/Charts'
import LicenseSkeleton from './LicenseSkeleton'

const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

const MODULE_MATRIX = [
  { area: 'Users', icon: 'user', bundle: 'Lifecycle', route: 'users' },
  { area: 'Organizations', icon: 'building', bundle: 'Lifecycle', route: 'organizations' },
  { area: 'Password Policy', icon: 'lock', bundle: 'Lifecycle', route: 'passwordPolicy' },
  { area: 'Configurations', icon: 'sliders', bundle: 'Lifecycle', route: 'configurations' },
  { area: 'Roles', icon: 'roles', bundle: 'RBAC', route: 'roles' },
  { area: 'Groups', icon: 'group', bundle: 'RBAC', route: 'groups' },
  { area: 'Approvals', icon: 'approve', bundle: 'RBAC', route: 'approvals' },
  { area: 'Access Requests', icon: 'request', bundle: 'RBAC', route: 'requests' },
  { area: 'Applications', icon: 'provision', bundle: 'Provisioning', route: 'applications' },
  { area: 'LDAP Directories', icon: 'directory', bundle: 'Provisioning', route: 'ldapapplications' },
  { area: 'Scheduler', icon: 'clock', bundle: 'Provisioning', route: 'schedulers' },
  { area: 'SSO Applications', icon: 'sso', bundle: 'Single Sign-On', route: 'ssoConfigurations' },
  { area: 'Multi-Factor Authentication', icon: 'shield', bundle: 'MFA', route: 'mfa' },
  { area: 'Recertification', icon: 'certify', bundle: 'Governance', route: 'recertification' },
  { area: 'Segregation of Duties', icon: 'sod', bundle: 'Governance', route: 'segregationofduties' },
  { area: 'Reports', icon: 'report', bundle: 'Reporting', route: 'reports' },
  { area: 'Logging', icon: 'logs', bundle: 'Reporting', route: 'syslogs' },
  { area: 'Consent Management', icon: 'consent', bundle: 'Consent', route: 'consent' },
  { area: 'Privileged Session Recording', icon: 'eye', bundle: 'Privileged Session Recording' },
  { area: 'Identity Analytics Pro', icon: 'trendUp', bundle: 'Identity Analytics Pro' },
  { area: 'Customer Identity', icon: 'users', bundle: 'Customer Identity' },
]

/* Entitlement is a property of the licence being read, not of the product, so
   an older licence lights up the modules it actually carried. */
const modulesFor = (lic) => MODULE_MATRIX.map((m) => ({ ...m, licensed: lic.modules.includes(m.bundle) }))

function LicenseUpload({ onSubmit, onCancel }) {
  const [file, setFile] = useState('')
  const [key, setKey] = useState('')

  return (
    <>
      <Banner tone="warn">
        Applying a license replaces the active entitlement immediately. If the new seat count is below current
        consumption, sign-in is blocked for identities beyond the licensed ceiling.
      </Banner>

      <div style={{ marginTop: 16 }}>
        <Field
          label="License file"
          required
          hint="Signed .lic bundle issued by Tanflow. Maximum 256 KB."
          htmlFor="lic-file"
        >
          <TextInput
            id="lic-file"
            type="file"
            accept=".lic,.json"
            onChange={(e) => setFile(e.target.value.split(/[\\/]/).pop())}
          />
        </Field>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field
          label="Activation key"
          hint="Optional. Required only for air-gapped tenants without outbound activation."
          htmlFor="lic-key"
        >
          <TextInput
            as="textarea"
            id="lic-key"
            className="mono"
            rows={4}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="TFLW-IDAM-ENT-0000-XXXX-0000"
          />
        </Field>
      </div>

      {file && (
        <div style={{ marginTop: 16 }}>
          <Banner tone="ok">Ready to apply <b>{file}</b>. The active license is archived before the replacement is written.</Banner>
        </div>
      )}

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="upload" disabled={!file} onClick={() => onSubmit(file)}>Apply license</Button>
      </div>
    </>
  )
}

export default function LicensePage() {
  /* Which licence the page is being read as of. A renewal replaces a licence
     rather than editing it, so the superseded ones are still answerable
     questions — what were we entitled to, and for how many seats. */
  const [licKey, setLicKey] = useState(LICENCES[0].key)
  const [licMenu, setLicMenu] = useState(null)
  const lic = LICENCES.find((l) => l.key === licKey) || LICENSE
  const current = lic.key === LICENCES[0].key
  const modules = useMemo(() => modulesFor(lic), [lic])
  const { toast, setDrawer, navigate } = useApp()

  const available = lic.seats - lic.seatsUsed
  const utilization = Math.round((lic.seatsUsed / lic.seats) * 100)
  const expiring = lic.daysRemaining < 60

  /* One flag for the page, keyed on the licence being read. Every figure on
     screen is read off the same licence file, so they arrive together —
     picking a superseded licence from the menu fetches that file and the whole
     page settles again, which is what choosing it means. */
  const loading = useLoading(licKey)

  const totalDays = Math.round(
    (Date.parse(lic.expires) - Date.parse(lic.issued)) / 86400000,
  )
  const elapsed = totalDays - lic.daysRemaining

  const modulesLicensed = modules.filter((m) => m.licensed)
  const modulesUnlicensed = modules.filter((m) => !m.licensed)

  // Entitlement lines, each measured against what the licence actually permits.
  const consumption = [
    {
      k: 'Identity seats',
      sub: 'Named identities that may authenticate',
      used: lic.seatsUsed,
      cap: lic.seats,
      unit: 'seats',
    },
    {
      k: 'Licensed modules',
      sub: 'Feature areas enabled by this edition',
      used: modulesLicensed.length,
      cap: modules.length,
      unit: 'modules',
    },
    {
      k: 'Organizations',
      sub: 'Tenant scoping boundaries in use',
      used: ORGANIZATIONS.length,
      cap: 25,
      unit: 'organizations',
    },
    {
      k: 'Connected applications',
      sub: 'Provisioning and federation targets',
      used: APPLICATIONS.length,
      cap: 50,
      unit: 'applications',
    },
  ].map((r) => ({ ...r, pct: Math.round((r.used / r.cap) * 100) }))

  // Deterministic host fingerprints — never Math.random() in render.
  const machines = useMemo(() => {
    const hex = (seed) => {
      let s = seed
      let out = ''
      for (let i = 0; i < 64; i++) {
        s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
        out += ((s >>> 16) & 15).toString(16)
      }
      return out
    }
    return [
      { id: 1, name: 'idam-prod-01', role: 'Primary node', fingerprint: hex(8842) },
      { id: 2, name: 'idam-prod-02', role: 'Failover node', fingerprint: hex(9137) },
    ]
  }, [])

  const timeline = [
    { k: 'Order created', d: '2025-12-04', s: 'Licence order raised with Tanflow', tone: 'ok', icon: 'check' },
    { k: 'Issued & activated', d: lic.issued, s: `${lic.edition} entitlements applied`, tone: 'ok', icon: 'check' },
    // Read from the same clock as daysRemaining — the two used to be computed
    // from different dates and disagreed by a fortnight on the same screen.
    { k: 'Today', d: lic.today, s: `${num(lic.daysRemaining)} days of validity remaining`, tone: 'acc', icon: 'clock' },
    { k: 'Validity ends', d: lic.expires, s: 'Renew or install a refreshed licence file', tone: 'warn', icon: 'warn' },
  ]

  const openUpload = () => {
    setDrawer({
      title: 'Upload license',
      sub: `Replacing ${lic.key}`,
      children: (
        <LicenseUpload
          onCancel={() => setDrawer(null)}
          onSubmit={(file) => {
            setDrawer(null)
            toast('ok', 'License applied', `${file} activated. Entitlements refresh within one minute.`)
          }}
        />
      ),
    })
  }

  if (loading) return <LicenseSkeleton banner={!current || expiring} />

  return (
    <>
      <PageBar
        title="License"
        crumbs={[{ label: 'License' }]}
        sub="Subscription health, entitlement consumption, feature entitlements and registered machines for this installation."
        actions={
          <>
            {/* Every licence this installation has held, current first. It was
                a static chip naming the one in force, which is the only one
                that never needs looking up — the superseded ones are what an
                audit question is actually about. */}
            <button
              type="button"
              className="lic-pick"
              aria-haspopup="menu"
              aria-expanded={!!licMenu}
              onClick={(e) => setLicMenu({
                anchor: e.currentTarget,
                items: LICENCES.map((l) => ({
                  id: l.key,
                  label: (
                    <span className="lic-opt" data-on={l.key === licKey || undefined}>
                      <span className="lic-dot" data-state={l.status.toLowerCase()} />
                      <span className="lic-opt-m">
                        <span className="lic-opt-k mono">{l.key}</span>
                        <span className="lic-opt-s">
                          {l.edition} · {l.issued} to {l.expires}
                        </span>
                      </span>
                      <span className="lic-opt-st" data-state={l.status.toLowerCase()}>{l.status}</span>
                    </span>
                  ),
                  onSelect: () => setLicKey(l.key),
                })),
              })}
            >
              <span className="lic-dot" data-state={lic.status.toLowerCase()} />
              <span className="mono">{lic.key}</span>
              <span className="lic-pick-st">({lic.status})</span>
              <Icon name="chevD" size={12} />
            </button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'The licence report is being prepared as a signed PDF.')}>
              Export report
            </Button>
            <Button icon="upload" onClick={openUpload}>Upload license</Button>
            <Button variant="pri" icon="refresh" onClick={() => toast('info', 'Renewal started', 'Your account team has been notified to prepare a renewal quote.')}>
              Start renewal
            </Button>
          </>
        }
      />

      {!current && (
        <Banner tone="info">
          You are reading <b className="mono">{lic.key}</b>, a superseded licence. Its entitlements and seat count
          are shown as they stood; nothing on this page can be changed while a past licence is selected.
          {' '}
          <button type="button" className="link" onClick={() => setLicKey(LICENCES[0].key)}>
            Back to the licence in force<Icon name="chevR" size={10} />
          </button>
        </Banner>
      )}

      {current && expiring && (
        <Banner tone="warn" style={{ marginBottom: 10 }}>
          This licence expires in {lic.daysRemaining} days. Install a refreshed licence file before {lic.expires} to avoid sign-in disruption.
        </Banner>
      )}

      <div className="kpi-row cols-5">
        <div className="kpi">
          <span className="k-label"><Icon name="shield" size={12} />License status</span>
          <span className="k-val">{lic.status}</span>
          <span className="k-foot mono">{lic.key}</span>
        </div>
        <div className="kpi">
          <span className="k-label"><Icon name="clock" size={12} />Validity remaining</span>
          <span className="k-val num">{num(lic.daysRemaining)}<span className="k-unit">of {num(totalDays)} days</span></span>
          <span className="k-foot">Ends {lic.expires}</span>
        </div>
        <div className="kpi">
          <span className="k-label"><Icon name="users" size={12} />Identity seats</span>
          <span className="k-val num">{num(lic.seatsUsed)}<span className="k-unit">/ {num(lic.seats)}</span></span>
          <span className="k-foot">{utilization}% of entitlement</span>
        </div>
        <div className="kpi">
          <span className="k-label"><Icon name="layers" size={12} />Licensed modules</span>
          <span className="k-val num">{modulesLicensed.length}<span className="k-unit">/ {modules.length}</span></span>
          <span className="k-foot">{modulesUnlicensed.length} available as add-ons</span>
        </div>
        <div className="kpi">
          <span className="k-label"><Icon name="building" size={12} />Organizations</span>
          <span className="k-val num">{ORGANIZATIONS.length}<span className="k-unit">/ 25</span></span>
          <span className="k-foot">Tenant scopes in use</span>
        </div>
      </div>

      <div className="lic-cols" style={{ marginTop: 10 }}>
        {/* ---- Left rail: the licence record itself ---- */}
        <div className="stack">
          <Card>
            <div className="lic-id">
              <div className="row" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Pill tone={expiring ? 'warn' : 'ok'} dot>{lic.status}</Pill>
                <Tag tone="acc">{lic.edition}</Tag>
                <Tag>Subscription</Tag>
              </div>

              <div className="lic-ring">
                <RingGauge
                  pct={(lic.daysRemaining / totalDays) * 100}
                  size={148}
                  color={expiring ? 'var(--warn-core)' : 'var(--ok)'}
                  track={expiring ? 'var(--warn-bg)' : 'var(--ok-bg)'}
                  label={num(lic.daysRemaining)}
                  cap={`of ${num(totalDays)} days left`}
                />
              </div>

              <div className="lic-key mono">{lic.key}</div>

              <div className="row" style={{ gap: 7, justifyContent: 'center', marginTop: 12 }}>
                <Button icon="shield" onClick={() => toast('ok', 'License valid', `Signature verified. ${num(lic.daysRemaining)} days remaining.`)}>
                  Validate now
                </Button>
                <Button icon="report" onClick={() => toast('info', 'Usage matrix', 'Per-module consumption is being compiled.')}>
                  Usage matrix
                </Button>
              </div>
            </div>

            <div className="lic-sec">License</div>
            <KeyValue
              cols={1}
              rows={[
                { k: 'License ID', v: lic.key },
                { k: 'Product', v: lic.product },
                { k: 'Plan', v: lic.edition },
                { k: 'Type', v: 'Subscription' },
              ]}
            />

            <div className="lic-sec">Licensee</div>
            <KeyValue
              cols={1}
              rows={[
                { k: 'Organization', v: lic.licensedTo },
                { k: 'Tenant', v: 'tanflow-prod' },
                { k: 'Identities on record', v: `${num(USERS.length)} directory identities` },
              ]}
            />

            {/* Who the licence is actually issued to. An auditor checking the
                contract needs the named signatory, not just the tenant. */}
            <div className="lic-sec">Licensee contact</div>
            <KeyValue
              cols={1}
              rows={[
                { k: 'Client name', v: lic.contact.clientName },
                { k: 'Designation', v: lic.contact.designation },
                { k: 'Phone number', v: <span className="mono">{lic.contact.phone}</span> },
                { k: 'Email address', v: <span className="mono">{lic.contact.email}</span> },
                { k: 'Organization address', v: lic.contact.address },
                { k: 'Organization GSTIN', v: <span className="mono">{lic.contact.gstin}</span> },
              ]}
            />

            <div className="lic-sec">Term</div>
            <KeyValue
              cols={1}
              rows={[
                { k: 'Issued & activated', v: lic.issued },
                { k: 'Validity ends', v: `${lic.expires} · ${num(lic.daysRemaining)} days` },
                { k: 'Term length', v: `${num(totalDays)} days` },
                { k: 'Elapsed', v: `${num(elapsed)} days` },
              ]}
            />
          </Card>

          <Card title="Contract timeline" sub="Milestones across this licence's term">
            <div className="tl">
              {timeline.map((t) => (
                <div className="tl-it" key={t.k} data-tone={t.tone}>
                  <span className="tl-dot"><Icon name={t.icon} size={8} stroke={3} /></span>
                  <div className="row-between" style={{ gap: 10 }}>
                    <div className="tl-t">{t.k}</div>
                    <div className="tl-time">{t.d}</div>
                  </div>
                  <div className="tl-s">{t.s}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ---- Right: consumption, capabilities, machines ---- */}
        <div className="stack">
          <Card title="Entitlement consumption" sub="Live counts — updated as identities, modules and applications change">
            <div className="stack" style={{ gap: 0 }}>
              {consumption.map((r) => (
                <div className="lic-cons" key={r.k}>
                  <div className="lic-cons-meta">
                    <div className="lic-cons-k">{r.k}</div>
                    <div className="t-xs t-mut">{r.sub}</div>
                  </div>
                  <div className="lic-cons-bar">
                    <Meter value={r.pct} tone={r.pct >= 90 ? 'bad' : r.pct >= 75 ? 'warn' : 'ok'} />
                    <div className="t-xs t-mut" style={{ marginTop: 5 }}>
                      {num(r.cap - r.used)} of {num(r.cap)} {r.unit} still available
                    </div>
                  </div>
                  <div className="lic-cons-val">
                    <div><b className="num">{num(r.used)}</b><span className="t-mut num"> / {num(r.cap)}</span></div>
                    <div className="t-xs t-mut">{r.pct}% consumed</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Feature entitlements"
            sub="Capabilities enforced at runtime for this licence"
            actions={<Tag tone="acc">Current: {lic.edition}</Tag>}
            flush
          >
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>Bundle</th>
                    <th style={{ width: 130, textAlign: 'right' }}>{lic.edition}</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => (
                    <tr
                      key={m.area}
                      onClick={() => m.licensed && m.route && navigate(m.route)}
                      style={{ cursor: m.licensed && m.route ? 'pointer' : 'default' }}
                    >
                      <td className="td-main">
                        <span className="cell-id"><Icon name={m.icon} size={14} />{m.area}</span>
                      </td>
                      <td className="t-mut">{m.bundle}</td>
                      <td style={{ textAlign: 'right' }}>
                        {m.licensed
                          ? <Icon name="check" size={15} stroke={2.6} style={{ color: 'var(--ok)' }} />
                          : <span className="t-faint t-xs">Not licensed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-f">
              <Icon name="shield" size={13} />
              Entitlements are enforced at runtime from the installed licence file.
            </div>
          </Card>

          <Card title="Registered machines" sub="Host fingerprints authorized to run this licence" flush>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Role</th>
                    <th>Fingerprint · SHA-256</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m, i) => (
                    <tr key={m.id}>
                      <td className="td-main">
                        <span className="cell-id"><Icon name="server" size={14} />{m.name}<Tag>#{i + 1}</Tag></span>
                      </td>
                      <td className="t-mut">{m.role}</td>
                      <td className="td-mono trunc">{m.fingerprint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-f">{machines.length} machines registered on this licence</div>
          </Card>
        </div>
      </div>

      {licMenu && <Menu {...licMenu} onClose={() => setLicMenu(null)} />}
    </>
  )
}
