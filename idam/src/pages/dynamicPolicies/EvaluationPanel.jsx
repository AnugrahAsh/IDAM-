import { useMemo } from 'react'
import Avatar from '../../components/primitives/Avatar'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import { groupLetter } from '../shared/conditions/ConditionBuilder'
import { needsValue, ruleText } from '../shared/conditions/conditionModel'
import { USERS } from '../../data/seed'
import { num } from '../../lib/format'
import { evalRule, matchUsers } from './policyPageData'

const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0)

/* Walk each group condition by condition, keeping the running population, so
   the panel can say where the result narrows — not just what it ends up as. */
function breakdownOf(model) {
  return model.groups
    .map((g, gi) => ({ g, gi }))
    .filter(({ g }) => g.rules.length > 0)
    .map(({ g, gi }) => {
      let running = USERS
      const reached = new Set()
      const steps = g.rules.map((r) => {
        const before = g.join === 'OR' ? reached.size : running.length
        if (g.join === 'OR') USERS.forEach((u) => { if (evalRule(u, r)) reached.add(u.id) })
        else running = running.filter((u) => evalRule(u, r))
        const count = g.join === 'OR' ? reached.size : running.length
        return { rule: r, before, count }
      })
      return {
        letter: groupLetter(gi),
        join: g.join,
        steps,
        count: steps.length ? steps[steps.length - 1].count : 0,
      }
    })
}

function diagnose(model, breakdown, matched) {
  if (matched > 0 || breakdown.length === 0) return null
  const empty = breakdown.find((b) => b.count === 0)
  if (empty) {
    const step = empty.steps.find((s) => s.count === 0 && s.before > 0) || empty.steps[0]
    const r = step.rule
    const missing = r.raw == null && needsValue(r.operator) && !String(r.value || '').trim()
    return (
      <>
        In group {empty.letter}, <code className="code">{ruleText(r)}</code>{' '}
        {missing ? 'has no value yet, so nothing can satisfy it.' : `removes the last ${num(step.before)} ${step.before === 1 ? 'identity' : 'identities'}.`}
      </>
    )
  }
  if (model.join === 'AND') {
    return <>Every group matches someone on its own, but no identity satisfies {breakdown.map((b) => b.letter).join(' and ')} together.</>
  }
  return null
}

export default function EvaluationPanel({ model, savedCount, dirty, onSimulate }) {
  const matched = useMemo(() => matchUsers(model), [model])
  const breakdown = useMemo(() => breakdownOf(model), [model])
  const total = USERS.length
  const n = matched.length
  const delta = n - savedCount
  const hint = diagnose(model, breakdown, n)
  const sample = matched.slice(0, 6)

  return (
    <Card
      title="Live evaluation"
      sub={`Recomputed on every edit against ${num(total)} identities`}
      actions={dirty ? <Pill tone="warn" dot>Unsaved draft</Pill> : <Pill tone="ok" dot>Matches saved</Pill>}
    >
      <div className="ev" data-split={breakdown.length > 0 || undefined}>
        <div className="ev-summary">
          <div className="row-between">
            <div>
              <div className="t-sm t-mut">Matching identities</div>
              <div className="ev-num num">{num(n)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Pill tone={delta > 0 ? 'ok' : delta < 0 ? 'bad' : 'mut'}>
                {delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}${num(Math.abs(delta))}`} vs saved {num(savedCount)}
              </Pill>
              <div className="t-xs t-mut" style={{ marginTop: 4 }}>{pct(n, total)}% of the directory</div>
            </div>
          </div>
          <Meter value={pct(n, total)} tone="ok" height={8} />

          {hint && <Banner tone="warn">{hint}</Banner>}

          {n > 0 && (
            <div className="row-between">
              <div className="ev-avatars">
                {sample.map((u) => (
                  <span key={u.id} className="ev-avatar" title={`${u.username} · ${u.department}`}>
                    <Avatar first={u.firstName} last={u.lastName} size="sm" />
                  </span>
                ))}
                {n > sample.length && <span className="t-xs t-mut" style={{ marginLeft: 8 }}>+{num(n - sample.length)} more</span>}
              </div>
              <Button size="sm" iconRight="chevR" onClick={onSimulate}>Preview identities</Button>
            </div>
          )}

          <div className="t-xs t-mut">Saved definition matches {num(savedCount)}. Unsaved edits are not evaluated by the scheduler.</div>
        </div>

        {breakdown.length > 0 && (
          <div className="ev-section">
            <div className="t-micro t-mut ev-section-h">How the result narrows</div>
            {breakdown.map((b) => (
              <div className="ev-group" key={b.letter}>
                <div className="row-between ev-group-h">
                  <span className="t-sm"><b>Group {b.letter}</b> <span className="t-mut">· {b.join === 'AND' ? 'all of' : 'any of'}</span></span>
                  <span className="num t-sm" style={b.count === 0 ? { color: 'var(--bad)', fontWeight: 600 } : { fontWeight: 600 }}>{num(b.count)}</span>
                </div>
                {b.steps.map((s, i) => (
                  <div key={i} className="ev-step" data-zero={s.count === 0 || undefined}>
                    <span className="ev-step-conj">{i === 0 ? 'Where' : b.join}</span>
                    <span className="ev-step-rule mono" title={ruleText(s.rule)}>{ruleText(s.rule) || '…'}</span>
                    <Meter value={pct(s.count, total)} height={4} />
                    <span className="ev-step-n num" title={s.rule.raw != null ? 'Free-form expression — passed through, not evaluated' : undefined}>
                      {s.rule.raw != null ? '—' : num(s.count)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {breakdown.length > 1 && (
              <div className="row-between ev-result">
                <span className="t-sm t-mut">Groups combined with {model.join}</span>
                <span className="num t-sm" style={{ fontWeight: 600 }}>{num(n)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
