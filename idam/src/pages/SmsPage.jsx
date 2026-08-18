import './styles/SmsPage.css'
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
import KeyValue from '../components/primitives/KeyValue'
import EmptyState from '../components/primitives/EmptyState'
import { useApp } from '../store/AppContext'
import { num, serialColumn } from '../lib/format'
import { SMS_QUEUE, SMS_TEMPLATES, stamp } from './comms/commsData'

const tone = (s) => (s === 'Sent' ? 'ok' : s === 'Failed' ? 'bad' : 'warn')

export default function SmsPage({ segments = [], embedded }) {
  const { navigate, toast, confirm } = useApp()
  const [rows, setRows] = useState(() => SMS_QUEUE.map((r) => ({ ...r })))
  const [chip, setChip] = useState(null)

  const rowFilter = useMemo(() => {
    if (chip === 'queued') return (r) => r.status === 'Queued'
    if (chip === 'failed') return (r) => r.status === 'Failed'
    return undefined
  }, [chip])

  const pickChip = (id) => setChip((c) => (c === id ? null : id))

  const record = useMemo(
    () => (segments[0] ? rows.find((r) => String(r.id) === String(segments[0])) : null),
    [segments, rows],
  )

  const send = (list) => {
    const s = new Set(list.map((r) => String(r.id)))
    setRows((rs) => rs.map((r) => (s.has(String(r.id)) ? { ...r, status: 'Sent', sent: stamp(0, 13), gateway: 'DELIVRD' } : r)))
    toast('ok', 'Dispatched', `${list.length} message${list.length > 1 ? 's' : ''} handed to the gateway.`)
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
      if (segments[0]) navigate('/iam/sms')
    },
  })

  if (segments[0]) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Message not found"
            sub="The message may have been sent and purged from the queue, or removed in this session."
            crumbs={[{ label: 'SMS', to: 'sms' }, { label: 'Not found' }]}
          />
          <Card><EmptyState icon="sms" title="No such message" body="It may have been sent and purged, or removed from the queue." actions={<Button variant="pri" onClick={() => navigate('/iam/sms')}>Back to queue</Button>} /></Card>
        </>
      )
    }
    const tpl = SMS_TEMPLATES.find((t) => t.name === record.template)
    const body = (tpl ? tpl.body : 'Template body unavailable.')
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
          backTo="/iam/sms"
          backLabel="SMS"
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

  return (
    <>
      {!embedded && (
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
          rail={
            <>
              <StatChip icon="sms" active={!chip} onClick={() => setChip(null)}>{num(rows.length)} in queue</StatChip>
              <StatChip icon="clock" active={chip === 'queued'} onClick={() => pickChip('queued')}>{num(queued.length)} queued</StatChip>
              <StatChip icon="warn" active={chip === 'failed'} onClick={() => pickChip('failed')}>{num(failed.length)} failed</StatChip>
              <StatChip icon="layers" title="Billable message segments across the queue">{num(rows.reduce((a, r) => a + r.segments, 0))} segments</StatChip>
            </>
          }
        />
      )}

      <DataWorkbench
        id="sms-queue"
        filter={rowFilter}
        rows={rows}
        columns={[
          serialColumn('S.No'),
          { key: 'template', label: 'Template', cls: 'td-main', locked: true, render: (r) => <span className="link" onClick={() => navigate(`/iam/sms/${r.id}`)}>{r.template}</span> },
          { key: 'user', label: 'User' },
          { key: 'phone', label: 'Phone', cls: 'td-mono' },
          { key: 'provider', label: 'Provider', render: (r) => <Tag>{r.provider}</Tag> },
          { key: 'status', label: 'Status', render: (r) => <Pill tone={tone(r.status)} dot>{r.status}</Pill> },
          { key: 'sent', label: 'Sent', cls: 'td-mono', render: (r) => r.sent || '—' },
        ]}
        selectable
        searchPlaceholder="Search by template, recipient or number…"
        onRowClick={(r) => navigate(`/iam/sms/${r.id}`)}
        bulkActions={(ids, clear) => {
          const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
          return (
            <>
              <Button size="sm" icon="sms" onClick={() => { send(list); clear() }}>Send</Button>
              <Button size="sm" variant="danger" icon="trash" onClick={() => remove(list, clear)}>Remove</Button>
            </>
          )
        }}
        rowActions={(r) => [
          { id: 'view', label: 'View message', icon: 'eye', onSelect: () => navigate(`/iam/sms/${r.id}`) },
          { id: 'send', label: 'Send', icon: 'sms', disabled: r.status === 'Sent', onSelect: () => send([r]) },
          { divider: true },
          { id: 'rm', label: 'Remove', icon: 'trash', danger: true, onSelect: () => remove([r]) },
        ]}
        emptyTitle="Queue is empty"
        emptyBody="No text messages are waiting to be delivered."
        emptyIcon="sms"
      />
    </>
  )
}
