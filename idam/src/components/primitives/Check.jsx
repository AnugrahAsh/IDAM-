import Icon from './Icon'

export default function Check({ checked, mixed, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : !!checked}
      aria-label={label}
      className="check"
      data-on={!!checked}
      data-mixed={!!mixed}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange && onChange(!checked)
      }}
    >
      {!mixed && <Icon name="check" size={10} stroke={3} />}
    </button>
  )
}
