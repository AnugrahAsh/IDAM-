import './ProfilePage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import AppLogo from '../../components/primitives/AppLogo'
import Tabs from '../../components/primitives/Tabs'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Switch from '../../components/primitives/Switch'
import Meter from '../../components/primitives/Meter'
import Banner from '../../components/primitives/Banner'
import { useLocalState } from '../../lib/useLocalState'
import FileDrop from '../../components/primitives/FileDrop'
import IconButton from '../../components/primitives/IconButton'
import { useApp } from '../../store/AppContext'
import { statusTone } from '../../lib/format'
import { ME, MFA_METHODS, GROUPS, MY_APPS, LOGS, ATTRS, LOOKUPS, ORGS } from '../../data/seed'
import UserConsentPanel from '../consentManagement/UserConsentPanel'
import { consentsFor } from '../consentManagement/userConsentData'
import { DATE_FORMATS, EDITABLE, FACTOR_IDS, HIDDEN_ATTRS, LANGUAGES, MY_ASSIGNED_APPS, MY_EVENTS, MY_GROUPS, NOTIFY_ROWS, PASSWORD_AGE_DAYS, PASSWORD_CHANGED, PREF_DEFAULTS, PROFILE_INITIAL, PROFILE_SECTIONS, SESSIONS, STRENGTH, TIMEZONES, attrOptions, locationText, pwScore } from './profileData'

// Default Strong Policy expires a password after 90 days, so the window left is
// whatever that policy allows less the age the activity feed records.
const PASSWORD_POLICY_DAYS = 90
const PASSWORD_EXPIRES_IN = Math.max(0, PASSWORD_POLICY_DAYS - PASSWORD_AGE_DAYS)

const MY_CONSENTS = consentsFor(ME.username)

