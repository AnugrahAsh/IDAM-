import Icon from './Icon'

const ICON = { info: 'info', warn: 'warn', bad: 'warn', ok: 'checkC' }

export default function Banner({ tone = 'info', children }) {
  return (
    <div className="banner" data-tone={tone}>
      <Icon name={ICON[tone]} size={15} />
      <div>{children}</div>
    </div>
  )
}
