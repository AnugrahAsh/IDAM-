import { useMemo, useRef, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Icon from '../../components/primitives/Icon'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Switch from '../../components/primitives/Switch'
import Check from '../../components/primitives/Check'
import Pill from '../../components/primitives/Pill'
import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { GROUPS, LOOKUPS, USERS } from '../../data/seed'
import { attrs as schemaAttrs, sections as schemaSections, useSchema, visibleAttrs } from '../configurations/schemaStore'
import SearchSelect from '../../components/primitives/SearchSelect'
import { entitlementsFor, optionsFor } from './identityData'

const TYPE_BLURB = {
  Internal: 'Permanent employee sourced from Workday HR. Full attribute set, organization baseline entitlements and a 90-day password policy.',
  External: 'Partner or vendor identity. Sponsor and expiry date are mandatory, and access is limited to the partner application set.',
  Contractor: 'Fixed-term worker. Entitlements expire 90 days after the start date unless a renewal is approved.',
  'Service Account': 'Non-human principal. No MFA enrollment, a 32-character non-expiring credential and a named human owner.',
}

const TYPE_ICON = { Internal: 'user', External: 'globe', Contractor: 'clock', 'Service Account': 'server' }

const DOC_TYPES = [
  { id: 'identity', label: 'Identity proof', required: true, hint: 'Passport, national identity card or driving license.' },
  { id: 'address', label: 'Address proof', required: false, hint: 'Utility bill or bank statement no older than 90 days.' },
  { id: 'contract', label: 'Employment contract', required: true, hint: 'Signed offer or contractor statement of work.' },
  { id: 'bgv', label: 'Background verification', required: false, hint: 'Vendor report reference or completion certificate.' },
  { id: 'aup', label: 'Acceptable use policy', required: true, hint: 'Countersigned acceptable use acknowledgement.' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const usernameClashMessage = (clash) =>
  `This username is already taken by ${clash.firstName} ${clash.lastName} (${clash.email}). Usernames must be unique — choose a different one.`

const ATTR_HINT = {
  username: 'Unique across the directory. Letters, digits, underscore, dot or hyphen.',
  email: 'Primary address for credentials, notifications and account recovery.',
  mobileNo: 'Used for one-time codes and out-of-band verification.',
  manager: 'Drives approval routing and attestation ownership.',
  retirementDate: 'Leave blank when there is no scheduled deactivation.',
  organization: 'Determines the password policy and baseline entitlements.',
  empCode: 'Employee code as held in the source of record.',
  reportingEmpId: 'Employee code of the reporting manager.',
  officeLevel: 'Sets the scope this identity occupies in the organizational hierarchy.',
  department: 'Feeds the dynamic policy engine and departmental access baselines.',
}

const emptyValues = () => {
  const v = {}
  schemaAttrs().forEach((a) => { v[a.id] = '' })
  return v
}

const valuesFrom = (user) => {
  const v = {}
  schemaAttrs().forEach((a) => { v[a.id] = user[a.id] == null ? '' : String(user[a.id]) })
  return v
}

const APP_GROUPS = [...new Set(GROUPS.map((g) => g.application))].sort().map((app) => ({
  application: app,
  groups: GROUPS.filter((g) => g.application === app),
}))

function AccordionCard({ id, title, sub, open, onToggle, summary, status, children }) {
  return (
    <div id={id}>
      <Card
        title={title}
        sub={sub}
        actions={(
          <>
            {status}
            <IconButton icon={open ? 'chevU' : 'chevD'} size="sm" label={open ? `Collapse ${title}` : `Expand ${title}`} onClick={onToggle} />
          </>
        )}
      >
        {open ? children : <div className="t-sm t-mut">{summary}</div>}
      </Card>
    </div>
  )
}

export default function IdentityForm({ user, existing, onCreate, onSave, onCancel }) {
  const { toast, confirm } = useApp()
  // The form is generated from the identity schema, so an attribute defined in
  // Configurations appears here without this file changing.
  const schema = useSchema()
  const ATTRS = schema.attrs
  const SECTIONS = schema.sections
  const isAdd = !user
  const initial = useRef(isAdd ? emptyValues() : valuesFrom(user))
  const [values, setValues] = useState(initial.current)
  const [errors, setErrors] = useState({})
  const [gateOpen, setGateOpen] = useState(isAdd)
  const [open, setOpen] = useState(() => {
    const o = {}
    schemaSections().forEach((s, i) => { o[s.id] = i === 0 })
    o.documents = false
    o.exception = false
    o.entitlements = false
    return o
  })
  const [docs, setDocs] = useState({})
  const [exception, setException] = useState({ on: false, reason: '', expires: '', approver: '' })
  const [granted, setGranted] = useState(() => new Set(isAdd ? [] : entitlementsFor(user).map((e) => e.group)))
  const [groupQ, setGroupQ] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)
  const [expandedApps, setExpandedApps] = useState(() => new Set())

  const sections = useMemo(() => SECTIONS.slice().sort((a, b) => a.order - b.order), [SECTIONS])
  // `Hide` means hide: an attribute an administrator may not see is not on the
  // form at all, rather than shown and rejected on save.
  const formAttrs = useMemo(() => visibleAttrs(ATTRS), [ATTRS])
  const attrsFor = (sectionId) => formAttrs
    .filter((a) => a.section === sectionId && !(isAdd && a.id === 'employeeType'))
    .sort((a, b) => a.order - b.order)

  const baselineGranted = useMemo(() => (isAdd ? [] : entitlementsFor(user).map((e) => e.group)), [isAdd, user])

  const dirty = useMemo(() => {
    if (isAdd) return Object.values(values).some((v) => v !== '') || granted.size > 0 || Object.keys(docs).length > 0 || exception.on
    const changed = ATTRS.some((a) => values[a.id] !== initial.current[a.id])  // eslint-disable-line
    const grantsChanged = granted.size !== baselineGranted.length || baselineGranted.some((g) => !granted.has(g))
    return changed || grantsChanged || Object.keys(docs).length > 0 || exception.on
  }, [values, granted, docs, exception, isAdd, baselineGranted])

  const set = (id, value) => {
    setValues((v) => ({ ...v, [id]: value }))
    setErrors((e) => (e[id] ? { ...e, [id]: undefined } : e))
  }

  const toggleGrant = (name) => setGranted((g) => {
    const next = new Set(g)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    return next
  })

  const sodPicked = GROUPS.filter((g) => granted.has(g.name) && g.sodFlags > 0)

  const filteredBlocks = useMemo(() => {
    const q = groupQ.trim().toLowerCase()
    if (!q && !onlySelected) return APP_GROUPS
    return APP_GROUPS
      .map((b) => {
        const appMatch = q ? b.application.toLowerCase().includes(q) : true
        return {
          ...b,
          groups: b.groups.filter((g) => {
            if (onlySelected && !granted.has(g.name)) return false
            if (!q) return true
            return appMatch || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
          }),
        }
      })
      .filter((b) => b.groups.length > 0)
  }, [groupQ, onlySelected, granted])

  const usernameClash = useMemo(() => {
    const raw = String(values.username || '').trim().toLowerCase()
    if (!raw) return null
    const directory = existing && existing.length ? existing : USERS
    return directory.find((u) => u.username.toLowerCase() === raw && (isAdd || u.id !== user.id)) || null
  }, [values.username, existing, isAdd, user])

  const allExpanded = filteredBlocks.length > 0 && filteredBlocks.every((b) => expandedApps.has(b.application))
  const toggleAllApps = () => setExpandedApps(allExpanded ? new Set() : new Set(APP_GROUPS.map((b) => b.application)))

  const sectionErrors = (sectionId) => attrsFor(sectionId).filter((a) => errors[a.id]).length

  const validate = () => {
    const next = {}
    if (isAdd && !values.employeeType) next.employeeType = 'Choose an employee type before continuing.'
    ATTRS.forEach((a) => {
      if (isAdd && a.id === 'employeeType') return
      if (a.req && !String(values[a.id] || '').trim()) next[a.id] = `${a.label} is required.`
    })
    if (values.email && !EMAIL_RE.test(values.email)) next.email = 'Enter a valid email address.'
    if (values.username) {
      const directory = existing && existing.length ? existing : USERS
      const clash = directory.find((u) => u.username.toLowerCase() === values.username.trim().toLowerCase() && (isAdd || u.id !== user.id))
      if (clash) next.username = usernameClashMessage(clash)
      else if (!/^[A-Za-z0-9_.-]+$/.test(values.username.trim())) next.username = 'Use letters, digits, underscore, dot or hyphen only.'
    }
    if (values.mobileNo && values.mobileNo.replace(/\D/g, '').length < 8) next.mobileNo = 'Enter a reachable mobile number.'
    // An attribute declared unique is enforced against the directory, not only
    // documented in the schema editor.
    const directoryRows = existing && existing.length ? existing : USERS
    formAttrs.filter((a) => a.unique && a.id !== 'username').forEach((a) => {
      const v = String(values[a.id] || '').trim()
      if (!v) return
      const clash = directoryRows.find((u) => String(u[a.id] || '').trim().toLowerCase() === v.toLowerCase()
        && (isAdd || u.id !== user.id))
      if (clash) next[a.id] = `${a.label} must be unique. ${clash.username} already holds “${v}”.`
    })
    if (exception.on && !exception.reason.trim()) next.exceptionReason = 'A written justification is required for a policy exception.'
    DOC_TYPES.filter((d) => d.required).forEach((d) => {
      if (isAdd && !docs[d.id]) next[`doc-${d.id}`] = `${d.label} must be attached.`
    })
    return next
  }

  const submit = () => {
    const next = validate()
    setErrors(next)
    const keys = Object.keys(next).filter((k) => next[k])
    if (keys.length) {
      const opened = { ...open }
      sections.forEach((s) => { if (attrsFor(s.id).some((a) => next[a.id])) opened[s.id] = true })
      if (keys.some((k) => k.startsWith('doc-'))) opened.documents = true
      if (next.exceptionReason) opened.exception = true
      setOpen(opened)
      if (next.employeeType) setGateOpen(true)
      toast('warn', 'Cannot save yet', `${keys.length} ${keys.length === 1 ? 'field needs' : 'fields need'} attention before this identity can be written.`)
      return
    }
    const payload = {
      ...values,
      entitlements: [...granted],
      documents: Object.keys(docs).length,
      exception: exception.on,
    }
    if (isAdd) {
      confirm({
        tone: 'ok',
        title: `Create ${values.username}?`,
        body: `The identity is written to the directory with ${granted.size} entitlements and provisioned to every connected target on the next run. A single-use enrollment link is mailed to ${values.email || 'the registered address'}.`,
        confirmLabel: 'Create identity',
        onConfirm: () => onCreate(payload),
      })
      return
    }
    onSave(payload)
  }

  const renderInput = (a) => {
    const id = `f-${a.id}`
    // `Read only` is a schema fact, not a form fact: the value is shown but the
    // authoritative source is the only thing that writes it.
    const locked = a.adminPerm === 'Read only'
    if (a.type === 'select' || a.type === 'lookup' || a.type === 'multi-level') {
      const options = optionsFor(a.src)
      // Attribute Configuration can mark a lookup attribute as multi-valued.
      // Stored as a comma-separated string so the record shape, the CSV import
      // and the table cell all keep working unchanged.
      if (a.multiValue) {
        const held = String(values[a.id] || '').split(',').map((v) => v.trim()).filter(Boolean)
        return (
          <SearchSelect
            id={id}
            multiple
            disabled={locked}
            value={held}
            placeholder={`Select ${a.label.toLowerCase()}`}
            searchPlaceholder={`Search ${a.label.toLowerCase()}…`}
            options={options}
            onChange={(e) => set(a.id, e.target.value.join(', '))}
          />
        )
      }
      return (
        <SearchSelect
          id={id}
          disabled={locked}
          value={values[a.id] || ''}
          placeholder={`Select ${a.label.toLowerCase()}`}
          searchPlaceholder={`Search ${a.label.toLowerCase()}…`}
          options={options}
          onChange={(e) => set(a.id, e.target.value)}
        />
      )
    }
    if (a.type === 'textarea') {
      return <TextInput as="textarea" id={id} rows={3} disabled={locked} value={values[a.id] || ''} onChange={(e) => set(a.id, e.target.value)} />
    }
    return (
      <TextInput
        id={id}
        type={a.type === 'email' ? 'email' : a.type === 'tel' ? 'tel' : a.type === 'date' ? 'date' : a.type === 'number' ? 'number' : 'text'}
        disabled={locked}
        value={values[a.id] || ''}
        placeholder={a.type === 'date' ? undefined : a.label}
        onChange={(e) => set(a.id, e.target.value)}
      />
    )
  }

  const jump = (id) => {
    setOpen((o) => ({ ...o, [id]: true }))
    const el = document.getElementById(`sec-${id}`)
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const filled = (sectionId) => attrsFor(sectionId).filter((a) => String(values[a.id] || '').trim()).length
  const gated = isAdd && !values.employeeType

  const railSteps = [
    ...(isAdd ? [{ id: 'gate', label: 'Employee type', sub: values.employeeType || 'Not chosen', state: values.employeeType ? 'done' : 'active' }] : []),
    ...sections.map((s) => ({
      id: s.id,
      label: s.name,
      sub: `${filled(s.id)} of ${attrsFor(s.id).length} completed`,
      state: sectionErrors(s.id) ? 'error' : filled(s.id) === attrsFor(s.id).length ? 'done' : 'active',
    })),
    { id: 'documents', label: 'Documents', sub: `${Object.keys(docs).length} attached`, state: Object.keys(docs).length ? 'done' : 'active' },
    { id: 'exception', label: 'Policy exception', sub: exception.on ? 'Requested' : 'Not requested', state: exception.on ? 'done' : 'active' },
    { id: 'entitlements', label: 'Entitlements', sub: `${granted.size} selected`, state: granted.size ? 'done' : 'active' },
  ]

  const errorCount = Object.keys(errors).filter((k) => errors[k]).length

  return (
    <>
      <DetailHeader
        backTo={isAdd ? '/iam/users' : `/iam/users/${user.id}`}
        backLabel={isAdd ? 'Users' : user.username}
        eyebrow={isAdd ? 'New identity' : 'Edit identity'}
        title={isAdd ? (values.username || 'Untitled identity') : user.username}
        sub={isAdd
          ? 'Attributes, documents and entitlements are captured in one pass. Nothing is written to the directory until every required attribute validates.'
          : `Editing ${user.firstName} ${user.lastName}. Changes are versioned on the audit trail and pushed to every connected target on the next provisioning run.`}
        media={isAdd
          ? <Avatar name={`${values.firstName || 'N'} ${values.lastName || 'I'}`} size="xl" />
          : <Avatar first={user.firstName} last={user.lastName} size="xl" />}
        badges={(
          <>
            {values.employeeType && <Pill tone="acc" icon={TYPE_ICON[values.employeeType] || 'tag'}>{values.employeeType}</Pill>}
            {errorCount > 0 && <Pill tone="bad" icon="warn">{errorCount} to fix</Pill>}
          </>
        )}
        meta={!isAdd && (
          <>
            <Fact icon="layers" label="Organization" value={user.organization} />
            <Fact icon="building" label="Department" value={user.department} />
            <Fact icon="history" label="Created" value={user.createdOn} />
          </>
        )}
      />

      <div className="detail-body">
        {errorCount > 0 && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <Banner tone="bad">
              {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention. Sections with a problem have been expanded and the offending fields are marked below.
            </Banner>
          </div>
        )}

        <div className="wizard">
          <nav className="wiz-rail" aria-label="Form sections">
            {railSteps.map((s, i) => (
              <button key={s.id} className="wiz-step" data-state={s.state} onClick={() => (s.id === 'gate' ? setGateOpen(true) : jump(s.id))} style={{ width: '100%', textAlign: 'left' }}>
                <span className="wiz-n">{s.state === 'done' ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                <span className="wiz-m" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="wiz-t">{s.label}</span>
                  <span className="wiz-s">{s.sub}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="wiz-body stack">
            {isAdd && (
              <div id="sec-gate">
                <Card
                  title="Employee type"
                  sub="The type determines which attributes are mandatory, which password policy applies and which baseline entitlements are granted."
                  actions={values.employeeType && !gateOpen
                    ? <Button size="sm" icon="edit" onClick={() => setGateOpen(true)}>Change</Button>
                    : null}
                >
                  {gateOpen ? (
                    <>
                      <div className="grid grid-2">
                        {LOOKUPS.employee_type.map((t) => (
                          <button
                            key={t}
                            className="tile"
                            data-nav="true"
                            data-tone={values.employeeType === t ? 'ok' : undefined}
                            style={{ textAlign: 'left', borderColor: values.employeeType === t ? 'var(--accent)' : undefined }}
                            onClick={() => { set('employeeType', t); setGateOpen(false) }}
                          >
                            <span className="tile-k"><Icon name={TYPE_ICON[t]} size={12} />{t}</span>
                            <span className="t-xs t-mut" style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: 'normal' }}>{TYPE_BLURB[t]}</span>
                          </button>
                        ))}
                      </div>
                      {errors.employeeType && (
                        <div className="field-err" style={{ marginTop: 10 }}><Icon name="warn" size={11} />{errors.employeeType}</div>
                      )}
                    </>
                  ) : (
                    <div className="row" style={{ gap: 10 }}>
                      <Pill tone="acc" icon={TYPE_ICON[values.employeeType] || 'tag'}>{values.employeeType}</Pill>
                      <span className="t-sm t-mut">{TYPE_BLURB[values.employeeType]}</span>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {gated ? (
              <Card>
                <div className="empty" data-size="sm">
                  <div className="empty-ic"><Icon name="lock" size={19} /></div>
                  <div className="empty-t">Choose an employee type to continue</div>
                  <div className="empty-s">The attribute set, password policy and entitlement baseline all derive from the type. Nothing below can be captured until it is set.</div>
                </div>
              </Card>
            ) : (
              <>
                {sections.map((s) => {
                  const attrs = attrsFor(s.id)
                  if (!attrs.length) return null
                  const bad = sectionErrors(s.id)
                  return (
                    <AccordionCard
                      key={s.id}
                      id={`sec-${s.id}`}
                      title={s.name}
                      sub={[
                        `${attrs.length} attributes`,
                        attrs.filter((a) => a.req).length ? `${attrs.filter((a) => a.req).length} required` : null,
                        attrs.filter((a) => a.core).length ? `${attrs.filter((a) => a.core).length} synchronized to connected targets` : null,
                      ].filter(Boolean).join(' · ')}
                      open={!!open[s.id]}
                      onToggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                      status={bad
                        ? <Pill tone="bad" icon="warn">{bad}</Pill>
                        : <span className="tag">{filled(s.id)}/{attrs.length}</span>}
                      summary={attrs.filter((a) => values[a.id]).map((a) => `${a.label}: ${values[a.id]}`).join(' · ') || 'Nothing captured in this section yet.'}
                    >
                      <div className="grid grid-2">
                        {attrs.map((a) => (
                          <Field
                            key={a.id}
                            label={a.label}
                            required={a.req}
                            error={a.id === 'username' && usernameClash
                              ? usernameClashMessage(usernameClash)
                              : errors[a.id]}
                            htmlFor={`f-${a.id}`}
                            span={a.type === 'textarea' ? 2 : undefined}
                            hint={[
                              ATTR_HINT[a.id],
                              a.adminPerm === 'Read only' ? 'Read only — written by the authoritative source.' : null,
                              a.unique ? 'Must be unique across the directory.' : null,
                            ].filter(Boolean).join(' ')}
                          >
                            {renderInput(a)}
                          </Field>
                        ))}
                      </div>
                    </AccordionCard>
                  )
                })}

                <AccordionCard
                  id="sec-documents"
                  title="Documents"
                  sub="Onboarding evidence retained against the identity record"
                  open={!!open.documents}
                  onToggle={() => setOpen((o) => ({ ...o, documents: !o.documents }))}
                  status={<span className="tag">{Object.keys(docs).length}/{DOC_TYPES.length}</span>}
                  summary={Object.keys(docs).length ? DOC_TYPES.filter((d) => docs[d.id]).map((d) => d.label).join(' · ') : 'No documents attached.'}
                >
                  <div className="stack">
                    {DOC_TYPES.map((d) => (
                      <Field
                        key={d.id}
                        label={d.label}
                        required={d.required}
                        error={errors[`doc-${d.id}`]}
                        hint={docs[d.id] ? `Attached: ${docs[d.id]}` : d.hint}
                        htmlFor={`doc-${d.id}`}
                      >
                        <div className="row" style={{ gap: 8 }}>
                          <TextInput
                            id={`doc-${d.id}`}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const f = e.target.files && e.target.files[0] ? e.target.files[0].name : ''
                              setDocs((s) => (f ? { ...s, [d.id]: f } : Object.fromEntries(Object.entries(s).filter(([k]) => k !== d.id))))
                              setErrors((s) => ({ ...s, [`doc-${d.id}`]: undefined }))
                            }}
                          />
                          {docs[d.id] && <Pill tone="ok" dot>Attached</Pill>}
                        </div>
                      </Field>
                    ))}
                  </div>
                </AccordionCard>

                <AccordionCard
                  id="sec-exception"
                  title="Policy exception"
                  sub="Bypass an organization control for this identity only"
                  open={!!open.exception}
                  onToggle={() => setOpen((o) => ({ ...o, exception: !o.exception }))}
                  status={exception.on ? <Pill tone="warn" icon="warn">Requested</Pill> : <span className="tag">None</span>}
                  summary={exception.on ? exception.reason || 'Exception requested without a justification.' : 'This identity follows every organization policy.'}
                >
                  <div className="stack">
                    <div className="row-between">
                      <div style={{ minWidth: 0 }}>
                        <div className="t-sm" style={{ fontWeight: 600 }}>Request a policy exception</div>
                        <div className="t-xs t-mut" style={{ marginTop: 2, lineHeight: 1.5 }}>
                          Exempts the identity from the password policy, MFA enforcement or the dormancy sweep. Every exception is
                          time-boxed, reported to the compliance owner and re-examined at each attestation.
                        </div>
                      </div>
                      <Switch checked={exception.on} label="Request a policy exception" onChange={(v) => setException((s) => ({ ...s, on: v }))} />
                    </div>
                    {exception.on && (
                      <>
                        <Banner tone="warn">
                          Exceptions weaken the control baseline and are sampled during external audit. Keep the window as short as the business case allows.
                        </Banner>
                        <Field label="Justification" required error={errors.exceptionReason} htmlFor="exc-reason">
                          <TextInput
                            as="textarea"
                            id="exc-reason"
                            rows={3}
                            value={exception.reason}
                            placeholder="Why this identity cannot meet the standard control, and what compensating control applies."
                            onChange={(e) => { setException((s) => ({ ...s, reason: e.target.value })); setErrors((s) => ({ ...s, exceptionReason: undefined })) }}
                          />
                        </Field>
                        <div className="grid grid-2">
                          <Field label="Expires on" hint="The exception lapses automatically on this date." htmlFor="exc-exp">
                            <TextInput id="exc-exp" type="date" value={exception.expires} onChange={(e) => setException((s) => ({ ...s, expires: e.target.value }))} />
                          </Field>
                          <Field label="Accountable approver" hint="Named owner who carries the residual risk." htmlFor="exc-app">
                            <SearchSelect
                              id="exc-app"
                              value={exception.approver}
                              placeholder="Select an approver"
                              searchPlaceholder="Search approvers…"
                              options={optionsFor('managers').slice(0, 40)}
                              onChange={(e) => setException((s) => ({ ...s, approver: e.target.value }))}
                            />
                          </Field>
                        </div>
                      </>
                    )}
                  </div>
                </AccordionCard>

                <AccordionCard
                  id="sec-entitlements"
                  title="Entitlements"
                  sub="Grant access per application. Baseline grants from the organization policy are applied automatically on save."
                  open={!!open.entitlements}
                  onToggle={() => setOpen((o) => ({ ...o, entitlements: !o.entitlements }))}
                  status={<span className="tag" data-tone={granted.size ? 'acc' : undefined}>{granted.size} selected</span>}
                  summary={granted.size
                    ? [...granted].slice(0, 6).join(' · ') + (granted.size > 6 ? ` · +${granted.size - 6} more` : '')
                    : 'No entitlements selected.'}
                >
                  <div className="stack">
                    {sodPicked.length > 0 && (
                      <Banner tone="warn">
                        {`${sodPicked.length} of the selected groups carry segregation-of-duties flags and will be evaluated against the conflict register before provisioning.`}
                      </Banner>
                    )}

                    <div className="gp-head">
                      <TextInput
                        type="search"
                        aria-label="Search groups"
                        placeholder={`Search ${GROUPS.length} groups by name, application or purpose…`}
                        value={groupQ}
                        onChange={(e) => setGroupQ(e.target.value)}
                      />
                      <button
                        type="button"
                        className="chip"
                        data-on={onlySelected}
                        aria-pressed={onlySelected}
                        disabled={granted.size === 0}
                        onClick={() => setOnlySelected((v) => !v)}
                      >
                        <Icon name="filter" size={12} />Selected only
                      </button>
                      <span className="tag" data-tone={granted.size ? 'acc' : undefined}>{granted.size} of {GROUPS.length} selected</span>
                      <Button size="sm" icon={allExpanded ? 'chevU' : 'chevD'} onClick={toggleAllApps}>
                        {allExpanded ? 'Collapse all' : 'Expand all'}
                      </Button>
                      {granted.size > 0 && (
                        <Button size="sm" icon="x" onClick={() => setGranted(new Set())}>Clear all</Button>
                      )}
                    </div>

                    {granted.size > 0 && (
                      <div className="gp-chips" aria-label="Selected groups">
                        {[...granted].sort().map((name) => (
                          <span className="gp-chip" key={name}>
                            <span>{name}</span>
                            <button type="button" aria-label={`Remove ${name}`} onClick={() => toggleGrant(name)}>
                              <Icon name="x" size={10} stroke={2.2} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="gp-panel" role="group" aria-label="Available groups by application">
                      {filteredBlocks.length === 0 ? (
                        <div className="gp-empty">
                          {onlySelected && !groupQ.trim()
                            ? 'No groups selected yet. Turn off “Selected only” to browse the catalog.'
                            : `No groups match “${groupQ.trim()}”. Try a shorter term or the application name.`}
                        </div>
                      ) : filteredBlocks.map((block) => {
                        const picked = block.groups.filter((g) => granted.has(g.name)).length
                        const all = picked === block.groups.length
                        const isOpen = expandedApps.has(block.application) || !!groupQ.trim() || onlySelected
                        return (
                          <div key={block.application} className="gp-app">
                            <div className="gp-app-h">
                              <Check
                                checked={all}
                                mixed={!all && picked > 0}
                                label={`Select every group in ${block.application}`}
                                onChange={() => setGranted((g) => {
                                  const next = new Set(g)
                                  block.groups.forEach((x) => (all ? next.delete(x.name) : next.add(x.name)))
                                  return next
                                })}
                              />
                              <button
                                type="button"
                                className="gp-app-btn"
                                aria-expanded={isOpen}
                                onClick={() => setExpandedApps((s) => {
                                  const next = new Set(s)
                                  if (next.has(block.application)) next.delete(block.application)
                                  else next.add(block.application)
                                  return next
                                })}
                              >
                                <Icon name={isOpen ? 'chevU' : 'chevD'} size={13} />
                                <span className="gp-app-name">{block.application}</span>
                              </button>
                              <span className="tag" data-tone={picked ? 'acc' : undefined}>{picked}/{block.groups.length}</span>
                            </div>
                            {isOpen && (
                              <div className="gp-groups">
                                {block.groups.map((g) => (
                                  <div
                                    className="gp-row"
                                    key={g.id}
                                    data-on={granted.has(g.name)}
                                    title={`${g.description} Owner ${g.owner}.`}
                                    onClick={() => toggleGrant(g.name)}
                                  >
                                    <Check checked={granted.has(g.name)} onChange={() => toggleGrant(g.name)} label={`Grant ${g.name}`} />
                                    <span className="gp-row-name">{g.name}</span>
                                    <span className="gp-row-meta">
                                      {g.sodFlags > 0 && <Pill tone="viol" icon="sod">{g.sodFlags}</Pill>}
                                      <span className="tag">{g.kind}</span>
                                      <span className="gp-row-members">{g.members}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="t-xs t-mut">
                      Groups are laid out in columns beneath the application that owns them, so a target carrying a couple of
                      hundred subgroups stays scannable. Applications stay collapsed until opened and searching expands every
                      match automatically. Groups flagged SoD are evaluated against the conflict register before provisioning.
                    </div>
                  </div>
                </AccordionCard>

                {isAdd && (
                  <Card title="Credentials" sub="Delivered by email — no manual handover">
                    <Banner tone="info">
                      A single-use enrollment link is emailed to {values.email ? <b>{values.email}</b> : 'the registered address'} when
                      the identity is created. The link expires after 24 hours and a password change is forced at first sign-in.
                      No credential is ever typed or handled by an operator.
                    </Banner>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <StickyActions dirty={dirty} message={dirty ? 'Unsaved changes' : 'No changes'}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" onClick={submit}>
          {isAdd ? 'Create identity' : 'Save changes'}
        </Button>
      </StickyActions>
    </>
  )
}
