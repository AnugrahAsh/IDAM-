import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import {
  SkeletonCard, SkeletonKeyValue, SkeletonLine,
} from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { Section } from './EmailForms'
import {
  EMAIL_HEALTH_CLIENTS, authType, clientHealth, encryptionShort, queueCounts,
} from './emailData'

/* ---------------------------------------------------------------------------
   Email health.

   Two questions an operator asks before anything else, and neither was
   answerable without opening a form: can the platform reach its relay, and
   what happened to the mail it has already been handed. The connection check
   was buried in a per-provider dialog and the delivery outcomes only existed
   as rows in the register.

   Both questions are now asked of every client, not just the default. A tenant
   relays through its own binding, so "is mail going out" had five answers and
   this screen gave one of them; finding the other four meant signing into four
   other tenants. The default stays where it is and open, because it is the one
   an operator is here for; the rest are accordions under it, answering with
   the same fields in the same format.
   --------------------------------------------------------------------------- */

/* The queue is the email log counted by outcome. Derived rather than stored,
   so it cannot drift from the register the operator opens next. */
const QUEUE_TILES = [
  { id: 'Queued', label: 'Queued', tone: 'acc', hint: 'Accepted, not yet handed to the relay' },
  { id: 'Sent', label: 'Sent', tone: 'ok', hint: 'The relay answered 250' },
  { id: 'Failed', label: 'Failed', tone: 'bad', hint: 'Rejected or undeliverable' },
  { id: 'Total', label: 'Total', tone: 'mut', hint: 'Every message in the log' },
]

/* The figures a collapsed head carries: the two the thresholds are read off,
   in the order the tiles below show them, so the head and the body are scanned
   the same way. Sent and Total are not triage figures — neither can make a
   client worth opening — and taking the labels and hints from the tiles keeps
   the head and the body naming the same numbers the same way. Both are shown
   on every row, because one of them alone is a guess at which one mattered. */
const HEAD_FIGURES = ['Queued', 'Failed'].map((id) => QUEUE_TILES.find((t) => t.id === id))

/* The driving figures said in words, for the recheck toast. Reading the same
   `drivers` the head colours keeps the two from contradicting each other: a
   client amber for its backlog must not be reported as a failure count that
   never crossed a threshold. */
const DRIVER_PHRASE = {
  Failed: (q) => `${num(q.Failed)} of ${num(q.Total)} undelivered`,
  Queued: (q) => `${num(q.Queued)} still queued`,
}

/* Counted from the same derivation the heads render, so the summary and the
   rows under it cannot disagree about how many need looking at. A module
   constant because the seed is one: nothing on this screen edits a client. */
const NEED_ATTENTION = EMAIL_HEALTH_CLIENTS.filter((c) => clientHealth(c).attention).length

/* The connection readout, as one component rather than one per caller: the
   default relay and every client accordion answer the same four questions, and
   two copies of this markup would start answering them differently the first
   time either was edited. */
function ConnectionPanel({ cfg, checkedAt }) {
  const configured = !!(cfg && cfg.host && cfg.port)
  const connected = configured && cfg.status === 'Active'
  const secure = cfg && cfg.encryption ? encryptionShort(cfg.encryption) : 'none'

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
        ? <span className="mono">{cfg.host}:{cfg.port}</span>
        : <span className="t-faint">Not set</span>,
    },
    {
      k: 'Secure',
      icon: 'lock',
      v: <span>{secure} / {cfg && cfg.auth && cfg.auth !== 'NONE' ? authType(cfg.auth).short : 'none'}</span>,
    },
  ]

  return (
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
 * the state was read off — the backlog and the rejections — so a bad tenant is
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
  const headId = `emh-h-${client.id}`
  const bodyId = `emh-b-${client.id}`

  return (
    <div className="em-acc" data-open={open || undefined}>
      <button
        type="button"
        id={headId}
        className="em-acc-h"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <Icon name="chevR" size={14} className="em-acc-chev" />
        <span className="em-acc-meta">
          <span className="em-acc-t">{client.name}</span>
          <span className="em-acc-s">
            <span className="mono">{client.code}</span> · {client.host}:{client.port}
          </span>
        </span>
        <span className="em-acc-figs">
          {/* Coloured by what tripped the state, not by what looks alarming:
              one rejection in two thousand is a healthy client, and a red
              figure beside a green pill asks the operator which of the two to
              believe. A figure that stayed inside its threshold stays neutral
              even on an amber row, so the coloured number is always the
              reason for the pill beside it rather than a second opinion. */}
          {HEAD_FIGURES.map((f) => (
            <span
              key={f.id}
              className="em-acc-fig"
              data-tone={health.drivers.includes(f.id) ? health.tone : 'mut'}
              title={f.hint}
            >
              <span className="em-acc-fig-v">{num(counts[f.id])}</span>
              <span className="em-acc-fig-k">{f.label}</span>
            </span>
          ))}
          <Pill tone={health.tone} dot>{health.label}</Pill>
        </span>
      </button>

      {/* Rendered whether or not it is open, and hidden with the attribute, so
          `aria-controls` always resolves to something a screen reader can be
          sent to rather than to an id that exists only half the time. */}
      <div className="em-acc-b" id={bodyId} role="region" aria-labelledby={headId} hidden={!open}>
        <div className="stack">
          <Section
            icon="activity"
            title="Connection status"
            actions={<Button size="sm" icon="refresh" onClick={onRecheck}>Refresh</Button>}
          >
            <ConnectionPanel cfg={client} checkedAt={checkedAt} />
          </Section>
          <Section icon="mail" title="Email queue">
            <QueuePanel counts={counts} />
          </Section>
        </div>
      </div>
    </div>
  )
}

