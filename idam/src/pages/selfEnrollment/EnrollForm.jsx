import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Field from '../../components/primitives/Field'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import { useApp } from '../../store/AppContext'
import { DEPARTMENTS, LOOKUPS, ORGS } from '../../data/seed'
import ConsentDocumentOverlay from '../consentGate/ConsentDocumentOverlay'
import { REGISTRATION_DOCUMENT } from '../consentGate/consentGateData'

/**
 * The enrollment form.
 *
 * Deliberately not the Add User form. That form is an administrator's
 * instrument — every attribute the tenant defines, a rail of sections, an
 * entitlement picker — and putting it in front of a new joiner asked them to
 * answer for a directory they have never seen. This asks four short questions
 * in order, says why each is needed, and shows what will be submitted before it
 * is. The record it produces is the same one either way.
 */

export const STEPS = [
  { id: 'you', title: 'About you', sub: 'Your name and how to reach you', icon: 'user' },
  { id: 'work', title: 'Your role', sub: 'Where you work and what you do', icon: 'building' },
  { id: 'verify', title: 'Verification', sub: 'Proof of identity and consent', icon: 'shield' },
  { id: 'review', title: 'Review', sub: 'Check it, then submit', icon: 'checkC' },
]

const EMPLOYEE_TYPES = LOOKUPS.employee_type.filter((t) => t !== 'Service Account')

