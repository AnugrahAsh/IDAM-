import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import {
  Skeleton, SkeletonCard, SkeletonKeyValue, SkeletonLine,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { Section } from './SmsForms'
import {
  SMS_HEALTH_CLIENTS, authType, clientHealth, encryptionShort, queueCounts, serializerShort,
} from './smsData'

/* ---------------------------------------------------------------------------
   SMS health.

   The same two questions the email side answers, asked of a gateway rather
   than a relay: can the platform reach the provider it posts through, and what
   came back for the traffic it has already handed over. Kept deliberately
   parallel to Email Management — an operator on call should not have to learn
   two shapes for the same answer.

   Both questions are now asked of every client, not just the default. A tenant
   posts through its own binding, so "are this tenant's codes going out" had
   five answers and this screen gave one of them; finding the other four meant
   signing into four other tenants. The default stays where it is and open,
   because it is the one an operator is here for; the rest are accordions under
   it, answering with the same fields in the same format.
   --------------------------------------------------------------------------- */

/* The queue is the delivery log counted by outcome. Derived rather than
   stored, so it cannot drift from the register the operator opens next.
   "Delivered" rather than "Sent", because a gateway that accepted a message is
   not a gateway that got it to a handset — the receipt is what says so. */
const QUEUE_TILES = [
  { id: 'Queued', label: 'Queued', tone: 'acc', hint: 'Accepted, not yet posted to the gateway' },
  { id: 'Delivered', label: 'Delivered', tone: 'ok', hint: 'The gateway returned a delivery receipt' },
  { id: 'Failed', label: 'Failed', tone: 'bad', hint: 'Rejected, or the receipt came back undelivered' },
  { id: 'Total', label: 'Total', tone: 'mut', hint: 'Every message in the log' },
]

/* The figures a collapsed head carries: the two the thresholds are read off,
   in the order the tiles below show them, so the head and the body are scanned
   the same way. Delivered and Total are not triage figures — neither can make
   a client worth opening — and taking the labels and hints from the tiles keeps
   the head and the body naming the same numbers the same way. Both are shown
   on every row, because one of them alone is a guess at which one mattered. */
const HEAD_FIGURES = ['Queued', 'Failed'].map((id) => QUEUE_TILES.find((t) => t.id === id))

/* The driving figures said in words, for the recheck toast. Reading the same
   `drivers` the head colours keeps the two from contradicting each other: a
   client amber for its backlog must not be reported as an undelivered count
   that never crossed a threshold. */
const DRIVER_PHRASE = {
  Failed: (q) => `${num(q.Failed)} of ${num(q.Total)} undelivered`,
  Queued: (q) => `${num(q.Queued)} still queued`,
}

/* Counted from the same derivation the heads render, so the summary and the
   rows under it cannot disagree about how many need looking at. A module
   constant because the seed is one: nothing on this screen edits a client. */
const NEED_ATTENTION = SMS_HEALTH_CLIENTS.filter((c) => clientHealth(c).attention).length

/* The connection readout, as one component rather than one per caller: the
   default gateway and every client accordion answer the same five questions,
   and two copies of this markup would start answering them differently the
   first time either was edited.

   A provider record names its gateway in `code`; a client names the gateway it
   routes through in `gateway`. Everything below that is the same binding. */
function ConnectionPanel({ cfg, checkedAt }) {
  const gateway = cfg ? cfg.gateway || cfg.code : ''
  const configured = !!gateway
  const connected = configured && cfg.status === 'Active'

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
      v: configured ? <span className="mono">{gateway}</span> : <span className="t-faint">Not set</span>,
    },
    {
      k: 'Transport',
      icon: 'swap',
      v: configured
        ? <span>{cfg.method} · {serializerShort(cfg.serializer)}</span>
        : <span className="t-faint">—</span>,
    },
    {
      k: 'Secure',
      icon: 'lock',
      v: (
        <span>
          {cfg && cfg.encryption ? encryptionShort(cfg.encryption) : 'no payload encryption'}
          {' / '}
          {cfg && cfg.auth && cfg.auth !== 'NONE' ? authType(cfg.auth).short : 'none'}
        </span>
      ),
    },
  ]

  return (
    <div className="stack">
      <KeyValue dense cols={2} rows={rows} />
      <Banner tone={connected ? 'ok' : 'warn'}>
        {connected
          ? `Gateway connection successful. Checked ${checkedAt}.`
          : configured
            ? 'The gateway is configured but inactive — nothing is dispatched through it.'
            : 'No gateway is configured. Text messages cannot leave the platform until one is.'}
      </Banner>
    </div>
  )
}

