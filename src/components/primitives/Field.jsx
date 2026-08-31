import { Children, cloneElement, isValidElement, useId } from 'react'
import Icon from './Icon'

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
 */
export default function Field({
  label, hint, error, required, children, span, htmlFor,
}) {
  const auto = useId()
  const only = Children.count(children) === 1 ? Children.only(children) : null
  const adoptable = !htmlFor && isValidElement(only) && !only.props.id
    && !only.props['aria-label'] && typeof only.type !== 'string'
  const forId = htmlFor || (adoptable ? auto : undefined)
  const body = adoptable ? cloneElement(only, { id: auto }) : children

  return (
    <div className="field" data-invalid={!!error} style={span ? { gridColumn: `span ${span}` } : undefined}>
      {label && (
        <label className="field-label" htmlFor={forId}>
          {label}
          {required && <span className="field-req">*</span>}
        </label>
      )}
      {body}
      {error ? (
        <span className="field-err" role="alert"><Icon name="warn" size={11} />{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  )
}
