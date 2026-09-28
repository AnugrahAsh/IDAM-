import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonKeyValue, SkeletonPageBar,
  SkeletonStats, SkeletonTable,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the Background Jobs screens hold their space with.
 *
 * Three of them are not kit shapes and are drawn from the real rules instead:
 * the joined figure strip (`.stat-strip`), the record's tab bar (`.tabs`), and
 * the uppercase block label a card on the Information tab opens with
 * (`.job-block-k`). Each states the line box its real type prints, because a
 * bar carries no text to set one and a block of them that comes up short drops
 * everything underneath it when the words arrive.
 */

/* `.tab`: 7px above, 8px below, a 2px indicator, one line of body type. */
const TAB_H = 'calc(15px + var(--t-body) * var(--t-body-lh) + 2px)'
/* From the shared `.kpi .k-label, .stat-k` and `.kpi .k-val, .stat-v` blocks in
   styles/horizon.css: `.stat-k` is --t-xs and declares no line-height, so it
   inherits the body's; `.stat-v` sets its own 1.25rem/1.1. */
const STAT_K = 'calc(var(--t-xs) * var(--t-body-lh))'
const STAT_V = 'calc(1.25rem * 1.1)'
/* `.job-block-k` is --t-micro with no line-height of its own — the body's. */
const BLOCK_K = 'calc(var(--t-micro) * var(--t-body-lh))'

const bar = { display: 'block' }

/** The joined figure strip — `.stat-strip` geometry. */
export function JobStatStripSkeleton({ cells = 3 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ ...bar, width: 72 + (i % 3) * 20, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V, display: 'flex', alignItems: 'center' }}>
            <span className="skel" style={{ ...bar, width: 44, height: 15 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* The tab bar under the record masthead. It keeps the real `.tabs` rule, so it
   carries the closing hairline the masthead gives up while it is a skeleton,
   and it bleeds to the canvas edges the way the header does. */
function TabsSkeleton({ tabs = 2, widths = [86, 92] }) {
  return (
    <div className="tabs job-skel-tabs" aria-hidden="true">
      {Array.from({ length: tabs }, (_, i) => (
        <span className="tab" key={i} style={{ minHeight: TAB_H }}>
          <span className="skel" style={{ ...bar, width: 14, height: 14 }} />
          <span className="skel" style={{ ...bar, width: widths[i % widths.length], height: 9 }} />
        </span>
      ))}
    </div>
  )
}

/* A card that opens with a `.job-block-k` label rather than a Card header. */
function BlockCard({ children }) {
  return (
    <SkeletonCard head={false}>
      <div className="job-block-k" style={{ display: 'flex', alignItems: 'center', minHeight: BLOCK_K }}>
        <span className="skel" style={{ ...bar, width: 92, height: 7 }} />
      </div>
      {children}
    </SkeletonCard>
  )
}

/** The register: masthead, the five posture figures, and the tab strip's rows. */
export function JobsListSkeleton() {
  return (
    <Skeleton label="Loading the execution history">
      <SkeletonPageBar actions={2} crumbs={1} />
      <SkeletonStats count={5} />
    </Skeleton>
  )
}

/**
 * One execution. The masthead's facts are counted from the run, so it waits
 * with the body rather than standing above it — a header that states a total
 * count before the records it counted have landed is stating a guess.
 */
export function JobRecordSkeleton({ tab = 'information' }) {
  return (
    <Skeleton label="Loading the job execution">
      <SkeletonDetailHeader className="job-skel-head" facts={5} actions={3} />
      <TabsSkeleton tabs={2} />
      <div className="detail-body">
        {tab === 'details' ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <div className="detail-cols">
            <div className="stack">
              <BlockCard><SkeletonKeyValue rows={7} cols={1} /></BlockCard>
              <BlockCard>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <span className="skel" style={{ ...bar, width: 104, height: 8 }} />
                  <span className="skel" style={{ ...bar, width: 62, height: 9 }} />
                </div>
                <span className="skel" style={{ ...bar, width: '100%', height: 7, borderRadius: 'var(--r-pill)' }} />
                <div style={{ marginTop: 14 }}><SkeletonKeyValue rows={7} cols={1} /></div>
              </BlockCard>
            </div>
            <div className="stack">
              <SkeletonCard head>
                <JobStatStripSkeleton cells={3} />
                <div style={{ marginTop: 10 }}><span className="skel" style={{ ...bar, width: '84%', height: 8 }} /></div>
                <div style={{ marginTop: 12 }}><span className="skel skel-btn" style={{ ...bar, width: 218 }} /></div>
              </SkeletonCard>
              <SkeletonCard head>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="skel skel-chip" style={{ ...bar, width: 104 }} />
                  <span className="skel skel-chip" style={{ ...bar, width: 78 }} />
                </div>
                <span className="skel skel-btn" style={{ ...bar, width: 150 }} />
              </SkeletonCard>
            </div>
          </div>
        )}
      </div>
    </Skeleton>
  )
}
