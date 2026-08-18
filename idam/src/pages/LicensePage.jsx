import './styles/LicensePage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import IconButton from '../components/primitives/IconButton'
import Icon from '../components/primitives/Icon'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Tabs from '../components/primitives/Tabs'
import Meter from '../components/primitives/Meter'
import Banner from '../components/primitives/Banner'
import KeyValue from '../components/primitives/KeyValue'
import Field from '../components/primitives/Field'
import TextInput from '../components/primitives/TextInput'
import StatChip from '../components/primitives/StatChip'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { LICENSE, ORGANIZATIONS } from '../data/seed'

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
  { area: 'MFA', icon: 'shield', bundle: 'MFA', route: 'mfa' },
  { area: 'Recertification', icon: 'certify', bundle: 'Governance', route: 'recertification' },
  { area: 'Segregation of Duties', icon: 'sod', bundle: 'Governance', route: 'segregationofduties' },
  { area: 'Reports', icon: 'report', bundle: 'Reporting', route: 'reports' },
  { area: 'Logging', icon: 'logs', bundle: 'Reporting', route: 'syslogs' },
  { area: 'Consent Management', icon: 'consent', bundle: 'Consent', route: 'consent' },
  { area: 'Privileged Session Recording', icon: 'eye', bundle: 'Privileged Session Recording' },
  { area: 'Identity Analytics Pro', icon: 'trendUp', bundle: 'Identity Analytics Pro' },
  { area: 'Customer Identity', icon: 'users', bundle: 'Customer Identity' },
].map((m) => ({ ...m, licensed: LICENSE.modules.includes(m.bundle) }))

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
  const { toast, setDrawer, navigate } = useApp()
  const [tab, setTab] = useState('entitlement')

  const available = LICENSE.seats - LICENSE.seatsUsed
  const utilization = Math.round((LICENSE.seatsUsed / LICENSE.seats) * 100)
  const expiring = LICENSE.daysRemaining < 60

  const trend = useMemo(() => MONTHS.map((t, i) => ({
    t,
    seats: i === MONTHS.length - 1
      ? LICENSE.seatsUsed
      : Math.round(LICENSE.seatsUsed - (MONTHS.length - 1 - i) * 58 + ((i * 37) % 41) - 20),
    licensed: LICENSE.seats,
  })), [])

  const growth = trend[trend.length - 1].seats - trend[0].seats
  const monthly = Math.round(growth / (MONTHS.length - 1))
  const runway = monthly > 0 ? Math.floor(available / monthly) : null

  const allocation = useMemo(() => [...ORGANIZATIONS]
    .sort((a, b) => b.users - a.users)
    .map((o) => ({ label: o.name, value: o.users, color: o.status === 'Disabled' ? 'var(--s6)' : 'var(--s1)', id: o.id })), [])

  const modulesLicensed = MODULE_MATRIX.filter((m) => m.licensed)
  const modulesUnlicensed = MODULE_MATRIX.filter((m) => !m.licensed)

  const openUpload = () => {
    setDrawer({
      title: 'Upload license',
      sub: `Replacing ${LICENSE.key}`,
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

  return (
    <>
      <PageBar
        title="License"
        sub="Entitlement, module coverage and seat consumption for this tenant. Seats are counted as enabled, non-service identities."
        badge={<Pill tone={expiring ? 'bad' : 'ok'} dot>{LICENSE.edition}</Pill>}
        actions={
          <>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Consumption statement is being generated.')}>Consumption statement</Button>
            <Button icon="copy" onClick={() => toast('ok', 'Copied', 'License key copied to the clipboard.')}>Copy key</Button>
            <Button variant="pri" icon="upload" onClick={openUpload}>Upload license</Button>
          </>
        }
        rail={
          <>
            <StatChip icon="license">{LICENSE.product}</StatChip>
            <StatChip icon="building">{LICENSE.licensedTo}</StatChip>
            <StatChip icon="calendar">Expires {LICENSE.expires}</StatChip>
            <StatChip icon="layers">{LICENSE.modules.length} bundle modules</StatChip>
            <StatChip icon="columns">{modulesLicensed.length} of {MODULE_MATRIX.length} areas licensed</StatChip>
          </>
        }
      />

      <div className="stack">
        <div className="stat-strip">
          <div className="stat-cell">
            <span className="stat-k"><Icon name="license" size={11} />Seats licensed</span>
            <span className="stat-v">{num(LICENSE.seats)}</span>
          </div>
          <div className="stat-cell" data-nav="true" onClick={() => navigate('users')}>
            <span className="stat-k"><Icon name="users" size={11} />Seats used</span>
            <span className="stat-v">{num(LICENSE.seatsUsed)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k"><Icon name="plus" size={11} />Seats available</span>
            <span className="stat-v">{num(available)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-k"><Icon name="clock" size={11} />Days remaining</span>
            <span className="stat-v" style={expiring ? { color: 'var(--bad)' } : undefined}>{num(LICENSE.daysRemaining)}</span>
          </div>
        </div>

        {expiring && (
          <Banner tone="bad">
            This license expires in <b>{LICENSE.daysRemaining} days</b> on {LICENSE.expires}. Provisioning and
            single sign-on stop at expiry. Contact your account team to issue a renewal bundle.
          </Banner>
        )}

        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'entitlement', label: 'Entitlement', icon: 'license' },
            { id: 'analytics', label: 'Seat analytics', icon: 'report' },
          ]}
        />

        {tab === 'entitlement' && (
          <div className="grid grid-hero">
            <Card
              title="License record"
              sub="Issued entitlement as presented by the signed bundle"
              actions={<Button size="sm" icon="upload" onClick={openUpload}>Replace</Button>}
              footer={
                <>
                  <Icon name="shield" size={12} />
                  <span>Signature verified against the Tanflow issuing authority on every start-up.</span>
                </>
              }
            >
              <div style={{ marginBottom: 18 }}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="t-xs t-mut">Seat utilization</span>
                  <span className="t-sm num" style={{ fontWeight: 600 }}>
                    {num(LICENSE.seatsUsed)} / {num(LICENSE.seats)} · {utilization}%
                  </span>
                </div>
                <Meter value={utilization} height={10} tone={utilization >= 95 ? 'bad' : utilization >= 85 ? 'warn' : 'ok'} />
                <div className="t-xs t-mut" style={{ marginTop: 6 }}>
                  {num(available)} seats remain.
                  {runway != null && ` At the current rate of ${num(monthly)} seats per month that is roughly ${runway} months of headroom.`}
                </div>
              </div>

              <KeyValue
                rows={[
                  { k: 'Product', v: LICENSE.product, icon: 'license' },
                  { k: 'Edition', v: LICENSE.edition, icon: 'star' },
                  { k: 'Licensed to', v: LICENSE.licensedTo, icon: 'building' },
                  {
                    k: 'License key',
                    icon: 'key',
                    node: (
                      <span className="row" style={{ gap: 6 }}>
                        <span className="mono t-xs">{LICENSE.key}</span>
                        <IconButton icon="copy" size="sm" label="Copy license key" onClick={() => toast('ok', 'Copied', 'License key copied to the clipboard.')} />
                      </span>
                    ),
                  },
                  { k: 'Issued', v: LICENSE.issued, icon: 'history' },
                  { k: 'Expires', v: LICENSE.expires, icon: 'calendar' },
                  { k: 'Seats licensed', v: num(LICENSE.seats), icon: 'users' },
                  { k: 'Seats consumed', v: `${num(LICENSE.seatsUsed)} (${utilization}%)`, icon: 'target' },
                ]}
              />
            </Card>

            <Card
              title="Modules matrix"
              sub={`${LICENSE.modules.length} bundle modules unlock ${modulesLicensed.length} of ${MODULE_MATRIX.length} product areas`}
              actions={<Pill tone="ok" dot>{modulesLicensed.length} enabled</Pill>}
              flush
              footer={
                <>
                  <Icon name="info" size={12} />
                  <span>Areas outside the bundle are hidden from navigation for every administrator. Adding a module reissues the bundle; seats and expiry are preserved.</span>
                </>
              }
            >
              <div className="row licmatrix-bundles">
                {LICENSE.modules.map((m) => (
                  <Tag key={m} tone="acc">{m}</Tag>
                ))}
              </div>

              <div className="licmatrix">
                {MODULE_MATRIX.map((m) => (
                  <div
                    className="licmatrix-cell"
                    key={m.area}
                    data-off={!m.licensed || undefined}
                    data-nav={(m.licensed && m.route) || undefined}
                    role={m.licensed && m.route ? 'button' : undefined}
                    tabIndex={m.licensed && m.route ? 0 : undefined}
                    onClick={m.licensed && m.route ? () => navigate(m.route) : undefined}
                    onKeyDown={m.licensed && m.route ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(m.route) } } : undefined}
                  >
                    <span className="licmatrix-top">
                      <span className="feed-ic" data-tone={m.licensed ? 'acc' : 'mut'}>
                        <Icon name={m.icon} size={13} />
                      </span>
                      {m.licensed
                        ? <Pill tone="ok" dot>Enabled</Pill>
                        : <Pill tone="mut">Not licensed</Pill>}
                    </span>
                    <span className="licmatrix-name">{m.area}</span>
                    <span className="licmatrix-sub">{m.bundle}{m.licensed ? ' module' : ' · add-on'}</span>
                  </div>
                ))}
              </div>

              <div className="licmatrix-note">
                <Banner tone="info">
                  {modulesUnlicensed.length} add-on {modulesUnlicensed.length === 1 ? 'area is' : 'areas are'} not in the {LICENSE.edition} bundle.
                  {' '}Contact your account team to extend the entitlement.
                </Banner>
              </div>
            </Card>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="grid grid-hero">
            <Card
              title="Consumption"
              sub="Seats consumed against the licensed ceiling, last 12 months"
            >
              <div className="stat-strip">
                <div className="stat-cell">
                  <span className="stat-k">Net growth</span>
                  <span className="stat-v">+{num(growth)}</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k">Average per month</span>
                  <span className="stat-v">+{num(monthly)}</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-k">Headroom</span>
                  <span className="stat-v">{runway != null ? `${runway} mo` : '—'}</span>
                </div>
              </div>
            </Card>

            <Card
              title="Seat allocation"
              sub="Consumed seats by organization"
              actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('organizations')}>Organizations</Button>}
            >
              <div>
                <Banner tone="info">
                  Disabled organizations continue to consume seats until their identities are deprovisioned.
                </Banner>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
