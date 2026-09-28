import './DashboardPage.css'
import { Skeleton, SkeletonCard, SkeletonPageBar } from '../../components/primitives/Skeleton'

/**
 * The dashboard's own skeleton.
 *
 * The kit covers registers and record cards, and neither is what this screen
 * is: it is six headline tiles and eight charts, and a chart is the shape a
 * generic skeleton gets most wrong. Three grey lines where a 190px plot is
 * about to land drop everything below them by most of that height the moment
 * the series arrives, and on the first screen of the console that reads as the
 * page breaking rather than as the page arriving.
 *
 * So the blocks here are drawn at the sizes the real thing is rendered at —
 * the `h` given to each chart in DashboardPage, the gauge's `size`, the tile's
 * padding and mark — and they reuse the page's own grid classes so the
 * skeleton reflows at the widths the dashboard reflows at.
 */

/* A plot. The chart's own `h` is stated at each call site so the two are
   edited together — but it is handed over as the block's ratio, not as its
   height: `AreaChart` and `BarChart` are both 760-wide viewBoxes drawn
   `width:100%;height:auto`, so what lands is the column width times h/760 and
   never `h` itself. See `.dash-skel-plot`. */
const Plot = ({ h }) => <span className="skel dash-skel-plot" style={{ '--plot-h': h }} />

/* A sub-head inside a panel — `.dash-sub-h`. `lead` is the variant that sits
   directly under a card header rather than between two blocks. */
const SubHead = ({ lead }) => <span className="skel dash-skel-sub-h" data-lead={lead || undefined} />

/* The figure strip: a caption over a number, repeated across the panel. */
function Figures({ count = 5 }) {
  return (
    <div className="dash-skel-figs" data-cols={count === 3 ? '3' : undefined}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>
          <span className="skel" style={{ width: `${62 + (i % 3) * 12}%`, height: 7 }} />
          <span className="skel" style={{ width: 44, height: 15 }} />
        </span>
      ))}
    </div>
  )
}

/* Label, bar, value — the three columns of `.meter-row`. */
function Meters({ rows = 4, lead }) {
  return (
    <div className="dash-skel-meters" data-lead={lead || undefined}>
      {Array.from({ length: rows }, (_, i) => (
        <span className="dash-skel-meter" key={i}>
          <span className="skel" style={{ width: `${54 + (i % 4) * 14}%` }} />
          <span className="skel" />
          <span className="skel" />
        </span>
      ))}
    </div>
  )
}

function Tile() {
  return (
    <span className="dash-skel-tile">
      <span className="skel" />
      {/* The label and the footnote under the figure. Their heights are the
          line boxes `.dash-tile-k` and `.dash-tile-s` print and live in the
          stylesheet beside the figure's, so all three are read off the same
          tokens. */}
      <span className="dash-skel-tile-m">
        <span className="skel dash-skel-fig" style={{ width: 72 }} />
        <span className="skel dash-skel-cap" style={{ width: '54%' }} />
        <span className="skel dash-skel-cap" style={{ width: '82%' }} />
      </span>
    </span>
  )
}

export default function DashboardSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the dashboard">
      <SkeletonPageBar actions={3} crumbs={1} />

      {/* Same grid as the real strip, so the tiles step 6 → 3 → 2 → 1 with it. */}
      <div className="dash-tiles">
        {Array.from({ length: 6 }, (_, i) => <Tile key={i} />)}
      </div>

      <div className="grid-23 dash-row">
        <SkeletonCard>
          <Figures count={5} />
          {/* AreaChart h=190, then the failed-attempts BarChart at h=110. */}
          <Plot h={190} />
          <SubHead />
          <Plot h={110} />
        </SkeletonCard>

        <SkeletonCard>
          <div className="dash-skel-posture">
            {/* RingGauge size=116 */}
            <span className="skel dash-skel-ring" />
            <span className="dash-skel-posture-m">
              <span className="skel" style={{ width: '46%', height: 9 }} />
              <span className="skel dash-skel-seg" />
              <span className="skel" style={{ width: '78%', height: 8 }} />
            </span>
          </div>
          <Meters rows={5} lead />
        </SkeletonCard>
      </div>

      <div className="grid-32 dash-row">
        {/* Insights is a flush card: the rows carry the padding, as they do on
            the real panel, so the body must not carry it too. */}
        <SkeletonCard className="dash-skel-flush">
          <div className="dash-skel-insights">
            {Array.from({ length: 5 }, (_, i) => (
              <span className="dash-skel-insight" key={i}>
                <span className="skel" />
                <span className="dash-skel-rowm">
                  <span className="skel" style={{ width: `${44 + (i % 3) * 13}%`, height: 10 }} />
                  <span className="skel" style={{ width: '92%', height: 8 }} />
                </span>
              </span>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <div className="dash-skel-gov">
            {Array.from({ length: 4 }, (_, i) => (
              <section key={i}>
                <SubHead lead />
                <Meters rows={i === 3 ? 3 : 4} />
              </section>
            ))}
          </div>
        </SkeletonCard>
      </div>

      <div className="dash-cols dash-row">
        <SkeletonCard>
          <span className="skel dash-skel-seg" style={{ display: 'block' }} />
          <SubHead />
          <Meters rows={4} />
        </SkeletonCard>

        <SkeletonCard className="dash-skel-flush">
          <div className="dash-skel-apps">
            {Array.from({ length: 6 }, (_, i) => (
              <span className="dash-skel-app" key={i}>
                <span className="skel" />
                <span className="dash-skel-rowm">
                  <span className="skel" style={{ width: `${40 + (i % 3) * 15}%`, height: 9 }} />
                  <span className="skel" style={{ width: '62%', height: 7 }} />
                </span>
                <span className="skel skel-chip" style={{ width: 62 }} />
              </span>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <SubHead lead />
          <Figures count={3} />
          <SubHead />
          <Meters rows={1} />
          <SubHead />
          <span className="skel" style={{ display: 'block', width: '62%', height: 8 }} />
        </SkeletonCard>
      </div>
    </Skeleton>
  )
}
