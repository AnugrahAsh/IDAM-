import { useMemo } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Avatar from '../../components/primitives/Avatar'
import KeyValue from '../../components/primitives/KeyValue'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonKeyValue, SkeletonPageBar,
  SkeletonStats, SkeletonText,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import './ConsentRecordsPage.css'
import { num, serialColumn } from '../../lib/format'
import { CONSENT_RECORDS, CONSENT_DEFS } from '../shared/comms/commsData'
import { USERS } from '../../data/seed'

const actionTone = (a) => (a === 'Accepted' ? 'ok' : a === 'Withdrawn' || a === 'Declined' ? 'bad' : 'mut')

/* `loading` is Consent Management's flag: the evidence register lands with the
   page bar and the tab strip, and opening a record re-keys that same flag. */
export default function ConsentRecordsPage({ segments = [], embedded, loading = false }) {
  const { navigate, toast } = useApp()
  const rows = CONSENT_RECORDS

  const record = useMemo(
    () => (segments[0] ? rows.find((r) => String(r.id) === String(segments[0])) : null),
    [segments, rows],
  )

  if (segments[0]) {
    /* An acceptance record is a record page: the masthead lands first, so it is
       held first. The body is the wording shown beside the forensic detail on
       the left, and integrity above the identity's other records on the
       right — four boxes, at the heights they land at. */
    if (loading) {
      return (
        <Skeleton label="Loading the consent record">
          <SkeletonDetailHeader facts={4} actions={2} />
          <div className="detail-body">
            <div className="detail-cols">
              <div className="stack">
                <SkeletonCard><SkeletonText lines={6} /></SkeletonCard>
                <SkeletonCard><SkeletonKeyValue rows={10} cols={2} /></SkeletonCard>
              </div>
              <div className="stack">
                <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
                <SkeletonCard lines={4} />
              </div>
            </div>
          </div>
        </Skeleton>
      )
    }

    if (!record) {
      return (
        <>
          <PageBar title="Record not found" crumbs={[{ label: 'Consent Records', to: '/iam/consent/records' }, { label: 'Not found' }]} />
          <Card><EmptyState icon="file" title="No such record" body={`Consent record ${segments[0]} does not exist.`} actions={<Button variant="pri" onClick={() => navigate('/iam/consent/records')}>Back to records</Button>} /></Card>
        </>
      )
    }

    const user = USERS.find((u) => u.id === record.userId)
    const def = CONSENT_DEFS.find((c) => c.name === record.consentName)
    const related = rows.filter((r) => r.username === record.username && r.id !== record.id)

    return (
      <>
        <DetailHeader
          backTo="/iam/consent/records"
          backLabel="Consent Records"
          eyebrow="Consent record"
          title={`${record.consentName} ${record.consentVersion}`}
          sub={`Captured from ${record.username} on ${record.timestamp} from ${record.ip}.`}
          media={user ? <Avatar first={user.firstName} last={user.lastName} size="xl" /> : null}
          badges={
            <>
              <Pill tone={actionTone(record.actionType)} dot>{record.actionType}</Pill>
              <Tag>{record.consentVersion}</Tag>
              <Tag>{record.channel}</Tag>
            </>
          }
          meta={
            <>
              <Fact icon="user" label="Identity" value={record.username} />
              <Fact icon="globe" label="Source IP" value={record.ip} />
              <Fact icon="clock" label="Timestamp" value={record.timestamp} />
              <Fact icon="device" label="Channel" value={record.channel} />
            </>
          }
          actions={
            <>
              <Button icon="user" onClick={() => navigate(`/iam/users/${record.userId}`)}>Open identity</Button>
              <Button icon="download" onClick={() => toast('ok', 'Export queued', 'Signed evidence bundle is being prepared.')}>Export evidence</Button>
            </>
          }
        />

        <div className="detail-body">
          <div className="detail-cols">
            <div className="stack">
              <Card title="The exact text shown" sub={`${record.consentName} ${record.consentVersion} as presented at capture`}>
                <div className="mail-preview">
                  <div className="mail-preview-b">{def ? def.body : 'The consent body for this version is no longer retained.'}</div>
                </div>
              </Card>

              <Card title="Forensic detail" sub="Everything captured alongside the decision">
                <KeyValue
                  rows={[
                    { k: 'Username', v: record.username, icon: 'user' },
                    { k: 'Consent name', v: record.consentName, icon: 'consent' },
                    { k: 'Consent version', v: record.consentVersion, icon: 'tag' },
                    { k: 'Status', v: record.status, icon: 'checkC' },
                    { k: 'Action type', v: record.actionType, icon: 'bolt' },
                    { k: 'IP address', v: record.ip, icon: 'globe' },
                    { k: 'Timestamp', v: record.timestamp, icon: 'clock' },
                    { k: 'Browser details', v: record.browser, icon: 'device' },
                    { k: 'Channel', v: record.channel, icon: 'swap' },
                    { k: 'Organization', v: user ? user.organization : '—', icon: 'building' },
                  ]}
                />
              </Card>
            </div>

            <div className="stack">
              <Card title="Integrity" sub="Why this record can be relied upon">
                <Banner tone="ok">
                  This record is append-only. Any correction is written as a new record with its own
                  timestamp; the original is never mutated.
                </Banner>
                <div style={{ marginTop: 14 }}>
                  <KeyValue
                    cols={1}
                    rows={[
                      { k: 'Record id', v: `CR-${String(record.id).padStart(6, '0')}`, icon: 'file' },
                      { k: 'Hash', v: `sha256:${(record.id * 733721).toString(16).padStart(12, '0')}…`, icon: 'lock' },
                      { k: 'Retention', v: '7 years from capture', icon: 'history' },
                      { k: 'Written by', v: 'consent-capture-service', icon: 'server' },
                    ]}
                  />
                </div>
              </Card>

              <Card title="Other records for this identity" sub={`${related.length} further decisions`} flush>
                {related.length === 0
                  ? <EmptyState icon="file" title="No other records" body="This is the only consent decision on file." size="sm" />
                  : (
                    <table className="tbl">
                      <thead><tr><th>Consent</th><th>Action</th><th>When</th></tr></thead>
                      <tbody>
                        {related.map((r) => (
                          <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/iam/consent/records/${r.id}`)}>
                            <td className="td-main">{r.consentName} {r.consentVersion}</td>
                            <td><Pill tone={actionTone(r.actionType)} dot>{r.actionType}</Pill></td>
                            <td className="td-mono">{r.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              </Card>
            </div>
          </div>
        </div>
      </>
    )
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'username', label: 'Username', cls: 'td-main', locked: true,
      render: (r) => {
        const u = USERS.find((x) => x.id === r.userId)
        return (
          <span className="cell-id">
            {u && <Avatar first={u.firstName} last={u.lastName} size="sm" />}
            <span className="link" onClick={() => navigate(`/iam/consent/records/${r.id}`)}>{r.username}</span>
          </span>
        )
      },
    },
    { key: 'consentName', label: 'Consent name' },
    { key: 'consentVersion', label: 'Consent version', cls: 'td-mono', render: (r) => <Tag>{r.consentVersion}</Tag> },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={actionTone(r.status)} dot>{r.status}</Pill> },
    { key: 'actionType', label: 'Action type', render: (r) => <Pill tone={actionTone(r.actionType)}>{r.actionType}</Pill> },
    { key: 'ip', label: 'IP address', cls: 'td-mono' },
    { key: 'timestamp', label: 'Timestamp', cls: 'td-mono' },
    { key: 'browser', label: 'Browser details' },
  ]

  const accepted = rows.filter((r) => r.actionType === 'Accepted')
  const withdrawn = rows.filter((r) => r.actionType === 'Withdrawn')

  return (
    <>
      {!embedded && loading && (
        <Skeleton label="Loading the consent records">
          <SkeletonPageBar actions={2} crumbs={1} />
        </Skeleton>
      )}

      {!embedded && !loading && (
      <PageBar
        title="Consent Records"
        sub="The append-only evidence trail of every consent decision, retained for seven years."
        crumbs={[{ label: 'Consent Records' }]}
        actions={
          <>
            <Button icon="consent" onClick={() => navigate('consent')}>Consent definitions</Button>
            <Button variant="pri" icon="download" onClick={() => toast('ok', 'Export queued', 'The full consent register is being prepared as a signed CSV.')}>Export</Button>
          </>
        }
      />
      )}

      {loading ? <SkeletonStats count={4} /> : (
      <StatCards
        items={[
          { key: 'total', icon: 'file', label: 'Records', value: rows.length, chip: '7-year retention', sub: 'evidence of every decision' },
          { key: 'accepted', icon: 'checkC', label: 'Accepted', value: accepted.length, chip: 'in force', chipTone: 'ok', sub: 'agreement still standing' },
          { key: 'withdrawn', icon: 'ban', label: 'Withdrawn', value: withdrawn.length, chip: withdrawn.length ? 'consent revoked' : 'none', chipTone: withdrawn.length ? 'warn' : undefined, sub: 'processing must stop' },
          { key: 'identities', icon: 'users', label: 'Identities', value: new Set(rows.map((r) => r.username)).size, chip: 'covered', sub: 'with at least one record' },
        ]}
        label="Consent record summary"
      />
      )}

      <DataWorkbench
        id="consent-records"
        loading={loading}
        toolbar={embedded
          ? <Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Filtered records exported as CSV.')}>Export</Button>
          : undefined}
        rows={rows}
        columns={columns}
        searchPlaceholder="Search by identity, consent, IP or browser…"
        onRowClick={(r) => navigate(`/iam/consent/records/${r.id}`)}
rowActions={(r) => [
          { id: 'view', label: 'View record', icon: 'eye', onSelect: () => navigate(`/iam/consent/records/${r.id}`) },
          { id: 'identity', label: 'Open identity', icon: 'user', onSelect: () => navigate(`/iam/users/${r.userId}`) },
          { id: 'export', label: 'Export evidence', icon: 'download', onSelect: () => toast('ok', 'Export queued', `Evidence bundle for ${r.username}.`) },
        ]}
        emptyTitle="No consent records"
        emptyBody="Nothing has been captured in the retention window."
        emptyIcon="file"
        footNote="Append-only register · corrections are written as new records"
      />
    </>
  )
}
