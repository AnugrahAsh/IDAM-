/**
 * The register summary band, holding its place.
 *
 * `RegisterSummary` has no shape in the skeleton kit, and a stat-tile skeleton
 * is the wrong height to stand in for it — the kit's tile carries a chip row
 * this band does not, so swapping one for the other drops the register by ten
 * pixels when the figures land. This is built from the band's own `.rsum`
 * classes instead, with every bar set to the type it replaces, so the band is
 * already the height it will be.
 *
 * It lives here rather than beside `RegisterSummary` in components/workbench
 * only because this packet's page folders are what this pass may edit. The
 * announcement register imports it across folders for the same reason, the way
 * that page already reaches into settings for its taxonomy. A page that draws
 * the segmented arrangement needs the four `[data-skel]` rules in
 * UsefulLinksPage.css beside it — they carry the geometry the real rule gives
 * only to a `button`, and the stacking it does at phone width.
 *
 * All three arrangements the band takes are covered: the anchor alone, the
 * anchor beside figures of equal weight, and the anchor beside a segmented
 * filter with the figures compacted between them. Segment captions are left
 * out on purpose — `.rsum` stretches its children to the tallest, which is the
 * anchor in every arrangement, so a caption stand-in would add bars and no
 * height.
 */

/* Heights read off the tokens the real elements print at, the way
   styles/skeleton.css reads `.skel-stat-v` off the figure it stands in for. */
const LABEL_H = 'calc(var(--t-micro) * var(--t-body-lh))'
const VALUE_H = 'calc(var(--t-display) * 1.1)'
const SEG_VALUE_H = 'calc(var(--t-h1) * 1.15)'
const FACT_H = 'calc(var(--t-h2) * var(--t-body-lh))'
const CAPTION_H = 'calc(var(--t-xs) * var(--t-body-lh))'

/* `.skel` carries no display of its own, and every container in the kit gives
   its bars one. The band's containers are the real ones, which do not, so the
   bars say it themselves and the component needs no stylesheet to be correct. */
const bar = (width, height) => ({ display: 'block', width, height })

/* A compacted figure, which the real band gives a `dt` and a `dd` and this has
   to state for itself. The segment cells are not here: the real rule hands
   their geometry to a `button`, and they rearrange at phone width, which an
   inline style cannot follow — the page stylesheet carries those, keyed on the
   `data-skel` marks below. */
const FACT_CELL = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }

export default function SummarySkeleton({ facts = 0, segments = 0 }) {
  const plain = segments === 0

  return (
    <section className="rsum" data-plain={plain || undefined} aria-hidden="true">
      <div className="rsum-anchor" data-skel="true" style={{ cursor: 'default' }}>
        <span className="skel" style={bar(96, LABEL_H)} />
        <span className="skel" style={bar(62, VALUE_H)} />
        <span className="skel" style={bar(118, CAPTION_H)} />
      </div>

      {/* With no filter beside them the figures are panels in their own right;
          beside one they compact into a single strip, exactly as the real band
          rearranges them. */}
      {facts > 0 && (plain ? (
        <div className="rsum-stats">
          {Array.from({ length: facts }, (_, i) => (
            <div className="rsum-stat" key={i} data-skel="true">
              <span className="skel" style={bar(86 + (i % 2) * 24, LABEL_H)} />
              <span className="skel" style={bar(54, VALUE_H)} />
              <span className="skel" style={bar(104 + (i % 2) * 18, CAPTION_H)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rsum-facts" data-skel="true">
          {Array.from({ length: facts }, (_, i) => (
            <div key={i} style={FACT_CELL}>
              <span className="skel" style={bar(72 + (i % 2) * 18, LABEL_H)} />
              <span className="skel" style={bar(48, FACT_H)} />
            </div>
          ))}
        </div>
      ))}

      {segments > 0 && (
        <div className="rsum-seg">
          {Array.from({ length: segments }, (_, i) => (
            <div key={i} data-skel="true">
              <span className="skel" style={bar(74 + (i % 3) * 16, LABEL_H)} />
              <span className="skel" style={bar(44, SEG_VALUE_H)} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
