import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { authType, encryptionShort, serializerShort } from './smsData'

/* ---------------------------------------------------------------------------
   SMS health.

   The same two questions the email side answers, asked of a gateway rather
   than a relay: can the platform reach the provider it sends through, and what
   happened to the traffic it has already handed over. Kept deliberately
   parallel to Email Management — an operator on call should not have to learn
   two shapes for the same answer.
   --------------------------------------------------------------------------- */

const QUEUE_TILES = [
  { id: 'Queued', label: 'Queued', tone: 'acc' },
  { id: 'Sent', label: 'Sent', tone: 'ok' },
  { id: 'Failed', label: 'Failed', tone: 'bad' },
  { id: 'Total', label: 'Total', tone: 'mut' },
]

export default function SmsHealth({ providers = [], messages = [] }) {
  const { toast, navigate } = useApp()
  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState('just now')

  const active = useMemo(() => providers.filter((p) => p.status === 'Active'), [providers])
  const primary = active[0] || providers[0] || null

  const counts = useMemo(() => {
    const by = { Queued: 0, Sent: 0, Failed: 0 }
    messages.forEach((m) => {
      // The register writes Delivered for a message the gateway confirmed;
      // the queue counts it as sent, because it left.
      const k = m.status === 'Delivered' ? 'Sent' : m.status
      if (by[k] != null) by[k] += 1
    })
    return { ...by, Total: messages.length }
  }, [messages])

  const configured = !!primary
  const connected = !!(primary && primary.status === 'Active')

  const refresh = () => {
    setChecking(true)
    setCheckedAt('just now')
    setTimeout(() => {
      setChecking(false)
      toast(
        connected ? 'ok' : 'warn',
        connected ? 'Gateway reachable' : 'Gateway unreachable',
        connected
          ? `${primary.code} answered and authenticated.`
          : 'No active gateway is configured, so nothing can be dispatched.',
      )
    }, 700)
  }

  const rows = [
    {
      k: 'Configured',
      icon: 'checkC',
      v: <Pill tone={configured ? 'ok' : 'bad'}>{configured ? 'Yes' : 'No'}</Pill>,
    },
    {
      k: 'Connection',
      icon: 'activity',
      v: <Pill tone={connected ? 'ok' : 'bad'}>{connected ? 'Connected' : 'Not connected'}</Pill>,
    },
    {
      k: 'Gateway',
      icon: 'server',
      v: primary ? <span className="mono">{primary.code}</span> : <span className="t-faint">None</span>,
    },
    {
      k: 'Transport',
      icon: 'swap',
      v: primary
        ? <span>{primary.method} · {serializerShort(primary.serializer)}</span>
        : <span className="t-faint">—</span>,
    },
    {
      k: 'Secure',
      icon: 'lock',
      v: primary
        ? (
          <span>
            {primary.encryption ? encryptionShort(primary.encryption) : 'no payload encryption'}
            {' / '}
            {primary.auth && primary.auth !== 'NONE' ? authType(primary.auth).short : 'none'}
          </span>
        )
        : <span className="t-faint">—</span>,
    },
    {
      k: 'Active gateways',
      icon: 'layers',
      v: <span>{num(active.length)} of {num(providers.length)}</span>,
    },
  ]

  return (
    <div className="stack">
      <Card
        title="Connection Status"
        sub="Live SMS gateway connectivity check"
        actions={(
          <Button size="sm" icon="refresh" disabled={checking} onClick={refresh}>
            {checking ? 'Checking…' : 'Refresh'}
          </Button>
        )}
      >
        <div className="stack">
          <KeyValue dense cols={2} rows={rows} />
          <Banner tone={connected ? 'ok' : 'warn'}>
            {connected
              ? `Gateway connection successful. Checked ${checkedAt}.`
              : configured
                ? 'Every configured gateway is inactive — nothing is dispatched.'
                : 'No gateway is configured. Text messages cannot leave the platform until one is.'}
          </Banner>
        </div>
      </Card>

      <Card
        title="Message Queue"
        sub="Delivery outcomes recorded in the SMS log"
        actions={<Button size="sm" icon="sms" onClick={() => navigate('/iam/sms/messages')}>Open the log</Button>}
      >
        <div className="stack">
          <div className="grid grid-4">
            {QUEUE_TILES.map((t) => (
              <div className="tile" key={t.id} data-tone={t.tone}>
                <div className="tile-k">{t.label}</div>
                <div className="tile-v">{num(counts[t.id])}</div>
              </div>
            ))}
          </div>
          {counts.Failed > 0 && (
            <Banner tone="bad">
              {num(counts.Failed)} {counts.Failed === 1 ? 'message' : 'messages'} could not be delivered. The gateway
              response is recorded against each one in the log.
            </Banner>
          )}
        </div>
      </Card>

      {/* One row per gateway, in the console's table: the same columns the
          provider register shows, read here for whether each is carrying
          traffic. */}
      <Card flush title="Gateways" sub="Every configured provider and whether it is carrying traffic">
        {providers.length === 0
          ? <div className="t-sm t-mut" style={{ padding: 'var(--sp-4)' }}>No gateway is configured.</div>
          : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Provider code</th>
                  <th>Name</th>
                  <th>Auth</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td className="td-main td-mono">{p.code}</td>
                    <td>{p.name}</td>
                    <td><Tag>{p.auth && p.auth !== 'NONE' ? authType(p.auth).short : 'No auth'}</Tag></td>
                    <td><Pill tone={p.status === 'Active' ? 'ok' : 'mut'} dot>{p.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>
    </div>
  )
}
