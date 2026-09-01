import Banner from '../../components/primitives/Banner'
import Icon from '../../components/primitives/Icon'

export default function TestResult({ result }) {
  if (!result) return null
  return (
    <div style={{ marginTop: 14 }}>
      <Banner tone={result.ok ? 'ok' : 'bad'}>
        <b>{result.title}.</b> {result.detail}
      </Banner>
      {result.steps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {result.steps.map((s) => (
            <div className="factor" key={s.label}>
              <span className="factor-l">
                <Icon name={s.ok ? 'check' : 'x'} size={12} style={{ display: 'inline-block', color: s.ok ? 'var(--ok)' : 'var(--bad)' }} />
                {' '}{s.label}
              </span>
              <span className="factor-bar">
                <i style={{ width: `${Math.min(100, (s.ms / 220) * 100)}%`, background: s.ok ? 'var(--ok)' : 'var(--bad)' }} />
              </span>
              <span className="factor-d">{s.ms} ms</span>
            </div>
          ))}
        </div>
      )}
      <div className="t-xs t-faint" style={{ marginTop: 8 }}>
        {result.ts} · {result.ok ? `${result.totalMs} ms total` : 'no call was made'} · simulation only
      </div>
    </div>
  )
}

