import { useState } from 'react'
import Button from '../../components/primitives/Button'
import Check from '../../components/primitives/Check'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { ME } from '../../data/seed'
import { stampText } from '../../lib/clock'
import wordmarkWhite from '../../assets/tanflow-wordmark-white.png'
import ConsentDocument from './ConsentDocument'
import {
  GATE_DOCUMENT, capturedText, consentTypeText, nextAskedOn, settleConsentGate,
} from './consentGateData'
import './ConsentGate.css'

/**
 * The post-login consent gate.
 *
 * Between the sign-in and the console, for a signed-in identity that still owes
 * an answer to a mandatory notice. It is deliberately the only thing on screen:
 * a gate rendered beside the sidebar is not a gate, and the whole point of a
 * blocking consent is that the console is not reachable until it is answered.
 *
 * Declining is a real answer rather than a dead end. The reference simply
 * dropped the visitor; this says what declining costs and offers the one action
 * that follows from it.
 *
 * It is built on the same Tanflow field the sign-in screen stands on, because
 * it is the screen immediately after it and the person has not yet seen
 * anything else of the console.
 */
export default function ConsentGatePage({ onAccept }) {
  const { signOut, toast } = useApp()
  const doc = GATE_DOCUMENT
  const [lang, setLang] = useState(doc.defaultLang)
  const [accepted, setAccepted] = useState(false)
  const [declining, setDeclining] = useState(false)

  const askedAgainOn = nextAskedOn(doc)

  const accept = () => {
    settleConsentGate()
    toast('ok', 'Consent recorded', `${doc.name} version ${doc.version}, accepted ${stampText()}.`)
    if (onAccept) onAccept()
  }

  const footer = (
    <>
      <div className="cg-accept">
        <Check
          checked={accepted}
          onChange={setAccepted}
          label="I accept the Terms & Conditions"
        />
        {/* The visible wording is a second way to reach the same control rather
            than a second tab stop: the checkbox above already carries the
            accessible name, so this is taken out of the tab order. */}
        <button type="button" className="cg-accept-t" tabIndex={-1} onClick={() => setAccepted((v) => !v)}>
          I accept the <b>Terms &amp; Conditions</b>
        </button>
      </div>
      <div className="cg-actions">
        <Button icon="x" onClick={() => setDeclining(true)}>Decline</Button>
        <Button variant="pri" icon="check" disabled={!accepted} onClick={accept}>Accept &amp; Continue</Button>
      </div>
    </>
  )

  return (
    <div className="cg-page">
      {/* The lockup the sign-in screen opens with: the wordmark on the field,
          the descriptor beside it, then what this particular screen is. The
          field is dark in both themes, so the mark is the white one in both. */}
      <header className="cg-top">
        <span className="cg-lockup">
          <img src={wordmarkWhite} alt="Tanflow" className="cg-logo" />
          <span className="cg-descriptor">Identity &amp; access management</span>
        </span>
        <span className="cg-top-sep" aria-hidden="true" />
        <span className="cg-context">
          <Icon name="consent" size={13} />
          Consent required
        </span>
        <span className="cg-who">
          <Icon name="user" size={13} />
          <span className="cg-who-t">{ME.firstName} {ME.lastName} · <span className="mono">{ME.username}</span></span>
        </span>
      </header>

      <main className="cg-main">
        {declining ? (
          <section className="cg-out" role="status">
            <span className="cg-out-ic" data-tone="bad"><Icon name="noentry" size={22} /></span>
            <h1 className="t-h1">Declining ends this session</h1>
            <div className="cg-out-b">
              <p>
                {doc.name} is a {consentTypeText(doc).toLowerCase()}. Without it there is no lawful basis to
                operate the account, so the console cannot be opened — declining signs {ME.firstName} out
                rather than letting you in with less.
              </p>
              <p>
                Nothing is recorded against you by declining. The notice stays waiting, and you are asked
                again the next time you sign in.
              </p>
            </div>
            <div className="cg-out-a">
              <Button icon="arrowRight" onClick={() => setDeclining(false)}>Back to the notice</Button>
              <Button variant="danger-solid" icon="power" onClick={signOut}>Decline and sign out</Button>
            </div>
          </section>
        ) : (
          <>
            <ConsentDocument doc={doc} lang={lang} onLang={setLang} footer={footer} />

            {/* True of every acceptance and cheap to say, so it is said once
                here instead of being buried three paragraphs into the body. */}
            <ul className="cg-facts">
              <li>
                <Icon name="user" size={13} />
                Asked of <b>{ME.firstName} {ME.lastName}</b> ({ME.email}) as <span className="mono">{ME.username}</span>.
              </li>
              <li>
                <Icon name="clock" size={13} />
                Valid for {doc.validityPeriod} {String(doc.validityUnit).toLowerCase()}
                {askedAgainOn ? <> — you are asked again on <b>{askedAgainOn}</b>, or sooner if the notice is republished.</> : '.'}
              </li>
              <li>
                <Icon name="file" size={13} />
                Kept as evidence — version {doc.version} of this notice, {capturedText(doc.attributes)}.
                The record is retained even if you withdraw the consent later.
              </li>
            </ul>
          </>
        )}
      </main>
    </div>
  )
}
