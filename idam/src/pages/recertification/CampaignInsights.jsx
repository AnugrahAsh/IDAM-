import Card from '../../components/primitives/Card'
import KeyValue from '../../components/primitives/KeyValue'
import { num } from '../../lib/format'
import { levelNames } from './data'
import { CampaignOverviewSkeleton } from './RecertificationSkeleton'

const share = (part, whole) => (whole ? (part / whole) * 100 : 0)

function Standing({ c, undecided, certified }) {
  const closed = c.status !== 'Active'
  const pct = Math.round(share(c.decided, c.items))
  const revokedPct = Math.round(share(c.revoked, c.decided))
  const certifiedPct = c.decided ? 100 - revokedPct : 0

  const figures = [
    { k: 'Certified', tone: 'ok', v: certified, s: c.decided ? `${certifiedPct}% of decisions kept access` : 'No decisions yet' },
    { k: 'Revoked', tone: 'bad', v: c.revoked, s: c.decided ? `${revokedPct}% of decisions removed access` : 'No decisions yet' },
    { k: 'Undecided', tone: 'mut', v: undecided, s: undecided ? (closed ? 'Left without a decision' : 'Waiting on a reviewer') : 'Nothing outstanding' },
  ]

  return (
    <Card
      title="Where this campaign stands"
      sub={closed ? 'Closed · these figures are final' : `Closes on ${c.closesOn} · ${c.dueIn} ${c.dueIn === 1 ? 'day' : 'days'} left`}
      flush
    >
      <div className="rc-standing">
        <div className="rc-standing-head">
          <span className="rc-standing-pct">{pct}%</span>
          <span className="rc-standing-of">
            decided · <b>{num(c.decided)}</b> of {num(c.items)} items
          </span>
        </div>
        <div
          className="rc-split"
          role="img"
          aria-label={`${num(certified)} certified, ${num(c.revoked)} revoked, ${num(undecided)} undecided`}
        >
          {certified > 0 && <i data-tone="ok" style={{ width: `${share(certified, c.items)}%` }} />}
          {c.revoked > 0 && <i data-tone="bad" style={{ width: `${share(c.revoked, c.items)}%` }} />}
        </div>
      </div>

      <div className="rc-figs">
        {figures.map((f) => (
          <div className="rc-fig" key={f.k}>
            <span className="rc-fig-k"><span className="rc-key" data-tone={f.tone} />{f.k}</span>
            <span className="rc-fig-v">{num(f.v)}</span>
            <span className="rc-fig-s">{f.s}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function OverviewTab({ c, scoped, loading = false }) {
  const certified = Math.max(0, c.decided - c.revoked)
  const undecided = Math.max(0, c.items - c.decided)
  const chain = levelNames(c.levels)

  /* Both cards are the same campaign read two ways, so the panel settles as one
     thing. Every figure on it is a count of what has not arrived yet, and a
     "0% decided" shown for a beat is a statement, not a placeholder. */
  if (loading) return <CampaignOverviewSkeleton campaign={c} />

  return (
    <div className="stack">
      <Standing c={c} undecided={undecided} certified={certified} />

      <Card title="Campaign record" sub="How this campaign was defined">
        <KeyValue
          dense
          cols={4}
          rows={[
            { k: 'Accountable auditor', v: c.auditor, icon: 'user' },
            { k: 'Scope', v: c.scope, icon: 'building' },
            { k: 'Reviewer chain', v: c.levels, icon: 'hierarchy' },
            { k: 'Levels', v: String(chain.length), icon: 'layers' },
            { k: 'Created on', v: c.createdOn, icon: 'calendar' },
            { k: 'Started', v: c.started.slice(0, 10), icon: 'play' },
            { k: 'Closes on', v: c.status === 'Active' ? c.closesOn : 'Closed', icon: 'clock' },
            { k: 'Loaded in this console', v: `${num(scoped.length)} items`, icon: 'inbox' },
          ]}
        />
      </Card>
    </div>
  )
}
