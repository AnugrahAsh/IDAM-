import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import KeyValue from '../../components/primitives/KeyValue'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { dateText, since } from '../../lib/clock'
import './SettingsPage.css'
import Toggle from './Toggle'
import SectionFooter, { DirtyPill } from './SectionFooter'
import Branding from './sections/Branding'
import RedirectUris from './sections/RedirectUris'
import PasswordFlows from './sections/PasswordFlows'
import Regions from './sections/Regions'
import ApprovalLevels from './sections/ApprovalLevels'
import NotificationTaxonomy from './sections/NotificationTaxonomy'
import SodSeverities from './sections/SodSeverities'
import DateTime from './sections/DateTime'
import {
  DEFAULT_SETTINGS, TIME_UNITS_LINK, TIME_UNITS_OTP, changeMetaFor, recordChange, resetSettings,
  useSettings, writeSection,
} from './settingsStore'

const TIMEOUTS = ['15 minutes', '30 minutes', '60 minutes', '4 hours', '8 hours']
const WARNINGS = ['1 minute', '2 minutes', '5 minutes']
const CADENCES = ['Every hour', 'Every 6 hours', 'Every 12 hours', 'Daily at 01:00', 'Weekly']
const GRACE = ['Immediately', '3 days', '7 days', '30 days']
const ORPHAN_MODES = ['Report only', 'Suspend and notify owner', 'Suspend and revoke entitlements', 'Delete account']
const RECONSENT = ['On material change', 'Every 12 months', 'Every 24 months', 'Never automatically']

/**
 * The section rail. Thirteen sections, and a control only earns one when it is
 * more than a switch: username casing sits inside General, and the three
 * device and channel switches sit inside Security, because a rail entry per toggle
 * reads as busywork.
 *
 * SIEM transport is not here. It configures where security events are shipped,
 * so it sits on Security Events beside the register that decides which events
 * exist at all. Its value is still tenant configuration held in this store.
 */
const SECTION_META = [
  { id: 'datetime', icon: 'clock', label: 'Date & Time', desc: 'The application timezone, and how dates and times are rendered and exported.' },
  { id: 'branding', icon: 'building', label: 'Branding', desc: 'The organization logo shown across the console and in outbound mail.' },
  { id: 'security', icon: 'shield', label: 'Security', desc: 'Session handling, the authentication baseline, and the SMS, Email and Device Trust switches.' },
  { id: 'lifetimes', icon: 'clock', label: 'Token and link lifetimes', desc: 'How long a set/reset link and a one-time code stay valid.' },
  { id: 'signout', icon: 'external', label: 'Sign-out', desc: 'Where an identity lands after signing out of the console.' },
  { id: 'redirectUris', icon: 'link', label: 'Redirect URIs', desc: 'The allow-list an authorization response may be returned to.' },
  { id: 'passwordFlows', icon: 'key', label: 'Password flow configuration', desc: 'Which credential-delivery journeys are active, and which may combine.' },
  { id: 'regionFlows', icon: 'globe', label: 'Region based password flows', desc: 'Regions, the master switch and the bindings that route each workflow.' },
  { id: 'approvalLevels', icon: 'approve', label: 'Approval levels', desc: 'The named, ordered chain every request runs through.' },
  { id: 'notificationTaxonomy', icon: 'bell', label: 'Notification Management Setup', desc: 'The Category and Severity options an announcement is authored against.' },
  { id: 'sodSeverities', icon: 'sod', label: 'Segregation of duties severity', desc: 'The Severity options a segregation-of-duties rule is graded against.' },
  { id: 'provisioning', icon: 'provision', label: 'Provisioning', desc: 'Reconciliation cadence, leaver handling and orphaned accounts.' },
  { id: 'privacyConsent', icon: 'consent', label: 'Privacy and consent', desc: 'Privacy notices, re-consent cadence and access blocking.' },
  { id: 'transport', icon: 'lock', label: 'Transport security', desc: 'Encryption applied to API request payloads in transit.' },
]

