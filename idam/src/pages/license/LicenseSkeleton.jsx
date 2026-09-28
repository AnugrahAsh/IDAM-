import {
  Skeleton, SkeletonCard, SkeletonKeyValue, SkeletonPageBar, SkeletonTable, SkeletonText,
} from '../../components/primitives/Skeleton'

/**
 * The shape the License page holds its space with.
 *
 * Nothing on this page is a register, so almost none of it is a kit shape. The
 * five headline figures are `.kpi` tiles rather than `.scard` ones, the licence
 * record opens with a ring gauge, and the consumption rows are their own
 * three-track grid. All three are drawn from the real rules here, and each
 * states the line box its type prints, so the page does not drop when the
 * figures land.
 *
 * The page is one wait, not eight. Every figure on it is read off the same
 * licence file, and a screen whose seat count arrives before its term does
 * reads as eight separate requests for one answer.
 */

const bar = { display: 'block' }

/* `.k-label` and `.k-foot` are .703125rem; `.k-val` is 1.25rem at 1.1. */
const K_LABEL = 'calc(.703125rem * var(--t-body-lh))'
const K_VAL = 'calc(1.25rem * 1.1)'

/** The five headline figures — `.kpi-row` / `.kpi` geometry. */
function KpiRowSkeleton({ count = 5 }) {
  return (
    <div className="kpi-row cols-5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="kpi" key={i}>
          <span className="k-label" style={{ minHeight: K_LABEL }}>
            <span className="skel" style={{ ...bar, width: 78 + (i % 3) * 22, height: 8 }} />
          </span>
          <span className="k-val" style={{ minHeight: K_VAL }}>
            <span className="skel" style={{ ...bar, width: 64, height: 16 }} />
          </span>
          <span className="k-foot" style={{ minHeight: K_LABEL }}>
            <span className="skel" style={{ ...bar, width: 96 + (i % 2) * 24, height: 8 }} />
          </span>
        </div>
      ))}
    </div>
  )
}

/* One entitlement line — `.lic-cons` geometry: what is measured, the bar, and
   the pair of figures on the right. */
function ConsumptionRowSkeleton({ i = 0 }) {
  return (
    <div className="lic-cons">
      <div className="lic-cons-meta">
        <div className="lic-cons-k" style={{ display: 'flex', alignItems: 'center', minHeight: 'calc(var(--t-h3) * var(--t-h3-lh))' }}>
          <span className="skel" style={{ ...bar, width: 132 + (i % 3) * 26, height: 10 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 'calc(var(--t-xs) * var(--t-xs-lh))' }}>
          <span className="skel" style={{ ...bar, width: '76%', height: 8 }} />
        </div>
      </div>
      <div className="lic-cons-bar">
        <span className="skel" style={{ ...bar, width: '100%', height: 7, borderRadius: 'var(--r-pill)' }} />
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', minHeight: 'calc(var(--t-xs) * var(--t-xs-lh))' }}>
          <span className="skel" style={{ ...bar, width: '62%', height: 8 }} />
        </div>
      </div>
      <div className="lic-cons-val" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <span className="skel" style={{ ...bar, width: 74, height: 15 }} />
        <span className="skel" style={{ ...bar, width: 56, height: 8 }} />
      </div>
    </div>
  )
}

/** The whole page: masthead, headline figures, and the two columns beneath. */
export default function LicenseSkeleton({ banner = false }) {
  return (
    <Skeleton label="Loading the license">
      <SkeletonPageBar actions={4} crumbs={1} />
      {/* A banner is drawn only when one is going to be there — the licence in
          force already says whether it is expiring, and a placeholder for a
          warning that never appears would move the page as surely as a missing
          one would. */}
      {banner && <span className="skel" style={{ ...bar, width: '100%', height: 42, borderRadius: 'var(--r)', marginBottom: 10 }} />}

      <KpiRowSkeleton count={5} />

      <div className="lic-cols" style={{ marginTop: 10 }}>
        <div className="stack">
          <SkeletonCard head={false}>
            <div className="lic-id">
              <div className="row" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="skel skel-chip" style={{ ...bar, width: 72 }} />
                <span className="skel skel-chip" style={{ ...bar, width: 88 }} />
                <span className="skel skel-chip" style={{ ...bar, width: 92 }} />
              </div>
              {/* The gauge's own 148px box, kept round so the card below it
                  does not rise by a third of its height when it lands. */}
              <div className="lic-ring">
                <span className="skel" style={{ ...bar, width: 148, height: 148, borderRadius: '50%' }} />
              </div>
              <span className="skel" style={{ ...bar, width: 188, height: 11 }} />
              <div className="row" style={{ gap: 7, justifyContent: 'center', marginTop: 12 }}>
                <span className="skel skel-btn" style={{ ...bar, width: 112 }} />
                <span className="skel skel-btn" style={{ ...bar, width: 118 }} />
              </div>
            </div>
            <div className="lic-sec"><span className="skel" style={{ ...bar, width: 62, height: 7 }} /></div>
            <SkeletonKeyValue rows={4} cols={1} />
            <div className="lic-sec"><span className="skel" style={{ ...bar, width: 70, height: 7 }} /></div>
            <SkeletonKeyValue rows={3} cols={1} />
            <div className="lic-sec"><span className="skel" style={{ ...bar, width: 112, height: 7 }} /></div>
            <SkeletonKeyValue rows={6} cols={1} />
            <div className="lic-sec"><span className="skel" style={{ ...bar, width: 48, height: 7 }} /></div>
            <SkeletonKeyValue rows={4} cols={1} />
          </SkeletonCard>

          <SkeletonCard head><SkeletonText lines={8} /></SkeletonCard>
        </div>

        <div className="stack">
          <SkeletonCard head>
            <div className="stack" style={{ gap: 0 }}>
              {[0, 1, 2, 3].map((i) => <ConsumptionRowSkeleton key={i} i={i} />)}
            </div>
          </SkeletonCard>
          <SkeletonCard head foot><SkeletonTable rows={12} cols={3} /></SkeletonCard>
          <SkeletonCard head foot><SkeletonTable rows={2} cols={3} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}
