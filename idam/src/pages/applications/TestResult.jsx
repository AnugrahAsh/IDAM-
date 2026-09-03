import Icon from '../../components/primitives/Icon'

const STEP_TONE = { ok: 'ok', warn: 'warn', fail: 'bad', skip: 'mut' }
const STEP_ICON = { ok: 'check', warn: 'warn', fail: 'x', skip: 'minus' }

export default function TestResult({ probe, testing, idle }) {
  if (testing) {
    return (
      <div className="banner" data-tone="info">
        <Icon name="refresh" size={15} />
        <div>Probing the target with the supplied service credential. This runs read-only checks and writes nothing.</div>
      </div>
    )
  }

  if (!probe) {
    return (
      <div className="banner" data-tone="info">
        <Icon name="target" size={15} />
        <div>
          {idle || 'The connection has not been tested yet. A test resolves the endpoint, opens a transport, authenticates the service credential and reads the first page of the account object.'}
        </div>
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="banner" data-tone={probe.level}>
        <Icon name={probe.ok ? 'checkC' : 'warn'} size={15} />
        <div>
          <b>{probe.ok ? 'Connection succeeded' : 'Connection failed'}</b> · {probe.summary}
          <div className="t-xs" style={{ marginTop: 2, opacity: 0.85 }}>
            {probe.steps.filter((s) => s.state !== 'skip').length} checks in {probe.ms}ms at {probe.at}
          </div>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 34 }} />
            <th>Check</th>
            <th>Result</th>
            <th className="td-num" style={{ width: 78 }}>Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {probe.steps.map((s) => (
            <tr key={s.id}>
              <td>
                <span className="feed-ic" data-tone={STEP_TONE[s.state]} style={{ width: 20, height: 20 }}>
                  <Icon name={STEP_ICON[s.state]} size={10} stroke={3} />
                </span>
              </td>
              <td className="td-main">{s.label}</td>
              <td style={{ whiteSpace: 'normal' }}>{s.detail}</td>
              <td className="td-num">{s.state === 'skip' ? '—' : `${s.ms}ms`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