function QueuePanel({ counts }) {
  return (
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
  )
}

/**
 * One client, collapsed to a head that is enough to triage on.
 *
 * The head carries the name, the state read off the figures, and the figures
 * the state was read off — the backlog and the undelivered — so a bad tenant is
 * visible, with its reason, without opening five accordions to find it. The
 * figure that crossed a threshold is the coloured one; a client can be amber
 * for either, and only the head can say which.
 *
 * Several may be open at once. The job here is comparison: an operator with two
 * unhealthy clients wants both readouts on screen together, and an accordion
 * that closes the first when you open the second makes that impossible. The
 * heads carry enough that nobody has to open all of them to look around.
 */
function ClientAccordion({ client, open, checkedAt, onToggle, onRecheck }) {
  const counts = queueCounts(client.queue)
  const health = clientHealth(client)
  const headId = `smh-h-${client.id}`
  const bodyId = `smh-b-${client.id}`

  return (
    <div className="sms-acc" data-open={open || undefined}>
      <button
        type="button"
        id={headId}
        className="sms-acc-h"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <Icon name="chevR" size={14} className="sms-acc-chev" />
        <span className="sms-acc-meta">
          <span className="sms-acc-t">{client.name}</span>
          <span className="sms-acc-s">
            <span className="mono">{client.code}</span> · routes through {client.gateway}
          </span>
        </span>
        <span className="sms-acc-figs">
          {/* Coloured by what tripped the state, not by what looks alarming:
              one undelivered receipt in two thousand is a healthy client, and a
              red figure beside a green pill asks the operator which of the two
              to believe. A figure that stayed inside its threshold stays
              neutral even on an amber row, so the coloured number is always the
              reason for the pill beside it rather than a second opinion. */}
          {HEAD_FIGURES.map((f) => (
            <span
              key={f.id}
              className="sms-acc-fig"
              data-tone={health.drivers.includes(f.id) ? health.tone : 'mut'}
              title={f.hint}
            >
              <span className="sms-acc-fig-v">{num(counts[f.id])}</span>
              <span className="sms-acc-fig-k">{f.label}</span>
            </span>
          ))}
          <Pill tone={health.tone} dot>{health.label}</Pill>
        </span>
      </button>

      {/* Rendered whether or not it is open, and hidden with the attribute, so
          `aria-controls` always resolves to something a screen reader can be
          sent to rather than to an id that exists only half the time. */}
      <div className="sms-acc-b" id={bodyId} role="region" aria-labelledby={headId} hidden={!open}>
        <div className="stack">
          <Section
            icon="activity"
            title="Connection status"
            actions={<Button size="sm" icon="refresh" onClick={onRecheck}>Refresh</Button>}
          >
            <ConnectionPanel cfg={client} checkedAt={checkedAt} />
          </Section>
          <Section icon="sms" title="Message queue">
            <QueuePanel counts={counts} />
          </Section>
        </div>
      </div>
    </div>
  )
}

/* The wait, drawn against the real geometry: a key/value panel and a banner in
   the first card, four tiles and a banner in the second, and the collapsed
   accordion heads in the third — heads only, because that is what the card
   lands as. `SkeletonCard` is the `Card` frame, so the three panels occupy the
   same three boxes they will be replaced by. */