const blank = () => ({
  firstName: '',
  lastName: '',
  email: '',
  mobileNo: '',
  employeeType: 'Internal',
  organization: '',
  department: '',
  designation: '',
  empCode: '',
  manager: '',
  country: LOOKUPS.country[0],
  state: '',
  city: '',
  accurate: false,
  privacy: false,
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^\+?[\d\s-]{7,15}$/

/* The sign-in name the directory will hold, shown before it is created so the
   person recognises it in the activation email. */
export const usernameFor = (d) => `${d.firstName}_${d.lastName}`.toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'NEW_USER'

/* The notice a registration is asked to agree to. Self-enrollment and the
   tokenised invitation are two doors into the same registration, so they put
   the same published document in front of the person walking through. */
const CONSENT = REGISTRATION_DOCUMENT

const issuesFor = (d, docs, acknowledged) => ({
  you: {
    firstName: !d.firstName.trim() ? 'Enter your first name.' : '',
    lastName: !d.lastName.trim() ? 'Enter your last name.' : '',
    email: !d.email.trim() ? 'Enter an email address.' : !EMAIL_RE.test(d.email.trim()) ? 'That is not an email address.' : '',
    mobileNo: !d.mobileNo.trim() ? 'Enter a mobile number.' : !MOBILE_RE.test(d.mobileNo.trim()) ? 'Use digits, spaces or dashes, 7 to 15 long.' : '',
  },
  work: {
    organization: !d.organization ? 'Choose the organization you are joining.' : '',
    department: !d.department ? 'Choose a department.' : '',
    designation: !d.designation.trim() ? 'Enter your job title.' : '',
  },
  verify: {
    documents: docs.length === 0 ? 'Attach at least one document.' : '',
    accurate: !d.accurate ? 'Confirm the details are accurate.' : '',
    /* Two different things are missing depending on how far they got, and
       "acknowledge the privacy notice" tells someone who has not opened it
       nothing about what to do next. */
    privacy: d.privacy
      ? ''
      : (acknowledged ? 'Agree to the Terms & Policy.' : 'Open the Terms & Policy, then agree to it.'),
  },
  review: {},
})

const countOf = (errs) => Object.values(errs).filter(Boolean).length

export default function EnrollForm({ onSubmit, onCancel, onStep }) {
  const { toast, confirm } = useApp()
  const [d, setD] = useState(blank)
  const [docs, setDocs] = useState([])
  const [at, setAt] = useState(0)
  const [attempted, setAttempted] = useState(() => new Set())
  /* The gate on the agreement: the checkbox stays inert until the notice has
     been opened and dismissed with "I Understand", because an agreement ticked
     by someone who was never shown the text is not evidence of anything. */
  const [lang, setLang] = useState(CONSENT.defaultLang)
  const [docOpen, setDocOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const step = STEPS[at]
  const errs = useMemo(() => issuesFor(d, docs, acknowledged), [d, docs, acknowledged])
  const shown = (id) => (attempted.has(id) ? errs[id] : {})

  const stateOf = (i) => {
    if (i === at) return 'active'
    if (i < at || attempted.has(STEPS[i].id)) return countOf(errs[STEPS[i].id]) ? 'error' : 'done'
    return 'future'
  }

  /* The page draws the step rail beside the card, so every move is reported
     rather than mirrored in two places. */
  const land = (i) => { setAt(i); if (onStep) onStep(i) }

  const go = (next) => {
    if (next > at) {
      setAttempted((a) => new Set([...a, step.id]))
      const n = countOf(errs[step.id])
      if (n) {
        toast('warn', 'Not ready to continue', `${n} ${n === 1 ? 'answer needs' : 'answers need'} attention on this step.`)
        return
      }
    }
    land(Math.max(0, Math.min(STEPS.length - 1, next)))
  }

  const submit = () => {
    const blocking = STEPS.filter((s) => countOf(errs[s.id]))
    if (blocking.length) {
      setAttempted(new Set(STEPS.map((s) => s.id)))
      land(STEPS.findIndex((s) => s.id === blocking[0].id))
      toast('warn', 'Cannot submit yet', `${blocking[0].title} is incomplete.`)
      return
    }
    confirm({
      tone: 'ok',
      title: 'Submit your enrollment?',
      body: `Your details and documents go to the identity team for review. Nothing is created until an administrator approves it, and you hear back at ${d.email}.`,
      confirmLabel: 'Submit enrollment',
      onConfirm: () => onSubmit({
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        username: usernameFor(d),
        email: d.email.trim().toLowerCase(),
        mobileNo: d.mobileNo.trim(),
        employeeType: d.employeeType,
        organization: d.organization,
        department: d.department,
        designation: d.designation.trim(),
        empCode: d.empCode.trim(),
        manager: d.manager.trim(),
        country: d.country,
        state: d.state,
        city: d.city,
        documents: docs.length,
        entitlements: [],
      }),
    })
  }

  const summary = [
    { k: 'Name', v: `${d.firstName} ${d.lastName}`.trim() || '—' },
    { k: 'Sign-in name', v: usernameFor(d), mono: true },
    { k: 'Email', v: d.email || '—' },
    { k: 'Mobile', v: d.mobileNo || '—' },
    { k: 'Employee type', v: d.employeeType },
    { k: 'Organization', v: d.organization || '—' },
    { k: 'Department', v: d.department || '—' },
    { k: 'Job title', v: d.designation || '—' },
    { k: 'Employee code', v: d.empCode || 'Assigned on approval' },
    { k: 'Manager', v: d.manager || '—' },
    { k: 'Location', v: [d.city, d.state, d.country].filter(Boolean).join(', ') || '—' },
    { k: 'Documents', v: docs.length ? `${docs.length} attached` : 'None' },
  ]

  return (
    <>
      <div className="en-card">
        <div className="en-card-h">
          <div className="en-card-hm">
            <span className="en-step-n">Step {at + 1} of {STEPS.length}</span>
            <h1 className="en-card-t">{step.title}</h1>
            <p className="en-card-s">{step.sub}</p>
          </div>
          <div className="en-progress" role="progressbar" aria-valuenow={at + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            <span style={{ width: `${((at + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <div className="en-card-b">
          {step.id === 'you' && (
            <div className="grid grid-2">
              <Field label="First name" required error={shown('you').firstName} htmlFor="en-first">
                <TextInput id="en-first" value={d.firstName} placeholder="Ananya" autoComplete="given-name" onChange={(e) => set({ firstName: e.target.value })} />
              </Field>
              <Field label="Last name" required error={shown('you').lastName} htmlFor="en-last">
                <TextInput id="en-last" value={d.lastName} placeholder="Rao" autoComplete="family-name" onChange={(e) => set({ lastName: e.target.value })} />
              </Field>
              <Field
                label="Email address"
                required
                error={shown('you').email}
                hint="Your activation link and every update about this enrollment go here."
                htmlFor="en-email"
              >
                <TextInput id="en-email" type="email" value={d.email} placeholder="ananya.rao@tanflow.com" autoComplete="email" onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Mobile number" required error={shown('you').mobileNo} hint="Used for the one-time code when you first sign in." htmlFor="en-mobile">
                <TextInput id="en-mobile" value={d.mobileNo} placeholder="+91 98765 43210" autoComplete="tel" onChange={(e) => set({ mobileNo: e.target.value })} />
              </Field>
              <Field label="I am joining as" required span={2} htmlFor="en-type">
                <div className="en-choices" role="radiogroup" aria-label="Employee type">
                  {EMPLOYEE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={d.employeeType === t}
                      className="en-choice"
                      data-on={d.employeeType === t || undefined}
                      onClick={() => set({ employeeType: t })}
                    >
                      <span className="en-choice-d" aria-hidden="true" />
                      <span className="en-choice-m">
                        <span className="en-choice-t">{t}</span>
                        <span className="en-choice-s">
                          {t === 'Internal' ? 'On the payroll of this organization' : t === 'Contractor' ? 'Engaged through a contract with an end date' : 'A partner or vendor with limited access'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step.id === 'work' && (
            <div className="grid grid-2">
              <Field label="Organization" required error={shown('work').organization} htmlFor="en-org">
                <Select id="en-org" value={d.organization} placeholder="Select an organization" options={ORGS} onChange={(e) => set({ organization: e.target.value })} />
              </Field>
              <Field label="Department" required error={shown('work').department} htmlFor="en-dept">
                <Select id="en-dept" value={d.department} placeholder="Select a department" options={DEPARTMENTS} onChange={(e) => set({ department: e.target.value })} />
              </Field>
              <Field label="Job title" required error={shown('work').designation} htmlFor="en-title">
                <TextInput id="en-title" value={d.designation} placeholder="Senior Engineer" onChange={(e) => set({ designation: e.target.value })} />
              </Field>
              <Field label="Employee code" hint="Leave blank if you have not been given one yet." htmlFor="en-code">
                <TextInput id="en-code" className="mono" value={d.empCode} placeholder="EMP1042" onChange={(e) => set({ empCode: e.target.value })} />
              </Field>
              <Field label="Reporting manager" hint="The person who will be asked to confirm this enrollment." htmlFor="en-manager">
                <TextInput id="en-manager" value={d.manager} placeholder="Shubham Jain" onChange={(e) => set({ manager: e.target.value })} />
              </Field>
              <Field label="Country" htmlFor="en-country">
                <Select id="en-country" value={d.country} options={LOOKUPS.country} onChange={(e) => set({ country: e.target.value })} />
              </Field>
              <Field label="State" htmlFor="en-state">
                <Select id="en-state" value={d.state} placeholder="Select a state" options={LOOKUPS.state} onChange={(e) => set({ state: e.target.value })} />
              </Field>
              <Field label="City" htmlFor="en-city">
                <Select id="en-city" value={d.city} placeholder="Select a city" options={LOOKUPS.city} onChange={(e) => set({ city: e.target.value })} />
              </Field>
            </div>
          )}

          {step.id === 'verify' && (
            <div className="stack">
              <Field
                label="Proof of identity"
                required
                error={shown('verify').documents}
                hint="A government photo ID, and your offer or contract letter if you have one. PDF, PNG or JPG up to 5 MB each."
              >
                <FileDrop
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  label="Drop your documents here, or choose files"
                  onFiles={(files) => setDocs((list) => [...list, ...files.map((f) => ({ name: f.name, size: f.size }))])}
                />
              </Field>

              {docs.length > 0 && (
                <ul className="en-docs">
                  {docs.map((f, i) => (
                    <li className="en-doc" key={`${f.name}-${i}`}>
                      <Icon name="file" size={14} />
                      <span className="en-doc-n trunc">{f.name}</span>
                      <span className="en-doc-s">{formatSize(f.size)}</span>
                      <button type="button" className="en-doc-x" aria-label={`Remove ${f.name}`} onClick={() => setDocs((list) => list.filter((_, k) => k !== i))}>
                        <Icon name="x" size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="en-consents">
                <div className="en-consent">
                  <Check checked={d.accurate} onChange={(v) => set({ accurate: v })} label="The details I have given are accurate" />
                  <span className="en-consent-m">
                    <span className="en-consent-t">The details I have given are accurate</span>
                    <span className="en-consent-s">Anything that does not match your documents will be sent back for correction.</span>
                  </span>
                </div>

                {/* The same gated consent the invitation carries, raising the same
                    published notice. Registering is registering whichever door it
                    was reached through, so it cannot ask for less here. */}
                <div className="en-consent" data-locked={!acknowledged || undefined}>
                  <Check
                    checked={d.privacy}
                    disabled={!acknowledged}
                    onChange={(v) => set({ privacy: v })}
                    label={`I agree to the ${CONSENT.title}`}
                  />
                  <span className="en-consent-m">
                    <span className="en-consent-t">
                      I agree to the{' '}
                      <button type="button" className="link en-consent-link" onClick={() => setDocOpen(true)}>
                        Terms &amp; Policy
                        <Icon name="external" size={12} />
                      </button>
                    </span>
                    <span className="en-consent-s">
                      Your details are processed to create and administer your identity, and kept for as long as that identity exists.
                      Consent can be withdrawn afterwards from your profile.
                    </span>
                    {acknowledged ? (
                      <span className="en-consent-g" data-done="true">
                        <Icon name="checkC" size={12} />
                        You opened version {CONSENT.version} of the Terms &amp; Policy. Tick the box to agree to it.
                      </span>
                    ) : (
                      <span className="en-consent-g">
                        <Icon name="lock" size={12} />
                        Open the Terms &amp; Policy and click <b>I Understand</b> to enable this checkbox.
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {(shown('verify').accurate || shown('verify').privacy) && (
                <Banner tone="warn">
                  {shown('verify').privacy && !acknowledged
                    ? 'The Terms & Policy has to be opened and agreed to before an enrollment can be submitted.'
                    : 'Both confirmations are needed before an enrollment can be submitted.'}
                </Banner>
              )}
            </div>
          )}

          {step.id === 'review' && (
            <div className="stack">
              <Banner tone="info">
                Nothing is created yet. An administrator reviews this and, once approved, emails a single-use link to
                <b> {d.email || 'your email address'}</b> so you can set a password.
              </Banner>
              <dl className="en-sum">
                {summary.map((s) => (
                  <div className="en-sum-r" key={s.k}>
                    <dt>{s.k}</dt>
                    <dd className={s.mono ? 'mono' : undefined}>{s.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="en-sum-docs">
                {docs.length === 0
                  ? <Tag tone="warn">No documents attached</Tag>
                  : docs.map((f, i) => <Tag key={`${f.name}-${i}`}>{f.name}</Tag>)}
              </div>
            </div>
          )}
        </div>

        <div className="en-card-f">
          <Button onClick={at === 0 ? onCancel : () => go(at - 1)} icon={at === 0 ? 'x' : 'chevL'}>
            {at === 0 ? 'Cancel' : 'Back'}
          </Button>
          <span className="spacer" />
          {at < STEPS.length - 1
            ? <Button variant="pri" iconRight="chevR" onClick={() => go(at + 1)}>Continue</Button>
            : <Button variant="pri" icon="check" onClick={submit}>Submit enrollment</Button>}
        </div>
      </div>

      {/* Escape leaves the notice without acknowledging it, so the checkbox
          above stays inert — an overlay dismissed by accident has not been
          read. */}
      {docOpen && (
        <ConsentDocumentOverlay
          doc={CONSENT}
          lang={lang}
          onLang={setLang}
          onUnderstand={() => { setAcknowledged(true); setDocOpen(false) }}
          onClose={() => setDocOpen(false)}
        />
      )}
    </>
  )
}
