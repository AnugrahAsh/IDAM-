import { useCallback, useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Modal from '../../components/primitives/Modal'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { useApp } from '../../store/AppContext'
import { BASE } from '../../data/nav'
import { USERS, nextId } from '../../data/seed'
import wordmarkDark from '../../assets/tanflow-wordmark-dark.png'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'
import ConsentDocument from './ConsentDocument'
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
 * The consent document, over the form.
 *
 * A separate component because it owns the focus trap, and a trap must be
 * mounted and unmounted with the thing it traps focus inside. Escape leaves
 * without acknowledging — which is correct, since an overlay dismissed by
 * accident must not count as having read anything.
 */
function DocumentOverlay({ doc, lang, onLang, onUnderstand, onClose }) {
  const ref = useDialogFocus(onClose)
  return (
    <div className="modal-scrim ci-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        className="ci-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={doc.title}
      >
        <ConsentDocument
          doc={doc}
          lang={lang}
          onLang={onLang}
          titleAs="h2"
          footer={(
            <div className="cg-actions">
              <Button onClick={onClose}>Close</Button>
              <Button variant="pri" icon="check" onClick={onUnderstand}>I Understand</Button>
            </div>
          )}
        />
      </div>
    </div>
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
  const { theme, toast } = useApp()
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

  const shell = (children) => (
    <div className="cg-page">
      <header className="cg-top">
        <img src={theme === 'dark' ? wordmarkWhite : wordmarkDark} alt="Tanflow" className="cg-logo" />
        <span className="cg-top-sep" aria-hidden="true" />
        <span className="t-sm t-mut">User registration</span>
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

  return shell(
    <>
      <div className="ci-card">
        <header className="ci-head">
          <h1 className="ci-head-t">User registration</h1>
          <p className="ci-head-s">Please fill the below details to register yourself.</p>
          <p className="ci-head-m">
            <Icon name="mail" size={13} />
            Invited by {invitation.invitedBy} for <b>{invitation.email}</b> on {invitation.sentOn} · this
            link is single-use and expires on <b>{invitation.expiresOn}</b>.
          </p>
        </header>

        <RegistrationForm
          invitation={invitation}
          doc={doc}
          acknowledged={acknowledged}
          onOpenDocument={() => setDocOpen(true)}
          onSubmit={submit}
          onCancel={() => setConfirmCancel(true)}
        />
      </div>

      {docOpen && (
        <DocumentOverlay
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
    </>,
  )
}
