import './PoliciesPage.css'
import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm, SkeletonKeyValue,
  SkeletonList, SkeletonPageBar, SkeletonText,
} from '../../components/primitives/Skeleton'
import { SkeletonRecordTabs, SkeletonStatStrip } from '../organizations/OrganizationsSkeleton'
import { SkeletonRegister } from '../groups/GroupsSkeleton'

/**
 * The shapes the Dynamic Policy screens hold their space with.
 *
 * The register is a kit screen — stat tiles over a workbench — so it is built
 * from the kit. The record is not: the condition tab is the studio, two equal
 * cards side by side with the evaluation panel across the full width beneath
 * them, and that is a layout the kit has no shape for. It is drawn here from
 * `.cstudio`'s own rule so the two columns and the panel under them break at
 * the widths the real studio breaks at.
 */

const bar = { display: 'block' }
const line = (h) => ({ minHeight: h, display: 'flex', alignItems: 'center' })

export { SkeletonStatStrip }

/**
 * The register's masthead.
 *
 * Only the masthead: the four tiles live inside the page's `.stack`, between
 * the bar and the rows, and `.scards` carries a bottom margin of its own on top
 * of the stack's gap. Holding their space from out here would leave the rows
 * one gap too high and drop them when the register landed, so PolicyList puts
 * `SkeletonStats` in the tiles' own place instead.
 */
export function PolicyListSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the policy register">
      {/* Home / Groups / Dynamic Policy, and two masthead buttons. */}
      <SkeletonPageBar actions={2} crumbs={2} />
    </Skeleton>
  )
}

/* One predicate row inside the builder — a conjunction, an attribute, an
   operator and a value, which is what a condition row prints. */
