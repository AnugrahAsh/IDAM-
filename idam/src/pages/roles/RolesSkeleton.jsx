import './RolesPage.css'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue,
  SkeletonList, SkeletonPageBar,
} from '../../components/primitives/Skeleton'
import { SkeletonRecordTabs, SkeletonStatStrip } from '../organizations/OrganizationsSkeleton'

/**
 * The shapes the Roles screens hold their space with.
 *
 * The catalog is not a register — it is a four-figure strip over a grid of
 * cards with their own rule, `.rl-card`, which the kit's record tile is the
 * wrong proportion for. The record is a masthead over the permission picker,
 * and the picker is the tallest single block in the console: three columns at a
 * stated 560px. Neither is guessed at here. Both are built from the real
 * classes in RolesPage.css, so the padding, the rules and the column widths are
 * the ones that land, and the bars only stand in for the type.
 *
 * Where a real panel prints text, the bar it is replaced by states the line box
 * that type sets. A bar has no line height of its own, and a block of them that
 * ignores this comes up short everywhere at once.
 */

const bar = { display: 'block' }

/* `.rl-metric` prints a caption, a 1.75rem figure at line-height 1.1, and a
   .625rem detail line at 1.5. The figure steps down to 1.5625rem on a phone,
   which a fixed inline height could not follow — so it is a class. */
const M_LABEL = 'calc(.6875rem * var(--t-body-lh))'
const M_DETAIL = 'calc(.625rem * 1.5)'
/* `.rl-card`: the name at 1rem/1.4, the description at .75rem/1.65, and the
   fact figures at 1.3125rem. */
const C_TITLE = 'calc(1rem * 1.4)'
const C_FACT = 'calc(1.3125rem * var(--t-body-lh))'

const line = (h) => ({ minHeight: h, display: 'flex', alignItems: 'center' })

