import { useState } from 'react'
import Button from '../../components/primitives/Button'
import IconButton from '../../components/primitives/IconButton'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import { RISK_ORDER, SOURCES, riskOf, sourceOf } from './posture'
import { LOOKUPS } from '../../data/seed'
import { attrs, filterableAttrs, useAttrs } from '../configurations/schemaStore'

// A filter is a list of attribute rules rather than a fixed set of fields, so
// any attribute on the identity can be filtered on without this form having to
// grow a control for it.
//
// The list is generated from the identity schema, not hand-maintained: an
// attribute defined in Configurations is filterable the moment it is saved, and
// an attribute an administrator may not see is not offered at all. `options` is
// only a suggestion list — the value stays free text so a value the seed has
// not produced yet is still filterable.

/* Facts about the record that are not schema attributes: lifecycle state,
   timestamps the platform keeps, and the two derived postures. */
const EXTRA_ATTRIBUTES = [
  { key: 'status', label: 'Status', options: ['Active', 'Disabled', 'Locked', 'Pending'] },
  { key: 'lastLogin', label: 'Last sign-in' },
  { key: 'createdOn', label: 'Created on' },
  { key: '__source', label: 'Source of record', options: SOURCES, derive: sourceOf },
  {
    key: '__risk',
    label: 'Risk level',
    options: ['critical', 'high', 'medium', 'low'],
    derive: (u) => riskOf(u).level,
    ranked: true,
  },
]

const fromSchema = (list) => filterableAttrs(list).map((a) => ({
  key: a.id,
  label: a.label,
  options: a.src && LOOKUPS[a.src] ? LOOKUPS[a.src] : undefined,
}))

export const attributeList = (list) => [...fromSchema(list), ...EXTRA_ATTRIBUTES]
export const attrIndex = (list) => Object.fromEntries(attributeList(list).map((a) => [a.key, a]))

/* The pure predicate helpers are called from render paths that have no hook, so
   they read the registry directly rather than being handed it. */
const currentIndex = () => attrIndex(attrs())

export const OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'is not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'does not contain', label: 'does not contain' },
  { value: 'starts with', label: 'starts with' },
  { value: 'at or above', label: 'at or above' },
  { value: 'is empty', label: 'is empty' },
  { value: 'is not empty', label: 'is not empty' },
]

// "at or above" only means anything on a ranked attribute; the empty checks
// never take a value.
export const needsValue = (op) => op !== 'is empty' && op !== 'is not empty'
const operatorsFor = (attr) => OPERATORS.filter((o) => o.value !== 'at or above' || (attr && attr.ranked))

export const blankRule = () => ({ attribute: 'department', operator: 'is', value: '' })
export const BLANK_ADV = { join: 'AND', rules: [] }

const valueOf = (user, attr) => {
  const raw = attr && attr.derive ? attr.derive(user) : user[attr ? attr.key : '']
  return raw == null ? '' : String(raw)
}

const testRule = (user, rule, index = currentIndex()) => {
  const attr = index[rule.attribute]
  if (!attr) return true
  const actual = valueOf(user, attr)
  const want = String(rule.value || '')
  const a = actual.toLowerCase()
  const b = want.trim().toLowerCase()

  switch (rule.operator) {
    case 'is empty': return actual === ''
    case 'is not empty': return actual !== ''
    case 'is not': return b === '' ? true : a !== b
    case 'contains': return b === '' ? true : a.includes(b)
    case 'does not contain': return b === '' ? true : !a.includes(b)
    case 'starts with': return b === '' ? true : a.startsWith(b)
    case 'at or above': {
      if (b === '') return true
      const have = RISK_ORDER[actual] || 0
      const floor = RISK_ORDER[b] || 0
      return have >= floor
    }
    default: return b === '' ? true : a === b
  }
}

// A rule with no value yet is treated as unset rather than as "match nothing",
// so the register does not empty out while a rule is still being typed.
export const matchesAdv = (user, adv) => {
  const rules = (adv && adv.rules) || []
  const live = rules.filter((r) => !needsValue(r.operator) || String(r.value || '').trim())
  if (live.length === 0) return true
  const index = currentIndex()
  return adv.join === 'OR'
    ? live.some((r) => testRule(user, r, index))
    : live.every((r) => testRule(user, r, index))
}

export const activeRules = (adv) =>
  ((adv && adv.rules) || []).filter((r) => !needsValue(r.operator) || String(r.value || '').trim())