function RuleRow({ i = 0 }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span className="skel" style={{ width: 40, height: 8, flex: 'none' }} />
      <span className="skel" style={{ flex: '1 1 0', minWidth: 0, height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
      <span className="skel" style={{ width: 92, height: '1.8125rem', borderRadius: 'var(--r-sm)', flex: 'none' }} />
      <span className="skel" style={{ flex: '1 1 0', minWidth: 0, height: '1.8125rem', borderRadius: 'var(--r-sm)' }} />
      <span className="skel" style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', flex: 'none' }} />
    </span>
  )
}

/* The evaluation panel under the pair: a headline count, then the steps the
   condition resolves through. `.ev-step` is a four-column grid at a 22px row. */
function EvaluationShape() {
  return (
    <div className="ev" data-split>
      <div className="ev-summary">
        <span style={line('calc(var(--t-display) * var(--t-display-lh))')}>
          <span className="skel" style={{ ...bar, width: 84, height: 20 }} />
        </span>
        <SkeletonText lines={2} />
        <div className="ev-result">
          <span style={line('calc(var(--t-sm) * var(--t-sm-lh))')}>
            <span className="skel" style={{ ...bar, width: '68%', height: 8 }} />
          </span>
        </div>
      </div>
      <div className="ev-section">
        <span className="ev-section-h" style={line('calc(var(--t-micro) * var(--t-body-lh))')}>
          <span className="skel" style={{ ...bar, width: 104, height: 7 }} />
        </span>
        <div className="ev-group">
          <div className="ev-group-h" style={line('calc(var(--t-xs) * var(--t-xs-lh))')}>
            <span className="skel" style={{ ...bar, width: 88, height: 7 }} />
          </div>
          {[0, 1, 2].map((i) => (
            <span className="ev-step" key={i}>
              <span className="skel" style={{ width: 32, height: 7 }} />
              <span className="skel" style={{ width: `${64 + (i % 3) * 11}%`, height: 8 }} />
              <span className="skel" style={{ width: 38, height: 8, marginLeft: 'auto' }} />
              <span className="skel" style={{ width: 18, height: 8 }} />
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
 * On a tab change, simulation and history are not drawn from here: both are a
 * figure strip over a register, and both keep their own chrome and settle their
 * own rows, because the dry-run controls are a form the operator sets before
 * running anything and covering them takes the control away rather than holds
 * its space.
 *
 * They are drawn here for the other case — a reload or a deep link straight to
 * `/…/simulation`, where nothing is mounted yet and something has to hold the
 * panel. PolicyDetail asks for that one through PolicyRecordSkeleton.
 */
export function PolicyPanelSkeleton({ tab = 'overview' }) {
  if (tab === 'simulation') {
    return (
      <Skeleton className="skel-head-type" label="Loading the dry run">
        <div className="stack">
          {/* The controls and the figures are one card on the real tab. */}
          <SkeletonCard>
            <div className="stack">
              <SkeletonForm fields={2} cols={2} actions={false} />
              <SkeletonStatStrip cells={4} />
            </div>
          </SkeletonCard>
          <SkeletonRegister rows={8} cols={6} controls={1} />
        </div>
      </Skeleton>
    )
  }

  if (tab === 'history') {
    return (
      <Skeleton className="skel-head-type" label="Loading the run history">
        <div className="stack">
          <SkeletonStatStrip cells={4} />
          <SkeletonRegister rows={8} cols={6} controls={1} />
        </div>
      </Skeleton>
    )
  }

  if (tab === 'condition') {
    return (
      <Skeleton className="skel-head-type" label="Loading the condition">
        <div className="cstudio">
          <div className="cstudio-pair">
            <SkeletonCard>
              <div className="stack">
                <RuleRow i={0} />
                <RuleRow i={1} />
                <RuleRow i={2} />
                <span className="skel skel-btn" style={{ width: 126 }} />
              </div>
            </SkeletonCard>
            <SkeletonCard><SkeletonText lines={6} /></SkeletonCard>
          </div>
          <SkeletonCard><EvaluationShape /></SkeletonCard>
        </div>
      </Skeleton>
    )
  }

  return (
    <Skeleton className="skel-head-type" label="Loading the policy record">
      <div className="detail-cols">
        <div className="stack">
          <SkeletonStatStrip cells={4} />
          <SkeletonCard>
            <div className="stack">
              <span className="row" style={{ justifyContent: 'space-between', ...line('calc(var(--t-h2) * var(--t-h2-lh))') }}>
                <span className="skel" style={{ ...bar, width: 152, height: 8 }} />
                <span className="skel" style={{ ...bar, width: 44, height: 14 }} />
              </span>
              {/* `.meter` at the height the coverage card asks for. */}
              <span className="skel" style={{ ...bar, height: 8, borderRadius: 'var(--r-pill)' }} />
              <SkeletonKeyValue rows={1} cols={1} />
            </div>
          </SkeletonCard>
          <SkeletonCard><SkeletonList rows={3} media="square" /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue rows={6} cols={1} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}

/** The whole record on arrival: masthead, tab strip and the panel beneath. */
export function PolicyRecordSkeleton({ tab = 'overview' }) {
  return (
    <Skeleton className="skel-head-type" label="Loading the policy">
      <SkeletonDetailHeader facts={4} actions={3} />
      <SkeletonRecordTabs tabs={4} />
      <div className="detail-body">
        <PolicyPanelSkeleton tab={tab} />
      </div>
    </Skeleton>
  )
}

/**
 * The builder, waiting on the policy it edits.
 *
 * Only the edit address settles. Creating a policy opens on an empty condition
 * with nothing to fetch, so a skeleton there would be a wait invented for its
 * own sake rather than one standing in for a round trip.
 */
export function PolicyBuilderSkeleton() {
  return (
    <Skeleton className="skel-head-type" label="Loading the policy">
      <SkeletonDetailHeader facts={0} actions={2} />
      <div className="detail-body">
        <div className="detail-cols">
          <div className="stack">
            {/* Identification, then the condition, then the target. */}
            <SkeletonCard><SkeletonForm fields={2} cols={1} actions={false} /></SkeletonCard>
            <SkeletonCard>
              <div className="stack">
                <RuleRow i={0} />
                <RuleRow i={1} />
                <span className="skel skel-btn" style={{ width: 126 }} />
              </div>
            </SkeletonCard>
            <SkeletonCard>
              <div className="stack">
                <SkeletonForm fields={2} cols={2} actions={false} />
                <SkeletonList rows={2} media="square" />
              </div>
            </SkeletonCard>
          </div>
          <div className="stack">
            <SkeletonCard>
              <div className="stack">
                <span className="row" style={{ justifyContent: 'space-between', ...line('calc(var(--t-display) * var(--t-display-lh))') }}>
                  <span className="skel" style={{ ...bar, width: 142, height: 8 }} />
                  <span className="skel" style={{ ...bar, width: 52, height: 20 }} />
                </span>
                <span className="skel" style={{ ...bar, height: 5, borderRadius: 'var(--r-pill)' }} />
                <SkeletonText lines={2} />
              </div>
            </SkeletonCard>
            <SkeletonCard><SkeletonKeyValue rows={4} cols={1} /></SkeletonCard>
          </div>
        </div>
      </div>
    </Skeleton>
  )
}
