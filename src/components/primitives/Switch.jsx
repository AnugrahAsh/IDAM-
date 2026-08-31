export default function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      className="switch"
      data-on={!!checked}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
    />
  )
}
