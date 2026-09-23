import './SelfEnrollmentPage.css'
import { useState } from 'react'
import IdentityForm from '../users/IdentityForm'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import { stampStr } from '../users/identityData'
import { useUsers, writeUsers } from '../users/usersStore'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'

/* What happens after the form, in the order it happens. */
const NEXT_STEPS = [
  { icon: 'checkC', title: 'Enrollment received', body: 'Your details and documents are on record against the reference above.' },
  { icon: 'user', title: 'Administrator review', body: 'The identity team checks your details, your organization and the documents you attached.' },
  { icon: 'mail', title: 'Activation email', body: 'Once approved, a single-use link arrives by email so you can set your password and enroll a second factor.' },
]

function Submitted({ enrollment, onDone }) {
  return (
    <div className="se-done" role="status">
      <span className="se-done-ic"><Icon name="checkC" size={24} /></span>
      <h1 className="se-done-h">Enrollment submitted</h1>
      <p className="se-done-s">
        Thank you{enrollment.name ? `, ${enrollment.name}` : ''}. Your reference is <b className="mono">{enrollment.reference}</b>.
        {enrollment.email ? <> Updates go to <b>{enrollment.email}</b>.</> : null}
      </p>
      <ol className="se-steps">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.title} className="se-step" data-state={i === 0 ? 'done' : undefined}>
            <span className="se-step-ic"><Icon name={s.icon} size={13} /></span>
            <span className="se-step-m">
              <span className="se-step-t">{s.title}</span>
              <span className="se-step-b">{s.body}</span>
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
 * The way in for someone the directory does not know yet. It is the Add User
 * form — the same schema-driven sections, rail and validation — in its
 * enrollment mode, so an attribute an administrator defines in Configurations
 * appears here too. What it creates is a pending identity for an administrator
 * to approve, never an active account.
 */
export default function SelfEnrollmentPage() {
  const { navigate, theme, toast } = useApp()
  const existing = useUsers()
  const [enrollment, setEnrollment] = useState(null)

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
    <div className="se-page">
      <header className="se-top">
        <img src={theme === 'dark' ? wordmarkWhite : wordmarkDark} alt="Tanflow" className="se-logo" />
        <span className="se-top-sep" aria-hidden="true" />
        <span className="se-top-t">Self-enrollment</span>
        <span className="spacer" />
        <span className="se-top-q">Already have an account?</span>
        <Button size="sm" icon="lock" onClick={() => navigate('login')}>Sign in</Button>
      </header>

      <main className="canvas se-canvas">
        <div className="canvas-inner se-inner">
          {enrollment
            ? <Submitted enrollment={enrollment} onDone={() => navigate('login')} />
            : (
              <IdentityForm
                key="enroll"
                enroll
                existing={existing}
                onCreate={submit}
                onCancel={() => navigate('login')}
              />
            )}
        </div>
      </main>
    </div>
  )
}
