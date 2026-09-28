import './SmsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import KeyValue from '../../components/primitives/KeyValue'
import EmptyState from '../../components/primitives/EmptyState'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonKeyValue, SkeletonPageBar, SkeletonText,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { stampText } from '../../lib/clock'
import { useLoading } from '../../lib/useLoading'
import { serialColumn } from '../../lib/format'
import { SMS_QUEUE } from '../shared/comms/commsData'

const tone = (s) => (s === 'Sent' ? 'ok' : s === 'Failed' ? 'bad' : 'warn')

// The register defaults to every message. The two narrower scopes exist because
// the question an operator actually arrives with is "what did not go out", and
// that answer should not need a search query to reach.
const SCOPES = [
  { id: 'all', label: 'All', icon: 'sms', count: (c) => c.rows.length },
  { id: 'issues', label: 'Needs attention', icon: 'warn', count: (c) => c.queued.length + c.failed.length },
  { id: 'failed', label: 'Failed', icon: 'ban', count: (c) => c.failed.length },
]

// `rows` and `setRows` come from the section above when SMS Management owns the
// queue, so the delivery cards and this register never disagree about how many
// messages are still waiting. The local fallback keeps the page usable alone.
export default function SmsPage({ segments = [], embedded, rows: rowsProp, onRowsChange, loading: loadingProp }) {
  const { navigate, toast, confirm } = useApp()
  const [ownRows, setOwnRows] = useState(() => SMS_QUEUE.map((r) => ({ ...r })))
  const rows = rowsProp || ownRows
  const setRows = onRowsChange || setOwnRows
  const [scope, setScope] = useState('all')
  /* Embedded in SMS Management the section above owns the settle, so the log
     lands with the tabs and the page bar rather than a frame after them. On
     its own route there is nothing above it, so it settles for itself — keyed
     on the message id, because opening one is the round trip a real deployment
     would make. */
  const ownLoading = useLoading(segments[0] || 'queue')
  const loading = loadingProp === undefined ? ownLoading : loadingProp

  const record = useMemo(
    () => (segments[0] ? rows.find((r) => String(r.id) === String(segments[0])) : null),
    [segments, rows],
  )

  const send = (list, resend = false) => {
    const s = new Set(list.map((r) => String(r.id)))
    setRows((rs) => rs.map((r) => (s.has(String(r.id)) ? { ...r, status: 'Sent', sent: stampText(), gateway: 'DELIVRD' } : r)))
    toast(
      'ok',
      resend ? 'Resent' : 'Dispatched',
      resend
        ? `${list.length} failed message${list.length > 1 ? 's were' : ' was'} re-queued and accepted. The failed count drops by ${list.length}.`
        : `${list.length} message${list.length > 1 ? 's' : ''} handed to the gateway.`,
    )
  }

  const remove = (list, clear) => confirm({
    title: list.length === 1 ? 'Remove this message?' : `Remove ${list.length} messages?`,
    body: 'A removed message is never delivered. Sent messages remain in the delivery log.',
    confirmLabel: list.length === 1 ? 'Remove' : `Remove ${list.length}`,
    onConfirm: () => {
      const s = new Set(list.map((r) => String(r.id)))
      setRows((rs) => rs.filter((r) => !s.has(String(r.id))))
      if (clear) clear()
      toast('ok', 'Removed', `${list.length} message${list.length > 1 ? 's' : ''} removed from the queue.`)
      if (segments[0]) navigate('/iam/sms/messages')
    },
  })

  if (segments[0]) {
    /* A message is a record page: masthead, the rendered text on the left and
       the envelope's nine facts on the right. Held in that shape so the two
       columns do not swap width when the record lands. */
    if (loading) {
      return (
        <Skeleton label="Loading the message">
          <SkeletonDetailHeader facts={5} actions={2} />
          <div className="detail-body">
            <div className="detail-cols">
              <SkeletonCard><SkeletonText lines={5} /></SkeletonCard>
              <SkeletonCard><SkeletonKeyValue rows={9} cols={1} /></SkeletonCard>
            </div>
          </div>
        </Skeleton>
      )
    }

    if (!record) {
      return (
        <>
          <PageBar title="Message not found" crumbs={[{ label: 'SMS', to: 'sms' }, { label: 'Not found' }]} />
          <Card><EmptyState icon="sms" title="No such message" body="It may have been sent and purged, or removed from the queue." actions={<Button variant="pri" onClick={() => navigate('/iam/sms/messages')}>Back to queue</Button>} /></Card>
        </>
      )
    }
    // The text is carried on the message, not looked up from the template: a
    // template is an API binding and no longer holds the words that were sent.
    const body = (record.body || 'Message body unavailable.')
      .replace(/\{\{code\}\}/g, '482913')
      .replace(/\{\{expiryMinutes\}\}/g, '10')
      .replace(/\{\{username\}\}/g, record.username)
      .replace(/\{\{supportEmail\}\}/g, 'support@tanflow.com')
      .replace(/\{\{actionUrl\}\}/g, 'https://id.tanflow.com/a/9c22')
      .replace(/\{\{expiryHours\}\}/g, '24')
      .replace(/\{\{requestId\}\}/g, 'REQ-2411')
      .replace(/\{\{startDate\}\}/g, '2026-08-07')

    return (
      <>
        <DetailHeader
          backTo="/iam/sms/messages"
          backLabel="SMS Management"
          eyebrow="Outbound message"
          title={record.template}
          sub={`Queued for ${record.user} via the ${record.provider} gateway.`}
          badges={<><Pill tone={tone(record.status)} dot>{record.status}</Pill><Tag>{record.provider}</Tag></>}
          meta={
            <>
              <Fact icon="user" label="Recipient" value={record.username} />
              <Fact icon="phone" label="Number" value={record.phone} />
              <Fact icon="clock" label="Sent" value={record.sent || 'Not yet sent'} />
              <Fact icon="layers" label="Segments" value={record.segments} />
              <Fact icon="bolt" label="Latency" value={record.latencyMs ? `${record.latencyMs} ms` : 'Not dispatched'} />
            </>
          }
          actions={
            <>
              {record.status !== 'Sent' && <Button variant="pri" icon="sms" onClick={() => send([record])}>Send now</Button>}
              <Button variant="danger" icon="trash" onClick={() => remove([record])}>Remove</Button>
            </>
          }
        />
        <div className="detail-body">
          <div className="detail-cols">
            <Card title="Rendered message" sub={`${body.length} characters · ${record.segments} segment${record.segments > 1 ? 's' : ''}`}>
              <div className="sms-preview">
                <div className="sms-bubble">{body}</div>
                <div className="sms-meta">{record.sent || 'queued'} · {record.provider}</div>
              </div>
            </Card>
            <Card title="Envelope">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Template', v: record.template, icon: 'file' },
                  { k: 'Recipient', v: record.username, icon: 'user' },
                  { k: 'Number', v: record.phone, icon: 'phone' },
                  { k: 'Provider', v: record.provider, icon: 'server' },
                  { k: 'Status', v: record.status, icon: 'checkC' },
                  { k: 'Gateway response', v: record.gateway, icon: 'swap' },
                  { k: 'Latency', v: record.latencyMs ? `${record.latencyMs} ms` : 'Not dispatched', icon: 'bolt' },
                  { k: 'Error', v: record.error || 'None', icon: 'warn' },
                  { k: 'Segments', v: record.segments, icon: 'layers' },
                ]}
              />
            </Card>
          </div>
        </div>
      </>
    )
  }

  const queued = rows.filter((r) => r.status === 'Queued')
  const failed = rows.filter((r) => r.status === 'Failed')

  const visible = scope === 'issues'
    ? rows.filter((r) => r.status === 'Failed' || r.status === 'Queued')
    : scope === 'failed'
      ? failed
      : rows

  return (
    <>
      {/* Embedded, the masthead belongs to the section above and is already
          being held there; on its own route this page owns it. One announcing
          region either way — the register's own body skeleton is decoration. */}
      {!embedded && loading && (
        <Skeleton label="Loading the SMS delivery log">
          <SkeletonPageBar actions={2} crumbs={1} />
        </Skeleton>
      )}

      {!embedded && !loading && (
        <PageBar
          title="SMS"
          sub="Outbound text messages waiting on a gateway, with per-message delivery detail."
          crumbs={[{ label: 'SMS' }]}
          actions={
            <>
              <Button icon="sliders" onClick={() => navigate('smsTemplates')}>Providers</Button>
              <Button variant="pri" icon="sms" disabled={!queued.length} onClick={() => send(queued)}>
                Send All{queued.length ? ` (${queued.length})` : ''}
              </Button>
            </>
          }
        />
      )}

      <DataWorkbench
        id="sms-queue"
        rows={visible}
        loading={loading}
        columns={[
          serialColumn('S.No'),
          {
            key: 'sent', label: 'Sent at', cls: 'td-mono', width: 150,
            render: (r) => (r.sent
              ? <span className="link" onClick={() => navigate(`/iam/sms/${r.id}`)}>{r.sent}</span>
              : <span className="t-mut">Not sent</span>),
          },
          { key: 'username', label: 'Username', cls: 'td-main', locked: true, render: (r) => <span className="trunc">{r.username}</span> },
          { key: 'phone', label: 'Recipient', cls: 'td-mono' },
          { key: 'template', label: 'Template', render: (r) => <span className="trunc">{r.template}</span> },
          { key: 'provider', label: 'Provider', render: (r) => <Tag>{r.provider}</Tag> },
          { key: 'status', label: 'Status', render: (r) => <Pill tone={tone(r.status)} dot>{r.status}</Pill> },
          {
            key: 'error', label: 'Error', sortable: false,
            // The reason a message failed is the point of this column, so it is
            // shown in full rather than truncated to a status word.
            render: (r) => (r.error
              ? <span className="sms-err"><Icon name="warn" size={12} />{r.error}</span>
              : <span className="t-faint">—</span>),
          },
        ]}
        selectable
        searchPlaceholder="Search by username, recipient, template or provider…"
        filters={
          <>
            {SCOPES.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                data-on={scope === s.id ? 'true' : undefined}
                aria-pressed={scope === s.id}
                onClick={() => setScope(s.id)}
              >
                <Icon name={s.icon} size={12} />
                {s.label}
                <b className="chip-n num">{s.count({ rows, queued, failed })}</b>
              </button>
            ))}
          </>
        }
        toolbar={
          <>
            <Button
              size="sm"
              variant="pri"
              icon="sms"
              disabled={queued.length === 0}
              onClick={() => send(queued)}
            >
              Send all queued{queued.length ? ` (${queued.length})` : ''}
            </Button>
            <Button
              size="sm"
              icon="refresh"
              disabled={failed.length === 0}
              onClick={() => send(failed, true)}
            >
              Resend all failed{failed.length ? ` (${failed.length})` : ''}
            </Button>
          </>
        }
        onRowClick={(r) => navigate(`/iam/sms/${r.id}`)}
        bulkActions={(ids, clear) => {
          const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
          const failedPicked = list.filter((r) => r.status === 'Failed')
          return (
            <>
              <Button size="sm" icon="sms" onClick={() => { send(list.filter((r) => r.status !== 'Sent')); clear() }}>Send</Button>
              <Button
                size="sm"
                icon="refresh"
                disabled={failedPicked.length === 0}
                onClick={() => { send(failedPicked, true); clear() }}
              >
                Resend {failedPicked.length ? `(${failedPicked.length})` : ''}
              </Button>
              <Button size="sm" variant="danger" icon="trash" onClick={() => remove(list, clear)}>Remove</Button>
            </>
          )
        }}
        rowActions={(r) => [
          { id: 'view', label: 'View message', icon: 'eye', onSelect: () => navigate(`/iam/sms/${r.id}`) },
          r.status === 'Failed'
            ? { id: 'resend', label: 'Resend', icon: 'refresh', onSelect: () => send([r], true) }
            : { id: 'send', label: 'Send', icon: 'sms', disabled: r.status === 'Sent', onSelect: () => send([r]) },
          { divider: true },
          { id: 'rm', label: 'Remove', icon: 'trash', danger: true, onSelect: () => remove([r]) },
        ]}
        emptyTitle={scope === 'all' ? 'No messages' : 'No SMS issues'}
        emptyBody={scope === 'all'
          ? 'No text messages have been queued or dispatched.'
          : 'Failed or dropped SMS messages will appear here.'}
        emptyIcon="sms"
      />
    </>
  )
}
