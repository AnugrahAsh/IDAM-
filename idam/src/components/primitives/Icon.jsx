import { ICONS } from '../../data/icons'

export default function Icon({ name, size = 16, stroke = 1.7, className, style }) {
  const path = ICONS[name] || ICONS.info
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  )
}
