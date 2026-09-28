import { useMemo } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Pill from '../../components/primitives/Pill'
import { duration, num } from '../../lib/format'
import { runHistory } from './policyPageData'
import { SkeletonStatStrip } from './PoliciesSkeleton'

export default function HistoryTab({ policy, matchedCount, loading = false }) {
  const runs = useMemo(() => runHistory(policy, matchedCount), [policy, matchedCount])
  const failed = runs.filter((r) => r.status === 'Failed').length

  const columns = [
    { key: 'runId', label: 'Run', locked: true, cls: 'td-main td-mono' },
    { key: 'started', label: 'Started', cls: 'td-mono' },
    { key: 'trigger', label: 'Triggered by' },
    { key: 'evaluated', label: 'Evaluated', align: 'right', render: (r) => num(r.evaluated) },
    { key: 'matched', label: 'Matched', align: 'right', render: (r) => num(r.matched) },
    { key: 'granted', label: 'Granted', align: 'right', render: (r) => (r.granted > 0 ? <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{r.granted}</span> : '0') },
    { key: 'revoked', label: 'Revoked', align: 'right', render: (r) => (r.revoked > 0 ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{r.revoked}</span> : '0') },
    { key: 'durationMs', label: 'Duration', align: 'right', render: (r) => duration(r.durationMs) },
    { key: 'status', label: 'Result', render: (r) => <Pill tone={r.status === 'Succeeded' ? 'ok' : 'bad'} dot>{r.status}</Pill> },
  ]

  return (
    <div className="stack">
      {/* The strip reads the same run records the rows do, so it settles with
          them rather than printing totals for a table that is still grey. */}
      {loading ? <SkeletonStatStrip cells={4} /> : (
        <div className="stat-strip">
          <div className="stat-cell"><span className="stat-k">Runs recorded</span><span className="stat-v">{num(runs.length)}</span></div>
          <div className="stat-cell"><span className="stat-k">Failures</span><span className="stat-v" style={{ color: failed ? 'var(--bad)' : undefined }}>{num(failed)}</span></div>
          <div className="stat-cell"><span className="stat-k">Grants issued</span><span className="stat-v">{num(runs.reduce((a, r) => a + r.granted, 0))}</span></div>
          <div className="stat-cell"><span className="stat-k">Revocations</span><span className="stat-v">{num(runs.reduce((a, r) => a + r.revoked, 0))}</span></div>
        </div>
      )}

      <DataWorkbench
        id={`policy-runs-${policy.id}`}
        rows={runs}
        loading={loading}
        columns={columns}
        searchPlaceholder="Search runs…"
        emptyTitle="No runs recorded"
        emptyBody="This policy has not been evaluated yet."
        emptyIcon="history"
        pageSize={10}
        footNote="Run records are retained for 400 days"
      />
    </div>
  )
}
