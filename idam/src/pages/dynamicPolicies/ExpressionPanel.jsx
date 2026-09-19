import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Tag from '../../components/primitives/Tag'
import ExpressionCode from '../shared/conditions/ExpressionCode'
import { allRules, incompleteRules } from '../shared/conditions/conditionModel'
import { useApp } from '../../store/AppContext'
import { modelText, resolvable } from './policyPageData'

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function ExpressionPanel({ model }) {
  const { toast } = useApp()
  const known = resolvable()
  const rules = allRules(model)
  const groups = model.groups.filter((g) => g.rules.length > 0).length
  const text = modelText(model)

  const incomplete = incompleteRules(model).length
  const raw = rules.filter((r) => r.raw != null).length
  const unknown = [...new Set(rules.filter((r) => r.raw == null && !known.has(r.attribute)).map((r) => r.attribute))]

  const checks = []
  if (rules.length === 0) checks.push({ tone: 'warn', icon: 'warn', text: 'Add a condition — an empty policy reaches nobody.' })
  if (incomplete) checks.push({ tone: 'warn', icon: 'warn', text: `${plural(incomplete, 'condition needs', 'conditions need')} a value.` })
  if (unknown.length) checks.push({ tone: 'bad', icon: 'ban', text: `Unknown ${unknown.length === 1 ? 'attribute' : 'attributes'}: ${unknown.join(', ')}.` })
  if (raw) checks.push({ tone: 'info', icon: 'info', text: `${plural(raw, 'free-form expression is', 'free-form expressions are')} passed through, not previewed.` })
  if (checks.length === 0) checks.push({ tone: 'ok', icon: 'checkC', text: 'Every condition resolves against the identity registry.' })

  const copy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text)
    toast('ok', 'Expression copied', 'The resolved expression is on the clipboard.')
  }

  return (
    <Card
      title="Expression"
      sub="Rewritten live as you edit the builder"
      actions={(
        <>
          <Tag>{plural(groups, 'group', 'groups')} · {plural(rules.length, 'condition', 'conditions')}</Tag>
          <IconButton icon="copy" size="sm" label="Copy expression" disabled={!text} onClick={copy} />
        </>
      )}
      footer={(
        <ul className="cstudio-checks">
          {checks.map((c) => (
            <li key={c.text} data-tone={c.tone}>
              <Icon name={c.icon} size={13} />
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      )}
    >
      <ExpressionCode model={model} isUnknown={(id) => !known.has(id)} emptyLabel="No conditions defined yet" />
    </Card>
  )
}
