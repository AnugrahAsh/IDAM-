import { useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Tag from '../../../components/primitives/Tag'
import Field from '../../../components/primitives/Field'
import Select from '../../../components/primitives/Select'
import TextInput from '../../../components/primitives/TextInput'
import {
  PICKABLE, blankRule, countRules, modelText, needsValue, parseExpression, unresolvedRules,
} from './conditionModel'

export default function ConditionBuilder({
  model, onChange, catalog, operators, noun = 'predicate', nounPlural = 'predicates', summary, idPrefix = 'cond',
  // Not every register wants the raw expression. Orphan detection rules are
  // authored by operators who asked for the builder alone, and offering a
  // second way to write the same rule there was noise rather than power.
  expressionMode = true,
}) {
  const [mode, setMode] = useState('builder')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const expression = modelText(model)
  const first = catalog.attributes[0].id

  const setGroup = (gi, patch) => onChange({ ...model, groups: model.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)) })
  const setRule = (gi, ri, patch) => setGroup(gi, { rules: model.groups[gi].rules.map((r, i) => (i === ri ? { ...r, ...patch } : r)) })
  const removeRule = (gi, ri) => {
    const rules = model.groups[gi].rules.filter((_, i) => i !== ri)
    if (rules.length === 0 && model.groups.length > 1) onChange({ ...model, groups: model.groups.filter((_, i) => i !== gi) })
    else setGroup(gi, { rules })
  }

  const applyExpression = () => {
    const parsed = parseExpression(draft)
    if (!parsed.groups.some((g) => g.rules.length > 0)) {
      setError(`The expression contains no ${nounPlural}.`)
      return
    }
    onChange(parsed)
    setMode('builder')
  }

  const shown = mode === 'expression' ? parseExpression(draft) : model

  return (
    <div className="stack">
      <div className="row-between">
        {expressionMode ? (
          <div className="seg" role="tablist" aria-label="Condition editor mode">
            <button type="button" role="tab" aria-selected={mode === 'builder'} data-on={mode === 'builder'} onClick={() => setMode('builder')}>Builder</button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'expression'}
              data-on={mode === 'expression'}
              onClick={() => { setDraft(expression); setError(''); setMode('expression') }}
            >
              Expression
            </button>
          </div>
        ) : <span />}
        {summary || (
          <span className="t-xs t-mut">
            {countRules(shown)} {countRules(shown) === 1 ? noun : nounPlural} across {shown.groups.length} {shown.groups.length === 1 ? 'group' : 'groups'}
          </span>
        )}
      </div>

      {mode === 'expression' ? (
        <div className="stack">
          <Field
            label="Raw expression"
            error={error}
            hint="Quote string values. Parentheses group predicates. Applying the expression rewrites the builder rows."
            htmlFor={`${idPrefix}-expression`}
          >
            <TextInput
              as="textarea"
              id={`${idPrefix}-expression`}
              className="mono"
              rows={6}
              spellCheck="false"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError('') }}
            />
          </Field>
          <div className="row">
            <Button icon="check" variant="pri" onClick={applyExpression}>Apply to builder</Button>
            <Button onClick={() => setMode('builder')}>Discard</Button>
            <span className="spacer" />
            <span className="t-xs t-faint">{countRules(shown)} parsed · {unresolvedRules(shown, catalog.index).length} unresolved</span>
          </div>
        </div>
      ) : (
        <div className="stack">
          {model.groups.map((g, gi) => (
            <div key={`grp-${gi}`} className="stack" style={{ gap: 8 }}>
              {gi > 0 && (
                <div className="row" style={{ gap: 8 }}>
                  <div className="seg" role="radiogroup" aria-label="Join with previous group">
                    <button type="button" role="radio" aria-checked={model.join === 'AND'} data-on={model.join === 'AND'} onClick={() => onChange({ ...model, join: 'AND' })}>AND</button>
                    <button type="button" role="radio" aria-checked={model.join === 'OR'} data-on={model.join === 'OR'} onClick={() => onChange({ ...model, join: 'OR' })}>OR</button>
                  </div>
                  <span className="t-xs t-faint">joins group {gi} with group {gi + 1}</span>
                </div>
              )}
              <Card
                title={`Group ${gi + 1}`}
                sub={g.join === 'OR' ? `Any ${noun} in this group may match` : `Every ${noun} in this group must match`}
                actions={
                  <>
                    <div className="seg" role="radiogroup" aria-label={`Group ${gi + 1} join`}>
                      <button type="button" role="radio" aria-checked={g.join === 'AND'} data-on={g.join === 'AND'} onClick={() => setGroup(gi, { join: 'AND' })}>All</button>
                      <button type="button" role="radio" aria-checked={g.join === 'OR'} data-on={g.join === 'OR'} onClick={() => setGroup(gi, { join: 'OR' })}>Any</button>
                    </div>
                    <IconButton
                      icon="trash"
                      size="sm"
                      label={`Remove group ${gi + 1}`}
                      disabled={model.groups.length === 1}
                      onClick={() => onChange({ ...model, groups: model.groups.filter((_, i) => i !== gi) })}
                    />
                  </>
                }
              >
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="t-micro t-mut" style={{ flex: '1 1 0' }}>Attribute</span>
                    <span className="t-micro t-mut" style={{ flex: '0 0 138px' }}>Operator</span>
                    <span className="t-micro t-mut" style={{ flex: '1 1 0' }}>Value</span>
                    <span style={{ flex: '0 0 26px' }} />
                  </div>
                  {g.rules.length === 0 && <div className="t-sm t-mut">No {nounPlural} in this group.</div>}
                  {g.rules.map((r, ri) => {
                    const attr = catalog.index[r.attribute]
                    const pickable = attr && attr.options && PICKABLE.includes(r.operator)
                    return (
                      <div className="row" style={{ gap: 8 }} key={`rule-${gi}-${ri}`}>
                        {r.raw != null ? (
                          <>
                            <Tag tone="acc">Expression</Tag>
                            <TextInput
                              className="mono"
                              style={{ flex: '1 1 0' }}
                              value={r.raw}
                              aria-label={`Free expression ${ri + 1}`}
                              onChange={(e) => setRule(gi, ri, { raw: e.target.value })}
                            />
                          </>
                        ) : (
                          <>
                            <Select
                              style={{ flex: '1 1 0' }}
                              value={r.attribute}
                              options={catalog.options}
                              aria-label={`Predicate ${ri + 1} attribute`}
                              onChange={(e) => setRule(gi, ri, { attribute: e.target.value, value: '' })}
                            />
                            <Select
                              style={{ flex: '0 0 138px' }}
                              value={r.operator}
                              options={operators}
                              aria-label={`Predicate ${ri + 1} operator`}
                              onChange={(e) => setRule(gi, ri, { operator: e.target.value })}
                            />
                            {!needsValue(r.operator) ? (
                              <TextInput style={{ flex: '1 1 0' }} value="" disabled placeholder="Not required" aria-label={`Predicate ${ri + 1} value`} />
                            ) : pickable ? (
                              <Select
                                style={{ flex: '1 1 0' }}
                                value={r.value}
                                placeholder="Select a value…"
                                options={attr.options}
                                aria-label={`Predicate ${ri + 1} value`}
                                onChange={(e) => setRule(gi, ri, { value: e.target.value })}
                              />
                            ) : (
                              <TextInput
                                style={{ flex: '1 1 0' }}
                                value={r.value}
                                placeholder="Value"
                                aria-label={`Predicate ${ri + 1} value`}
                                onChange={(e) => setRule(gi, ri, { value: e.target.value })}
                              />
                            )}
                          </>
                        )}
                        <IconButton icon="x" size="sm" label={`Remove predicate ${ri + 1}`} onClick={() => removeRule(gi, ri)} />
                      </div>
                    )
                  })}
                  <div>
                    <Button size="sm" icon="plus" onClick={() => setGroup(gi, { rules: [...g.rules, blankRule(first)] })}>Add {noun}</Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              icon="layers"
              onClick={() => onChange({ ...model, groups: [...model.groups, { join: 'AND', rules: [blankRule(first)] }] })}
            >
              Add group
            </Button>
          </div>
        </div>
      )}

      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 6 }}>Resolved expression</div>
        <div className="code mono" style={{ display: 'block', padding: '8px 10px', lineHeight: 1.7 }}>
          {expression || `No ${nounPlural} defined`}
        </div>
      </div>
    </div>
  )
}
