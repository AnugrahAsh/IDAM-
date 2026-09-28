import { useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import { SkeletonCard, SkeletonKeyValue, SkeletonLine } from '../../components/primitives/Skeleton'
import { useApp } from '../../store/AppContext'
import { num, pct } from '../../lib/format'
import { HEALTH_STATES, providerHealth, providerState } from './authData'
import { PROVIDERS } from './mfaData'

/* ---------------------------------------------------------------------------
   Delivery health.

   The same two questions Email and SMS Management answer, asked of an
   authentication provider: can the platform reach the thing that issues the
   challenge, and what happened to the challenges it has already issued.

   Both are now asked of every provider, not just the one whose page happens to
   be open. A tenant challenges through five of these, so "is MFA working" had
   five answers and this tab gave one of them; finding the other four meant
   opening four other provider pages. The provider you are on stays at the top
   and open, because it is the one you came for; the rest are accordions under
   it, answering with the same fields in the same format.

   Nothing here is a new metric. Every figure is one `providerHealth` already
   derives from the seed, said twice in the same words — once as a tile, once
   on a collapsed head.
   --------------------------------------------------------------------------- */

/* The rolling window counted by outcome. `value` is read by both the tile and
   the collapsed head, so a figure cannot be formatted one way in the body and
   another way on the row above it. */
const FIGURES = [
  {
    id: 'issued',
    label: 'Issued',
    tone: 'acc',
    hint: 'Challenges issued in the rolling seven-day window',
    value: (h) => num(h.challenges7d),
  },
  {
    id: 'failed',
    label: 'Failed',
    tone: 'bad',
    hint: 'Challenges the identity never completed',
    value: (h) => num(h.failures7d),
  },
  {
    id: 'success',
    label: 'Success rate',
    tone: 'ok',
    hint: 'Share of issued challenges that completed',
    value: (h) => pct(h.successRate, 2),
  },
  {
    id: 'latency',
    label: 'Median latency',
    tone: 'mut',
    hint: 'Half of the challenges completed faster than this',
    value: (h) => `${h.latencyMs} ms`,
  },
]

/* The figures a collapsed head carries: the two the thresholds are read off,
   in the order the tiles below show them, so the head and the body are scanned
   the same way. Issued and the success rate are not triage figures — a busy
   provider is not a bad one, and the rate is the failure count said again —
   and taking the labels and hints from the tiles keeps the head and the body
   naming the same numbers the same way. */
const HEAD_FIGURES = ['failed', 'latency'].map((id) => FIGURES.find((f) => f.id === id))

/* The driving figures said in words, for the recheck toast. Reading the same
   `drivers` the head colours keeps the two from contradicting each other: a
   provider amber for its latency must not be reported as a failure count that
   never crossed a threshold. */
const DRIVER_PHRASE = {
  failed: (h) => `${num(h.failures7d)} of ${num(h.challenges7d)} challenges failed`,
  latency: (h) => `${h.latencyMs} ms median latency`,
}

/* The connection readout, as one component rather than one per caller: the
   provider on the page and every accordion under it answer the same six
   questions, and two copies of this markup would start answering them
   differently the first time either was edited. */
function DeliveryPanel({ provider, enabled }) {
  const h = providerHealth(provider)
  const configured = !!provider.endpoint

  return (
    <div className="stack">
      <KeyValue
        dense
        cols={2}
        rows={[
          {
            k: 'Configured',
            icon: 'checkC',
            v: <Pill tone={configured ? 'ok' : 'bad'}>{configured ? 'Yes' : 'No'}</Pill>,
          },
          {
            k: 'Offered at enrollment',
            icon: 'activity',
            v: <Pill tone={enabled ? 'ok' : 'mut'}>{enabled ? 'Enabled' : 'Disabled'}</Pill>,
          },
          { k: 'Endpoint', icon: 'globe', v: <span className="mono t-xs">{provider.endpoint}</span> },
          { k: 'Transport', icon: 'swap', v: <span>{provider.protocol} · {provider.hosting}</span> },
          { k: 'Region', icon: 'server', v: provider.region },
          { k: 'Last connection test', icon: 'bolt', v: <span className="mono t-xs">{h.lastTest}</span> },
        ]}
      />
      <Banner tone={enabled ? 'ok' : 'warn'}>
        {enabled
          ? `${provider.vendor} answered over ${provider.protocol}. Probed ${h.lastTest}.`
          : 'The factor is configured but withdrawn from enrollment — no challenge is issued through it.'}
      </Banner>
    </div>
  )
}

function OutcomePanel({ provider }) {
  const h = providerHealth(provider)
  return (
    <div className="stack">
      <div className="grid grid-4">
        {FIGURES.map((f) => (
          <div className="tile" key={f.id} data-tone={f.tone} title={f.hint}>
            <div className="tile-k">{f.label}</div>
            <div className="tile-v">{f.value(h)}</div>
          </div>
        ))}
      </div>
      {h.failures7d > 0 && (
        <Banner tone="warn">
          {num(h.failures7d)} of {num(h.challenges7d)} challenges were never completed. Each one is recorded against
          the identity that was challenged, in the authentication log.
        </Banner>
      )}
    </div>
  )
}

/* A group inside a panel. The card header names the provider; this names the
   part, so a client's readout is read in the same two halves as the expanded
   one above it. */
function Section({ icon, title, actions, children }) {
  return (
    <section className="mfa-fs">
      <div className="mfa-fs-hr">
        <h3 className="mfa-fs-h"><Icon name={icon} size={13} />{title}</h3>
        {actions && <div className="mfa-fs-a">{actions}</div>}
      </div>
      <div className="stack">{children}</div>
    </section>
  )
}

/**
 * One provider, collapsed to a head that is enough to triage on.
 *
 * The head carries the name, the state read off the figures, and the figures
 * the state was read off — the failures and the median latency — so a bad
 * provider is visible, with its reason, without opening four accordions to find
 * it. The figure that crossed a threshold is the coloured one; a provider can
 * be amber for either, and only the head can say which.
 *
 * Several may be open at once. The job here is comparison: an operator with two
 * unhealthy providers wants both readouts on screen together, and an accordion
 * that closes the first when you open the second makes that impossible.
 */
function ProviderAccordion({ provider, enabled, open, onToggle, onRecheck }) {
  const h = providerHealth(provider)
  const state = providerState(provider, enabled)
  const headId = `mfah-h-${provider.id}`
  const bodyId = `mfah-b-${provider.id}`

  return (
    <div className="mfa-acc" data-open={open || undefined}>
      <button
        type="button"
        id={headId}
        className="mfa-acc-h"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <Icon name="chevR" size={14} className="mfa-acc-chev" />
        <span className="mfa-acc-meta">
          <span className="mfa-acc-t">{provider.name}</span>
          <span className="mfa-acc-s">{provider.vendor} · {provider.protocol} · {provider.hosting}</span>
        </span>
        <span className="mfa-acc-figs">
          {/* Coloured by what tripped the state, not by what looks alarming:
              eighty failures in twelve thousand challenges is a healthy
              provider, and a red figure beside a green pill asks the operator
              which of the two to believe. A figure that stayed inside its
              threshold stays neutral even on an amber row, so the coloured
              number is always the reason for the pill beside it. */}
          {HEAD_FIGURES.map((f) => (
            <span
              key={f.id}
              className="mfa-acc-fig"
              data-tone={state.drivers.includes(f.id) ? state.tone : 'mut'}
              title={f.hint}
            >
              <span className="mfa-acc-fig-v">{f.value(h)}</span>
              <span className="mfa-acc-fig-k">{f.label}</span>
            </span>
          ))}
          <Pill tone={state.tone} dot>{state.label}</Pill>
        </span>
      </button>

      {/* Rendered whether or not it is open, and hidden with the attribute, so
          `aria-controls` always resolves to something a screen reader can be
          sent to rather than to an id that exists only half the time. */}
      <div className="mfa-acc-b" id={bodyId} role="region" aria-labelledby={headId} hidden={!open}>
        <div className="stack">
          <Section
            icon="activity"
            title="Delivery"
            actions={<Button size="sm" icon="refresh" onClick={onRecheck}>Recheck</Button>}
          >
            <DeliveryPanel provider={provider} enabled={enabled} />
          </Section>
          <Section icon="shield" title="Challenge outcomes">
            <OutcomePanel provider={provider} />
          </Section>
        </div>
      </div>
    </div>
  )
}

/* The wait, drawn against the real geometry and kept beside the thing it
   imitates so the two are edited together: a six-row field grid and a banner
   in the first card, four tiles in the second, and the collapsed heads in the
   third — heads only, because that is what the card lands as. */
export function DeliveryHealthSkeleton({ others = PROVIDERS.length - 1 }) {
  return (
    <div className="stack">
      <SkeletonCard>
        <div className="stack">
          <SkeletonKeyValue rows={6} cols={2} />
          <SkeletonLine height={38} />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <div className="grid grid-4">
          {FIGURES.map((f) => (
            <div className="tile" key={f.id} data-tone="mut">
              <div className="tile-k"><SkeletonLine width="56%" height={8} /></div>
              <div className="tile-v"><SkeletonLine width={62} height={20} /></div>
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard>
        {Array.from({ length: others }, (_, i) => (
          <div className="mfa-acc mfa-acc-skel" key={i}>
            <div className="mfa-acc-h">
              <span className="skel mfa-acc-skel-chev" />
              <span className="mfa-acc-meta">
                <SkeletonLine width="38%" height={12} />
                <SkeletonLine width="52%" height={9} />
              </span>
              <span className="mfa-acc-figs">
                {HEAD_FIGURES.map((f) => (
                  <span className="mfa-acc-fig" key={f.id}>
                    <SkeletonLine width={54} height={14} />
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

export default function DeliveryHealth({ provider, enabled, factorEnabled = {}, onTest }) {
  const { toast } = useApp()
  // Where an operator was standing is not configuration, so the open set does
  // not outlive the visit.
  const [openIds, setOpenIds] = useState({})

  const others = PROVIDERS.filter((p) => p.id !== provider.id)
  const needAttention = others.filter((p) => providerState(p, !!factorEnabled[p.id]).attention).length

  const recheck = (p) => {
    const state = providerState(p, !!factorEnabled[p.id])
    const h = providerHealth(p)
    // Built from the same drivers the head colours, so the toast repeats the
    // row's reason rather than offering a different one.
    const detail = state.drivers.map((k) => DRIVER_PHRASE[k](h)).join(', ')
    const body = state.id === HEALTH_STATES.off.id
      ? `${p.vendor} is configured but withdrawn from enrollment — no challenge is issued through it.`
      : detail
        ? `${p.endpoint} — ${detail}.`
        : `${p.endpoint} answered and authenticated.`
    toast(
      // "off" is not a toast tone, and a factor somebody withdrew is a warning
      // rather than a failure: nothing is being issued, nothing is broken.
      state.id === HEALTH_STATES.off.id ? 'warn' : state.id,
      `${p.name} · ${state.label}`,
      body,
    )
  }

  return (
    <div className="stack">
      <Card
        title="Delivery"
        sub={`Rolling seven-day window for ${provider.name.toLowerCase()}`}
        actions={<Button size="sm" icon="bolt" onClick={onTest}>Test connection</Button>}
      >
        <DeliveryPanel provider={provider} enabled={enabled} />
      </Card>

      <Card title="Challenge outcomes" sub="Every challenge this provider issued in the window">
        <OutcomePanel provider={provider} />
      </Card>

      {/* The card is the container so the rows are not cards inside a card;
          each row is a hairline-separated accordion, the same shape Email and
          SMS Management use for their client health. */}
      <Card
        title="Other providers"
        sub="Every other factor the platform issues a challenge through, checked the same way"
        flush
        actions={(
          <Pill tone={needAttention ? 'warn' : 'ok'} dot>
            {needAttention ? `${needAttention} need attention` : 'All healthy'}
          </Pill>
        )}
      >
        {others.map((p) => (
          <ProviderAccordion
            key={p.id}
            provider={p}
            enabled={!!factorEnabled[p.id]}
            open={!!openIds[p.id]}
            onToggle={() => setOpenIds((m) => ({ ...m, [p.id]: !m[p.id] }))}
            onRecheck={() => recheck(p)}
          />
        ))}
      </Card>
    </div>
  )
}
