import Button from '../../components/primitives/Button'
import { useDialogFocus } from '../../lib/useDialogFocus'
import ConsentDocument from './ConsentDocument'
import './ConsentGate.css'

/**
 * The consent document, raised over whatever asked for it.
 *
 * A module of its own because two registration flows raise the same notice —
 * the tokenised invitation and self-enrollment — and a second copy of this
 * would be a second document to keep in step with the first. It owns the focus
 * trap, and a trap must be mounted and unmounted with the thing it traps focus
 * inside, which is why it is a component rather than a branch in the caller.
 *
 * Escape leaves without acknowledging. That is correct rather than careless: an
 * overlay dismissed by accident must not count as having read anything, and the
 * checkbox the caller gates on stays inert until "I Understand" is pressed.
 */
export default function ConsentDocumentOverlay({ doc, lang, onLang, onUnderstand, onClose }) {
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
