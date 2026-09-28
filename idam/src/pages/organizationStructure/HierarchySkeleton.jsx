import './HierarchyPage.css'
import {
  Skeleton, SkeletonCard, SkeletonKeyValue, SkeletonPageBar,
} from '../../components/primitives/Skeleton'

/**
 * The organization structure, holding its space.
 *
 * The kit has a shape for a register and a shape for a record, and this screen
 * is neither: it is a tree beside the unit that tree has selected. A stack of
 * even grey rows would settle into something with indent rails, connector ticks
 * and a root — which is to say the page would rearrange itself at the moment it
 * arrived, and the one thing a skeleton exists to prevent is that.
 *
 * So the tree here is drawn with `.otree`'s own classes and only the printed
 * parts — the name, the sub-line, the share bar and the count — are replaced by
 * bars. The indent and the guides are the real ones, at the real depths, so
 * what settles reads as a structure resolving rather than as a list becoming a
 * tree. The row heights come from HierarchyPage.css, which states the line box
 * the real row prints, because bars set no line box of their own.
 */

/* The shape the tree opens at: the tenant root, its organizations expanded one
   level, and the root's own units below them. It matches the default `open`
   set in HierarchyPage — the root plus every organization under it — so the
   skeleton holds the number of rows that are actually about to appear. */
const TREE = [
  { w: 38, sub: 26, kids: [{ w: 31 }, { w: 45 }, { w: 34 }] },
  { w: 44, sub: 24, kids: [{ w: 37 }, { w: 29 }] },
  { w: 33, sub: 28, kids: [{ w: 41 }, { w: 32 }] },
  { w: 30 },
  { w: 39 },
]

function TreeRow({ w = 38, sub = 27 }) {
  return (
    <div className="otree-row">
      {/* The chevron column is held open rather than drawn: a bar there would
          read as a control, and half the rows in the real tree have none. */}
      <span className="ot-chev" />
      <span className="skel hy-skel-ic" />
      <span className="ot-id">
        <span className="skel" style={{ width: `${w}%`, height: 9 }} />
        <span className="skel" style={{ width: `${sub}%`, height: 7 }} />
      </span>
      <span className="skel hy-skel-share" />
      <span className="skel hy-skel-count" />
    </div>
  )
}

function TreeBranch({ node }) {
  return (
    <div className="otree-node">
      <TreeRow w={node.w} sub={node.sub} />
      {node.kids && (
        <div className="otree-kids">
          {node.kids.map((k, i) => <TreeBranch key={i} node={k} />)}
        </div>
      )}
    </div>
  )
}

/* The joined figure pair the record opens with — `.stat-strip` geometry. The
   first cell prints a caption under its figure and the second does not, so the
   two are drawn separately rather than repeated. */
function StatStrip() {
  const k = { minHeight: 'calc(var(--t-xs) * var(--t-xs-lh))', display: 'flex', alignItems: 'center' }
  const v = { minHeight: 'calc(1.125rem * var(--t-body-lh))', display: 'flex', alignItems: 'center' }
  return (
    <div className="stat-strip">
      <div className="stat-cell">
        <span className="stat-k" style={k}><span className="skel" style={{ width: 48, height: 8 }} /></span>
        <span className="stat-v" style={v}><span className="skel" style={{ width: 52, height: 15 }} /></span>
        <span style={{ minHeight: 'calc(var(--t-xs) * var(--t-xs-lh))', display: 'flex', alignItems: 'center' }}>
          <span className="skel" style={{ width: 132, height: 7 }} />
        </span>
      </div>
      <div className="stat-cell">
        <span className="stat-k" style={k}><span className="skel" style={{ width: 66, height: 8 }} /></span>
        <span className="stat-v" style={v}><span className="skel" style={{ width: 34, height: 15 }} /></span>
      </div>
    </div>
  )
}

/* One relationship: a micro caption over a bordered box. The box is the real
   `.hier-rel-row button`, so its padding and rule are the ones that land. */
function RelRow({ kind, label = 62, rows = 1 }) {
  return (
    <div className="hier-rel-row" data-kind={kind}>
      <span className="hier-rel-k" style={{ minHeight: 'calc(var(--t-micro) * var(--t-body-lh))', display: 'flex', alignItems: 'center' }}>
        <span className="skel" style={{ width: label, height: 7 }} />
      </span>
      {Array.from({ length: rows }, (_, i) => (
        /* `.hier-rel-self` would be the closer match for padding, but it also
           carries the accent fill that marks the unit you are reading. While
           the panel is a skeleton nothing in it is selected, so the box is
           drawn neutral. */
        <span className="hy-skel-relbox" key={i} style={{ minHeight: 'calc(var(--t-sm) * var(--t-sm-lh))' }}>
          <span className="skel" style={{ width: 13, height: 13, borderRadius: 'var(--r-xs)' }} />
          <span className="skel" style={{ width: `${34 + (i % 3) * 12}%`, height: 9 }} />
          <span className="skel" style={{ width: 24, height: 8, marginLeft: 'auto' }} />
        </span>
      ))}
    </div>
  )
}

/* A row of the "Open from here" list — `.hier-cfg-links button` geometry. */
function LinkRow() {
  return (
    <span className="hy-skel-link">
      <span className="skel" />
      <span className="hy-skel-link-m">
        <span className="skel" style={{ width: '38%', height: 9 }} />
        <span className="skel" style={{ width: '72%', height: 7 }} />
      </span>
      <span className="skel" style={{ width: 13, height: 13 }} />
    </span>
  )
}

export default function HierarchySkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the organization structure">
      <SkeletonPageBar className="hy-skel-bar" actions={1} crumbs={2} />
      {/* The five readings under the title. They are part of the masthead, so
          they sit in the bar's gutters rather than in the canvas. */}
      <div className="hy-skel-rail" aria-hidden="true">
        {[52, 78, 46, 44, 62].map((w, i) => (
          <span key={i}>
            <span className="skel" style={{ width: 12, height: 12, borderRadius: 'var(--r-xs)' }} />
            <span className="skel" style={{ width: w, height: 8 }} />
            <span className="skel" style={{ width: 28 + (i % 3) * 26, height: 9 }} />
          </span>
        ))}
      </div>

      <div className="grid grid-side">
        {/* The tree card is flush: the toolbar and `.otree` carry their own
            padding, as they do on the real panel. */}
        <SkeletonCard className="hy-skel-flush" foot>
          <div className="wb-bar tree-bar hy-skel-toolbar">
            <span className="skel" style={{ flex: '0 1 300px', minWidth: 230 }} />
            <span className="spacer" />
            <span className="skel" style={{ width: 128 }} />
            <span className="skel" style={{ width: 88 }} />
          </div>
          <div className="otree hy-skel-tree">
            <TreeBranch node={{ w: 34, sub: 22, kids: TREE }} />
          </div>
        </SkeletonCard>

        <div className="stack">
          <SkeletonCard>
            <div className="stack">
              <StatStrip />
              <SkeletonKeyValue rows={5} cols={1} />
            </div>
          </SkeletonCard>

          <SkeletonCard className="hy-skel-flush">
            <div className="hier-rel">
              <RelRow kind="parent" label={44} />
              <RelRow kind="self" label={62} />
              <RelRow kind="children" label={78} rows={3} />
            </div>
          </SkeletonCard>

          <SkeletonCard className="hy-skel-flush">
            <div className="hy-skel-links">
              <LinkRow />
              <LinkRow />
            </div>
          </SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}
