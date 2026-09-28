import {
  Skeleton, SkeletonCard, SkeletonStats, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { GROUP_TYPES } from './campaignUsers'
import { sectionsForReview } from './UserDetailsForm'

/**
 * The shapes the recertification screens hold their space with.
 *
 * A campaign and a campaign user are both read through a masthead that carries
 * a tab strip, and the kit's header skeleton has no tab row — swapping it in
 * would drop the panel by the height of that row the moment the record landed.
 * So the mastheads here stay put and what settles is the panel beneath them.
 * The email review link is the exception: it has no console shell to inherit,
 * so it draws its own bar and its own tabs.
 *
 * Several shapes below are not kit shapes because they are not kit components —
 * the joined `.stat-strip`, the `.rc-standing` split, the `.rc-level-progress`
 * meters, a `.tabs` bar, the `.rl-attrs` tile grid. Each keeps the real classes
 * and states the line box the real type prints, because a bar carries no text
 * of its own to set one and a block that comes up short moves everything under
 * it when the campaign lands.
 *
 * The field grid is drawn the same way, and for a sharper reason than looks.
 * The kit's `.skel-kv` fixes a column count and a 43px row, so a shape for it
 * has to be worked out by hand from whatever `.kv` will actually do with the
 * card's `cols` and `dense` at each breakpoint — and the two shapes below had
 * both worked out wrong. Borrowing `.kv` itself means the grid answers that
 * question for the skeleton, and only the two line boxes are left to state.
 */

/* `.tab`: 7px above, 8px below, a 2px indicator, and one line of body type. */
const TAB_H = 'calc(15px + var(--t-body) * var(--t-body-lh) + 2px)'
/* `.stat-k` is --t-xs; `.stat-v` is 1.125rem on the inherited line height. */
const STAT_K = 'calc(var(--t-xs) * var(--t-xs-lh))'
const STAT_V = 'calc(1.125rem * var(--t-body-lh))'
const LINE_XS = 'calc(var(--t-xs) * var(--t-xs-lh))'
const LINE_SM = 'calc(var(--t-sm) * var(--t-sm-lh))'
/* `.t-micro` sets no line height of its own, so it prints on the body's. */
const LINE_MICRO = 'calc(var(--t-micro) * var(--t-body-lh))'
/* Nor do `.kv-k` and `.kv-v`, so a field row is two body line boxes deep. */
const KV_K = LINE_MICRO
const KV_V = 'calc(var(--t-sm) * var(--t-body-lh))'

const bar = { display: 'block' }

/* Ragged value widths, so a grid of fields does not read as a printed form.
   Fixed rather than random: a skeleton that reshuffles every render draws
   attention to itself instead of to the wait. */
const RAG = ['62%', '48%', '71%', '55%']

/**
 * A field grid, drawn from `.kv` itself. The column count, the dense padding
 * and both collapse breakpoints then come from the same rule the real card is
 * laid out by, so the shape cannot disagree with it about how many grid rows
 * `rows` will make.
 */
function SkeletonKV({ rows = 4, cols = 2, dense }) {
  return (
    <div className="kv" data-cols={cols} data-dense={dense || undefined} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="kv-row" key={i}>
          {/* The 24px chip, drawn rather than borrowed: `.kv-ic` carries a
              border and a background the bar would only half override. */}
          {!dense && <span className="skel" style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)' }} />}
          <span className="kv-m">
            <span className="kv-k" style={{ minHeight: KV_K, display: 'flex', alignItems: 'center' }}>
              <span className="skel" style={{ ...bar, width: '44%', height: 7 }} />
            </span>
            <span className="kv-v" style={{ minHeight: KV_V, display: 'flex', alignItems: 'center' }}>
              <span className="skel" style={{ ...bar, width: RAG[i % RAG.length], height: 9 }} />
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/* The joined figure strip the Reviewers panel opens with. */
function SkeletonStatStrip({ cells = 4 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ ...bar, width: 76 + (i % 3) * 22, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V, display: 'flex', alignItems: 'center' }}>
            <span className="skel" style={{ ...bar, width: 40, height: 15 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* A tab bar. Only the email review page needs one: everywhere else the strip
   belongs to a masthead that is already on screen. */
function SkeletonTabs({ tabs = 3, widths = [62, 78, 70, 56] }) {
  return (
    <div className="tabs" aria-hidden="true">
      {Array.from({ length: tabs }, (_, i) => (
        <span className="tab" key={i} style={{ minHeight: TAB_H }}>
          <span className="skel" style={{ ...bar, width: 13, height: 13 }} />
          <span className="skel" style={{ ...bar, width: widths[i % widths.length], height: 9 }} />
        </span>
      ))}
    </div>
  )
}

/* A one-line `.banner`: 10px of padding either side of a body line box, inside
   a hairline border. */
function SkeletonBanner() {
  return <span className="skel" style={{ ...bar, height: 40, borderRadius: 'var(--r)' }} aria-hidden="true" />
}

/**
 * Campaign progress cards — the `grid grid-3` of `Card`s the register's second
 * tab draws, one per campaign: a header, five label/value rows and a footer.
 */
export function CampaignProgressSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} foot>
          <div className="stack" style={{ gap: 7 }}>
            {Array.from({ length: 5 }, (_, r) => (
              <span className="row-between" key={r} style={{ minHeight: LINE_SM }}>
                <span className="skel" style={{ ...bar, width: 62 + (r % 3) * 16, height: 8 }} />
                <span className="skel" style={{ ...bar, width: 44 + (r % 2) * 22, height: 9 }} />
              </span>
            ))}
          </div>
        </SkeletonCard>
      ))}
    </div>
  )
}