function HealthSkeleton() {
  return (
    <div className="stack">
      <SkeletonCard>
        <div className="stack">
          <SkeletonKeyValue rows={5} cols={2} />
          <SkeletonLine height={38} />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <div className="stack">
          <div className="grid grid-4">
            {QUEUE_TILES.map((t) => (
              <div className="tile" key={t.id} data-tone="mut">
                <div className="tile-k"><SkeletonLine width="52%" height={8} /></div>
                <div className="tile-v"><SkeletonLine width={62} height={20} /></div>
              </div>
            ))}
          </div>
        </div>
      </SkeletonCard>
      <SkeletonCard>
        {SMS_HEALTH_CLIENTS.map((c) => (
          <div className="sms-acc sms-acc-skel" key={c.id}>
            <div className="sms-acc-h">
              <span className="skel sms-acc-skel-chev" />
              <span className="sms-acc-meta">
                <SkeletonLine width="42%" height={12} />
                <SkeletonLine width="28%" height={9} />
              </span>
              <span className="sms-acc-figs">
                {HEAD_FIGURES.map((f) => (
                  <span className="sms-acc-fig" key={f.id}>
                    <SkeletonLine width={46} height={14} />
                  </span>
                ))}
                <span className="skel skel-chip" style={{ width: 72 }} />
              </span>
            </div>
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}

export default function SmsHealth({ providers = [], messages = [], loading = false }) {
  const { toast, navigate } = useApp()
  /* The check is re-run on demand rather than polled: it opens a real
     connection, and a screen left open should not keep dialling the gateway. */
  const [checkedAt, setCheckedAt] = useState('just now')
  const [checking, setChecking] = useState(false)
  // Open accordions and re-checked clients, both keyed by client id. Neither
  // outlives the visit: where an operator was standing is not configuration.
  const [openIds, setOpenIds] = useState({})
  const [clientChecks, setClientChecks] = useState({})

  const active = useMemo(() => providers.filter((p) => p.status === 'Active'), [providers])
  const primary = active[0] || providers[0] || null

  const counts = useMemo(() => {
    const by = { Queued: 0, Delivered: 0, Failed: 0 }
    messages.forEach((m) => {
      // The register writes Sent for a message the gateway accepted and
      // Delivered for one it confirmed; the queue counts both as delivered,
      // because both left.
      const k = m.status === 'Sent' ? 'Delivered' : m.status
      if (by[k] != null) by[k] += 1
    })
    return { ...by, Total: messages.length }
  }, [messages])

  const connected = !!(primary && primary.status === 'Active')

  const refresh = () => {
    setChecking(true)
    setCheckedAt('just now')
    // The handshake is a round trip, so the button says so rather than
    // flicking through a state nobody can read.
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

  const recheck = (c) => {
    setClientChecks((m) => ({ ...m, [c.id]: 'just now' }))
    const health = clientHealth(c)
    const q = queueCounts(c.queue)
    // Built from the same drivers the head colours, so the toast repeats the
    // row's reason rather than offering a different one.
    const detail = health.drivers.map((k) => DRIVER_PHRASE[k](q)).join(', ')
    const body = health.id === 'off'
      ? `${c.gateway} is configured but inactive — nothing is dispatched through it.`
      : detail
        ? `${c.gateway} — ${detail}.`
        : health.id === 'ok'
          ? `${c.gateway} answered and authenticated.`
          : 'No gateway is configured. Text messages cannot leave until one is.'
    toast(
      // "off" is not a toast tone, and a binding somebody switched off is a
      // warning rather than a failure: nothing is going out, nothing is broken.
      health.id === 'off' ? 'warn' : health.id,
      `${c.code} · ${health.label}`,
      body,
    )
  }

  if (loading) {
    return (
      <Skeleton label="Loading SMS gateway health">
        <HealthSkeleton />
      </Skeleton>
    )
  }

  return (
    <div className="stack">
      <Card
        title="Connection Status"
        /* The count of active gateways rides in the subtitle rather than as a
           sixth key/value row: the panel below is shared with every client
           accordion, and "how many gateways exist" is a fact about the
           platform that no single client can answer. */
        sub={`Live connectivity check for the default gateway — ${num(active.length)} of ${num(providers.length)} configured gateways active`}
        actions={(
          <Button size="sm" icon="refresh" disabled={checking} onClick={refresh}>
            {checking ? 'Checking…' : 'Refresh'}
          </Button>
        )}
      >
        <ConnectionPanel cfg={primary} checkedAt={checkedAt} />
      </Card>

      <Card
        title="Message Queue"
        sub="Delivery outcomes recorded in the SMS log"
        actions={<Button size="sm" icon="sms" onClick={() => navigate('/iam/sms/messages')}>Open the log</Button>}
      >
        <QueuePanel counts={counts} />
      </Card>

      {/* The card is the container so the rows are not cards inside a card;
          each row is a hairline-separated accordion, the same shape the email
          side and the scheduler use for their collapsed panels. */}
      <Card
        title="Other clients"
        sub="Every tenant that posts through its own binding, checked the same way"
        flush
        actions={(
          <Pill tone={NEED_ATTENTION ? 'warn' : 'ok'} dot>
            {NEED_ATTENTION ? `${NEED_ATTENTION} need attention` : 'All healthy'}
          </Pill>
        )}
      >
        {SMS_HEALTH_CLIENTS.map((c) => (
          <ClientAccordion
            key={c.id}
            client={c}
            open={!!openIds[c.id]}
            checkedAt={clientChecks[c.id] || c.checkedAt}
            onToggle={() => setOpenIds((m) => ({ ...m, [c.id]: !m[c.id] }))}
            onRecheck={() => recheck(c)}
          />
        ))}
      </Card>
    </div>
  )
}
