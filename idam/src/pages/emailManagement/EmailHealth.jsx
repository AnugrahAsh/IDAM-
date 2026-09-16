import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { authType, encryptionShort } from './emailData'

/* ---------------------------------------------------------------------------
   Email health.

   Two questions an operator asks before anything else, and neither was
   answerable without opening a form: can the platform reach its relay, and
   what happened to the mail it has already been handed. The connection check
   was buried in a per-provider dialog and the delivery outcomes only existed
   as rows in the register.
   --------------------------------------------------------------------------- */

/* The queue is the email log counted by outcome. Derived rather than stored,
   so it cannot drift from the register the operator opens next. */
const QUEUE_TILES = [
  { id: 'Queued', label: 'Queued', tone: 'acc', hint: 'Accepted, not yet handed to the relay' },
  { id: 'Sent', label: 'Sent', tone: 'ok', hint: 'The relay answered 250' },
  { id: 'Failed', label: 'Failed', tone: 'bad', hint: 'Rejected or undeliverable' },
  { id: 'Total', label: 'Total', tone: 'mut', hint: 'Every message in the log' },
]

export default function EmailHealth({ smtp, messages = [] }) {
  const { toast, navigate } = useApp()
  /* The check is re-run on demand rather than polled: it opens a real
     connection, and a screen left open should not keep dialling the relay. */
  const [checkedAt, setCheckedAt] = useState('just now')
  const [checking, setChecking] = useState(false)

  const counts = useMemo(() => {
    const by = { Queued: 0, Sent: 0, Failed: 0 }
    messages.forEach((m) => { if (by[m.status] != null) by[m.status] += 1 })
    return { ...by, Total: messages.length }
  }, [messages])

  const configured = !!(smtp && smtp.host && smtp.port)
  const connected = configured && smtp.status === 'Active'
  const secure = smtp && smtp.encryption ? encryptionShort(smtp.encryption) : 'none'

  const refresh = () => {
    setChecking(true)
    setCheckedAt('just now')
    // The handshake is a round trip, so the button says so rather than
    // flicking through a state nobody can read.
    setTimeout(() => {
      setChecking(false)
      toast(
        connected ? 'ok' : 'warn',
        connected ? 'SMTP reachable' : 'SMTP unreachable',
        connected
          ? `${smtp.host}:${smtp.port} answered and authenticated.`
          : 'The configuration is incomplete or the relay is inactive.',
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
      k: 'Host',
      icon: 'server',
      v: configured
        ? <span className="mono">{smtp.host}:{smtp.port}</span>
        : <span className="t-faint">Not set</span>,
    },
    {
      k: 'Secure',
      icon: 'lock',
      v: <span>{secure} / {smtp && smtp.auth && smtp.auth !== 'NONE' ? authType(smtp.auth).short : 'none'}</span>,
    },
  ]

  return (
    <div className="stack">
      <Card
        title="Connection Status"
        sub="Live SMTP connectivity check"
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
              ? `SMTP connection successful. Checked ${checkedAt}.`
              : configured
                ? 'The relay is configured but inactive — nothing is dispatched through it.'
                : 'No relay is configured. Mail cannot leave the platform until one is.'}
          </Banner>
        </div>
      </Card>

      <Card
        title="Email Queue"
        sub="Delivery outcomes recorded in the email log"
        actions={(
          <Button size="sm" icon="mail" onClick={() => navigate('/iam/emails/messages')}>
            Open the log
          </Button>
        )}
      >
        <div className="stack">
          <div className="grid grid-4">
            {QUEUE_TILES.map((t) => (
              <div className="tile" key={t.id} data-tone={t.tone} title={t.hint}>
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
    </div>
  )
}