export const ruleLabel = (rule) => {
  const attr = currentIndex()[rule.attribute]
  const name = attr ? attr.label : rule.attribute
  return needsValue(rule.operator) ? `${name} ${rule.operator} ${rule.value}` : `${name} ${rule.operator}`
}

export default function AdvancedFilters({ initial, suggestions = {}, onChange }) {
  const schema = useAttrs()
  const ATTRIBUTES = attributeList(schema)
  const ATTR_INDEX = attrIndex(schema)
  const [draft, setDraft] = useState(() => ({
    join: (initial && initial.join) || 'AND',
    rules: initial && initial.rules && initial.rules.length ? initial.rules.map((r) => ({ ...r })) : [blankRule()],
  }))

  const commit = (next) => { setDraft(next); onChange(next) }
  const setRule = (i, patch) => commit({ ...draft, rules: draft.rules.map((r, ri) => (ri === i ? { ...r, ...patch } : r)) })
  const removeRule = (i) => commit({ ...draft, rules: draft.rules.filter((_, ri) => ri !== i) })
  const addRule = () => commit({ ...draft, rules: [...draft.rules, blankRule()] })

  return (
    <div className="stack">
      <div className="row-between">
        <div className="seg" role="radiogroup" aria-label="How rules combine">
          <button type="button" role="radio" aria-checked={draft.join === 'AND'} data-on={draft.join === 'AND'} onClick={() => commit({ ...draft, join: 'AND' })}>Match all</button>
          <button type="button" role="radio" aria-checked={draft.join === 'OR'} data-on={draft.join === 'OR'} onClick={() => commit({ ...draft, join: 'OR' })}>Match any</button>
        </div>
        <span className="t-xs t-mut">{draft.rules.length} {draft.rules.length === 1 ? 'rule' : 'rules'}</span>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <span className="t-micro t-mut" style={{ flex: '1 1 0' }}>Attribute</span>
        <span className="t-micro t-mut" style={{ flex: '0 0 132px' }}>Operator</span>
        <span className="t-micro t-mut" style={{ flex: '1 1 0' }}>Value</span>
        <span style={{ flex: '0 0 26px' }} />
      </div>

      {draft.rules.length === 0 && (
        <div className="t-sm t-mut">No rules yet. Add one to narrow the register by any identity attribute.</div>
      )}

      {draft.rules.map((r, i) => {
        const attr = ATTR_INDEX[r.attribute]
        const listId = `adv-vals-${i}`
        const suggested = attr && (attr.options || suggestions[attr.key] || [])
        const ops = operatorsFor(attr)
        return (
          <div className="row" style={{ gap: 8 }} key={`adv-${i}`}>
            <Select
              style={{ flex: '1 1 0' }}
              value={r.attribute}
              options={ATTRIBUTES.map((a) => ({ value: a.key, label: a.label }))}
              aria-label={`Rule ${i + 1} attribute`}
              onChange={(e) => {
                const next = ATTR_INDEX[e.target.value]
                const keepOp = ops.some((o) => o.value === r.operator) && (r.operator !== 'at or above' || (next && next.ranked))
                setRule(i, { attribute: e.target.value, value: '', operator: keepOp ? r.operator : 'is' })
              }}
            />
            <Select
              style={{ flex: '0 0 132px' }}
              value={r.operator}
              options={ops}
              aria-label={`Rule ${i + 1} operator`}
              onChange={(e) => setRule(i, { operator: e.target.value })}
            />
            {needsValue(r.operator) ? (
              <>
                <TextInput
                  style={{ flex: '1 1 0' }}
                  value={r.value}
                  list={suggested && suggested.length ? listId : undefined}
                  placeholder="Type a value…"
                  aria-label={`Rule ${i + 1} value`}
                  onChange={(e) => setRule(i, { value: e.target.value })}
                />
                {suggested && suggested.length > 0 && (
                  <datalist id={listId}>
                    {suggested.map((v) => <option key={v} value={v} />)}
                  </datalist>
                )}
              </>
            ) : (
              <TextInput style={{ flex: '1 1 0' }} value="" disabled placeholder="Not required" aria-label={`Rule ${i + 1} value`} />
            )}
            <IconButton icon="x" size="sm" label={`Remove rule ${i + 1}`} onClick={() => removeRule(i)} />
          </div>
        )
      })}

      <div>
        <Button size="sm" icon="plus" onClick={addRule}>Add rule</Button>
      </div>
    </div>
  )
}
