import './GroupsPage.css'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue,
  SkeletonPageBar, SkeletonTable,
} from '../../components/primitives/Skeleton'
import { SkeletonRecordTabs } from '../organizations/OrganizationsSkeleton'
import SummarySkeleton from '../quickLinks/SummarySkeleton'

/**
 * The shapes the Groups screens hold their space with.
 *
 * The register's headline is `RegisterSummary`, not `StatCards`, so the kit's
 * stat shape is the wrong one: an anchor panel and a connected segmented filter
 * are one row of three boxes, not a grid of four tiles. The console has one
 * drawing of that band — quickLinks/SummarySkeleton — and this page uses it
 * rather than keeping a second. The second one had drifted from the rule in
 * three places: it printed the segment figures at the anchor's --t-display
 * when `.rsum-seg-v` is --t-h1 at 1.15, it kept a caption bar that
 * `.rsum-seg-s` hides below 900px, and it gave the segment cells their
 * geometry in inline styles, which cannot follow the column-to-row flip
 * `.rsum-seg button` does below 560px. The `[data-skel]` rules that carry that
 * geometry sit in GroupsPage.css beside this, because a page stylesheet ships
 * with its own route chunk and UsefulLinksPage.css is not on this route.
 *
 * `SkeletonRegister` is the other shape the kit does not carry. A register that
 * is already mounted settles its own rows — `DataWorkbench` takes `loading` and
 * keeps its toolbar, which is the right behaviour when only the panel is
 * changing. But a record arriving on a register tab has no workbench mounted
 * yet, and something has to hold that space; this is that something.
 */

const bar = { display: 'block' }
const line = (h) => ({ minHeight: h, display: 'flex', alignItems: 'center' })

/* The micro caption and the --t-xs line the record panels print. */
const R_K = 'calc(var(--t-micro) * var(--t-body-lh))'
const R_C = 'calc(var(--t-xs) * var(--t-xs-lh))'

/**
 * A register that has not mounted yet — `.wb` geometry: the control bar, the
 * rows, the footer. Only for a record arriving straight onto a register tab.
 * Once the workbench is on screen it settles its own rows and keeps its
 * toolbar, because a search box that disappears for a moment is worse than a
 * search box over rows that have not arrived.
 */
export function SkeletonRegister({ rows = 8, cols = 6, controls = 3 }) {
  return (
    <div className="wb" aria-hidden="true">
      <div className="wb-bar">
        <span className="skel" style={{ ...bar, flex: '0 1 300px', minWidth: 230, height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
        <span className="spacer" />
        {Array.from({ length: controls }, (_, i) => (
          <span key={i} className="skel" style={{ ...bar, width: 72 + (i % 3) * 24, height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
        ))}
      </div>
      <div className="wb-scroll"><SkeletonTable rows={rows} cols={cols} /></div>
      <div className="wb-foot">
        <span className="skel" style={{ ...bar, width: 148, height: 8 }} />
        <span className="spacer" />
        <span className="skel" style={{ ...bar, width: 96, height: 8 }} />
      </div>
    </div>
  )
}

/** The register: masthead and the summary row above the rows. */
export function GroupListSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the group register">
      <SkeletonPageBar actions={4} crumbs={1} />
      {/* The anchor, the two compacted figures, and the three kind segments. */}
      <SummarySkeleton facts={2} segments={3} />
    </Skeleton>
  )
}

/**
 * The panel under a record's tab strip.
 *
 * The conditional banners each tab can carry — external federation, an empty
 * group, a degraded connector, a disabled SSO application — are left out. Most
 * records show none of them, and space held for a banner that never arrives
 * moves everything under it the moment the record lands.
 */
export function GroupPanelSkeleton({ tab = 'information' }) {
  if (tab === 'members' || tab === 'activity') {
    return (
      <Skeleton className="skel-head-type" label={tab === 'members' ? 'Loading the members' : 'Loading the membership history'}>
        <SkeletonRegister rows={8} cols={6} />
      </Skeleton>
    )
  }

  if (tab === 'schedule') {
    return (
      <Skeleton className="skel-head-type" label="Loading the scheduled access">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={4} cols={2} /></SkeletonCard>
          <SkeletonRegister rows={6} cols={6} controls={1} />
        </div>
      </Skeleton>
    )
  }

  if (tab === 'sod') {
    return (
      <Skeleton className="skel-head-type" label="Loading the duty conflicts">
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue rows={6} cols={2} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue rows={6} cols={2} /></SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  return (
    <Skeleton className="skel-head-type" label="Loading the group record">
      <div className="detail-cols">
        <div className="stack">
          {/* Definition prints thirteen readings in two columns; the target
              binding block is shorter. */}
          <SkeletonCard><SkeletonKeyValue rows={13} cols={2} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue rows={5} cols={2} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard>
            <span style={line('calc(var(--t-display) * var(--t-display-lh))')}>
              <span className="skel" style={{ ...bar, width: 76, height: 20 }} />
            </span>
            {/* `.meter` is 5px; the real card gives it 10px of clearance. */}
            <span className="skel" style={{ ...bar, height: 5, borderRadius: 'var(--r-pill)', marginTop: 10 }} />
            <span className="row" style={{ justifyContent: 'space-between', marginTop: 7, ...line(R_C) }}>
              <span className="skel" style={{ ...bar, width: 132, height: 7 }} />
              <span className="skel" style={{ ...bar, width: 118, height: 7 }} />
            </span>
            <span style={{ display: 'block', marginTop: 14 }}>
              <span style={{ ...line(R_K), marginBottom: 7 }}>
                <span className="skel" style={{ ...bar, width: 146, height: 7 }} />
              </span>
              <span style={line(R_C)}><span className="skel" style={{ ...bar, width: 168, height: 7 }} /></span>
            </span>
          </SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}

/** The whole record on arrival: masthead, tab strip and the panel beneath. */
export function GroupRecordSkeleton({ tab = 'information' }) {
  return (
    <Skeleton className="skel-head-type" label="Loading the group">
      <SkeletonDetailHeader facts={4} actions={4} />
      <SkeletonRecordTabs tabs={5} />
      <div className="detail-body">
        <GroupPanelSkeleton tab={tab} />
      </div>
    </Skeleton>
  )
}

/**
 * The editor, waiting on the group it edits.
 *
 * GroupForm opens under a `DetailHeader`, not a page masthead, and lays the
 * definition out beside a live preview — so this holds that shape rather than
 * the register's.
 */
export function GroupFormSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the group">
      <SkeletonDetailHeader facts={0} actions={0} />
      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            <SkeletonCard><SkeletonForm fields={5} cols={1} actions={false} /></SkeletonCard>
          </div>
          <div className="stack">
            <SkeletonCard lines={4} />
            <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
          </div>
        </div>
      </div>
    </Skeleton>
  )
}
