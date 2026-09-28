import {
  Skeleton, SkeletonCard, SkeletonDetailHeader, SkeletonForm,
} from '../../components/primitives/Skeleton'

/**
 * Two shapes the Scheduler screens need that the kit does not carry.
 *
 * The rest of the module holds its space inline, beside the card or the row it
 * imitates — the next-executions timeline in SchedulerList, the bound-scheduler
 * list in ExecutionHistory. What is here is the pair that belongs to a record
 * masthead: the tab strip that hangs off the bottom of one, and the editor that
 * opens under it.
 */

/* `.tab`: 7px above, 8px below, a 2px indicator, and one line of body type. */
const TAB_H = 'calc(15px + var(--t-body) * var(--t-body-lh) + 2px)'

const bar = { display: 'block' }

/**
 * The scope strip under the execution-history masthead. It keeps the real
 * `.tabs` rule, so it carries the closing hairline the masthead gives up while
 * it is a skeleton, and it bleeds to the canvas edges the way the header does.
 */
export function SchedulerTabsSkeleton({ tabs = 2, widths = [118, 146] }) {
  return (
    <div className="tabs sch-skel-tabs" aria-hidden="true">
      {Array.from({ length: tabs }, (_, i) => (
        <span className="tab" key={i} style={{ minHeight: TAB_H }}>
          <span className="skel sch-skel-b" style={{ ...bar, width: 14, height: 14 }} />
          <span className="skel sch-skel-b" style={{ ...bar, width: widths[i % widths.length], height: 9 }} />
        </span>
      ))}
    </div>
  )
}

/**
 * The editor, hydrated from a record.
 *
 * Only Modify draws this. Create opens on a blank form the operator starts
 * typing into immediately, and there is nothing on its way to hold space for —
 * a skeleton there would be a wait invented for its own sake.
 *
 * Three cards, in the order the form has them: the scheduler and its schedule,
 * the service configuration the chosen service declares, and the execution
 * policy beneath it.
 */
export function SchedulerFormSkeleton() {
  return (
    <Skeleton label="Loading the scheduler">
      <SkeletonDetailHeader media={false} facts={2} actions={1} />
      <div className="detail-body">
        <div className="stack">
          <SkeletonCard head>
            <div className="stack">
              <SkeletonForm fields={4} cols={2} actions={false} />
              <SkeletonForm fields={2} cols={2} actions={false} />
              <span className="skel" style={{ ...bar, width: '100%', height: 44, borderRadius: 'var(--r)' }} />
            </div>
          </SkeletonCard>
          <SkeletonCard head><SkeletonForm fields={6} cols={2} actions={false} /></SkeletonCard>
          <SkeletonCard head><SkeletonForm fields={4} cols={2} actions={false} /></SkeletonCard>
        </div>
      </div>
    </Skeleton>
  )
}
