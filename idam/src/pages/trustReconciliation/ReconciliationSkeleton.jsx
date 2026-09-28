import {
  Skeleton, SkeletonCard, SkeletonForm, SkeletonKeyValue, SkeletonList,
  SkeletonPageBar, SkeletonTable,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the Trust Reconciliation screens hold their space with.
 *
 * The one shape that is not in the kit is the joined figure strip every screen
 * in this module opens with. It is built from the real rule's own classes —
 * `.stat-strip`, `.stat-cell` — so the only thing invented here is the bars
 * inside, and each of those states the line box the type it replaces prints at.
 * A bar has no text in it to set one, and a strip that comes up short moves
 * everything below it at the moment the figures arrive, which is the jump this
 * whole exercise exists to remove.
 *
 * Each export wraps itself in `Skeleton`. Composed together the outer region
 * announces and the inner ones fall silent, so a screen says once that it is
 * loading however many of these pieces it is built from.
 */

/* `.stat-k` is --t-xs on the inherited body line; `.stat-v` is 1.25rem on 1.1.
   Both come from horizon.css, which is the last word on the tile. */
const STAT_K = 'calc(var(--t-xs) * var(--t-body-lh))'
const STAT_V = 'calc(1.25rem * 1.1)'

/* The match-key block's own line boxes. `.section-title` is --t-h2 and
   `.field-label`/`.field-hint` are --t-xs, all three on the inherited body line
   — none of them sets a line-height of its own. */
const SECTION_T = 'calc(var(--t-h2) * var(--t-body-lh))'
const FIELD_L = 'calc(var(--t-xs) * var(--t-body-lh))'

/* The match key a run correlates on: two `Field` rows, each a label over a
   select over a hint, inside the `.map-unique` block the real card opens with.
   Built from the real rules — `.map-unique` brings the padding, the tint and
   the hairline the flush card has none of, `.field` the 5px column — so only
   the bars are invented, and each states the line box the type it replaces
   prints at. `SkeletonForm` is not used here: its field is a label over an
   input with no hint, which is 28px short of the row this card actually
   prints. */
function MatchKeySkeleton() {
  return (
    <div className="map-unique" aria-hidden="true">
      <div className="section-head">
        <span className="section-title" style={{ minHeight: SECTION_T }}>
          <span className="skel" style={{ display: 'block', width: 74, height: 10 }} />
        </span>
        <span className="section-sub" style={{ minHeight: FIELD_L }}>
          <span className="skel" style={{ display: 'block', width: 232, height: 8 }} />
        </span>
      </div>
      <div className="grid grid-2">
        {[0, 1].map((i) => (
          <span className="field" key={i}>
            <span className="field-label" style={{ minHeight: FIELD_L }}>
              <span className="skel" style={{ display: 'block', width: 86 + i * 28, height: 8 }} />
            </span>
            <span className="skel tr-skel-input" />
            <span className="field-hint" style={{ minHeight: FIELD_L }}>
              <span className="skel" style={{ display: 'block', width: i ? '78%' : '62%', height: 8 }} />
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** The joined figure strip — `.stat-strip` geometry. */
export function SkeletonStatStrip({ cells = 5 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell tr-skel-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ display: 'block', width: 78 + (i % 3) * 20, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V }}>
            <span className="skel" style={{ display: 'block', width: 50 + (i % 2) * 24, height: 15 }} />
          </span>
          <span className="skel" style={{ display: 'block', width: `${62 + (i % 3) * 10}%`, height: 8, marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/**
 * The module overview: the masthead and the estate figures above the tab bar.
 *
 * The tab bar and the register beneath it are not drawn here. The bar is
 * chrome and stays live, and the register settles its own rows from the
 * `loading` prop it already accepts, which leaves the search box the operator
 * is about to type into alive rather than replacing it with a rectangle.
 */
export function OverviewSkeleton() {
  return (
    <Skeleton label="Loading trust reconciliation">
      <SkeletonPageBar actions={3} crumbs={2} />
      <SkeletonStatStrip cells={5} />
    </Skeleton>
  )
}

/**
 * The panel under a trust source's tab bar.
 *
 * User management and Run history are absent on purpose: both are registers and
 * settle their own rows.
 */
export function SourcePanelSkeleton({ tab }) {
  if (tab === 'connection') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={6} actions={false} /></SkeletonCard>
          <SkeletonCard lines={3} />
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
          <SkeletonCard head={false} lines={2} />
        </div>
      </div>
    )
  }

  /* Attributes: one flush card — the match key above the mapping table it
     correlates on — over its summary footer. The card is `flush`, so the body
     it holds space for has no padding of its own: the match key block brings
     its own from `.map-unique`, and the table brings its own row gutters. */
  if (tab === 'attributes') {
    return (
      <SkeletonCard className="tr-skel-flush" foot>
        <MatchKeySkeleton />
        <SkeletonTable rows={8} cols={5} />
      </SkeletonCard>
    )
  }

  /* Overview: the figure strip, then connection and attribute configuration
     beside the record and what the last read is waiting on. */
  return (
    <div className="stack">
      <SkeletonStatStrip cells={5} />
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={2} rows={5} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={2} rows={4} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
          <SkeletonCard lines={3} />
        </div>
      </div>
    </div>
  )
}

/**
 * The panel under a reconciliation run's tab bar.
 *
 * Account results and Unmatched identities both open on a figure strip over a
 * register, so the strip is drawn here and the rows are left to the register
 * itself.
 */
export function RunPanelSkeleton({ tab }) {
  if (tab === 'rules') {
    return (
      <div className="stack">
        <SkeletonCard className="tr-skel-flush" foot><SkeletonTable rows={6} cols={5} /></SkeletonCard>
        <div className="detail-cols">
          <SkeletonCard><SkeletonForm fields={2} cols={1} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
        </div>
      </div>
    )
  }

  if (tab === 'summary') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonList rows={5} media="square" /></SkeletonCard>
          <SkeletonCard className="tr-skel-flush" foot><SkeletonTable rows={6} cols={5} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
        </div>
      </div>
    )
  }

  if (tab === 'identities') return <SkeletonStatStrip cells={3} />

  /* Account results: the five figures, then the rule chips applied to the run.
     The register under them settles its own rows. */
  return (
    <div className="stack">
      <SkeletonStatStrip cells={5} />
      <SkeletonCard lines={2} />
    </div>
  )
}
