import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'

/**
 * One switched setting.
 *
 * The badge states what the switch currently means rather than what it is: an
 * encryption mode reads as Strict or Soft, not as on or off, and a reader
 * scanning a column of identical switches has nothing else to go on.
 */
export default function Toggle({ title, body, checked, onChange, badge, badgeTone }) {
  return (
    <div className="settings-toggle row-between">
      <div style={{ minWidth: 0 }}>
        <div className="t-sm" style={{ fontWeight: 600 }}>{title}</div>
        <div className="t-xs t-mut">{body}</div>
      </div>
      <span className="row" style={{ gap: 9, flex: 'none' }}>
        {badge && <Tag tone={badgeTone}>{badge}</Tag>}
        <Switch checked={checked} onChange={onChange} label={title} />
      </span>
    </div>
  )
}