/* The wait, drawn against the real geometry: a key/value panel and a banner in
   the first card, four tiles in the second, and the collapsed accordion heads
   in the third — heads only, because that is what the card lands as.
   `SkeletonCard` is the `Card` frame, so the three panels occupy the same three
   boxes they will be replaced by. */
function HealthSkeleton() {
  return (
    <div className="stack">
      <SkeletonCard>
        <div className="stack">
          <SkeletonKeyValue rows={4} cols={2} />
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
      {/* The card these rows land in is `flush` — a row runs to the card's own
          edge — so the waiting card gives up its body padding too. Left on,
          it stands 32px taller than the card that replaces it and insets every
          row a gutter further in than the row it holds space for. */}
      <SkeletonCard className="em-skel-flush">
        {EMAIL_HEALTH_CLIENTS.map((c) => (
          <div className="em-acc em-acc-skel" key={c.id}>
            <div className="em-acc-h">
              <span className="skel em-acc-skel-chev" />
              <span className="em-acc-meta">
                <SkeletonLine width="42%" height={12} />
                <SkeletonLine width="28%" height={9} />
              </span>
              <span className="em-acc-figs">
                {HEAD_FIGURES.map((f) => (
                  <span className="em-acc-fig" key={f.id}>
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

export default function EmailHealth({ smtp, messages = [], loading = false }) {
  const { toast, navigate } = useApp()
  /* The check is re-run on demand rather than polled: it opens a real
     connection, and a screen left open should not keep dialling the relay. */
  const [checkedAt, setCheckedAt] = useState('just now')
  const [checking, setChecking] = useState(false)
  // Open accordions and re-checked clients, both keyed by client id. Neither
  // outlives the visit: where an operator was standing is not configuration.
  const [openIds, setOpenIds] = useState({})
  const [clientChecks, setClientChecks] = useState({})

  const counts = useMemo(() => {
    const by = { Queued: 0, Sent: 0, Failed: 0 }
    messages.forEach((m) => { if (by[m.status] != null) by[m.status] += 1 })
    return { ...by, Total: messages.length }
  }, [messages])

  const connected = !!(smtp && smtp.host && smtp.port && smtp.status === 'Active')

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

  const recheck = (c) => {
    setClientChecks((m) => ({ ...m, [c.id]: 'just now' }))
    const health = clientHealth(c)
    const q = queueCounts(c.queue)
    const at = `${c.host}:${c.port}`
    // Built from the same drivers the head colours, so the toast repeats the
    // row's reason rather than offering a different one.
    const detail = health.drivers.map((k) => DRIVER_PHRASE[k](q)).join(', ')
    const body = health.id === 'off'
      ? `${at} is configured but inactive — nothing is dispatched through it.`
      : detail
        ? `${at} — ${detail}.`
        : health.id === 'ok'
          ? `${at} answered and authenticated.`
          : 'No relay host is configured. Mail cannot leave until one is.'
    toast(
      // "off" is not a toast tone, and a relay somebody switched off is a
      // warning rather than a failure: nothing is going out, nothing is broken.
      health.id === 'off' ? 'warn' : health.id,
      `${c.code} · ${health.label}`,
      body,
    )
  }

  /* The section above owns the settle, so the three panels are held and
     released together with the page bar and the tabs rather than a frame after
     them — and it has already announced the wait, so these shapes are
     decoration under its region rather than a second one. */
  if (loading) return <HealthSkeleton />

  return (
    <div className="stack">
      <Card
        title="Connection Status"
        sub="Live SMTP connectivity check for the default relay"
        actions={(
          <Button size="sm" icon="refresh" disabled={checking} onClick={refresh}>
            {checking ? 'Checking…' : 'Refresh'}
          </Button>
        )}
      >
        <ConnectionPanel cfg={smtp} checkedAt={checkedAt} />
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
        <QueuePanel counts={counts} />
      </Card>

      {/* The card is the container so the rows are not cards inside a card;
          each row is a hairline-separated accordion, the same shape the
          scheduler uses for its collapsed policy panel. */}
      <Card
        title="Other clients"
        sub="Every tenant that relays through its own binding, checked the same way"
        flush
        actions={(
          <Pill tone={NEED_ATTENTION ? 'warn' : 'ok'} dot>
            {NEED_ATTENTION ? `${NEED_ATTENTION} need attention` : 'All healthy'}
          </Pill>
        )}
      >
        {EMAIL_HEALTH_CLIENTS.map((c) => (
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
