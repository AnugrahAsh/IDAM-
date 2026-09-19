import './ExpressionCode.css'
import { needsValue } from './conditionModel'

const NUMERIC = /^-?\d+(\.\d+)?$/

function ruleTokens(r, isUnknown) {
  if (r.raw != null) return [{ t: 'raw', v: r.raw || '…' }]
  const out = [{ t: isUnknown && isUnknown(r.attribute) ? 'attr-unknown' : 'attr', v: r.attribute }, { t: 'sp', v: ' ' }, { t: 'op', v: r.operator }]
  if (!needsValue(r.operator)) return out
  const value = String(r.value == null ? '' : r.value).trim()
  out.push({ t: 'sp', v: ' ' })
  if (!value) out.push({ t: 'str-empty', v: "''" })
  else if (NUMERIC.test(value)) out.push({ t: 'num', v: value })
  else out.push({ t: 'str', v: `'${value}'` })
  return out
}

/* One line per condition, one line per join between groups, and each group
   wrapped in parentheses when it shares the expression with another — the
   same shape the evaluator reads, laid out so a long rule can be scanned
   instead of parsed. */
function toLines(model, isUnknown) {
  const live = model.groups.filter((g) => g.rules.length > 0)
  const lines = []
  live.forEach((g, gi) => {
    if (gi > 0) lines.push([{ t: 'kw', v: model.join }])
    const wrap = live.length > 1 && g.rules.length > 1
    g.rules.forEach((r, ri) => {
      const line = []
      if (ri === 0) {
        if (wrap) line.push({ t: 'paren', v: '(' })
      } else {
        line.push({ t: 'sp', v: '  ' }, { t: 'kw', v: g.join }, { t: 'sp', v: ' ' })
      }
      line.push(...ruleTokens(r, isUnknown))
      if (wrap && ri === g.rules.length - 1) line.push({ t: 'paren', v: ')' })
      lines.push(line)
    })
  })
  return lines
}

const TITLES = {
  'str-empty': 'This condition still needs a value',
  'attr-unknown': 'This attribute is not defined in the identity registry',
  raw: 'Free-form expression',
}

export default function ExpressionCode({ model, isUnknown, emptyLabel = 'No conditions defined', numbered = true, className = '' }) {
  const lines = toLines(model, isUnknown)
  return (
    <div className={`xc ${className}`} role="figure" aria-label="Resolved expression">
      {lines.length === 0 ? (
        <div className="xc-empty">{emptyLabel}</div>
      ) : (
        <ol className="xc-lines" data-numbered={numbered || undefined}>
          {lines.map((tokens, i) => (
            <li className="xc-line" key={i}>
              {numbered && <span className="xc-ln" aria-hidden="true">{i + 1}</span>}
              <code className="xc-code">
                {tokens.map((tk, j) => (
                  <span key={j} className={`xc-${tk.t}`} title={TITLES[tk.t]}>{tk.v}</span>
                ))}
              </code>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
