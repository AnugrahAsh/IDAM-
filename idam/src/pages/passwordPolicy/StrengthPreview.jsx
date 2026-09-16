import Banner from '../../components/primitives/Banner'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Meter from '../../components/primitives/Meter'
import Pill from '../../components/primitives/Pill'
import TextInput from '../../components/primitives/TextInput'
import { useState } from 'react'
import { SAMPLE_USERNAME, crackTime, entropyBits, poolSize, requirementList, strengthBand } from './passwordData'

// The meter runs to the top of the "very strong" band rather than to 100, so a
// policy that clears every threshold still leaves headroom on the bar.
const SCALE_MAX = 110

const nextBand = (bits) => {
  if (bits < 55) return { at: 55, label: 'Adequate' }
  if (bits < 70) return { at: 70, label: 'Strong' }
  if (bits < 90) return { at: 90, label: 'Very strong' }
  return null
}

export default function StrengthPreview({ rules, title = 'Strength preview' }) {
  const [candidate, setCandidate] = useState('')
  const bits = entropyBits(rules)
  const band = strengthBand(bits)
  const reqs = requirementList(rules)
  const value = candidate
  const evaluated = value
    ? reqs.map((r) => ({ ...r, pass: r.informational ? true : r.test(value, SAMPLE_USERNAME) }))
    : reqs
  const failing = value ? evaluated.filter((r) => !r.pass).length : 0
  const met = evaluated.length - failing
  const next = nextBand(bits)

  return (
    <Card
      title={title}
      sub="What the current rules demand of every credential set under this policy"
      actions={<Pill tone={band.tone} dot>{band.label}</Pill>}
    >
      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="bolt" size={12} />Entropy floor</span>
          <span className="stat-v">{bits}<span className="k-unit">bits</span></span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="layers" size={12} />Character pool</span>
          <span className="stat-v">{poolSize(rules)}<span className="k-unit">symbols</span></span>
        </div>
      </div>

      <Meter value={Math.min(100, (bits / SCALE_MAX) * 100)} tone={band.tone} height={7} />
      <div className="req-scale">
        <span>{band.label}</span>
        <span className="spacer" />
        <span>{next ? `${next.label} at ${next.at} bits` : 'Top band reached'}</span>
      </div>

      <div className="t-xs t-mut req-crack">
        A credential that only just satisfies these rules resists an offline attack at 100 billion guesses per second
        for approximately <b>{crackTime(bits)}</b>.
      </div>

      <div className="req-head">
        <span className="t-micro t-mut">Requirements</span>
        <span className="spacer" />
        <span className="req-count" data-state={!value ? 'idle' : failing ? 'bad' : 'ok'}>
          {value ? `${met} of ${evaluated.length} met` : `${evaluated.length} rules`}
        </span>
      </div>

      <ul className="req-list">
        {evaluated.map((r) => {
          const state = !value ? 'idle' : r.informational ? 'skip' : r.pass ? 'ok' : 'bad'
          return (
            <li className="req-it" key={r.id} data-state={state}>
              <span className="req-mk">
                {state === 'ok' && <Icon name="check" size={11} stroke={2.6} />}
                {state === 'bad' && <Icon name="x" size={11} stroke={2.6} />}
              </span>
              <span className="req-m">
                <span className="req-t">{r.label}</span>
                {r.note && <span className={`req-n${r.mono ? ' mono' : ''}`}>{r.note}</span>}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="req-try">
        <Field
          label="Evaluate a candidate"
          hint="Evaluated in the browser against the rules above. Nothing is transmitted or stored."
          htmlFor="pp-candidate"
        >
          <TextInput
            id="pp-candidate"
            className="mono"
            value={candidate}
            placeholder="Try a candidate credential"
            autoComplete="off"
            spellCheck="false"
            onChange={(e) => setCandidate(e.target.value)}
          />
        </Field>
        {value && (
          <div style={{ marginTop: 12 }}>
            <Banner tone={failing === 0 ? 'ok' : 'bad'}>
              {failing === 0
                ? <>The candidate satisfies every rule in this policy. It would be accepted at set, change and reset.</>
                : <><b>{failing} {failing === 1 ? 'rule fails' : 'rules fail'}.</b> The candidate would be refused with the failing rules listed back to the identity.</>}
            </Banner>
          </div>
        )}
      </div>
    </Card>
  )
}
