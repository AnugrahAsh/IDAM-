import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import {
  CONDITION_TYPES, LOGIC, VALUE_HINTS, blankCondition, operatorsFor, reshapeCondition, shapeOf, typeMeta,
} from './signOnPolicyData'

/**
 * The access conditions of one rule.
 *
 * The value control follows the operator — one value, a list, or a from/to
 * pair — and stays disabled until there is an operator to follow.
 */
export default function ConditionEditor({ conditions, logic, issues, scopeError, onChange, onLogic }) {
  const update = (key, patch) => onChange(conditions.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  const remove = (key) => onChange(conditions.filter((c) => c.key !== key))
  const add = () => onChange([...conditions, blankCondition()])

  return (
    <Card
      title="Access conditions"
      sub="What a sign-in is checked against. With no conditions, the rule matches every sign-in that reaches it."
      actions={<Button size="sm" icon="plus" onClick={add}>Add condition</Button>}
    >
      <div className="stack">
        {conditions.length > 1 && (
          <Field label="Match logic" hint="How the conditions combine. Offered once there are two or more.">
            <div className="seg" role="radiogroup" aria-label="Match logic">
              {LOGIC.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={logic === l.value}
                  data-on={logic === l.value}
                  onClick={() => onLogic(l.value)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {conditions.length === 0 ? (
          <EmptyState
            size="sm"
            icon="filter"
            title="No conditions"
            body="This rule matches every sign-in that reaches it. Add a condition to narrow it, or require MFA below."
            actions={<Button size="sm" icon="plus" onClick={add}>Add condition</Button>}
          />
        ) : conditions.map((c, i) => (
          <ConditionRow
            key={c.key}
            index={i}
            condition={c}
            join={i > 0 ? logic : null}
            issues={issues[i] || {}}
            onChange={(patch) => update(c.key, patch)}
            onRemove={() => remove(c.key)}
          />
        ))}

        {scopeError && (
          <div className="banner" data-tone="bad" data-issue tabIndex={-1} role="alert">
            <Icon name="warn" size={15} />
            <div>{scopeError}</div>
          </div>
        )}
      </div>
    </Card>
  )
}

function ConditionRow({ index, condition: c, join, issues, onChange, onRemove }) {
  const n = index + 1
  const id = (part) => `sop-${c.key}-${part}`
  const shape = shapeOf(c.operator)
  const hints = VALUE_HINTS[c.type] || VALUE_HINTS.ip
  const type = typeMeta(c.type)
  const suggest = hints.suggestions && shape === 'single' ? id('suggest') : undefined

  // A type change keeps the operator and values only while the operator still
  // applies — a range means nothing once the condition is about a browser.
  const setType = (value) => {
    const keep = operatorsFor(value).some((o) => o.value === c.operator)
    onChange(keep ? { type: value } : { type: value, operator: '', value: '', list: '', from: '', to: '' })
  }

  return (
    <>
      {join && <div className="sop-join" aria-hidden="true"><span>{join}</span></div>}
      <div className="sop-cond" data-bad={Object.keys(issues).length > 0 || undefined}>
        <span className="sop-cond-n" aria-hidden="true">{type ? <Icon name={type.icon} size={13} /> : n}</span>
        <div className="sop-cond-grid">
          <Field label="Type" required htmlFor={id('type')} error={issues.type}>
            <Select
              id={id('type')}
              value={c.type}
              placeholder="Select"
              options={CONDITION_TYPES}
              onChange={(e) => setType(e.target.value)}
            />
          </Field>
          <Field label="Operator" required htmlFor={id('operator')} error={issues.operator}>
            <Select
              id={id('operator')}
              value={c.operator}
              placeholder={c.type ? 'Select' : 'Select a type first'}
              disabled={!c.type}
              options={c.type ? operatorsFor(c.type) : []}
              onChange={(e) => onChange(reshapeCondition(c, e.target.value))}
            />
          </Field>
          {shape === 'range' ? (
            <div className="sop-cond-range">
              <Field label="From" required htmlFor={id('from')} error={issues.from}>
                <TextInput
                  id={id('from')}
                  className="mono"
                  value={c.from}
                  placeholder={hints.from}
                  autoComplete="off"
                  spellCheck="false"
                  onChange={(e) => onChange({ from: e.target.value })}
                />
              </Field>
              <Field label="To" required htmlFor={id('to')} error={issues.to}>
                <TextInput
                  id={id('to')}
                  className="mono"
                  value={c.to}
                  placeholder={hints.to}
                  autoComplete="off"
                  spellCheck="false"
                  onChange={(e) => onChange({ to: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <Field
              label={shape === 'list' ? 'Values' : 'Value'}
              required
              htmlFor={id('value')}
              error={shape === 'list' ? issues.list : issues.value}
              hint={shape === 'list' ? 'Separate values with commas.' : undefined}
            >
              <TextInput
                id={id('value')}
                className={c.type === 'ip' ? 'mono' : undefined}
                disabled={!c.operator}
                value={shape === 'list' ? c.list : c.value}
                placeholder={!c.operator ? 'Select an operator first' : shape === 'list' ? hints.list : hints.single}
                list={suggest}
                autoComplete="off"
                spellCheck="false"
                onChange={(e) => onChange(shape === 'list' ? { list: e.target.value } : { value: e.target.value })}
              />
            </Field>
          )}
          <IconButton icon="trash" size="sm" className="sop-cond-x" label={`Remove condition ${n}`} onClick={onRemove} />
        </div>
        {suggest && (
          <datalist id={suggest}>
            {hints.suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </div>
    </>
  )
}
