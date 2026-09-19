import './ConditionBuilder.css'
import { Fragment, useState } from 'react'
import Button from '../../../components/primitives/Button'
import Card from '../../../components/primitives/Card'
import IconButton from '../../../components/primitives/IconButton'
import Field from '../../../components/primitives/Field'
import Pill from '../../../components/primitives/Pill'
import Select from '../../../components/primitives/Select'
import Tag from '../../../components/primitives/Tag'
import TextInput from '../../../components/primitives/TextInput'
import ExpressionCode from './ExpressionCode'
import {
  PICKABLE, blankRule, countRules, needsValue, parseExpression, modelText, unresolvedRules,
} from './conditionModel'

export const groupLetter = (i) => String.fromCharCode(65 + (i % 26))

export default function ConditionBuilder({
  model, onChange, catalog, operators, noun = 'predicate', nounPlural = 'predicates', summary, idPrefix = 'cond',
  // Not every register wants the raw expression. Orphan detection rules are
  // authored by operators who asked for the builder alone, and offering a
  // second way to write the same rule there was noise rather than power.
  expressionMode = true,
  // A screen that shows the resolved expression in its own panel beside the
  // builder hides the copy that normally sits under these rows.
  showResolvedExpression = true,
  // Optional: the population a single group reaches on its own, so an
  // operator can see which group is the one narrowing the result to nothing.
  countFor,
  countNoun = 'match',
}) {
  const [mode, setMode] = useState('builder')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const first = catalog.attributes[0].id
  const isUnknown = (id) => !catalog.index[id]

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
  const total = countRules(shown)
  const hasBar = expressionMode || summary !== null

  return (
    <div className="cb">
      {hasBar && (
        <div className="row-between">
          {expressionMode ? (
            <div className="seg" role="tablist" aria-label="Condition editor mode">
              <button type="button" role="tab" aria-selected={mode === 'builder'} data-on={mode === 'builder'} onClick={() => setMode('builder')}>Builder</button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'expression'}
                data-on={mode === 'expression'}
                onClick={() => { setDraft(modelText(model)); setError(''); setMode('expression') }}
              >
                Expression
              </button>
            </div>
          ) : <span />}
          {summary !== null && (summary || (
            <span className="t-xs t-mut">
              {total} {total === 1 ? noun : nounPlural} across {shown.groups.length} {shown.groups.length === 1 ? 'group' : 'groups'}
            </span>
          ))}
        </div>
      )}

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
        <div className="stack" style={{ gap: 8 }}>
          {model.groups.map((g, gi) => {
            const letter = groupLetter(gi)
            const reach = countFor && g.rules.length > 0 ? countFor({ join: 'AND', groups: [g] }) : null
            return (
              <Fragment key={`grp-${gi}`}>
                {gi > 0 && (
                  <div className="row" style={{ gap: 8 }}>
                    <div className="seg" role="radiogroup" aria-label={`How group ${letter} combines with the groups above`}>
                      <button type="button" role="radio" aria-checked={model.join === 'AND'} data-on={model.join === 'AND'} onClick={() => onChange({ ...model, join: 'AND' })}>AND</button>
                      <button type="button" role="radio" aria-checked={model.join === 'OR'} data-on={model.join === 'OR'} onClick={() => onChange({ ...model, join: 'OR' })}>OR</button>
                    </div>
                    <span className="t-xs t-faint">joins group {groupLetter(gi - 1)} with group {letter}</span>
                  </div>
                )}

                <Card
                  className="cb-group"
                  title={`Group ${letter}`}
                  sub={g.join === 'OR' ? `Any ${noun} in this group may match` : `Every ${noun} in this group must match`}
                  flush
                  actions={(
                    <>
                      {reach != null && <Pill tone={reach === 0 ? 'bad' : 'mut'}>{reach} {countNoun}</Pill>}
                      <div className="seg" role="radiogroup" aria-label={`Group ${letter} join`}>
                        <button type="button" role="radio" aria-checked={g.join === 'AND'} data-on={g.join === 'AND'} onClick={() => setGroup(gi, { join: 'AND' })}>All</button>
                        <button type="button" role="radio" aria-checked={g.join === 'OR'} data-on={g.join === 'OR'} onClick={() => setGroup(gi, { join: 'OR' })}>Any</button>
                      </div>
                      <IconButton
                        icon="trash"
                        size="sm"
                        label={`Remove group ${letter}`}
                        disabled={model.groups.length === 1}
                        onClick={() => onChange({ ...model, groups: model.groups.filter((_, i) => i !== gi) })}
                      />
                    </>
                  )}
                >
                  <div className="cb-rows">
                    {g.rules.length > 0 && (
                      <div className="cb-row cb-row-head" aria-hidden="true">
                        <span className="cb-conj-h" />
                        <span className="cb-attr">Attribute</span>
                        <span className="cb-op">Operator</span>
                        <span className="cb-val">Value</span>
                        <span className="cb-x" />
                      </div>
                    )}
                    {g.rules.length === 0 && <div className="cb-empty t-sm t-mut">No {nounPlural} in this group.</div>}
                    {g.rules.map((r, ri) => {
                      const attr = catalog.index[r.attribute]
                      const pickable = attr && attr.options && PICKABLE.includes(r.operator)
                      const incomplete = r.raw == null && needsValue(r.operator) && !String(r.value || '').trim()
                      return (
                        <div
                          className="cb-row"
                          key={`rule-${gi}-${ri}`}
                          data-raw={r.raw != null || undefined}
                          data-incomplete={incomplete || undefined}
                        >
                          <span className="cb-conj">{ri === 0 ? 'Where' : g.join}</span>
                          {r.raw != null ? (
                            <div className="cb-expr">
                              <Tag tone="acc">Expression</Tag>
                              <TextInput
                                className="mono"
                                value={r.raw}
                                aria-label={`Free expression ${ri + 1}`}
                                onChange={(e) => setRule(gi, ri, { raw: e.target.value })}
                              />
                            </div>
                          ) : (
                            <>
                              <Select
                                className="cb-attr"
                                value={r.attribute}
                                options={catalog.options}
                                aria-label={`Condition ${ri + 1} attribute`}
                                onChange={(e) => setRule(gi, ri, { attribute: e.target.value, value: '' })}
                              />
                              <Select
                                className="cb-op"
                                value={r.operator}
                                options={operators}
                                aria-label={`Condition ${ri + 1} operator`}
                                onChange={(e) => setRule(gi, ri, { operator: e.target.value })}
                              />
                              {!needsValue(r.operator) ? (
                                <TextInput className="cb-val" value="" disabled placeholder="Not required" aria-label={`Condition ${ri + 1} value`} />
                              ) : pickable ? (
                                <Select
                                  className="cb-val"
                                  value={r.value}
                                  placeholder="Select a value…"
                                  options={attr.options}
                                  aria-label={`Condition ${ri + 1} value`}
                                  aria-invalid={incomplete || undefined}
                                  title={incomplete ? 'This condition needs a value' : undefined}
                                  onChange={(e) => setRule(gi, ri, { value: e.target.value })}
                                />
                              ) : (
                                <TextInput
                                  className="cb-val"
                                  value={r.value}
                                  placeholder={r.operator === 'in' ? 'Value, value, …' : 'Value'}
                                  aria-label={`Condition ${ri + 1} value`}
                                  aria-invalid={incomplete || undefined}
                                  title={incomplete ? 'This condition needs a value' : undefined}
                                  onChange={(e) => setRule(gi, ri, { value: e.target.value })}
                                />
                              )}
                            </>
                          )}
                          <IconButton className="cb-x" icon="x" size="sm" label={`Remove condition ${ri + 1}`} onClick={() => removeRule(gi, ri)} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="cb-group-f">
                    <Button size="sm" icon="plus" onClick={() => setGroup(gi, { rules: [...g.rules, blankRule(first)] })}>Add {noun}</Button>
                  </div>
                </Card>
              </Fragment>
            )
          })}

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

      {showResolvedExpression && (
        <div>
          <div className="t-micro t-mut" style={{ marginBottom: 6 }}>Resolved expression</div>
          <ExpressionCode model={model} isUnknown={isUnknown} numbered={false} emptyLabel={`No ${nounPlural} defined`} />
        </div>
      )}
    </div>
  )
}
