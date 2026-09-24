import './SelfEnrollmentPage.css'
import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import { stampStr } from '../users/identityData'
import { useUsers, writeUsers } from '../users/usersStore'
import EnrollForm, { STEPS } from './EnrollForm'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'

/* What happens after the form, in the order it happens. */
const NEXT_STEPS = [
  { icon: 'checkC', title: 'Enrollment received', body: 'Your details and documents are on record against the reference above.' },
  { icon: 'user', title: 'Administrator review', body: 'The identity team checks your details, your organization and the documents you attached.' },
  { icon: 'mail', title: 'Activation email', body: 'Once approved, a single-use link arrives by email so you can set your password and enrol a second factor.' },
]

/* Why each thing is asked for, said once beside the form rather than repeated
   under every field. */
const ASSURANCES = [
  { icon: 'lock', text: 'Nothing is created until an administrator approves it.' },
  { icon: 'shield', text: 'Your documents are held against this enrollment alone.' },
  { icon: 'consent', text: 'You can withdraw consent later from your own profile.' },
]

function Submitted({ enrollment, onDone }) {
  return (
    <div className="en-done" role="status">
      <span className="en-done-ic"><Icon name="checkC" size={26} /></span>
      <h1 className="en-done-h">Enrollment submitted</h1>
      <p className="en-done-s">
        Thank you{enrollment.name ? `, ${enrollment.name}` : ''}. Your reference is <b className="mono">{enrollment.reference}</b>.
        {enrollment.email ? <> Updates go to <b>{enrollment.email}</b>.</> : null}
      </p>
      <ol className="en-steps">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.title} className="en-step" data-state={i === 0 ? 'done' : undefined}>
            <span className="en-step-ic"><Icon name={s.icon} size={13} /></span>
            <span className="en-step-m">
              <span className="en-step-t">{s.title}</span>
              <span className="en-step-b">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button variant="pri" size="lg" icon="lock" onClick={onDone}>Back to sign in</Button>
    </div>
  )
}

/**
 * Self-enrollment.
 *
 * The way in for someone the directory does not know yet, and the only page in
 * the console written for a person who has never seen it. It carries its own
 * shell — no sidebar, no register chrome — and asks four short questions in
 * order. What it creates is a pending identity for an administrator to approve,
 * never an active account.
 */
export default function SelfEnrollmentPage() {
  const { navigate, theme, toast } = useApp()
  const existing = useUsers()
  const [enrollment, setEnrollment] = useState(null)
  const [at, setAt] = useState(0)

  const submit = (payload) => {
    const username = String(payload.username || '').trim().toUpperCase()
    const id = nextId(existing)
    const reference = `ENR-${4200 + id}`
    writeUsers((rows) => [{
      ...payload,
      id,
      username,
      status: 'Pending',
      createdOn: stampStr(0),
      createdBy: 'Self-enrollment',
      lastLogin: '',
    }, ...rows])
    setEnrollment({
      reference,
      email: payload.email,
      name: [payload.firstName, payload.lastName].filter(Boolean).join(' '),
    })
    toast('ok', 'Enrollment submitted', `Reference ${reference}. An administrator will review it before an account is created.`)
  }

  return (
    <div className="en-page">
      <aside className="en-rail">
        <div className="en-rail-top">
          <img src={theme === 'dark' ? wordmarkWhite : wordmarkDark} alt="Tanflow" className="en-logo" />
          <h2 className="en-rail-h">Create your Tanflow identity</h2>
          <p className="en-rail-s">
            Four short steps. It takes a couple of minutes, and you can see everything you have entered before it is sent.
          </p>
        </div>

        {!enrollment && (
          <ol className="en-rail-steps" aria-label="Enrollment steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className="en-rail-step" data-state={i === at ? 'active' : i < at ? 'done' : 'future'}>
                <span className="en-rail-n">{i < at ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                <span className="en-rail-m">
                  <span className="en-rail-t">{s.title}</span>
                  <span className="en-rail-b">{s.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <ul className="en-assure">
          {ASSURANCES.map((a) => (
            <li key={a.text}><Icon name={a.icon} size={13} />{a.text}</li>
          ))}
        </ul>
      </aside>

      <main className="en-main">
        <header className="en-main-h">
          <span className="en-main-q">Already have an account?</span>
          <Button size="sm" icon="lock" onClick={() => navigate('login')}>Sign in</Button>
        </header>

        <div className="en-main-b">
          {enrollment
            ? <Submitted enrollment={enrollment} onDone={() => navigate('login')} />
            : <EnrollForm onSubmit={submit} onCancel={() => navigate('login')} onStep={setAt} />}
        </div>
      </main>
    </div>
  )
}