/* Sections held as a draft with an explicit save. The CRUD registers — redirect
   URIs, regions, bindings, approval levels — write on the row action instead,
   because a half-added row has nothing to revert to. */
const DRAFT_SECTIONS = ['datetime', 'security', 'lifetimes', 'signout', 'provisioning', 'privacyConsent', 'transport']

const LABELS = Object.fromEntries(SECTION_META.map((s) => [s.id, s.label]))

export default function SettingsPage() {
  const { toast, confirm, navigate } = useApp()
  const settings = useSettings()
  const [draft, setDraft] = useState(() => Object.fromEntries(DRAFT_SECTIONS.map((k) => [k, settings[k]])))
  // The rail's first section, whatever it is — General has gone, and hardcoding
  // a section id here is how a removed section becomes a blank panel.
  const [active, setActive] = useState(SECTION_META[0].id)
  const meta = changeMetaFor(active, settings)

  const set = (group, key, value) => setDraft((f) => ({ ...f, [group]: { ...f[group], [key]: value } }))
  const dirty = (group) => JSON.stringify(draft[group]) !== JSON.stringify(settings[group])
  const dirtyGroups = DRAFT_SECTIONS.filter((g) => dirty(g))

  const save = (group) => {
    writeSection(group, group === 'transport'
      ? { ...draft[group], lastChange: `${draft[group].encryptPayloads ? 'Enabled' : 'Disabled'} by SHUBHAM_JAIN on ${dateText()}` }
      : draft[group])
    recordChange(group)
    toast('ok', 'Settings saved', `${LABELS[group]} applied across the tenant.`)
  }

  const revert = (group) => setDraft((f) => ({ ...f, [group]: settings[group] }))

  const saveAll = () => {
    dirtyGroups.forEach((g) => { writeSection(g, draft[g]); recordChange(g) })
    toast('ok', 'Settings saved', `${dirtyGroups.length} ${dirtyGroups.length === 1 ? 'section' : 'sections'} applied across the tenant.`)
  }

  const restoreDefaults = () => confirm({
    title: 'Restore platform defaults?',
    body: 'Every setting on this page returns to its shipped value — including the regions, flow bindings, approval levels and redirect URIs registered here. Connectors keep running, but reconciliation cadence, session policy and the approval chain change immediately.',
    confirmLabel: 'Restore defaults',
    onConfirm: () => {
      resetSettings()
      setDraft(Object.fromEntries(DRAFT_SECTIONS.map((k) => [k, DEFAULT_SETTINGS[k]])))
      toast('ok', 'Defaults restored', 'Platform settings reverted to the shipped configuration.')
    },
  })

  const foot = (group) => (
    <SectionFooter dirty={dirty(group)} onSave={() => save(group)} onRevert={() => revert(group)} />
  )

  /* Read off the change log rather than written into the copy: the chip said
     "4 days ago" against a change recorded two days before the platform clock. */
  const lastChange = useMemo(() => {
    const stamps = Object.values(settings.meta || {}).filter(Boolean).map((m) => m.at).sort()
    return stamps.length ? since(stamps[stamps.length - 1]) : 'never'
  }, [settings])

  const controlCount = useMemo(() => (
    12 // scalar controls in General, Sign-out, lifetimes
    + 7 // security: 2 selects and 5 toggles
    + 4 // provisioning
    + 3 // privacy
    + 1 // transport
    + settings.regions.length
    + settings.regionFlows.bindings.length
    + settings.approvalLevels.length
    + settings.redirectUris.length
  ), [settings])

  return (
    <>
      <PageBar
        title="Settings"
        sub="Tenant-wide platform configuration. Changes apply to every organization unless an override is set at the organization level."
        badge={<Pill tone="mut" icon="building">{settings.general.orgName}</Pill>}
        actions={
          <>
            {/* The admin audit trail, not Security Events: that screen configures which
                events are captured, and answers "what do we record", never
                "what changed here and when". */}
            <Button icon="history" onClick={() => navigate('/iam/reports/audit-trail')}>Configuration history</Button>
            <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Tenant configuration is being exported as JSON.')}>Export</Button>
            {/* Page-level, because it resets the page. Repeated under each
                section it read as "reset this section", which it never was. */}
            <Button variant="danger" icon="refresh" onClick={restoreDefaults}>Restore defaults</Button>
            <Button variant="pri" icon="save" disabled={dirtyGroups.length === 0} onClick={saveAll}>Save all changes</Button>
          </>
        }
        rail={
          <>
            <span className="chip" data-on="true"><Icon name="config" size={12} />{SECTION_META.length} sections</span>
            <span className="chip"><Icon name="sliders" size={12} />{controlCount} configured controls</span>
            <span className="chip"><Icon name="edit" size={12} />{dirtyGroups.length} with unsaved changes</span>
            <span className="chip"><Icon name="clock" size={12} />Last change {lastChange}</span>
          </>
        }
      />

      <div className="set-shell">
        <nav className="set-rail" aria-label="Settings categories">
          {SECTION_META.map((sec) => (
            <button
              type="button"
              key={sec.id}
              className="set-rail-it"
              data-on={active === sec.id || undefined}
              aria-current={active === sec.id ? 'page' : undefined}
              onClick={() => setActive(sec.id)}
            >
              <Icon name={sec.icon} size={15} />
              <span className="trunc">{sec.label}</span>
              {DRAFT_SECTIONS.includes(sec.id) && dirty(sec.id) && <span className="set-rail-dot" aria-label="Unsaved changes" />}
            </button>
          ))}
        </nav>

        <div className="set-panel">
          <div className="stack">

            {active === 'datetime' && (
              <DateTime
                draft={draft.datetime}
                saved={settings.datetime}
                set={(k, v) => set('datetime', k, v)}
                dirty={dirty('datetime')}
                onSave={() => save('datetime')}
                onRevert={() => revert('datetime')}
              />
            )}

            {active === 'branding' && <Branding value={settings.branding} />}

            {active === 'security' && (
              <Card title="Security" sub="Session handling and the authentication baseline every identity must meet." actions={<DirtyPill dirty={dirty('security')} />} footer={foot('security')}>
                <div className="grid grid-2">
                  <Field label="Session timeout" hint="Idle sessions end and require re-authentication." htmlFor="st-to">
                    <Select id="st-to" options={TIMEOUTS} value={draft.security.sessionTimeout} onChange={(e) => set('security', 'sessionTimeout', e.target.value)} />
                  </Field>
                  <Field label="Expiry warning" hint="How long before timeout the user is warned." htmlFor="st-warn">
                    <Select id="st-warn" options={WARNINGS} value={draft.security.idleWarning} onChange={(e) => set('security', 'idleWarning', e.target.value)} />
                  </Field>
                </div>

                <div style={{ marginTop: 14 }}>
                  <Toggle
                    title="Enforce multi-factor authentication"
                    body="Identities without a registered factor are prompted to enrol at their next sign-in."
                    checked={draft.security.enforceMfa}
                    onChange={(v) => set('security', 'enforceMfa', v)}
                  />
                  <Toggle
                    title="Step-up for privileged actions"
                    body="Require a phishing-resistant factor before any privileged entitlement is granted or used."
                    checked={draft.security.privilegedStepUp}
                    onChange={(v) => set('security', 'privilegedStepUp', v)}
                  />
                  <Toggle
                    title="Device Trust"
                    body="Bind a session to the device it started on. A new device must be enrolled and trusted before it can complete sign-in."
                    checked={draft.security.deviceBasedAuth}
                    onChange={(v) => set('security', 'deviceBasedAuth', v)}
                  />
                  <Toggle
                    title="SMS service"
                    body="The platform-wide switch for outbound SMS. Every SMS flow, template and one-time code depends on it."
                    checked={draft.security.smsService}
                    onChange={(v) => set('security', 'smsService', v)}
                  />
                  <Toggle
                    title="Email service"
                    body="The platform-wide switch for outbound email. Every email flow, template and one-time code depends on it."
                    checked={draft.security.emailService}
                    onChange={(v) => set('security', 'emailService', v)}
                  />
                  <div className="row-between" style={{ padding: '11px 0', borderTop: '1px solid var(--hair)', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600 }}>Password policy</div>
                      <div className="t-xs t-mut">Length, history, expiry and lockout are managed per organization.</div>
                    </div>
                    <Button size="sm" iconRight="chevR" onClick={() => navigate('passwordPolicy')}>Open password policy</Button>
                  </div>
                </div>
              </Card>
            )}

            {active === 'lifetimes' && (
              <Card title="Token and link lifetimes" sub="How long a credential artefact stays valid. Both are security-control parameters an auditor will ask about directly." actions={<DirtyPill dirty={dirty('lifetimes')} />} footer={foot('lifetimes')}>
                <div className="set-sub-h">Set / reset email link expiry</div>
                <div className="grid grid-2">
                  <Field label="Value" required htmlFor="st-linkv">
                    <TextInput id="st-linkv" type="number" min="1" max="999" value={draft.lifetimes.linkValue} onChange={(e) => set('lifetimes', 'linkValue', Number(e.target.value))} />
                  </Field>
                  <Field label="Time unit" required htmlFor="st-linku">
                    <Select id="st-linku" options={TIME_UNITS_LINK} value={draft.lifetimes.linkUnit} onChange={(e) => set('lifetimes', 'linkUnit', e.target.value)} />
                  </Field>
                </div>
                <div className="t-xs t-mut" style={{ marginTop: 6 }}>
                  A set or reset link stops working {draft.lifetimes.linkValue} {String(draft.lifetimes.linkUnit).toLowerCase()} after it is issued.
                </div>

                <div className="set-sub-h" style={{ marginTop: 18 }}>One-time code expiry</div>
                <div className="grid grid-2">
                  <Field label="Value" required htmlFor="st-otpv">
                    <TextInput id="st-otpv" type="number" min="1" max="999" value={draft.lifetimes.otpValue} onChange={(e) => set('lifetimes', 'otpValue', Number(e.target.value))} />
                  </Field>
                  <Field label="Time unit" required htmlFor="st-otpu">
                    <Select id="st-otpu" options={TIME_UNITS_OTP} value={draft.lifetimes.otpUnit} onChange={(e) => set('lifetimes', 'otpUnit', e.target.value)} />
                  </Field>
                </div>
                <div className="t-xs t-mut" style={{ marginTop: 6 }}>
                  A one-time code stops working {draft.lifetimes.otpValue} {String(draft.lifetimes.otpUnit).toLowerCase()} after it is sent.
                </div>
              </Card>
            )}

            {active === 'signout' && (
              <Card title="Sign-out" sub="Where an identity lands after signing out of the console." actions={<DirtyPill dirty={dirty('signout')} />} footer={foot('signout')}>
                <Field
                  label="Default redirect URI after logout"
                  hint="Must be an absolute URI. It does not need to be on the redirect allow-list, which governs authorization responses only."
                  htmlFor="st-lo"
                >
                  <TextInput id="st-lo" className="mono" value={draft.signout.redirectUri} placeholder="https://demo1.tanflow.com" onChange={(e) => set('signout', 'redirectUri', e.target.value)} />
                </Field>
              </Card>
            )}

            {active === 'redirectUris' && <RedirectUris value={settings.redirectUris} />}

            {active === 'passwordFlows' && <PasswordFlows value={settings.passwordFlows} />}

            {active === 'regionFlows' && (
              <Regions regions={settings.regions} regionFlows={settings.regionFlows} settings={settings} />
            )}

            {active === 'approvalLevels' && <ApprovalLevels value={settings.approvalLevels} />}

            {active === 'notificationTaxonomy' && <NotificationTaxonomy value={settings.notificationTaxonomy} />}

            {active === 'sodSeverities' && <SodSeverities value={settings.sodSeverities} />}

            {active === 'provisioning' && (
              <Card title="Provisioning" sub="How the platform reconciles target systems and handles identities that leave." actions={<DirtyPill dirty={dirty('provisioning')} />} footer={foot('provisioning')}>
                <div className="grid grid-2">
                  <Field label="Reconciliation cadence" hint="Frequency of the full sweep across every connector." htmlFor="st-cad">
                    <Select id="st-cad" options={CADENCES} value={draft.provisioning.cadence} onChange={(e) => set('provisioning', 'cadence', e.target.value)} />
                  </Field>
                  <Field label="Deprovisioning grace period" hint="Delay between the leaver event and account removal." htmlFor="st-grace">
                    <Select id="st-grace" options={GRACE} value={draft.provisioning.graceDays} onChange={(e) => set('provisioning', 'graceDays', e.target.value)} />
                  </Field>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Field label="Orphan handling" hint="Applied to target accounts with no matching identity." htmlFor="st-orph">
                    <Select id="st-orph" options={ORPHAN_MODES} value={draft.provisioning.orphanHandling} onChange={(e) => set('provisioning', 'orphanHandling', e.target.value)} />
                  </Field>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Toggle
                    title="Auto-deprovision on exit"
                    body="Revoke every entitlement and disable target accounts when the HR feed marks an identity as a leaver."
                    checked={draft.provisioning.autoDeprovision}
                    onChange={(v) => set('provisioning', 'autoDeprovision', v)}
                  />
                  <div className="row-between" style={{ padding: '11px 0', borderTop: '1px solid var(--hair)', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600 }}>Orphaned accounts</div>
                      <div className="t-xs t-mut">22 unmatched accounts are waiting on a decision.</div>
                    </div>
                    <Button size="sm" iconRight="chevR" onClick={() => navigate('orphanedpolicy')}>Review orphans</Button>
                  </div>
                </div>
              </Card>
            )}

            {active === 'privacyConsent' && (
              <Card title="Privacy and consent" sub="Tenant defaults for privacy notices, re-consent and access blocking." actions={<DirtyPill dirty={dirty('privacyConsent')} />} footer={foot('privacyConsent')}>
                <div className="grid grid-2">
                  <Field label="Default privacy notice" htmlFor="st-pn">
                    <Select id="st-pn" options={['Global privacy notice v4.2', 'Employee privacy notice v3.1', 'Contractor privacy notice v2.0']} value={draft.privacyConsent.privacyNotice} onChange={(e) => set('privacyConsent', 'privacyNotice', e.target.value)} />
                  </Field>
                  <Field label="Re-consent cadence" htmlFor="st-rc">
                    <Select id="st-rc" options={RECONSENT} value={draft.privacyConsent.reconsent} onChange={(e) => set('privacyConsent', 'reconsent', e.target.value)} />
                  </Field>
                </div>
                <Toggle
                  title="Block access until accepted"
                  body="Require identities to accept mandatory privacy notices before entering the application catalog."
                  checked={draft.privacyConsent.blockUntilAccepted}
                  onChange={(v) => set('privacyConsent', 'blockUntilAccepted', v)}
                />
              </Card>
            )}

            {active === 'transport' && (
              <Card
                title="Transport security"
                sub="Encryption applied to API request payloads while they are in transit."
                actions={
                  <>
                    <Tag tone={draft.transport.encryptPayloads ? 'ok' : undefined}>
                      {draft.transport.encryptPayloads ? 'Enabled' : 'Disabled'}
                    </Tag>
                    <DirtyPill dirty={dirty('transport')} />
                  </>
                }
                footer={foot('transport')}
              >
                <div className="t-sm t-mut">
                  Encrypts all outgoing API request payloads across the application in transit using JWE / AES-256-GCM.
                  Protects sensitive data — passwords, tokens, credentials and form submissions — on every request.
                </div>
                <div style={{ marginTop: 14 }}>
                  <Toggle
                    title="Encrypt API payloads"
                    body="Wraps all outgoing API request bodies application-wide with RSA-OAEP-256 + AES-256-GCM."
                    badge={draft.transport.encryptPayloads ? 'Enabled' : 'Disabled'}
                    badgeTone={draft.transport.encryptPayloads ? 'ok' : undefined}
                    checked={draft.transport.encryptPayloads}
                    onChange={(v) => set('transport', 'encryptPayloads', v)}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  {/* Enforcement is a separate decision from encryption, and the
                      order matters: turning encryption on without Strict is the
                      state a tenant migrates through, and turning Strict on
                      without encryption would refuse every request. */}
                  <Toggle
                    title={<>Enforce encryption <span className="t-xs t-mut" style={{ fontWeight: 400 }}>— transition mode</span></>}
                    body={(
                      <>
                        <b>On (Strict):</b> plain requests are rejected with 400.
                        {' '}
                        <b>Off (Soft):</b> both plain and encrypted requests are accepted — use during key
                        rotation or client migration.
                      </>
                    )}
                    badge={draft.transport.enforceEncryption ? 'Strict' : 'Soft'}
                    badgeTone={draft.transport.enforceEncryption ? 'warn' : undefined}
                    checked={draft.transport.enforceEncryption}
                    onChange={(v) => set('transport', 'enforceEncryption', v)}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <Banner tone={!draft.transport.encryptPayloads ? 'warn' : draft.transport.enforceEncryption ? 'bad' : 'info'}>
                    {!draft.transport.encryptPayloads
                      ? 'Payloads are protected by TLS only. Enable payload encryption where a downstream proxy terminates TLS.'
                      : draft.transport.enforceEncryption
                        ? 'Strict: any client that cannot encrypt is rejected with 400 from the next request. Confirm every client is across before saving this.'
                        : 'Soft: clients that cannot encrypt yet are still accepted. Move to Strict once the last one is migrated — until then an unencrypted request is not refused.'}
                  </Banner>
                </div>
                {/* Who last touched this section, stated under the controls it
                    describes. The change-control panel beside the card carries
                    the same fact, but a reader deciding whether to arm Strict is
                    looking at the switches, not at the rail. */}
                <div className="set-lastmod">
                  <Icon name="history" size={12} />
                  {meta
                    ? (
                      <span>
                        Last changed by <b>{meta.by}</b> on <span className="mono">{meta.at}</span>
                        {meta.ticket ? <> · <span className="mono">{meta.ticket}</span></> : null}
                      </span>
                    )
                    : <span>Never changed — transport security is running the configuration the platform shipped with.</span>}
                </div>
              </Card>
            )}
          </div>

          <div className="stack">
            <Card
              title="Change control"
              sub={`Who last touched ${LABELS[active] || 'this section'}`}
            >
              {meta ? (
                <KeyValue
                  cols={1}
                  rows={[
                    { k: 'Scope', v: 'All organizations', icon: 'layers' },
                    { k: 'Last changed by', v: meta.by, icon: 'user' },
                    { k: 'Last changed', v: meta.at, icon: 'clock' },
                    { k: 'Change ticket', v: meta.ticket, icon: 'file' },
                  ]}
                />
              ) : (
                <div className="t-sm t-mut">
                  Never changed. {LABELS[active]} is running the configuration the platform shipped with.
                </div>
              )}
              <div className="banner" data-tone="info" style={{ marginTop: 14 }}>
                <Icon name="info" size={15} />
                <div>
                  Every change is written to the audit log with the previous value.
                  {' '}<button className="link" onClick={() => navigate('/iam/reports/audit-trail')}>View history</button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
