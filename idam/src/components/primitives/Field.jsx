import Icon from './Icon'

export default function Field({
  label, hint, error, required, children, span, htmlFor,
}) {
  return (
    <div className="field" data-invalid={!!error} style={span ? { gridColumn: `span ${span}` } : undefined}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field-req">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field-err" role="alert"><Icon name="warn" size={11} />{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  )
}
