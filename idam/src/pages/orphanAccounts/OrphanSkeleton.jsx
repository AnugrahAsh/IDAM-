import {
  Skeleton, SkeletonCard, SkeletonText,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the orphan detection rule holds its space with.
 *
 * The rule's masthead is not among them. It carries the tab strip the reader is
 * steering with, and the kit's header skeleton has no tab row — swapping it in
 * would drop the panel by the height of that row the moment the rule landed.
 * What settles is the panel under the tabs, which is what these draw.
 *
 * Several shapes here are not kit shapes, because the things they stand in for
 * are not kit components: the joined `.stat-strip` a tab opens with, the
 * numbered `.chain` that reads the rule back in words, and the `.tl` rail the
 * change log is drawn on. Each keeps the real classes and states the line box
 * the real type prints, because a bar carries no text of its own to set one and
 * a block that comes up short moves everything under it on arrival.
 *
 * The field grid is here for the same reason, and it is the one that mattered
 * most: the kit's `.skel-kv-row` is a 24px icon between 9px of padding, which
 * lands the row at 43px, while the real `.kv-row` is a two-line stack of type
 * that lands at about 55.7px. The fact panels on the Overview tab are nineteen
 * such rows, so the kit shape was holding roughly 240px less than the rule
 * needed and the right-hand column jumped every time it arrived.
 */

/* `.stat-k` is --t-xs; `.stat-v` is 1.125rem on the inherited line height. */
const STAT_K = 'calc(var(--t-xs) * var(--t-xs-lh))'
const STAT_V = 'calc(1.125rem * var(--t-body-lh))'
/* The line boxes the change-log entries print. A bar has no text in it to set
   one, and a rail that comes up short moves the card under it on arrival. */
const LINE_SM = 'calc(var(--t-sm) * var(--t-sm-lh))'
const LINE_XS = 'calc(var(--t-xs) * var(--t-xs-lh))'
/* `.kv-k` and `.kv-v` carry no line height of their own, so both print on the
   body's rather than on the one their own size token names. */
const KV_K = 'calc(var(--t-micro) * var(--t-body-lh))'
const KV_V = 'calc(var(--t-sm) * var(--t-body-lh))'

const bar = { display: 'block' }

/* Ragged value widths, so a column of fields does not read as a printed form.
   Fixed rather than random: a skeleton that reshuffles every render draws
   attention to itself instead of to the wait. */
const RAG = ['62%', '48%', '71%', '55%']

/**
 * A field grid, drawn from `.kv` itself rather than from the kit's `.skel-kv`.
 *
 * Borrowing the real classes buys the column count, the dense padding and both
 * collapse breakpoints for nothing, and leaves only the two line boxes to state
 * — which is the whole of what the kit shape gets wrong.
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

/* The joined figure strip a tab opens with — `.stat-strip` geometry. */
function SkeletonStatStrip({ cells = 3 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ ...bar, width: 82 + (i % 3) * 20, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V, display: 'flex', alignItems: 'center' }}>
            <span className="skel" style={{ ...bar, width: 44, height: 15 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* The three numbered steps of "What this rule detects" — `.chain-step` keeps
   its own 26px mark and hairline, so the steps land at the height they hold. */
function SkeletonChain({ steps = 3 }) {
  return (
    <div className="chain" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <div className="chain-step" key={i}>
          {/* `.cs-n` is a 26px disc. The mark is drawn rather than borrowed:
              skeleton.css is imported last, so `.skel` would flatten the
              class's own border-radius into the block's small one. */}
          <span className="skel" style={{ width: 26, height: 26, borderRadius: '50%' }} />
          <div className="cs-m" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="skel" style={{ ...bar, width: `${52 + (i % 3) * 12}%`, height: 10 }} />
            <span className="skel" style={{ ...bar, width: `${68 - (i % 2) * 14}%`, height: 8 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* A column of short links — the "Linked records" rail, one bar per row. */
function SkeletonLinks({ rows = 5 }) {
  return (
    <div className="stack" style={{ gap: 7 }} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skel" style={{ ...bar, width: 138 + (i % 3) * 26, height: 10 }} />
      ))}
    </div>
  )
}

/**
 * The Overview panel: the figure strip, the plain reading of the definition and
 * the health card on the left, four fact panels on the right. The columns are
 * the real `.detail-cols` grid, so nothing moves sideways when the rule lands.
 */
export function RuleOverviewSkeleton({ rule }) {
  return (
    <Skeleton label={`Loading ${rule.name}`} className="detail-cols">
      <div className="stack">
        <SkeletonStatStrip cells={3} />
        <SkeletonCard>
          <div className="stack">
            <SkeletonText lines={2} />
            <SkeletonChain steps={3} />
          </div>
        </SkeletonCard>
        {/* Detection health: the live figure, its meter, and four rows under it. */}
        <div className="grid">
          <SkeletonCard>
            <div className="stack">
              <span className="skel" style={{ ...bar, width: '44%', height: 14 }} />
              <span className="skel" style={{ ...bar, width: '100%', height: 8, borderRadius: 'var(--r-pill)' }} />
              <SkeletonKV rows={4} cols={1} />
            </div>
          </SkeletonCard>
        </div>
      </div>
      <div className="stack">
        <SkeletonCard><SkeletonKV rows={5} cols={1} /></SkeletonCard>
        <SkeletonCard><SkeletonKV rows={5} cols={1} /></SkeletonCard>
        <SkeletonCard><SkeletonKV rows={5} cols={1} /></SkeletonCard>
        <SkeletonCard><SkeletonLinks rows={5} /></SkeletonCard>
      </div>
    </Skeleton>
  )
}

/**
 * Run history. Only the two blocks either side of the sweep register are drawn:
 * the register settles its own rows from its `loading` prop, and replacing its
 * toolbar with a grey rectangle would take away the search the operator was
 * about to type into.
 */
export function RuleHistoryStripSkeleton({ rule }) {
  return (
    <Skeleton label={`Loading the run history for ${rule.name}`}>
      <SkeletonStatStrip cells={4} />
    </Skeleton>
  )
}

/**
 * The change log beside the sweep register. `.tl` is a rail rather than a list
 * of rows — a dot outside the text, three lines of type per entry and 16px
 * between them — so it is drawn from its own rule rather than from
 * `SkeletonList`, whose rows come up about 24px short of it each.
 *
 * The default is the length of the log the rule actually keeps. An entry is
 * about 74px, so one too many is a visible drop the moment the log lands.
 */
export function RuleChangeLogSkeleton({ rows = 4 }) {
  return (
    <SkeletonCard>
      <div className="tl" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div className="tl-it" key={i}>
            <span className="skel tl-dot" style={{ borderRadius: '50%' }} />
            <div className="tl-t" style={{ minHeight: LINE_SM }}><span className="skel" style={{ ...bar, width: `${46 + (i % 3) * 14}%`, height: 10 }} /></div>
            <div className="tl-s" style={{ minHeight: LINE_XS }}><span className="skel" style={{ ...bar, width: `${72 - (i % 2) * 16}%`, height: 8 }} /></div>
            <div className="tl-time" style={{ minHeight: LINE_XS }}><span className="skel" style={{ ...bar, width: 124, height: 8 }} /></div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  )
}
