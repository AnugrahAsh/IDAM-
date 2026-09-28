import { useCallback, useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Modal from '../../components/primitives/Modal'
import { useApp } from '../../store/AppContext'
import { BASE } from '../../data/nav'
import { USERS, nextId } from '../../data/seed'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'
import ConsentDocumentOverlay from './ConsentDocumentOverlay'
import RegistrationForm from './RegistrationForm'
import { REGISTRATION_DOCUMENT, resolveInvitation } from './consentGateData'
import './ConsentGate.css'

const goLogin = () => window.location.assign(`${BASE}/login`)

/** A full-page outcome: submitted, abandoned, expired, already used, invalid. */
function Outcome({ icon, tone, title, children, actions }) {
  return (
    <section className="cg-out" role="status">
      <span className="cg-out-ic" data-tone={tone}><Icon name={icon} size={22} /></span>
      <h1 className="t-h1">{title}</h1>
      <div className="cg-out-b">{children}</div>
      {actions && <div className="cg-out-a">{actions}</div>}
    </section>
  )
}

/**
 * Tokenised registration with consent.
 *
 * The recipient half of Consent Management's User Consent Initiative: the
 * administrator sends one invitation, and this is the page the mailed link
 * opens. It is public — whoever opens it has no session and may not exist in
 * the directory yet — so it renders outside the sign-in gate and outside the
 * console shell.
 *
 * A link that no longer works gets a screen of its own. Showing an empty form
 * to someone whose invitation expired wastes ten minutes of their time and
 * then fails at submit, which is the worst of both.
 */
export default function ConsentInitiatePage() {
  const { toast } = useApp()
  const doc = REGISTRATION_DOCUMENT
  const invitation = useMemo(() => resolveInvitation(window.location.search), [])

  const [lang, setLang] = useState(doc.defaultLang)
  const [docOpen, setDocOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  /* 'form' until the recipient finishes with it; then the outcome they chose. */
  const [view, setView] = useState('form')
  const [submitted, setSubmitted] = useState(null)

  const closeDoc = useCallback(() => setDocOpen(false), [])

  const understand = () => {
    setAcknowledged(true)
    setDocOpen(false)
  }

  const submit = ({ values, files }) => {
    const reference = `REG-${4200 + nextId(USERS)}`
    setSubmitted({ reference, name: `${values.firstName} ${values.lastName}`.trim(), files: files.length })
    setView('submitted')
    toast('ok', 'Registration submitted', `Reference ${reference}. An administrator reviews it before an identity is created.`)
  }

  /* The field and lockup the post-login gate stands on, kept for the five
     screens that are a single short notice: a link that expired, one already
     used, one that cannot be read, and the two ways this one ends. A notice of
     four sentences wants a centred card and nothing else, which is exactly what
     the gate gives it. The form is the one view that does not fit that shape,
     and it gets a layout of its own below. */
  const shell = (children) => (
    <div className="cg-page">
      <header className="cg-top">
        <span className="cg-lockup">
          <img src={wordmarkWhite} alt="Tanflow" className="cg-logo" />
          <span className="cg-descriptor">Identity &amp; access management</span>
        </span>
        <span className="cg-top-sep" aria-hidden="true" />
        <span className="cg-context">
          <Icon name="user" size={13} />
          User registration
        </span>
      </header>
      <main className="cg-main">{children}</main>
    </div>
  )

  if (invitation.state === 'expired') {
    return shell(
      <Outcome icon="clock" tone="warn" title="This invitation has expired">
        <p>
          The link sent to <b>{invitation.email}</b> on {invitation.sentOn} was valid until{' '}
          <b>{invitation.expiresOn}</b>. Registration links are short-lived on purpose — an invitation
          that stays open forever is a way into the directory that nobody is watching.
        </p>
        <p>
          Nothing has been lost. Ask {invitation.invitedBy} to initiate the consent again and a fresh
          link arrives at the same address.
        </p>
      </Outcome>,
    )
  }

  if (invitation.state === 'used') {
    return shell(
      <Outcome
        icon="checkC"
        tone="ok"
        title="This registration is already complete"
        actions={<Button variant="pri" icon="lock" onClick={goLogin}>Go to sign in</Button>}
      >
        <p>
          The invitation issued to <b>{invitation.email}</b> was submitted on <b>{invitation.completedOn}</b>,
          and each link may be used once.
        </p>
        <p>
          If the identity is approved you will have an activation mail at that address. If you did not
          submit this registration, tell {invitation.invitedBy} rather than trying the link again.
        </p>
      </Outcome>,
    )
  }

  if (invitation.state !== 'valid') {
    return shell(
      <Outcome
        icon="noentry"
        tone="bad"
        title="This link is not valid"
        actions={<Button variant="pri" icon="lock" onClick={goLogin}>Go to sign in</Button>}
      >
        <p>
          The token in the address could not be read. That usually means the link was broken across two
          lines by a mail client, so copying the whole address from the mail and pasting it in one piece
          often fixes it.
        </p>
        <p>If it still fails, ask whoever invited you to send a new invitation.</p>
      </Outcome>,
    )
  }

  if (view === 'submitted') {
    return shell(
      <Outcome
        icon="checkC"
        tone="ok"
        title="Registration submitted"
        actions={<Button variant="pri" icon="lock" onClick={goLogin}>Go to sign in</Button>}
      >
        <p>
          Thank you{submitted.name ? `, ${submitted.name}` : ''}. Your reference is{' '}
          <b className="mono">{submitted.reference}</b>
          {submitted.files ? `, with ${submitted.files} document${submitted.files === 1 ? '' : 's'} attached` : ''}.
        </p>
        <p>
          Nothing has been created yet. An administrator checks what you entered, and an activation mail
          goes to <b>{invitation.email}</b> once the identity is approved. Your agreement to version{' '}
          {doc.version} of the Terms &amp; Policy is on record against this reference.
        </p>
      </Outcome>,
    )
  }

  if (view === 'cancelled') {
    return shell(
      <Outcome
        icon="info"
        tone="mut"
        title="Registration not completed"
        actions={<Button variant="pri" icon="edit" onClick={() => { setView('form'); setAcknowledged(false) }}>Start again</Button>}
      >
        <p>
          Nothing was sent, and what you had typed has been discarded. The invitation itself is still
          good until <b>{invitation.expiresOn}</b>, so you can reopen the link from your mail or start
          again here.
        </p>
      </Outcome>,
    )
  }

  /* Two columns, the height of the window: the invitation on the left, the form
     on the right.

     It was one 960px card centred on the field, which is the shape the original
     Keycloak page was traced from — and on a 1440x900 window that left about
     400px of empty brand either side while the form ran a little over 100px
     past the bottom, so the checkbox and Submit had to be scrolled to. The
     two faults were the same fault: a long form pinned into a column narrower
     than the screen has nowhere to go but down.

     Self-enrollment — the other page in this console written for someone who
     has never seen it — already answers this: a rail that says what is being
     asked and why, and a panel beside it that asks. This is that layout, with
     the sign-in's field as the rail so the one screen an invited stranger sees
     of Tanflow still looks like the one they will sign in to. Nothing is said
     here that the card header did not say; it is said beside the form instead
     of above it. */
  return (
    <div className="ci-page">
      <aside className="ci-rail">
        <span className="cg-lockup">
          <img src={wordmarkWhite} alt="Tanflow" className="cg-logo" />
          <span className="cg-descriptor">Identity &amp; access management</span>
        </span>

        {/* The context chip the other views carry says "User registration" too,
            so on this one it would sit four lines above a heading with the same
            words in it. The heading is the one that stays. */}
        <div className="ci-rail-m">
          <span className="ci-eyebrow">Invitation</span>
          <h1 className="ci-rail-t">User registration</h1>
          <p className="ci-rail-s">Please fill the below details to register yourself.</p>
        </div>

        <p className="ci-invite">
          <Icon name="mail" size={13} />
          Invited by {invitation.invitedBy} for <b>{invitation.email}</b> on {invitation.sentOn} · this
          link is single-use and expires on <b>{invitation.expiresOn}</b>.
        </p>
      </aside>

      <main className="ci-main">
        <RegistrationForm
          invitation={invitation}
          doc={doc}
          acknowledged={acknowledged}
          onOpenDocument={() => setDocOpen(true)}
          onSubmit={submit}
          onCancel={() => setConfirmCancel(true)}
        />
      </main>

      {docOpen && (
        <ConsentDocumentOverlay
          doc={doc}
          lang={lang}
          onLang={setLang}
          onUnderstand={understand}
          onClose={closeDoc}
        />
      )}

      {confirmCancel && (
        <Modal
          title="Discard this registration?"
          tone="bad"
          icon="warn"
          body="Nothing has been sent yet, and what you have typed is not saved anywhere. The invitation stays valid, but you would have to fill the form in again."
          confirmLabel="Discard"
          cancelLabel="Keep filling it in"
          onConfirm={() => setView('cancelled')}
          onClose={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}
