import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { csvHref } from './uploadData'

export default function UploadResult({ spec, report, fileName }) {
  const failed = report.failures
  const errCsv = ['row,username,reason', ...failed.map((f) => `${f.row},${f.username},"${f.reason}"`)].join('\n')
  return (
    <div className="stack">
      <div className="banner" data-tone={failed.length ? 'warn' : 'ok'}>
        <Icon name={failed.length ? 'warn' : 'checkC'} size={15} />
        <div>
          {fileName} validated. {report.ok} of {report.total} rows {spec.okVerb}
          {failed.length
            ? `; ${failed.length} ${failed.length === 1 ? 'row was' : 'rows were'} rejected and left untouched.`
            : '.'}
          {failed.length > 0 && (
            <>
              {' '}
              <a className="link" href={csvHref(errCsv)} download={`${spec.sampleName.replace('.csv', '')}-failed.csv`}>
                Download failed rows
              </a>
            </>
          )}
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="file" size={12} />Rows read</span>
          <span className="stat-v">{report.total}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="checkC" size={12} />{spec.okLabel}</span>
          <span className="stat-v" style={{ color: 'var(--ok)' }}>{report.ok}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="warn" size={12} />Failed</span>
          <span className="stat-v" style={{ color: failed.length ? 'var(--bad)' : undefined }}>{failed.length}</span>
        </div>
      </div>

      {failed.length > 0 && (
        <div>
          <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Failed rows</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr><th>Row</th><th>Username</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {failed.map((f) => (
                  <tr key={f.row}>
                    <td className="td-mono">{f.row}</td>
                    <td className="td-mono">{f.username}</td>
                    <td>
                      <span className="row" style={{ gap: 7, alignItems: 'flex-start' }}>
                        <Pill tone={f.kind === 'Duplicate' ? 'bad' : 'warn'} dot>{f.kind}</Pill>
                        <span style={{ whiteSpace: 'normal' }}>{f.reason}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="t-xs t-mut">
        Duplicate usernames are never {spec.okVerb} or overwritten. Correct the failed rows and upload only those rows again.
      </div>
    </div>
  )
}

