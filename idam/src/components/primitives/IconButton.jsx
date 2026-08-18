import Icon from './Icon'

export default function IconButton({ icon, label, size, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={['btn-icon', size === 'sm' ? 'sm' : '', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 13 : 15} />
    </button>
  )
}