/** The four joined figures above the catalog — `.rl-summary` geometry. */
function Metrics() {
  return (
    <div className="rl-summary">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="rl-metric" key={i}>
          <div className="rl-metric-label" style={{ minHeight: M_LABEL }}>
            <span className="skel" style={{ ...bar, width: 62 + (i % 3) * 22, height: 8 }} />
            <span className="skel" style={{ ...bar, width: 16, height: 16, borderRadius: 'var(--r-xs)' }} />
          </div>
          <span className="rl-skel-v">
            <span className="skel" style={{ ...bar, width: 54 + (i % 2) * 18, height: 22 }} />
          </span>
          <span style={line(M_DETAIL)}>
            <span className="skel" style={{ ...bar, width: `${58 + (i % 3) * 14}%`, height: 7 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* One catalog card. `.rl-description` is the flexing element on the real card,
   so the three in a row stay level however long the copy is; two bars of body
   type is what the seed actually prints. */
function RoleCard({ i = 0 }) {
  return (
    <article className="rl-card">
      <div className="rl-card-top">
        <span className="skel" style={{ width: 40, height: 40, borderRadius: 'var(--r-lg)' }} />
        <span className="skel" style={{ width: 78 + (i % 2) * 12, height: 19, borderRadius: 'var(--r)' }} />
      </div>
      <span style={line(C_TITLE)}>
        <span className="skel" style={{ ...bar, width: `${46 + (i % 3) * 15}%`, height: 11 }} />
      </span>
      {/* Matches `.rl-description`'s own 8px / 24px margins and its flex:1. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, margin: '8px 0 24px' }}>
        <span className="skel" style={{ ...bar, width: '100%', height: 8 }} />
        <span className="skel" style={{ ...bar, width: `${62 + (i % 3) * 11}%`, height: 8 }} />
      </div>
      <dl className="rl-facts">
        {[0, 1].map((f) => (
          <div key={f}>
            <dt style={{ marginBottom: 8, minHeight: 'calc(.625rem * var(--t-body-lh))' }}>
              <span className="skel" style={{ ...bar, width: 58, height: 7 }} />
            </dt>
            <dd style={line(C_FACT)}>
              <span className="skel" style={{ ...bar, width: 34 + f * 10, height: 16 }} />
            </dd>
          </div>
        ))}
      </dl>
      <footer className="rl-card-footer">
        <span className="skel skel-btn" style={{ width: 88 }} />
        <span className="skel skel-btn" style={{ width: 72 }} />
      </footer>
    </article>
  )
}

/** The catalog: masthead, the four figures, and the card grid. */
export function RoleListSkeleton() {
  return (
    <div className="rl-workspace">
      <Skeleton className="skel-head-type" label="Loading the role catalog">
        {/* RoleList gives PageBar no `crumbs`, so the trail is Home / Roles. */}
        <SkeletonPageBar actions={1} crumbs={1} />
        <Metrics />
        <section className="rl-catalog">
          <div className="rl-section-head">
            <div>
              <span style={line('calc(1.0625rem * var(--t-body-lh))')}>
                <span className="skel" style={{ ...bar, width: 148, height: 13 }} />
              </span>
              <span style={{ ...line('calc(.75rem * 1.5)'), marginTop: 6 }}>
                <span className="skel" style={{ ...bar, width: 318, height: 8 }} />
              </span>
            </div>
            <span className="skel" style={{ width: 168, height: 9 }} />
          </div>
          <div className="rl-grid">
            {Array.from({ length: 6 }, (_, i) => <RoleCard key={i} i={i} />)}
          </div>
          <p className="rl-note" style={{ minHeight: 'calc(.625rem * var(--t-body-lh))' }}>
            <span className="skel" style={{ ...bar, width: 262, height: 7 }} />
          </p>
        </section>
      </Skeleton>
    </div>
  )
}

/**
 * The permission picker.
 *
 * Three columns at the heights RoleDetail asks for — the module rail is capped
 * at 560 and the checklist beside it at 560 + 76, exactly as the real call
 * site states them. This is the block the whole record is sized by: getting it
 * wrong moves the sticky action bar and everything above it.
 */
function PickerSkeleton({ maxHeight = 560 }) {
  return (
    <div className="pp">
      <aside className="pp-mods">
        <span className="skel pp-search" style={{ ...bar, height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
        <div className="pp-mod-list" style={{ maxHeight, overflow: 'hidden' }}>
          {Array.from({ length: 18 }, (_, i) => (
            <span className="pp-mod" key={i} style={{ minHeight: 'calc(12px + var(--t-sm) * var(--t-body-lh))' }}>
              <span className="skel pp-mod-name" style={{ ...bar, width: `${50 + (i % 4) * 12}%`, height: 8 }} />
              <span className="skel" style={{ ...bar, width: 30, height: 8 }} />
            </span>
          ))}
        </div>
        <div className="pp-mods-foot" style={{ minHeight: 'calc(var(--t-xs) * var(--t-xs-lh))' }}>
          <span className="skel" style={{ ...bar, width: '72%', height: 7 }} />
        </div>
      </aside>

      <section className="pp-main" style={{ maxHeight: maxHeight + 76, overflow: 'hidden' }}>
        <div className="pp-head">
          <div className="pp-head-m">
            <span style={line('calc(var(--t-h3) * var(--t-h3-lh))')}>
              <span className="skel" style={{ ...bar, width: 178, height: 13 }} />
            </span>
            <span style={{ ...line('calc(var(--t-xs) * var(--t-xs-lh))'), marginTop: 3 }}>
              <span className="skel" style={{ ...bar, width: '62%', height: 8 }} />
            </span>
            <span style={{ ...line('calc(var(--t-sm) * var(--t-sm-lh))'), marginTop: 2 }}>
              <span className="skel" style={{ ...bar, width: 146, height: 8 }} />
            </span>
          </div>
          <div className="pp-head-a">
            <span className="skel skel-btn" style={{ width: 74 }} />
            <span className="skel skel-btn" style={{ width: 82 }} />
          </div>
        </div>
        <div className="pp-perm-scroll">
          {[4, 6, 4].map((n, g) => (
            <div key={g}>
              <div className="pp-group-t" style={{ minHeight: 'calc(var(--t-micro) * var(--t-body-lh))' }}>
                <span className="skel" style={{ ...bar, width: 92, height: 7 }} />
              </div>
              <div className="pp-perms">
                {Array.from({ length: n }, (_, i) => (
                  <span className="pp-perm" key={i} style={{ minHeight: 'calc(12px + var(--t-sm) * 1.35)' }}>
                    <span className="skel" style={{ width: 14, height: 14, borderRadius: 'var(--r-xs)' }} />
                    <span className="skel pp-perm-t" style={{ ...bar, width: `${52 + (i % 4) * 11}%`, height: 8 }} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pp-sum">
        <span className="skel pp-sum-h" style={{ ...bar, width: 104, height: 7 }} />
        <div className="pp-sum-total">
          <span className="skel" style={{ ...bar, width: 84, height: 9 }} />
          <span className="skel" style={{ ...bar, width: 46, height: 9 }} />
        </div>
        <div className="pp-sum-facts">
          {[0, 1, 2].map((i) => (
            <span key={i}><span className="skel" style={{ ...bar, width: `${62 - i * 9}%`, height: 7 }} /></span>
          ))}
        </div>
        <div className="pp-sum-list">
          {Array.from({ length: 7 }, (_, i) => (
            <span className="pp-sum-mod" key={i} style={{ minHeight: 'calc(10px + var(--t-sm) * var(--t-body-lh))' }}>
              <span className="skel" style={{ ...bar, width: `${54 + (i % 3) * 13}%`, height: 8 }} />
              <span className="skel" style={{ ...bar, width: 26, height: 8 }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * The panel under the record's tab strip.
 *
 * Members is a register and settles its own rows from `loading`, so it is not
 * drawn here — replacing its toolbar with a rectangle would take away the
 * search the operator was about to type into.
 *
 * The two conditional banners on the permissions tab are left out on purpose.
 * A system role shows one, a write-capable custom role shows another, and most
 * roles show neither; space held for a banner that never arrives moves the
 * picker up the moment the record lands, which is the fault this is here to
 * prevent.
 */
export function RolePanelSkeleton({ tab = 'permissions' }) {
  if (tab === 'rules') {
    return (
      <Skeleton className="skel-head-type" label="Loading the assignment rules">
        <div className="stack">
          <SkeletonCard><SkeletonList rows={4} media="square" /></SkeletonCard>
          <SkeletonCard><SkeletonList rows={3} media={false} /></SkeletonCard>
          <div className="detail-cols">
            <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
            <SkeletonCard><SkeletonList rows={3} media="square" /></SkeletonCard>
          </div>
        </div>
      </Skeleton>
    )
  }

  if (tab === 'activity') {
    return (
      <Skeleton className="skel-head-type" label="Loading the role activity">
        <div className="detail-cols">
          <SkeletonCard><SkeletonList rows={8} media="square" /></SkeletonCard>
          <div className="stack">
            <SkeletonCard><SkeletonKeyValue rows={5} cols={1} /></SkeletonCard>
            <SkeletonCard lines={3} />
          </div>
        </div>
      </Skeleton>
    )
  }

  return (
    <Skeleton className="skel-head-type" label="Loading the role permissions">
      <div className="stack">
        <SkeletonStatStrip cells={4} />
        <PickerSkeleton maxHeight={560} />
      </div>
    </Skeleton>
  )
}

/** The whole record on arrival: masthead, tab strip and the panel beneath. */
export function RoleRecordSkeleton({ tab = 'permissions' }) {
  return (
    <Skeleton className="skel-head-type" label="Loading the role">
      <SkeletonDetailHeader facts={4} actions={3} />
      <SkeletonRecordTabs tabs={4} />
      <div className="detail-body">
        <RolePanelSkeleton tab={tab} />
      </div>
    </Skeleton>
  )
}

/** The editor, under the same masthead the record uses. */
export function RoleFormSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the role">
      <SkeletonDetailHeader facts={0} actions={2} />
      <div className="detail-body">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}
