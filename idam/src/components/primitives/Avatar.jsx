import { avatarColor, initials } from '../../lib/format'

export default function Avatar({ first, last, name, size, seed }) {
  const label = name || `${first || ''} ${last || ''}`.trim()
  const key = seed || label
  const text = name ? initials(...name.split(' ')) : initials(first, last)
  return (
    <span className="av" data-size={size} style={{ background: avatarColor(key) }} title={label}>
      <span>{text}</span>
    </span>
  )
}
