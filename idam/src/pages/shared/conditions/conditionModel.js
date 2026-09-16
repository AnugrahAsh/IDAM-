export const NO_VALUE = ['is empty', 'is not empty']
export const PICKABLE = ['=', '!=']
export const needsValue = (op) => !NO_VALUE.includes(op)

export const FULL_OPERATORS = ['=', '!=', 'contains', 'starts with', 'ends with', 'in', '>', '>=', '<', '<=', 'is empty', 'is not empty']

export const buildAttributes = (list) => ({
  attributes: list,
  index: Object.fromEntries(list.map((a) => [a.id, a])),
  options: list.map((a) => ({ value: a.id, label: `${a.label} · ${a.id}` })),
})

export const stripParens = (text) => {
  const t = String(text).trim()
  if (!t.startsWith('(') || !t.endsWith(')')) return t
  let depth = 0
  for (let i = 0; i < t.length; i += 1) {
    if (t[i] === '(') depth += 1
    else if (t[i] === ')') {
      depth -= 1
      if (depth === 0 && i < t.length - 1) return t
    }
  }
  return t.slice(1, -1).trim()
}

export const splitTop = (text, keyword) => {
  const kw = keyword.toLowerCase()
  const parts = []
  let depth = 0
  let quoted = false
  let cur = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === "'") { quoted = !quoted; cur += ch; i += 1; continue }
    if (!quoted && ch === '(') { depth += 1; cur += ch; i += 1; continue }
    if (!quoted && ch === ')') { depth -= 1; cur += ch; i += 1; continue }
    if (!quoted && depth === 0 && /\s/.test(ch)) {
      const ahead = text.slice(i + 1, i + 1 + kw.length).toLowerCase()
      const after = text[i + 1 + kw.length]
      if (ahead === kw && (after === undefined || /\s/.test(after) || after === '(')) {
        parts.push(cur)
        cur = ''
        i += 1 + kw.length
        continue
      }
    }
    cur += ch
    i += 1
  }
  parts.push(cur)
  return parts.map((p) => p.trim()).filter(Boolean)
}

const SYMBOL_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|!=|=|>|<)\s*(.+)$/
const WORD_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s+(starts with|ends with|contains|in)\s+(.+)$/i
const EMPTY_RE = /^([A-Za-z_][A-Za-z0-9_]*)\s+(is not empty|is empty)$/i
const unquote = (v) => String(v).trim().replace(/^'(.*)'$/s, '$1')

export const parseRule = (text) => {
  const t = stripParens(text)
  const empty = t.match(EMPTY_RE)
  if (empty) return { attribute: empty[1], operator: empty[2].toLowerCase(), value: '' }
  const m = t.match(SYMBOL_RE) || t.match(WORD_RE)
  if (!m) return { raw: t }
  return { attribute: m[1], operator: m[2].toLowerCase(), value: unquote(m[3]) }
}

export const parseExpression = (text) => {
  const src = String(text || '').trim()
  if (!src) return { join: 'AND', groups: [{ join: 'AND', rules: [] }] }
  let join = 'AND'
  let chunks = splitTop(src, 'OR')
  if (chunks.length > 1) join = 'OR'
  else chunks = [src]
  const groups = chunks.map((chunk) => {
    const inner = stripParens(chunk)
    let gjoin = 'AND'
    let parts = splitTop(inner, 'AND')
    if (parts.length === 1) {
      const alt = splitTop(inner, 'OR')
      if (alt.length > 1) { parts = alt; gjoin = 'OR' }
    }
    return { join: gjoin, rules: parts.map(parseRule) }
  })
  return { join, groups }
}

const quoteValue = (v) => (/^-?\d+(\.\d+)?$/.test(String(v).trim()) ? String(v).trim() : `'${v}'`)

export const ruleText = (r) => {
  if (r.raw != null) return r.raw
  if (!needsValue(r.operator)) return `${r.attribute} ${r.operator}`
  return `${r.attribute} ${r.operator} ${quoteValue(r.value)}`
}

export const groupText = (g) => g.rules.map(ruleText).join(` ${g.join} `)

export const modelText = (m) => {
  const live = m.groups.filter((g) => g.rules.length > 0)
  return live
    .map((g) => (live.length > 1 && g.rules.length > 1 ? `(${groupText(g)})` : groupText(g)))
    .join(` ${m.join} `)
}

export const countRules = (m) => m.groups.reduce((a, g) => a + g.rules.length, 0)
export const allRules = (m) => m.groups.flatMap((g) => g.rules)
export const unresolvedRules = (m, index) => allRules(m).filter((r) => r.raw != null || !index[r.attribute])
export const incompleteRules = (m) => allRules(m).filter((r) => r.raw == null && needsValue(r.operator) && !String(r.value || '').trim())

export const blankRule = (attributeId) => ({ attribute: attributeId, operator: '=', value: '' })
export const blankModel = (attributeId) => ({ join: 'AND', groups: [{ join: 'AND', rules: [blankRule(attributeId)] }] })

export const evalRule = (view, r, index) => {
  if (r.raw != null) return true
  if (!index[r.attribute]) return true
  const raw = view[r.attribute]
  const a = String(raw == null ? '' : raw).toLowerCase()
  const b = String(r.value == null ? '' : r.value).trim().toLowerCase()
  switch (r.operator) {
    case '=': return a === b
    case '!=': return a !== b
    case 'contains': return b !== '' && a.includes(b)
    case 'starts with': return b !== '' && a.startsWith(b)
    case 'ends with': return b !== '' && a.endsWith(b)
    case 'in': return b.split(',').map((s) => s.trim()).filter(Boolean).includes(a)
    case '>': return Number(raw) > Number(r.value)
    case '>=': return Number(raw) >= Number(r.value)
    case '<': return Number(raw) < Number(r.value)
    case '<=': return Number(raw) <= Number(r.value)
    case 'is empty': return raw == null || raw === '' || raw === false
    case 'is not empty': return !(raw == null || raw === '' || raw === false)
    default: return true
  }
}

export const evalModel = (view, m, index) => {
  const live = m.groups.filter((g) => g.rules.length > 0)
  if (live.length === 0) return false
  const results = live.map((g) => (g.join === 'OR'
    ? g.rules.some((r) => evalRule(view, r, index))
    : g.rules.every((r) => evalRule(view, r, index))))
  return m.join === 'OR' ? results.some(Boolean) : results.every(Boolean)
}
