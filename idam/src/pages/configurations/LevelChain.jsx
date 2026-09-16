import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'

export default function LevelChain({ levels }) {
  return (
    <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
      {levels.map((l, i) => (
        <span key={l + i} className="row" style={{ gap: 5 }}>
          {i > 0 && <Icon name="chevR" size={10} style={{ color: 'var(--faint)' }} />}
          <Tag>{l}</Tag>
        </span>
      ))}
    </span>
  )
}

