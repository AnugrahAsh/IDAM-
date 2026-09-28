import {
  Children, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState,
} from 'react'
import Icon from './Icon'

/**
 * The `?` beside a label, and the tooltip it opens.
 *
 * `hint` prints under the control and is read whether or not anybody wanted it,
 * which is right for a one-line qualifier and wrong for a paragraph: a form of
 * thirty-five paragraphs is a wall of grey with inputs buried in it. This is
 * the other half of the pair — help that is asked for. It carries the same
 * words; it just waits to be asked.
 *
 * The bubble is `position: fixed` and placed from the button's own rect rather
 * than flowing under it, for two reasons that both bite on a four-column grid:
 * the canvas clips horizontal overflow, so a bubble anchored inside a
 * right-hand column would be cut in half, and a bubble wide enough to read is
 * wider than the column it belongs to. Fixed escapes the clip, and the measure
 * below keeps it inside the viewport instead of pushing the page sideways.
 */
export function FieldHelp({ text, name }) {
  const tipId = useId()
  const btn = useRef(null)
  const tip = useRef(null)
  /* The rect the bubble opened against; null is closed. Held in state rather
     than in a class so the bubble is not in the DOM at all when shut — thirty
     five permanently-rendered tooltips is the noise this is removing. */
  const [at, setAt] = useState(null)
  /* Whether the bubble on screen was asked for or merely hovered into. A press
     closes one it opened and pins one the pointer opened, which is what makes
     the control behave the same way for a mouse, a finger and a keyboard. */
  const [pinned, setPinned] = useState(false)

  const show = () => {
    const b = btn.current && btn.current.getBoundingClientRect()
    if (b) setAt({ left: b.left, top: b.bottom + 6 })
  }
  const hide = () => setAt(null)

  /* Measured once the bubble exists and before it paints, so the correction
     never flashes. Right-hand columns are the case this exists for: the bubble
     is pulled back to the viewport edge rather than being allowed past it. */
  useLayoutEffect(() => {
    const el = tip.current
    const b = btn.current && btn.current.getBoundingClientRect()
    if (!at || !el || !b) return
    const m = 8
    const left = Math.max(m, Math.min(b.left, window.innerWidth - m - el.offsetWidth))
    const below = b.bottom + 6
    const top = below + el.offsetHeight > window.innerHeight - m
      ? Math.max(m, b.top - 6 - el.offsetHeight)
      : below
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }, [at])

  /* A rect goes stale the moment anything moves, so scroll and resize close the
     bubble rather than leave it pointing at nothing. Escape and a press
     elsewhere close it too — a tooltip pinned by touch has no pointer to leave
     with. */
  useEffect(() => {
    if (!at) return undefined
    const onKey = (e) => { if (e.key === 'Escape') hide() }
    const onAway = (e) => { if (!btn.current || !btn.current.contains(e.target)) hide() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    document.addEventListener('pointerdown', onAway, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
      document.removeEventListener('pointerdown', onAway, true)
    }
  }, [at])

  /* After the hooks, never before them: a guard that skipped them would change
     the hook order the first time a call site passed help conditionally. */
  if (!text) return null

  return (
    <>
      <button
        type="button"
        ref={btn}
        className="field-help"
        aria-label={name ? `Help for ${name}` : 'Help'}
        aria-expanded={!!at}
        aria-describedby={at ? tipId : undefined}
        onClick={() => {
          if (pinned) { setPinned(false); hide(); return }
          setPinned(true)
          if (!at) show()
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Icon name="help" size={12} />
      </button>
      {at && (
        <span
          ref={tip}
          id={tipId}
          role="tooltip"
          className="field-help-tip"
          style={{ left: at.left, top: at.top }}
        >
          {text}
        </span>
      )}
    </>
  )
}

/**
 * A labelled form field.
 *
 * The label is only a label if it is attached to something. Passing `htmlFor`
 * is the explicit way to do that, but most call sites wrap exactly one control
 * and the association is obvious — so when `htmlFor` is absent this generates
 * an id and hands it to that single child. Without it a screen reader
 * announces "edit text" with no name, even though the label is right there on
 * screen; fixing it here fixes every field in the console at once.
 *
 * A child that already carries an id, or a field wrapping several controls,
 * is left alone — the call site knows better than this does.
 *
 * `hint` prints under the control; `help` puts a `?` beside the label instead.
 * They are independent, and a field that passes neither renders exactly the
 * markup it always has.
 */
export default function Field({
  label, hint, help, error, required, children, span, htmlFor, keepHint = false,
}) {
  const auto = useId()
  const only = Children.count(children) === 1 ? Children.only(children) : null
  const adoptable = !htmlFor && isValidElement(only) && !only.props.id
    && !only.props['aria-label'] && typeof only.type !== 'string'
  const forId = htmlFor || (adoptable ? auto : undefined)
  const body = adoptable ? cloneElement(only, { id: auto }) : children

  const labelEl = label && (
    <label className="field-label" htmlFor={forId}>
      {label}
      {required && <span className="field-req">*</span>}
    </label>
  )

  return (
    <div className="field" data-invalid={!!error} style={span ? { gridColumn: `span ${span}` } : undefined}>
      {/* The wrapper only appears when there is a `?` to sit beside the label,
          so every field in the console that does not ask for one keeps the
          markup — and therefore the layout — it already had. */}
      {help
        ? (
          <span className="field-labelrow">
            {labelEl}
            <FieldHelp text={help} name={typeof label === 'string' ? label : undefined} />
          </span>
        )
        : labelEl}
      {body}
      {/* With keepHint the description stays under the control and the error
          follows it, so fixing a field doesn't hide what the field is for. */}
      {hint && (keepHint || !error) && <span className="field-hint">{hint}</span>}
      {error && <span className="field-err" role="alert"><Icon name="warn" size={11} />{error}</span>}
    </div>
  )
}
