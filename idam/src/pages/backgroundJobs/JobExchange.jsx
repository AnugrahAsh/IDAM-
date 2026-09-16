import Card from '../../components/primitives/Card'
import Pill from '../../components/primitives/Pill'
import JsonView from '../../components/primitives/JsonView'
import EmptyState from '../../components/primitives/EmptyState'

const toneFor = (code) => {
  if (code == null) return 'mut'
  if (code >= 400) return 'bad'
  if (code === 207) return 'warn'
  return 'ok'
}

/**
 * What was sent, and what came back.
 *
 * This is the whole reason a failed job row is opened, so it is the first thing
 * the panel shows rather than something reached through a record summary and
 * then a second button. Payload above, response below, both as the JSON
 * documents they are — the same viewer the reports use, so an operator reading
 * a gateway response and one reading a connector response read the same thing.
 */
export default function JobExchange({ payload, response, sub }) {
  const status = response ? response.status : null
  return (
    <div className="stack">
      {sub && <div className="t-xs t-mut">{sub}</div>}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {payload && <span className="tag mono">{payload.method}</span>}
        <Pill tone={toneFor(status)} dot>
          {status == null ? 'Not dispatched' : `HTTP ${status}`}
        </Pill>
        {response && response.durationMs != null && (
          <span className="t-xs t-mut">{response.durationMs} ms</span>
        )}
      </div>

      {payload && <div className="jsonurl mono">{payload.url}</div>}

      <Card flush title="Payload Data" sub="What the platform sent to the target">
        <div className="job-json-pad">
          {payload
            ? <JsonView data={{ headers: payload.headers, body: payload.body }} label="Payload Data" />
            : <EmptyState size="sm" icon="upload" title="No payload recorded" body="Nothing was dispatched for this record." />}
        </div>
      </Card>

      <Card
        flush
        title="Response Data"
        sub={status == null ? 'The target was never reached' : `The target answered ${status}`}
      >
        <div className="job-json-pad">
          {response && response.status != null
            ? <JsonView data={{ statusCode: response.status, headers: response.headers, body: response.body }} label="Response Data" />
            : (
              <EmptyState
                size="sm"
                icon="info"
                title="No response recorded"
                body={(response && response.note)
                  || 'This record was not dispatched before the run was observed, so nothing came back.'}
              />
            )}
        </div>
      </Card>
    </div>
  )
}
