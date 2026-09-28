import './OrganizationsPage.css'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue,
  SkeletonList, SkeletonPageBar, SkeletonStats,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the Organizations screens hold their space with.
 *
 * Two of them are not in the kit because they are not kit shapes: a record's
 * tab strip, and the joined `.stat-strip` a record opens with. Both are drawn
 * from the real rules — `.tab` and `.stat-cell` — and both state the line box
 * the real type prints, because a bar has no text in it to set one and a strip
 * that comes up short moves everything under it when the record lands.
 *
 * Each export wraps itself in `Skeleton`. Composed together the outer one
 * announces and the inner ones fall silent, which is why a whole record can be
 * built out of the same pieces the panel alone is built from.
 */

/* `.tab`: 7px above, 8px below, a 2px indicator, and one line of body type. */
const TAB_H = 'calc(15px + var(--t-body) * var(--t-body-lh) + 2px)'
/* `.stat-k` is --t-xs; `.stat-v` is 1.125rem on the inherited line height. */
const STAT_K = 'calc(var(--t-xs) * var(--t-xs-lh))'
const STAT_V = 'calc(1.125rem * var(--t-body-lh))'

const bar = { display: 'block' }

/* The tab bar under a record's masthead. It keeps the real `.tabs` rule, so it
   carries the closing hairline the masthead gives up while it is a skeleton,
   and it bleeds to the canvas edges the way the header does. */
export function SkeletonRecordTabs({ tabs = 4, widths = [58, 74, 64, 52, 66] }) {
  return (
    <div className="tabs org-skel-tabs" aria-hidden="true">
      {Array.from({ length: tabs }, (_, i) => (
        <span className="tab" key={i} style={{ minHeight: TAB_H }}>
          <span className="skel" style={{ ...bar, width: 13, height: 13 }} />
          <span className="skel" style={{ ...bar, width: widths[i % widths.length], height: 9 }} />
        </span>
      ))}
    </div>
  )
}

/* The joined figure strip a record opens with — `.stat-strip` geometry. */
export function SkeletonStatStrip({ cells = 3 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ ...bar, width: 74 + (i % 3) * 18, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V, display: 'flex', alignItems: 'center' }}>
            <span className="skel" style={{ ...bar, width: 46, height: 15 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* A row of pills — the badge cluster a panel leads with. */
function Chips({ count = 3 }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="skel skel-chip" style={{ ...bar, width: 92 + (i % 3) * 30 }} />
      ))}
    </div>
  )
}

/** The register: masthead and the five posture figures above it. */
export function OrgListSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the organization register">
      <SkeletonPageBar actions={3} crumbs={1} />
      <SkeletonStats count={5} />
    </Skeleton>
  )
}

/**
 * The panel under the tab bar.
 *
 * Only the two card tabs are drawn here. Identities and Child organizations
 * are registers, and a register settles its own rows from the `loading` prop —
 * replacing its toolbar with a grey rectangle would take away the search the
 * operator was about to type into.
 */
export function OrgPanelSkeleton({ tab }) {
  if (tab === 'audit') {
    return (
      <Skeleton className="skel-head-type" label="Loading the audit trail">
        <div className="detail-cols">
          <SkeletonCard><SkeletonList rows={7} media="square" /></SkeletonCard>
          <div className="stack">
            <SkeletonCard><SkeletonKeyValue rows={7} cols={1} /></SkeletonCard>
            <SkeletonCard lines={4} />
          </div>
        </div>
      </Skeleton>
    )
  }

  return (
    <Skeleton className="skel-head-type" label="Loading the organization record">
      <div className="detail-cols">
        <div className="stack">
          <SkeletonStatStrip cells={3} />
          <SkeletonCard><SkeletonKeyValue rows={9} cols={2} /></SkeletonCard>
          <SkeletonCard>
            <div className="stack">
              <Chips count={3} />
              <SkeletonKeyValue rows={8} cols={2} />
            </div>
          </SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard lines={4} />
          <SkeletonCard><SkeletonList rows={4} media="square" /></SkeletonCard>
          <SkeletonCard><SkeletonList rows={1} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}

/** The whole record on arrival: masthead, tab strip and the panel beneath. */
export function OrgRecordSkeleton({ tab }) {
  return (
    <Skeleton className="skel-head-type" label="Loading the organization record">
      <SkeletonDetailHeader className="org-skel-head" facts={5} actions={4} />
      <SkeletonRecordTabs tabs={4} />
      <div className="detail-body">
        <OrgPanelSkeleton tab={tab} />
      </div>
    </Skeleton>
  )
}

/** The editor. Three field cards under the same masthead the record uses. */
export function OrgFormSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the organization">
      <SkeletonDetailHeader facts={0} actions={2} />
      <div className="detail-body">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}