export default function ProfilePage() {
  const { toast, confirm, navigate, setDrawer } = useApp()
  const [tab, setTab] = useState('personal')
  // The profile picture is per-identity, not per-session, so it persists.
  const [photo, setPhoto] = useLocalState('tf-idam-profile-photo', '')

  const openPhoto = () => setDrawer({
    title: 'Profile picture',
    sub: 'Shown beside your name across the console and in every approval you take part in.',
    children: (
      <div className="stack">
        <div className="row" style={{ gap: 14 }}>
          <Avatar first={ME.firstName} last={ME.lastName} size="xl" src={photo} />
          <div className="t-sm t-mut">
            {photo
              ? 'Your current picture. Upload another to replace it.'
              : 'You have no picture, so your initials are shown instead.'}
          </div>
        </div>
        <FileDrop
          accept=".jpg,.jpeg,.png"
          maxSize={2 * 1024 * 1024}
          label="Drag a picture here, or browse"
          hint="Allowed types: JPG, JPEG, PNG. Maximum file size: 2 MB. Square images crop best."
          onFiles={(files) => {
            const f = files[0]
            if (!f) return
            const reader = new FileReader()
            reader.onload = () => {
              setPhoto(String(reader.result))
              setDrawer(null)
              toast('ok', 'Picture updated', 'Your profile picture is shown across the console.')
            }
            reader.readAsDataURL(f)
          }}
        />
        <Banner tone="info">
          The picture is visible to anyone who can see your identity record — approvers, auditors and the helpdesk.
        </Banner>
      </div>
    ),
    footer: (
      <>
        <Button onClick={() => setDrawer(null)}>Close</Button>
        {photo && (
          <Button
            variant="danger"
            icon="trash"
            onClick={() => { setPhoto(''); setDrawer(null); toast('ok', 'Photo removed', 'Your initials are shown again.') }}
          >
            Remove picture
          </Button>
        )}
      </>
    ),
  })

  const [form, setForm] = useState(PROFILE_INITIAL)
  const [savedForm, setSavedForm] = useState(PROFILE_INITIAL)
  const profileDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])

  const [factors, setFactors] = useState(MFA_METHODS.filter((m) => FACTOR_IDS.includes(m.id)))
  const [sessions, setSessions] = useState(SESSIONS)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwChanged, setPwChanged] = useState(PASSWORD_CHANGED)

  const [prefs, setPrefs] = useState(PREF_DEFAULTS)
  const [savedPrefs, setSavedPrefs] = useState(PREF_DEFAULTS)
  const prefsDirty = useMemo(() => JSON.stringify(prefs) !== JSON.stringify(savedPrefs), [prefs, savedPrefs])

  const setAttr = (id, value) => setForm((f) => ({ ...f, [id]: value }))

  const saveProfile = () => {
    if (!String(form.mobileNo).trim()) {
      toast('bad', 'Profile not saved', 'A mobile number is required for account recovery and SMS delivery.')
      return
    }
    setSavedForm(form)
    toast('ok', 'Profile updated', 'Your changes are written to the identity record and synchronized to connected targets.')
  }

  const discardProfile = () => {
    setForm(savedForm)
    toast('info', 'Changes discarded', 'Your profile was returned to the last saved record.')
  }

  const changePassword = () => {
    const errs = {}
    if (!pw.current) errs.current = 'Enter your current password.'
    if (pw.next.length < 14) errs.next = 'At least 14 characters are required under the Default Strong Policy.'
    else if (!/[a-z]/.test(pw.next) || !/[A-Z]/.test(pw.next) || !/\d/.test(pw.next)) errs.next = 'Use upper case, lower case and at least one digit.'
    else if (pw.current && pw.next === pw.current) errs.next = 'The new password must differ from the current one.'
    if (pw.confirm !== pw.next) errs.confirm = 'The confirmation does not match the new password.'
    else if (!pw.confirm) errs.confirm = 'Repeat the new password.'
    setPwErrors(errs)
    if (Object.keys(errs).length > 0) {
      toast('bad', 'Password not changed', 'Fix the highlighted fields and try again.')
      return
    }
    setPw({ current: '', next: '', confirm: '' })
    setPwChanged('just now')
    toast('ok', 'Password changed', 'Every other session keeps running; new sign-ins require the new password.')
  }

  const resetFactor = (f) => confirm({
    title: `Reset ${f.name}?`,
    body: 'The factor is removed immediately and you will be asked to enrol a replacement at your next sign-in.',
    confirmLabel: 'Reset factor',
    onConfirm: () => {
      setFactors((fs) => fs.filter((x) => x.id !== f.id))
      toast('ok', 'Factor reset', `${f.name} removed from your account.`)
    },
  })

  const signOutSession = (d) => confirm({
    title: `Sign out ${d.name}?`,
    body: 'Every active session on that device ends immediately and re-authentication is required.',
    confirmLabel: 'Sign out device',
    onConfirm: () => {
      setSessions((ds) => ds.filter((x) => x.id !== d.id))
      toast('ok', 'Device signed out', `${d.name} no longer holds a session.`)
    },
  })

  const signOutOthers = () => confirm({
    title: 'Sign out all other sessions?',
    body: 'Every session except the one you are using now ends immediately.',
    confirmLabel: 'Sign out others',
    onConfirm: () => {
      setSessions((ds) => ds.filter((x) => x.current))
      toast('ok', 'Sessions ended', 'Only this device still holds a session.')
    },
  })

  const renderAttr = (attr) => {
    const editable = EDITABLE.has(attr.id)
    const options = attrOptions(attr)
    const id = `pf-${attr.id}`
    const value = form[attr.id] ?? ''
    return (
      <Field
        key={attr.id}
        label={attr.label}
        required={editable && attr.req}
        htmlFor={id}
        hint={editable ? undefined : 'Managed by HR'}
        span={attr.type === 'textarea' ? 2 : undefined}
      >
        {editable && options ? (
          <Select id={id} options={options} value={value} onChange={(e) => setAttr(attr.id, e.target.value)} />
        ) : editable && attr.type === 'textarea' ? (
          <TextInput as="textarea" id={id} rows={2} value={value} onChange={(e) => setAttr(attr.id, e.target.value)} />
        ) : editable ? (
          <TextInput id={id} type={attr.type === 'tel' ? 'tel' : 'text'} value={value} onChange={(e) => setAttr(attr.id, e.target.value)} />
        ) : (
          <TextInput id={id} value={String(value || '—')} disabled readOnly />
        )}
      </Field>
    )
  }

  return (
    <>
      <PageBar
        title="My Profile"
        sub="Your account details, roles, groups, sessions and access windows."
      />

      <Card className="pf-id">
        <div className="pf-hero">
          <div className="pf-av">
            <Avatar first={ME.firstName} last={ME.lastName} size="xl" src={photo} />
            <div className="pf-av-acts">
              <Button size="sm" icon="upload" onClick={openPhoto}>
                {photo ? 'Change photo' : 'Add photo'}
              </Button>
              {photo && (
                <IconButton
                  icon="trash"
                  size="sm"
                  label="Remove profile picture"
                  onClick={() => { setPhoto(''); toast('ok', 'Photo removed', 'Your initials are shown again across the console.') }}
                />
              )}
            </div>
          </div>

          <div className="pf-hero-meta">
            <div className="pf-hero-name">
              <span className="pf-name">{ME.firstName} {ME.lastName}</span>
              <span className="pf-handle mono">@{ME.username.toLowerCase()}</span>
              <Pill tone="acc" icon="roles">{ME.roleLabel}</Pill>
              <Pill tone={statusTone(ME.status)} dot>{ME.status}</Pill>
              <Tag>{ME.employeeType}</Tag>
            </div>
            <div className="pf-facts">
              <Fact icon="mail" label="Email" value={ME.email} />
              <Fact icon="building" label="Role / organization" value={`${ME.designation} · ${ME.organization}`} />
              <Fact icon="globe" label="Location" value={locationText(ME)} />
              <Fact icon="activity" label="Last sign-in" value={`${ME.lastLogin} (${ME.lastLoginRel})`} />
            </div>
          </div>

          <div className="pf-hero-actions">
            <Button
              icon="edit"
              onClick={() => {
                setTab('personal')
                toast('info', 'Profile editor', 'Editable attributes are governed by your organization policy. HR-sourced fields are read-only.')
              }}
            >
              Edit details
            </Button>
            <Button icon="lock" onClick={() => setTab('security')}>Change password</Button>
          </div>
        </div>
      </Card>

      <div className="kpi-row cols-5" style={{ marginTop: 10 }}>
        <button type="button" className="kpi" onClick={() => setTab('access')}>
          <span className="k-label"><Icon name="roles" size={12} />Roles</span>
          <span className="k-val num">1</span>
          <span className="k-foot">Assigned directly</span>
        </button>
        <button type="button" className="kpi" onClick={() => setTab('access')}>
          <span className="k-label"><Icon name="group" size={12} />Group memberships</span>
          <span className="k-val num">{MY_GROUPS.length}</span>
          <span className="k-foot">Permissions inherited</span>
        </button>
        <button type="button" className="kpi" onClick={() => setTab('access')}>
          <span className="k-label"><Icon name="apps" size={12} />Applications</span>
          <span className="k-val num">{MY_ASSIGNED_APPS.length}</span>
          <span className="k-foot">Provisioned to you</span>
        </button>
        <button type="button" className="kpi" onClick={() => setTab('security')}>
          <span className="k-label"><Icon name="device" size={12} />Active sessions</span>
          <span className="k-val num">{sessions.length}</span>
          <span className="k-foot">Signed-in devices</span>
        </button>
        <button type="button" className="kpi" onClick={() => setTab('security')}>
          <span className="k-label"><Icon name="shield" size={12} />MFA</span>
          <span className="k-val">{factors.length ? `${factors.length} enrolled` : 'Not enrolled'}</span>
          <span className="k-foot">{factors.length ? factors[0].name : 'Enrol from Security'}</span>
        </button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'personal', label: 'Personal information', icon: 'user' },
          { id: 'security', label: 'Security', icon: 'shield', count: factors.length },
          { id: 'access', label: 'Access', icon: 'group', count: MY_GROUPS.length + MY_ASSIGNED_APPS.length },
          { id: 'privacy', label: 'Privacy & consent', icon: 'consent', count: MY_CONSENTS.length },
          { id: 'preferences', label: 'Preferences', icon: 'sliders' },
          { id: 'activity', label: 'Activity', icon: 'activity', count: MY_EVENTS.length },
        ]}
      />

      <div className="pf-body detail-cols">
        <div className="stack">
              {tab === 'personal' && (
                <div className="stack">
                  <Banner tone="info">
                    Fields marked <b>Managed by HR</b> are sourced from Workday and read-only here. Corrections to
                    governed attributes route through your HR partner.
                  </Banner>

                  {PROFILE_SECTIONS.map((sec) => {
                    const fields = ATTRS
                      .filter((a) => a.section === sec.id && !HIDDEN_ATTRS.has(a.id))
                      .sort((a, b) => a.order - b.order)
                    const governed = fields.filter((a) => !EDITABLE.has(a.id)).length
                    return (
                      <Card
                        key={sec.id}
                        title={sec.title}
                        sub={sec.sub}
                        actions={governed ? <Tag>{governed} managed by HR</Tag> : <Tag tone="acc">Editable</Tag>}
                      >
                        <div className="grid grid-2">{fields.map(renderAttr)}</div>
                      </Card>
                    )
                  })}
                </div>
              )}

              {tab === 'security' && (
                <>
                  <Card
                    title="Change password"
                    sub={`Last changed ${pwChanged} · expires in ${PASSWORD_EXPIRES_IN} days under the Default Strong Policy. Minimum 14 characters with mixed case and a digit; your previous 8 passwords cannot be reused.`}
                  >
                  <div className="grid grid-3">
                    <Field label="Current password" required error={pwErrors.current} htmlFor="pw-current">
                      <TextInput
                        id="pw-current"
                        type="password"
                        autoComplete="current-password"
                        value={pw.current}
                        onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                      />
                    </Field>
                    <Field label="New password" required error={pwErrors.next} htmlFor="pw-next">
                      <TextInput
                        id="pw-next"
                        type="password"
                        autoComplete="new-password"
                        value={pw.next}
                        onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      />
                    </Field>
                    <Field label="Confirm new password" required error={pwErrors.confirm} htmlFor="pw-confirm">
                      <TextInput
                        id="pw-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={pw.confirm}
                        onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      />
                    </Field>
                  </div>
                  {pw.next && (
                    <div className="pw-strength">
                      <span style={{ flex: 1 }}>
                        <Meter value={pwScore(pw.next)} tone={pwScore(pw.next) >= 85 ? 'ok' : pwScore(pw.next) >= 50 ? 'warn' : 'bad'} />
                      </span>
                      <span className="t-xs t-mut">
                        {pwScore(pw.next) >= 85 ? 'Strong' : pwScore(pw.next) >= 50 ? 'Fair' : 'Weak'}
                      </span>
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 12 }}>
                    <Button variant="pri" icon="key" onClick={changePassword}>Change password</Button>
                    <span className="t-xs t-mut">You will be asked for a factor before the change is committed.</span>
                  </div>

                  </Card>

                  <Card
                    title="Authentication factors"
                    sub="Second factors registered against this identity."
                    actions={
                      <Button size="sm" icon="plus" onClick={() => toast('info', 'Enrol a factor', 'A single-use enrollment link has been sent to your registered email.')}>
                        Enrol a factor
                      </Button>
                    }
                  >
                  {factors.length === 0 ? (
                    <div className="banner" data-tone="bad">
                      <Icon name="warn" size={15} />
                      <div>No factor is registered. You will be required to enrol one at your next sign-in.</div>
                    </div>
                  ) : (
                    <div className="feed">
                      {factors.map((f) => {
                        const s = STRENGTH[f.strength] || STRENGTH.weak
                        return (
                          <div className="feed-it" key={f.id}>
                            <span className="feed-ic" data-tone={s.tone}>
                              <Icon name={f.icon} size={13} />
                            </span>
                            <div className="feed-m">
                              <div className="feed-t"><b>{f.name}</b></div>
                              <div className="feed-s">
                                <span>{f.sub}</span>
                              </div>
                              <div className="feed-s">
                                <Pill tone={s.tone} dot>{s.label}</Pill>
                                {f.id === 'passkey' && <Tag tone="acc">Primary</Tag>}
                              </div>
                            </div>
                            <Button size="sm" icon="refresh" onClick={() => resetFactor(f)}>Reset</Button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  </Card>

                  <Card
                    title="Active sessions"
                    sub="Devices currently holding a signed-in session."
                    actions={
                      <Button size="sm" icon="power" disabled={sessions.length <= 1} onClick={signOutOthers}>
                        Sign out all others
                      </Button>
                    }
                  >
                  <div className="feed">
                    {sessions.map((d) => (
                      <div className="feed-it" key={d.id}>
                        <span className="feed-ic" data-tone={d.current ? 'acc' : 'mut'}><Icon name="device" size={13} /></span>
                        <div className="feed-m">
                          <div className="feed-t"><b>{d.name}</b></div>
                          <div className="feed-s">
                            <span>{d.detail}</span>
                            <span>{d.location}</span>
                            <span className="mono">{d.ip}</span>
                            {d.current && <Pill tone="acc" dot>This device</Pill>}
                          </div>
                        </div>
                        <span className="feed-time">{d.lastSeen}</span>
                        <Button size="sm" icon="power" disabled={d.current} onClick={() => signOutSession(d)}>Sign out</Button>
                      </div>
                    ))}
                  </div>
                  </Card>
                </>
              )}

              {tab === 'access' && (
                <>
                  <Card title="Entitlements" sub="Groups and access this identity holds today.">
                  <div className="feed">
                    {MY_GROUPS.map((g) => (
                      <div className="feed-it" key={g.id}>
                        <span className="feed-ic" data-tone="mut"><Icon name="group" size={13} /></span>
                        <div className="feed-m">
                          <div className="feed-t"><b>{g.name}</b></div>
                          <div className="feed-s"><span>{g.description}</span></div>
                          <div className="feed-s">
                            <Tag>{g.kind}</Tag>
                            <span>{g.application}</span>
                            <span>Owner {g.owner}</span>
                          </div>
                        </div>
                        <button className="link" onClick={() => navigate('requests')}>Request removal</button>
                      </div>
                    ))}
                  </div>

                  </Card>

                  <Card
                    title="Applications"
                    sub="Everything provisioned to this identity through its roles and groups."
                    actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('myapps')}>All my apps</Button>}
                  >
                  {/* A preview, not the register: the card sits beside six
                      others on a tab, so a long estate is capped and the rest
                      is one click away in My Apps. */}
                  <div className="feed">
                    {MY_ASSIGNED_APPS.slice(0, 8).map((a) => (
                      <div className="feed-it" key={a.id}>
                        <AppLogo brand={a.brand} name={a.name} size={26} />
                        <div className="feed-m">
                          <div className="feed-t"><b>{a.name}</b></div>
                          <div className="feed-s">
                            <Tag>{a.type}</Tag>
                            <span>Last used {a.lastUsed}</span>
                          </div>
                        </div>
                        <Button size="sm" iconRight="external" onClick={() => navigate('myapps')}>Open</Button>
                      </div>
                    ))}
                  </div>
                  {MY_ASSIGNED_APPS.length > 8 && (
                    <button className="link" onClick={() => navigate('myapps')}>
                      Show all {MY_ASSIGNED_APPS.length} applications
                    </button>
                  )}
                  </Card>
                </>
              )}

              {/* Consent is the one part of a profile the person answers for
                  themselves: it can be given and withdrawn here, and the
                  record of both is kept as evidence. */}
              {tab === 'privacy' && <UserConsentPanel username={ME.username} self />}

              {tab === 'preferences' && (
                <div className="stack">
                  {/* Language is applied. Time zone and date format are stored
                      against the account but the console still renders every
                      stamp in UTC as YYYY-MM-DD, so the fields say so rather
                      than implying a change the reader will not see. */}
                  <Card title="Localization" sub="How the console renders language, timestamps and dates for you.">
                    <div className="grid grid-3">
                      <Field label="Language" htmlFor="pref-lang">
                        <Select id="pref-lang" options={LANGUAGES} value={prefs.language} onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))} />
                      </Field>
                      <Field label="Time zone" htmlFor="pref-tz" hint="Saved against your account. The console still renders every timestamp in UTC.">
                        <Select id="pref-tz" options={TIMEZONES} value={prefs.timezone} onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))} />
                      </Field>
                      <Field label="Date format" htmlFor="pref-date" hint="Saved against your account. The console still renders every date as YYYY-MM-DD.">
                        <Select id="pref-date" options={DATE_FORMATS} value={prefs.dateFormat} onChange={(e) => setPrefs((p) => ({ ...p, dateFormat: e.target.value }))} />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title="Notifications"
                    sub={`Delivered to ${ME.email}${prefs.channelSms ? ` and ${savedForm.mobileNo}` : ''}.`}
                  >
                    {NOTIFY_ROWS.map((r) => (
                      <div className="pref-toggle row-between" key={r.id}>
                        <div style={{ minWidth: 0 }}>
                          <div className="t-sm" style={{ fontWeight: 600 }}>{r.title}</div>
                          <div className="t-xs t-mut">{r.body}</div>
                        </div>
                        <Switch checked={prefs[r.id]} onChange={(v) => setPrefs((p) => ({ ...p, [r.id]: v }))} label={r.title} />
                      </div>
                    ))}
                  </Card>
                </div>
              )}

              {tab === 'activity' && (
                <>
                  <Card
                    title="Recent activity"
                    sub="Sign-ins, credential changes and administrative actions on this account."
                    actions={
                      <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Your last 90 days of account activity is being written to CSV.')}>
                        Export
                      </Button>
                    }
                  >
                  <div className="tl">
                    {MY_EVENTS.map((e) => (
                      <div
                        className="tl-it"
                        key={e.id}
                        data-tone={e.outcome === 'Denied' ? 'bad' : e.level === 'WARN' ? 'warn' : e.level === 'ERROR' ? 'bad' : 'acc'}
                      >
                        <span className="tl-dot"><Icon name={e.outcome === 'Denied' ? 'ban' : 'check'} size={8} stroke={3} /></span>
                        <div className="tl-t">{e.action}</div>
                        <div className="tl-s">{e.category} · {e.subject}</div>
                        <div className="tl-time">{e.ts} · {e.ip}</div>
                      </div>
                    ))}
                  </div>
                  </Card>
                </>
              )}
        </div>

        <aside className="stack">
          <Card title="Security &amp; sign-in" sub="Authentication and account safety">
            <div className="pf-sec">
              <div className="pf-sec-row">
                <span>Multi-factor</span>
                <Pill tone={factors.length ? 'ok' : 'warn'} dot>
                  {factors.length ? `${factors.length} enrolled` : 'Not enrolled'}
                </Pill>
              </div>
              <div className="pf-sec-row">
                <span>Strongest factor</span>
                <Tag tone="acc">{factors.length ? factors[0].name : '—'}</Tag>
              </div>
              <div className="pf-sec-row">
                <span>Password</span>
                <Pill tone="ok" dot>Valid</Pill>
              </div>
              <div className="pf-sec-row">
                <span>Last changed</span>
                <b>{pwChanged}</b>
              </div>
              <div className="pf-sec-row">
                <span>Self-service change</span>
                <Tag tone="acc">Allowed</Tag>
              </div>
              <div className="pf-sec-row">
                <span>Account</span>
                <Pill tone="ok" dot>Unlocked</Pill>
              </div>
              <div className="pf-sec-row">
                <span>Failed attempts</span>
                <b className="num">0 of 5</b>
              </div>
              <div className="pf-sec-row">
                <span>Active sessions</span>
                <b className="num">{sessions.length}</b>
              </div>
              <div className="pf-sec-row">
                <span>Last sign-in</span>
                <b>{ME.lastLogin}</b>
              </div>
            </div>
            <div className="row" style={{ gap: 7, marginTop: 12 }}>
              <Button size="sm" icon="lock" onClick={() => setTab('security')}>Change password</Button>
              <Button size="sm" icon="shield" onClick={() => setTab('security')}>Manage MFA</Button>
            </div>
          </Card>

          <Card title="Access at a glance" sub="What this identity currently holds">
            <div className="pf-sec">
              <div className="pf-sec-row"><span>Role</span><b>{ME.roleLabel}</b></div>
              <div className="pf-sec-row"><span>Groups</span><b className="num">{MY_GROUPS.length}</b></div>
              <div className="pf-sec-row"><span>Applications</span><b className="num">{MY_ASSIGNED_APPS.length}</b></div>
              <div className="pf-sec-row"><span>Organization</span><b>{ME.organization}</b></div>
              <div className="pf-sec-row"><span>Employee type</span><b>{ME.employeeType}</b></div>
            </div>
            <div className="row" style={{ gap: 7, marginTop: 12 }}>
              <Button size="sm" icon="group" onClick={() => setTab('access')}>Review access</Button>
            </div>
          </Card>
        </aside>
      </div>

      {tab === 'personal' && (
        <StickyActions dirty={profileDirty} message={profileDirty ? 'Unsaved profile changes' : 'No changes'}>
          <Button disabled={!profileDirty} onClick={discardProfile}>Discard</Button>
          <Button variant="pri" icon="save" disabled={!profileDirty} onClick={saveProfile}>Save profile</Button>
        </StickyActions>
      )}

      {tab === 'preferences' && (
        <StickyActions dirty={prefsDirty} message={prefsDirty ? 'Unsaved preferences' : 'No changes'}>
          <Button disabled={!prefsDirty} onClick={() => setPrefs(savedPrefs)}>Discard</Button>
          <Button
            variant="pri"
            icon="save"
            disabled={!prefsDirty}
            onClick={() => { setSavedPrefs(prefs); toast('ok', 'Preferences saved', 'Applied to this account on every device.') }}
          >
            Save preferences
          </Button>
        </StickyActions>
      )}
    </>
  )
}
