import { useMemo } from 'react'
import PageBar from '../../components/shell/PageBar'
import Icon from '../../components/primitives/Icon'
import Button from '../../components/primitives/Button'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import RegisterSummary from '../../components/workbench/RegisterSummary'
import RecordCard, { CardIcon } from '../../components/workbench/RecordCard'
import { Skeleton, SkeletonPageBar } from '../../components/primitives/Skeleton'
import SummarySkeleton from './SummarySkeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { useLocalState } from '../../lib/useLocalState'
import { serialColumn } from '../../lib/format'
import { usePublishedLinks } from './linksStore'
import { MANAGE_PATH, QUICK_LINKS_MODULE, WRITE_QUICK_LINK } from './quickLinksAccess'

const HOSTS = [
  { match: /^docs\.|^kb\.|^learn\./, icon: 'file', tone: 'acc' },
  { match: /^status\.|^changelog\./, icon: 'activity', tone: 'ok' },
  { match: /^support\.|^community\./, icon: 'help', tone: 'warn' },
  { match: /^trust\./, icon: 'shield', tone: 'mut' },
]

const parts = (url) => {
  const bare = url.replace(/^https?:\/\//, '')
  const cut = bare.indexOf('/')
  return cut === -1 ? { host: bare, path: '' } : { host: bare.slice(0, cut), path: bare.slice(cut) }
}

const markOf = (host) => HOSTS.find((h) => h.match.test(host)) || { icon: 'link', tone: 'mut' }

export default function QuickLinksList() {
  const { toast, navigate, can } = useApp()
  // The same collection the Manage view edits. A link hidden there is not
  // published here — the two views can no longer disagree.
  const published = usePublishedLinks()
  const mayManage = can(QUICK_LINKS_MODULE, WRITE_QUICK_LINK)
  /* One settle for the page. The masthead, the summary band and the register
     are the same arrival, so they are drawn and replaced together rather than
     landing one after another. */
  const loading = useLoading()

  const ROWS = useMemo(
    () => published.map((l) => ({ id: l.id, link: l.url, label: l.label, description: l.description, createdOn: l.createdOn })),
    [published],
  )

  const hosts = useMemo(() => new Set(ROWS.map((r) => parts(r.link).host)), [ROWS])

  const open = (row) => {
    const opened = window.open(row.link, '_blank', 'noopener,noreferrer')
    if (!opened) toast('warn', 'Pop-up blocked', `Allow pop-ups for this console to open ${row.label}.`)
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'link', label: 'Link', locked: true, width: 316,
      value: (r) => `${r.link} ${r.label}`,
      render: (r) => {
        const { host, path } = parts(r.link)
        const mark = markOf(host)
        return (
          <button type="button" className="lnk" onClick={(e) => { e.stopPropagation(); open(r) }} title={r.link}>
            <span className="feed-ic" data-tone={mark.tone}><Icon name={mark.icon} size={13} /></span>
            <span className="cell-stack">
              <span className="lnk-t">
                <span className="trunc">{r.label}</span>
                <Icon name="external" size={11} />
              </span>
              <span className="cell-sub trunc">{host}<span className="lnk-p">{path}</span></span>
            </span>
          </button>
        )
      },
    },
    { key: 'description', label: 'Description', render: (r) => <span className="trunc" title={r.description}>{r.description}</span> },
    { key: 'createdOn', label: 'Created On', cls: 'td-mono', align: 'right', width: 128 },
  ]

  return (
    <>
      {/* One announcing region for the page. The register below keeps its own
          panel and toolbar while it settles — the shapes it draws inside are
          decoration and stay silent. */}
      {loading ? (
        <Skeleton label="Loading quick links">
          <SkeletonPageBar actions={mayManage ? 1 : 0} crumbs={1} />
          <SummarySkeleton facts={2} />
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="Quick Links"
            crumbs={[{ label: 'Quick Links' }]}
            sub="Shortcuts your administrator publishes to the console — documentation, status, support and training."
            actions={mayManage
              ? <Button variant="pri" icon="sliders" onClick={() => navigate(MANAGE_PATH)}>Manage</Button>
              : undefined}
          />

          <RegisterSummary
            ariaLabel="Quick link summary"
            icon="link"
            label="Links published"
            value={ROWS.length}
            caption="on the launchpad"
            facts={[
              { k: 'Destinations', v: hosts.size, icon: 'globe', c: 'distinct hosts linked' },
              { k: 'Added this year', v: ROWS.filter((r) => String(r.createdOn).startsWith('2026')).length, icon: 'calendar', c: 'published in 2026' },
            ]}
            segments={[]}
            active="All"
            allId="All"
            onSelect={() => {}}
          />
        </>
      )}

      <DataWorkbench
        id="useful-links"
        rows={ROWS}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search shortcuts by title, address or description…"
        onRowClick={open}
        emptyTitle="No links"
        emptyBody="Your administrator has not published any shortcuts yet."
        emptyIcon="link"
      />
    </>
  )
}
