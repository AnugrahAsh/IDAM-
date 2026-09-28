import {
  Skeleton, SkeletonCard, SkeletonForm, SkeletonKeyValue, SkeletonList,
  SkeletonPageBar, SkeletonTable,
} from '../../components/primitives/Skeleton'

/**
 * The shapes the Applications screens hold their space with.
 *
 * Two of them are not in the kit because they are not kit shapes: the joined
 * figure strip a record opens with, and the register's own header of
 * number-led filter tabs. Both are drawn from the real rules — `.stat-strip`,
 * `.reg` — so the only thing invented here is the bars inside, and both state
 * the line box the real type prints. A bar has no text in it to set one, and a
 * strip or a header that comes up short moves everything below it at the moment
 * the figures arrive, which is the jump this whole exercise exists to remove.
 *
 * Each export wraps itself in `Skeleton`. Composed together the outer region
 * announces and the inner ones fall silent, so a screen says once that it is
 * loading however many of these pieces it is built from.
 */

/* `.stat-k` is --t-xs on the inherited body line; `.stat-v` is 1.25rem on 1.1.
   Both come from horizon.css, which is the last word on the tile. */
const STAT_K = 'calc(var(--t-xs) * var(--t-body-lh))'
const STAT_V = 'calc(1.25rem * 1.1)'

/** The joined figure strip a record opens with — `StatStrip` geometry. */
export function SkeletonStatStrip({ cells = 4 }) {
  return (
    <div className="stat-strip" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <div className="stat-cell app-skel-cell" key={i}>
          <span className="stat-k" style={{ minHeight: STAT_K }}>
            <span className="skel" style={{ display: 'block', width: 72 + (i % 3) * 20, height: 8 }} />
          </span>
          <span className="stat-v" style={{ minHeight: STAT_V }}>
            <span className="skel" style={{ display: 'block', width: 54 + (i % 2) * 26, height: 15 }} />
          </span>
          <span className="skel" style={{ display: 'block', width: `${56 + (i % 3) * 12}%`, height: 8, marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/**
 * The register's header, mounted inside the workbench panel. It is the
 * register's headline figures and the filter they double as, so it is data as
 * much as the rows beneath it and settles with them rather than landing first
 * with counts the rows cannot yet corroborate.
 */
export function SkeletonRegisterHeader({ tabs = 4, summary = 3 }) {
  return (
    <div className="reg" aria-hidden="true">
      <div className="reg-row">
        <div className="reg-tabs">
          {Array.from({ length: tabs }, (_, i) => (
            <span className="reg-f app-skel-f" key={i}>
              <span className="skel" style={{ width: 26 + (i % 3) * 12 }} />
              <span className="skel" style={{ width: 64 + (i % 3) * 22 }} />
            </span>
          ))}
        </div>
        <div className="reg-sum">
          {Array.from({ length: summary }, (_, i) => (
            <span className="skel" key={i} style={{ width: 86 + (i % 3) * 26, height: 9 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** The register's masthead. The rows below it settle inside the workbench. */
export function AppsListSkeleton() {
  return (
    <Skeleton label="Loading the application register">
      <SkeletonPageBar actions={3} crumbs={1} />
    </Skeleton>
  )
}

/**
 * The panel under a record's tab bar.
 *
 * Three tabs are deliberately absent. Attribute Configuration and Client Scope
 * are registers, and a register settles its own rows from the `loading` prop it
 * already accepts, which leaves the search box the operator is about to type
 * into alive instead of replacing it with a grey rectangle. The Add Application
 * wizard is not a tab at all and never settles: nothing is read into it, so
 * there is nothing for a skeleton to stand in for.
 */
export function AppPanelSkeleton({ tab }) {
  if (tab === 'provisioning') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonForm fields={6} actions={false} /></SkeletonCard>
          <SkeletonCard><SkeletonForm fields={4} actions={false} /></SkeletonCard>
          <SkeletonCard lines={3} />
        </div>
        <SkeletonCard><SkeletonKeyValue cols={1} rows={5} /></SkeletonCard>
      </div>
    )
  }

  if (tab === 'reconciliation') {
    return (
      <div className="stack">
        <SkeletonStatStrip cells={4} />
        <div className="detail-cols">
          <div className="stack">
            <SkeletonCard><SkeletonForm fields={4} actions={false} /></SkeletonCard>
            {/* The card this stands in for is `flush`: its body is a table, and
                a table carries its own row gutters, so the shape holding its
                place carries none either. */}
            <SkeletonCard className="app-skel-flush" foot><SkeletonTable rows={6} cols={6} /></SkeletonCard>
          </div>
          <div className="stack">
            <SkeletonCard><SkeletonForm fields={3} cols={1} actions={false} /></SkeletonCard>
            <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
          </div>
        </div>
      </div>
    )
  }

  /* SSO. The editor behind it is reached from this view, so by the time it
     opens the record is already in hand and nothing settles again — this shape
     is only ever seen standing in for the view itself, or for one arrival
     straight at the editor's own address. */
  if (tab === 'sso') {
    return (
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={2} rows={4} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={2} rows={6} /></SkeletonCard>
          <SkeletonCard><SkeletonKeyValue cols={2} rows={6} /></SkeletonCard>
        </div>
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={1} rows={4} /></SkeletonCard>
          <SkeletonCard><SkeletonList rows={4} media="square" /></SkeletonCard>
        </div>
      </div>
    )
  }

  /* URL configuration: one banner's worth of prose over the single card that
     holds the address and the parameters read from the record. */
  if (tab === 'urls') {
    return (
      <div className="stack">
        <SkeletonCard head={false} lines={3} />
        <SkeletonCard foot><SkeletonForm fields={2} cols={1} actions={false} /></SkeletonCard>
      </div>
    )
  }

  if (tab === 'linkage') {
    return (
      <div className="stack">
        <SkeletonCard head={false} lines={2} />
        <div className="detail-cols">
          <div className="stack">
            <SkeletonCard><SkeletonList rows={2} media={false} /></SkeletonCard>
            <SkeletonCard><SkeletonForm fields={1} actions={false} /></SkeletonCard>
          </div>
        </div>
      </div>
    )
  }

  /* Overview: the figure strip, then the two facet cards beside the record and
     its linkage summary. */
  return (
    <div className="stack">
      <SkeletonStatStrip cells={5} />
      <div className="detail-cols">
        <div className="stack">
          <SkeletonCard><SkeletonKeyValue cols={2} rows={4} /></SkeletonCard>
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
