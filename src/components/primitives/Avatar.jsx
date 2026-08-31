import { avatarColor, initials } from '../../lib/format'

export default function Avatar({ first, last, name, size, seed, src }) {
  const label = name || `${first || ''} ${last || ''}`.trim()
  const key = seed || label
  const text = name ? initials(...name.split(' ')) : initials(first, last)
  // A photograph replaces the initials entirely; without one the tinted
  // initials stay, because a grey placeholder head tells the reader nothing.
  if (src) {
    return (
      <span className="av av-img" data-size={size} title={label}>
        <img src={src} alt="" />
      </span>
    )
  }
  return (
    <span className="av" data-size={size} style={{ background: avatarColor(key) }} title={label}>
      <span>{text}</span>
    </span>
  )
}
