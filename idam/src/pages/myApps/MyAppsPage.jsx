import './MyAppsPage.css'
import { memo, useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import AppLogo from '../../components/primitives/AppLogo'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { MY_APPS } from '../../data/seed'

/* My Apps is a showcase, not a configuration screen.

   It carried the protocol each assignment was federated over, a pin control, a
   count of the distinct sign-in methods behind the estate, and a category
   filter above a set of category sections. None of that is the launcher's job:
   an identity opening this page wants to find an application and be taken to
   it. How the hand-off is authenticated belongs to the administrative surfaces
   that govern it, and what is left here is the application, what it is for, and
   the way in. */

/* The whole tile is the link. An anchor rather than a button, so the browser
   offers what it offers for any link — open in a new tab, copy the address —
   and the destination is visible on hover instead of being a secret held by an
   onClick handler. */
const AppTile = memo(function AppTile({ app }) {
  return (
    <a
      className="ma-tile"
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${app.name}`}
    >
      <span className="ma-tile-top">
        <AppLogo brand={app.brand} name={app.name} size={38} />
        <span className="ma-tile-go" aria-hidden="true"><Icon name="external" size={13} /></span>
      </span>
      <span className="ma-tile-name">{app.name}</span>
      <span className="ma-tile-desc">{app.desc}</span>
      <span className="ma-tile-foot">
        <span className="ma-tile-owner">{app.owner}</span>
        <span className="ma-tile-open">Open<Icon name="chevR" size={12} /></span>
      </span>
    </a>
  )
})

export default function MyAppsPage() {
  const { navigate } = useApp()
  const [q, setQ] = useState('')

  /* One grid, ordered by name. There is no grouping and no sort control: the
     estate is a set of applications an identity opens, not a taxonomy to
     navigate, and A–Z is the order you can find something in without being
     told how the page was arranged.

     Category is still matched on, so "finance" or "security" finds the right
     tiles even though neither word appears on one. */
  const apps = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? MY_APPS.filter((a) => `${a.name} ${a.desc} ${a.owner} ${a.category}`.toLowerCase().includes(needle))
      : MY_APPS
    return [...list].sort((x, y) => x.name.localeCompare(y.name))
  }, [q])

  const reset = () => setQ('')

  return (
    <div className="ma-workspace">
      <PageBar
        title="My Apps"
        sub="Every application your identity can reach. Choose one to open it."
        actions={<Button icon="shield" onClick={() => navigate('/iam/profile')}>My access</Button>}
      />

      {/* The register shell the rest of the console uses: a .wb panel with a
          .wb-bar toolbar. The body happens to be tiles rather than rows. */}
      <div className="wb">
        <div className="wb-bar">
          <div className="wb-bar-search">
            <div className="wb-search ma-search">
              <Icon name="search" size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search applications…"
                aria-label="Search applications"
              />
              {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
            </div>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="ma-empty">
            <EmptyState
              icon="apps"
              title="Nothing matches"
              body="No application in your estate answers to that search."
              actions={<Button onClick={reset}>Clear search</Button>}
            />
          </div>
        ) : (
          <div className="ma-grid">
            {apps.map((a) => <AppTile app={a} key={a.id} />)}
          </div>
        )}
      </div>
    </div>
  )
}
