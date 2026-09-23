import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import AppLogo from '../../components/primitives/AppLogo'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import { useApp } from '../../store/AppContext'
import { brandForConnector } from '../shared/provisioning/shared'
import { BASE, CATEGORIES, HUB_CONNECTORS, categoryOf, countIn } from './federationData'

const RAIL = [{ id: 'all', label: 'All Connectors', icon: 'group' }, ...CATEGORIES]

/* ---------------------------------------------------------------------------
   Connector Hub — the first step of adding a federated application.

   The categories hold the left of the page and the connectors under the chosen
   one hold the right. A connector is one click: the whole row opens its setup
   form, and the "Set up" affordance only says so out loud on hover and focus.
   ------------------------------------------------------------------------- */
export default function ConnectorHub() {
  const { navigate } = useApp()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')

  const scope = RAIL.find((r) => r.id === cat) || RAIL[0]
  const inScope = useMemo(
    () => (cat === 'all' ? HUB_CONNECTORS : HUB_CONNECTORS.filter((c) => c.category === cat)),
    [cat],
  )
  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => (needle
    ? inScope.filter((c) => `${c.name} ${c.description} ${c.method} ${categoryOf(c.category).label}`.toLowerCase().includes(needle))
    : inScope), [inScope, needle])

  const setUp = (id) => navigate(`${BASE}/new/${id}`)

  return (
    <>
      <PageBar
        title="Add Application"
        crumbs={[{ label: 'External User Federation', to: BASE }, { label: 'Add Application' }]}
        sub="Choose the connector this application federates its users through. The setup form that follows asks only for what that connector needs."
        actions={<Button icon="chevL" onClick={() => navigate(BASE)}>Back to federated applications</Button>}
      />

      <div className="fed-hub">
        <nav className="fed-rail" aria-label="Connector categories">
          <div className="fed-rail-h">
            <span className="fed-rail-mark"><Icon name="plug" size={17} /></span>
            <span className="fed-rail-hm">
              <span className="fed-rail-t">Connector Hub</span>
              <span className="fed-rail-s">{HUB_CONNECTORS.length} integrations</span>
            </span>
          </div>

          <div className="fed-rail-list">
            {RAIL.map((it) => (
              <button
                key={it.id}
                type="button"
                className="fed-rail-it"
                data-on={cat === it.id || undefined}
                aria-pressed={cat === it.id}
                onClick={() => setCat(it.id)}
              >
                <Icon name={it.icon} size={15} />
                <span className="trunc">{it.label}</span>
                <span className="fed-rail-n num">{countIn(it.id)}</span>
              </button>
            ))}
          </div>

          <div className="fed-rail-note">
            <Icon name="help" size={14} />
            <span>
              Can&apos;t find your application? Use{' '}
              <button type="button" className="link" onClick={() => setUp('api')}>REST API</button>
              {' '}or{' '}
              <button type="button" className="link" onClick={() => setUp('scim')}>SCIM 2.0</button>
              {' '}for custom integrations.
            </span>
          </div>
        </nav>

        <section className="fed-main" aria-labelledby="fed-main-title">
          <header className="fed-main-h">
            <div className="fed-main-t">
              <h2 id="fed-main-title">{scope.label}</h2>
              <p>
                {needle
                  ? `${shown.length} of ${inScope.length} ${inScope.length === 1 ? 'connector matches' : 'connectors match'} “${q.trim()}”`
                  : `${scope.label} · ${inScope.length} available`}
              </p>
            </div>
            <div className="wb-search fed-search">
              <Icon name="search" size={14} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search connectors…"
                aria-label="Search connectors"
              />
              {q && (
                <button type="button" className="fed-search-x" aria-label="Clear search" onClick={() => setQ('')}>
                  <Icon name="x" size={11} />
                </button>
              )}
            </div>
          </header>

          {shown.length > 0 ? (
            <ul className="fed-list">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="fed-conn"
                    aria-label={`Set up ${c.name}`}
                    aria-describedby={`fed-desc-${c.id}`}
                    onClick={() => setUp(c.id)}
                  >
                    <span className="tile-logo">
                      <AppLogo brand={brandForConnector(c.id)} name={c.name} size={44} />
                    </span>
                    <span className="fed-conn-m">
                      <span className="fed-conn-top">
                        <span className="fed-conn-name">{c.name}</span>
                        <Tag tone="acc">{categoryOf(c.category).tag}</Tag>
                      </span>
                      <span className="fed-conn-desc" id={`fed-desc-${c.id}`}>{c.description}</span>
                    </span>
                    <span className="fed-conn-go" aria-hidden="true">
                      <span className="fed-conn-go-t">Set up</span>
                      <Icon name="arrowRight" size={13} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="search"
              title="No connectors match"
              body={`Nothing in ${scope.label} matches “${q.trim()}”. Try another name, or search every category.`}
              actions={(
                <>
                  <Button onClick={() => setQ('')}>Clear search</Button>
                  {cat !== 'all' && <Button variant="pri" onClick={() => setCat('all')}>Search all connectors</Button>}
                </>
              )}
            />
          )}

          <footer className="fed-main-f">
            <Icon name="info" size={13} />
            <span>Choosing a connector opens its setup form. Nothing is saved until the application is created.</span>
          </footer>
        </section>
      </div>
    </>
  )
}
