import './styles/EmailsPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DetailHeader, { Fact } from '../components/shell/DetailHeader'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import StatChip from '../components/primitives/StatChip'
import Pill from '../components/primitives/Pill'
import Tag from '../components/primitives/Tag'
import Tabs from '../components/primitives/Tabs'
import KeyValue from '../components/primitives/KeyValue'
import EmptyState from '../components/primitives/EmptyState'
import { useApp } from '../store/AppContext'
import { num, serialColumn } from '../lib/format'
import { OUTBOX, TEMPLATES, stamp } from './comms/commsData'
import { DELIVERY_LOG } from '../data/seed'

const tone = (s) => (s === 'Sent' || s === 'Delivered' ? 'ok' : s === 'Failed' ? 'bad' : 'warn')

function MessageDetail({ record, onBack, onSend, onRemove }) {
  const template = TEMPLATES.find((t) => t.name === record.template)
  const attempts = Array.from({ length: record.attempts }, (_, i) => ({
    n: i + 1,
    at: record.sent || stamp(0, 12 + i),
    result: i === record.attempts - 1 ? record.gateway : 'timeout after 8000ms',
    ok: i === record.attempts - 1 && record.status === 'Sent',
  }))

  return (
    <>
      <DetailHeader
        backTo="/iam/emails"
        backLabel="Emails"
        eyebrow="Outbound message"
        title={record.subject}
        sub={`Generated from the ${record.template} template for ${record.user}.`}
        badges={<><Pill tone={tone(record.status)} dot>{record.status}</Pill><Tag>{record.template}</Tag></>}
        meta={
          <>
            <Fact icon="user" label="Recipient" value={record.username} />
            <Fact icon="at" label="Address" value={record.email} />
            <Fact icon="clock" label="Sent" value={record.sent || 'Not yet sent'} />
            <Fact icon="refresh" label="Attempts" value={record.attempts} />
          </>
        }
        actions={
          <>
            {record.status !== 'Sent' && <Button variant="pri" icon="mail" onClick={() => onSend(record)}>Send now</Button>}
            <Button variant="danger" icon="trash" onClick={() => onRemove(record)}>Remove</Button>
          </>
        }
      />
      <div className="detail-body">
        <div className="detail-cols">
          <Card title="Rendered message" sub="Exactly what the recipient receives">
            <div className="mail-preview">
              <div className="mail-preview-h">
                <div className="t-xs t-mut">To</div>
                <div className="t-sm">{record.user} &lt;{record.email}&gt;</div>
                <div className="t-xs t-mut" style={{ marginTop: 6 }}>Subject</div>
                <div className="t-sm" style={{ fontWeight: 600 }}>{record.subject}</div>
              </div>
              <div className="mail-preview-b">
                {(template ? template.body : 'Template body unavailable.')
                  .replace(/\{\{firstName\}\}/g, record.user.split(' ')[0])
                  .replace(/\{\{username\}\}/g, record.username)
                  .replace(/\{\{email\}\}/g, record.email)
                  .replace(/\{\{tenantName\}\}/g, 'Tanflow Corp')
                  .replace(/\{\{supportEmail\}\}/g, 'support@tanflow.com')
                  .replace(/\{\{expiryHours\}\}/g, '24')
                  .replace(/\{\{actionUrl\}\}/g, 'https://id.tanflow.com/a/8f21c4')}
              </div>
            </div>
          </Card>

          <div className="stack">
            <Card title="Delivery attempts" sub={`${record.attempts} attempt${record.attempts > 1 ? 's' : ''}`}>
              <div className="tl">
                {attempts.map((a) => (
                  <div className="tl-it" key={a.n} data-tone={a.ok ? 'ok' : 'bad'}>
                    <span className="tl-dot"><Icon name={a.ok ? 'check' : 'x'} size={8} stroke={3} /></span>
                    <div className="tl-t">Attempt {a.n}</div>
                    <div className="tl-s mono">{a.result}</div>
                    <div className="tl-time">{a.at}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Envelope">
              <KeyValue
                cols={1}
                rows={[
                  { k: 'Template', v: record.template, icon: 'file' },
                  { k: 'Recipient', v: record.username, icon: 'user' },
                  { k: 'Address', v: record.email, icon: 'at' },
                  { k: 'Status', v: record.status, icon: 'checkC' },
                  { k: 'Gateway response', v: record.gateway, icon: 'server' },
                  { k: 'Sent', v: record.sent || 'Queued', icon: 'clock' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

export default function EmailsPage({ segments = [], embedded }) {
  const { navigate, toast, confirm } = useApp()
  const [rows, setRows] = useState(() => OUTBOX.map((o) => ({ ...o })))
  const [tab, setTab] = useState('outbox')
  const [chip, setChip] = useState(null)

  const outboxFilter = useMemo(() => {
    if (chip === 'queued') return (r) => r.status === 'Queued'
    if (chip === 'failed') return (r) => r.status === 'Failed'
    if (chip === 'sent') return (r) => r.status === 'Sent'
    return undefined
  }, [chip])

  const pickChip = (id) => {
    setTab('outbox')
    setChip((c) => (c === id ? null : id))
  }

  const record = useMemo(
    () => (segments[0] ? rows.find((r) => String(r.id) === String(segments[0])) : null),
    [segments, rows],
  )

  const send = (list) => {
    const s = new Set(list.map((r) => String(r.id)))
    setRows((rs) => rs.map((r) => (s.has(String(r.id)) ? { ...r, status: 'Sent', sent: stamp(0, 12), gateway: '250 OK' } : r)))
    toast('ok', 'Dispatched', `${list.length} message${list.length > 1 ? 's' : ''} handed to the relay.`)
  }

  const remove = (list, clear) => confirm({
    title: list.length === 1 ? `Remove this message?` : `Remove ${list.length} messages?`,
    body: 'Removing a queued message means it will never be delivered. Sent messages stay in the delivery log.',
    confirmLabel: list.length === 1 ? 'Remove' : `Remove ${list.length}`,
    onConfirm: () => {
      const s = new Set(list.map((r) => String(r.id)))
      setRows((rs) => rs.filter((r) => !s.has(String(r.id))))
      if (clear) clear()
      toast('ok', 'Removed', `${list.length} message${list.length > 1 ? 's' : ''} removed from the outbox.`)
      if (segments[0]) navigate('/iam/emails')
    },
  })

  if (segments[0]) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Message not found"
            sub="The message may have been sent and purged from the outbox, or removed in this session."
            crumbs={[{ label: 'Emails', to: 'emails' }, { label: 'Not found' }]}
          />
          <Card><EmptyState icon="mail" title="No such message" body="It may have been sent and purged, or removed." actions={<Button variant="pri" onClick={() => navigate('/iam/emails')}>Back to outbox</Button>} /></Card>
        </>
      )
    }
    return <MessageDetail record={record} onBack={() => navigate('/iam/emails')} onSend={(r) => send([r])} onRemove={(r) => remove([r])} />
  }

  const queued = rows.filter((r) => r.status === 'Queued')
  const failed = rows.filter((r) => r.status === 'Failed')

  const outboxColumns = [
    serialColumn('S.No'),
    { key: 'template', label: 'Template', cls: 'td-main', locked: true, render: (r) => <span className="link" onClick={() => navigate(`/iam/emails/${r.id}`)}>{r.template}</span> },
    { key: 'user', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'subject', label: 'Subject' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={tone(r.status)} dot>{r.status}</Pill> },
    { key: 'sent', label: 'Sent', cls: 'td-mono', render: (r) => r.sent || '—' },
  ]

  const logColumns = [
    { key: 'ts', label: 'Time', cls: 'td-mono', locked: true },
    { key: 'channel', label: 'Channel', render: (r) => <Tag>{r.channel}</Tag> },
    { key: 'event', label: 'Event', cls: 'td-mono' },
    { key: 'recipient', label: 'Recipient' },
    { key: 'username', label: 'Identity' },
    { key: 'status', label: 'Status', render: (r) => <Pill tone={tone(r.status)} dot>{r.status}</Pill> },
    { key: 'detail', label: 'Gateway', cls: 'td-mono' },
  ]

  return (
    <>
      {!embedded && (
        <PageBar
          title="Emails"
          sub="The outbound queue and the delivery record for every transactional message the platform generates."
          crumbs={[{ label: 'Emails' }]}
          actions={
            <>
              <Button icon="sliders" onClick={() => navigate('emailConfigurations')}>Configuration</Button>
              <Button variant="pri" icon="mail" disabled={!queued.length} onClick={() => send(queued)}>
                Send All{queued.length ? ` (${queued.length})` : ''}
              </Button>
            </>
          }
          rail={
            <>
              <StatChip icon="mail" active={tab === 'outbox' && !chip} onClick={() => { setTab('outbox'); setChip(null) }}>{num(rows.length)} in outbox</StatChip>
              <StatChip icon="clock" active={tab === 'outbox' && chip === 'queued'} onClick={() => pickChip('queued')}>{num(queued.length)} queued</StatChip>
              <StatChip icon="warn" active={tab === 'outbox' && chip === 'failed'} onClick={() => pickChip('failed')}>{num(failed.length)} failed</StatChip>
              <StatChip icon="checkC" active={tab === 'outbox' && chip === 'sent'} onClick={() => pickChip('sent')}>{num(rows.filter((r) => r.status === 'Sent').length)} sent</StatChip>
            </>
          }
        />
      )}

      <div className="stack">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'outbox', label: 'Outbox', icon: 'mail', count: rows.length },
            { id: 'log', label: 'Delivery log', icon: 'activity', count: DELIVERY_LOG.length },
          ]}
        />

        {tab === 'outbox' ? (
          <DataWorkbench
            id="email-outbox"
            filter={outboxFilter}
            rows={rows}
            columns={outboxColumns}
            selectable
            searchPlaceholder="Search by template, recipient or subject…"
            onRowClick={(r) => navigate(`/iam/emails/${r.id}`)}
            bulkActions={(ids, clear) => {
              const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
              return (
                <>
                  <Button size="sm" icon="mail" onClick={() => { send(list); clear() }}>Send</Button>
                  <Button size="sm" variant="danger" icon="trash" onClick={() => remove(list, clear)}>Remove</Button>
                </>
              )
            }}
            rowActions={(r) => [
              { id: 'view', label: 'View message', icon: 'eye', onSelect: () => navigate(`/iam/emails/${r.id}`) },
              { id: 'send', label: 'Send', icon: 'mail', disabled: r.status === 'Sent', onSelect: () => send([r]) },
              { id: 'tpl', label: 'Open template', icon: 'file', onSelect: () => navigate(`/iam/emailTemplates/${r.templateId}`) },
              { divider: true },
              { id: 'rm', label: 'Remove', icon: 'trash', danger: true, onSelect: () => remove([r]) },
            ]}
            emptyTitle="Outbox is empty"
            emptyBody="Nothing is waiting to be delivered."
            emptyIcon="mail"
          />
        ) : (
          <DataWorkbench
            id="email-delivery-log"
            rows={DELIVERY_LOG}
            columns={logColumns}
            searchPlaceholder="Search the delivery log…"
            toolbar={<Button size="sm" icon="download" onClick={() => toast('ok', 'Export queued', 'Delivery log exported as CSV.')}>Export</Button>}
            emptyTitle="No deliveries"
            emptyBody="Nothing has been dispatched in the retention window."
            emptyIcon="activity"
          />
        )}
      </div>
    </>
  )
}