/**
 * Campaign › Overview: where the campaign stands, then how it was defined.
 *
 * The standing card is `flush`, so its body is the `.rc-standing` block and the
 * three `.rc-fig` cells under it rather than the card's own padding.
 */
export function CampaignOverviewSkeleton({ campaign }) {
  return (
    <Skeleton label={`Loading ${campaign.name}`}>
      <div className="stack">
        <section className="card" aria-hidden="true">
          <header className="card-h">
            <div className="card-h-meta">
              <span className="skel" style={{ ...bar, width: '34%', height: 11 }} />
              <span className="skel" style={{ ...bar, width: '52%', height: 8, marginTop: 5 }} />
            </div>
          </header>
          <div className="card-b flush">
            <div className="rc-standing">
              <div className="rc-standing-head">
                <span className="skel rc-standing-pct" style={{ ...bar, width: 72, height: '1.625rem' }} />
                <span className="skel" style={{ ...bar, width: 176, height: 9 }} />
              </div>
              {/* The split bar keeps its pill radius: skeleton.css is imported
                  last, so `.skel` would otherwise flatten it. */}
              <div className="skel rc-split" style={{ borderRadius: 'var(--r-pill)' }} />
            </div>
            <div className="rc-figs">
              {Array.from({ length: 3 }, (_, i) => (
                <div className="rc-fig" key={i}>
                  <span className="rc-fig-k" style={{ minHeight: LINE_XS }}>
                    <span className="skel" style={{ ...bar, width: 66 + (i % 3) * 14, height: 8 }} />
                  </span>
                  <span className="rc-fig-v" style={{ minHeight: 'calc(1.25rem * 1.2)', display: 'flex', alignItems: 'center' }}>
                    <span className="skel" style={{ ...bar, width: 38, height: 16 }} />
                  </span>
                  <span className="rc-fig-s" style={{ minHeight: LINE_XS, display: 'flex', alignItems: 'center' }}>
                    <span className="skel" style={{ ...bar, width: '84%', height: 8 }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The campaign record: the eight dense fields of CampaignInsights, at
            the same `cols` and `dense` the card passes, so the shape folds to
            two, four or eight grid rows exactly where the card does. */}
        <SkeletonCard><SkeletonKV rows={8} cols={4} dense /></SkeletonCard>
      </div>
    </Skeleton>
  )
}

/**
 * Campaign › Items, above the register. The register keeps its own toolbar and
 * settles its rows from `loading`, so only the tiles and the level meters are
 * drawn here — and this is the panel's one announcing region.
 */
export function CampaignItemsSkeleton({ levels = 3 }) {
  return (
    <Skeleton label="Loading the campaign users">
      <SkeletonStats count={4} />
      <SkeletonCard>
        <div className="rc-level-progress" style={{ '--rc-cols': levels }} aria-hidden="true">
          {Array.from({ length: levels }, (_, i) => (
            <div className="rc-level-progress-it" key={i}>
              <span className="row-between" style={{ minHeight: LINE_SM }}>
                <span className="skel" style={{ ...bar, width: 104 + (i % 3) * 18, height: 9 }} />
                <span className="skel" style={{ ...bar, width: 48, height: 8 }} />
              </span>
              {/* `.meter` at the height the card passes it. */}
              <span className="skel" style={{ ...bar, height: 6, borderRadius: 'var(--r-pill)' }} />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </Skeleton>
  )
}

/** Campaign › Reviewers, above its register. */
export function CampaignReviewersSkeleton() {
  return (
    <Skeleton label="Loading the campaign reviewers">
      <SkeletonStatStrip cells={4} />
    </Skeleton>
  )
}

/**
 * One campaign user, read at one approval level: the level's own sign-off card,
 * the attribute comparison, and one card per group type.
 */
export function UserReviewLevelSkeleton({ user, groups = 3 }) {
  return (
    <Skeleton label={`Loading ${user.name}`}>
      <div className="stack">
        {/* The sign-off card: six fields at the `cols` the card passes — which
            is four, though `.kv` has no four-column rule outside `dense` and so
            lays them out two wide, three rows deep. Under them the card always
            carries one `Banner`: the read-only note when the level is closed,
            certified or not yet reached, the review note when it is open and
            pending. There is no state in which neither is drawn. */}
        <SkeletonCard>
          <SkeletonKV rows={6} cols={4} />
          <div style={{ marginTop: 12 }}><SkeletonBanner /></div>
        </SkeletonCard>
        <SkeletonCard><SkeletonTable rows={8} cols={4} /></SkeletonCard>
        {Array.from({ length: groups }, (_, i) => (
          <SkeletonCard key={i}><SkeletonTable rows={3} cols={4} /></SkeletonCard>
        ))}
      </div>
    </Skeleton>
  )
}

/** The same user read across every level at once — one wide comparison table. */
export function UserReviewAllSkeleton({ user, levels = 3 }) {
  return (
    <Skeleton label={`Loading every change recorded against ${user.name}`}>
      <SkeletonCard><SkeletonTable rows={10} cols={Math.min(6, levels + 2)} /></SkeletonCard>
    </Skeleton>
  )
}

/**
 * The attribute tiles the email page reviews.
 *
 * The sections and their attributes are asked for rather than counted out here:
 * `sectionsForReview` is the same static list the page itself lays out, so the
 * grid holds exactly the rows the review will fill and the two cards below it
 * do not move when it lands.
 */
function SkeletonAttrSections() {
  return (
    <div className="stack" aria-hidden="true">
      {sectionsForReview().map((s, si) => (
        <div key={s.id}>
          <div className="t-micro t-mut rl-attr-section" style={{ minHeight: LINE_MICRO }}>
            <span className="skel" style={{ ...bar, width: 96 + (si % 3) * 34, height: 8 }} />
          </div>
          <div className="rl-attrs">
            {s.attrs.map((a, i) => (
              <div className="rl-attr" key={a.id}>
                <span className="row-between" style={{ gap: 8, minHeight: LINE_XS }}>
                  <span className="skel" style={{ ...bar, width: 64 + (i % 3) * 22, height: 8 }} />
                </span>
                <span className="rl-attr-v" style={{ minHeight: LINE_SM }}>
                  <span className="skel" style={{ ...bar, width: `${54 + (i % 4) * 12}%`, height: 9 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The group tables under it — one block per group type, each a heading over a
 * bordered table. Built from the real `.rl-group` markup rather than from the
 * kit's table, which has neither the block's heading nor the table's border.
 */
function SkeletonGroupBlocks({ rows = 3 }) {
  return (
    <div className="stack" aria-hidden="true">
      {GROUP_TYPES.map((t) => (
        <div className="rl-group" key={t.id}>
          <div className="row-between rl-group-h">
            <div style={{ minWidth: 0 }}>
              <div className="t-sm" style={{ minHeight: LINE_SM }}>
                <span className="skel" style={{ ...bar, width: 132, height: 9 }} />
              </div>
              <div className="t-xs" style={{ minHeight: LINE_XS }}>
                <span className="skel" style={{ ...bar, width: 198, height: 8 }} />
              </div>
            </div>
          </div>
          <table className="tbl rl-group-tbl">
            <thead>
              <tr>
                <th style={{ width: 64 }}><span className="skel" style={{ ...bar, width: 30, height: 8 }} /></th>
                <th style={{ width: '42%' }}><span className="skel" style={{ ...bar, width: 54, height: 8 }} /></th>
                <th><span className="skel" style={{ ...bar, width: 74, height: 8 }} /></th>
                <th style={{ width: 120 }}><span className="skel" style={{ ...bar, width: 52, height: 8 }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => (
                <tr key={i}>
                  <td><span className="skel" style={{ ...bar, width: 14, height: 9 }} /></td>
                  <td><span className="skel" style={{ ...bar, width: `${58 + (i % 3) * 12}%`, height: 9 }} /></td>
                  <td><span className="skel" style={{ ...bar, width: `${44 + (i % 2) * 18}%`, height: 9 }} /></td>
                  <td><span className="skel" style={{ ...bar, width: 18, height: 9 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

/**
 * The email review link, on a cold load.
 *
 * This is the page with the strongest claim to a skeleton in the group: it is
 * opened from a mail client by someone who is not signed in, with nothing of
 * the console already on screen. It is also the page that must not guess — the
 * link may turn out to be invalid or expired, and an outcome shown for a beat
 * and then replaced by a review is worse than a wait — so the whole body is
 * held, including the level tabs, which are drawn from the campaign's chain.
 */
export function ReviewLinkSkeleton({ levels = 3 }) {
  return (
    <Skeleton label="Loading your recertification review">
      <div className="stack">
        {/* The masthead card: a 76px avatar beside the identity, with the three
            review facts trailing it. */}
        <SkeletonCard head={false}>
          <div className="rl-intro" aria-hidden="true">
            <span className="skel" style={{ width: 76, height: 76, borderRadius: '50%' }} />
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span className="skel" style={{ ...bar, width: 92, height: 8 }} />
              <span className="skel" style={{ ...bar, width: '42%', height: 18 }} />
              <span className="skel" style={{ ...bar, width: '64%', height: 9 }} />
            </div>
            <div className="rl-intro-facts">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i}>
                  <span className="skel" style={{ ...bar, width: 62, height: 8 }} />
                  <span className="skel" style={{ ...bar, width: 104 + (i % 3) * 24, height: 10, marginTop: 4 }} />
                </span>
              ))}
            </div>
          </div>
        </SkeletonCard>

        <SkeletonTabs tabs={levels} />
        {/* One banner: the read-only or review-this-level note the page always
            carries. The second, which says the level was already certified, is
            drawn only on some of them and is not held space for. */}
        <SkeletonBanner />

        <SkeletonCard><SkeletonAttrSections /></SkeletonCard>
        <SkeletonCard><SkeletonGroupBlocks rows={3} /></SkeletonCard>
      </div>
    </Skeleton>
  )
}
