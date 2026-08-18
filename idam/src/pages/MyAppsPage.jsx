import './styles/MyAppsPage.css'
import { memo, useCallback, useMemo, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import Card from '../components/primitives/Card'
import Button from '../components/primitives/Button'
import Icon from '../components/primitives/Icon'
import StatChip from '../components/primitives/StatChip'
import Tag from '../components/primitives/Tag'
import AppLogo from '../components/primitives/AppLogo'
import EmptyState from '../components/primitives/EmptyState'
import Field from '../components/primitives/Field'
import Select from '../components/primitives/Select'
import TextInput from '../components/primitives/TextInput'
import { useApp } from '../store/AppContext'
import { useLocalState } from '../lib/useLocalState'
import { num } from '../lib/format'
import { MY_APPS, APP_CATEGORIES, GROUPS } from '../data/seed'

const TYPE_TONE = { SAML: 'acc', OIDC: 'info', OAuth: 'viol', JWT: 'ok', Link: 'mut' }

const AppTile = memo(function AppTile({ a, onLaunch, onToggleFavorite }) {
  return (
    <div className="apptile">
      <button
        type="button"
        className="apptile-star"
        data-on={a.favorite || undefined}
        aria-pressed={a.favorite}
        aria-label={a.favorite ? `Remove ${a.name} from favorites` : `Add ${a.name} to favorites`}
        onClick={() => onToggleFavorite(a)}
      >
        <Icon name="star" size={13} />
      </button>
      <button type="button" className="apptile-main" onClick={() => onLaunch(a)}>
        <AppLogo brand={a.brand} name={a.name} size={44} />
        <span className="apptile-name">{a.name}</span>
        <span className="apptile-sub">{a.lastUsed}</span>
      </button>
      <div className="apptile-foot">
        <Tag tone={TYPE_TONE[a.type] === 'acc' ? 'acc' : undefined}>{a.type}</Tag>
        <Button size="sm" iconRight="external" aria-label={`Open ${a.name}`} onClick={() => onLaunch(a)}>Open</Button>
      </div>
    </div>
  )
})

export default function MyAppsPage() {
  const { toast, setDrawer, navigate } = useApp()
  const [pinned, setPinned] = useLocalState('tf-idam-favorites', MY_APPS.filter((a) => a.favorite).map((a) => a.id))
  const apps = useMemo(() => MY_APPS.map((a) => ({ ...a, favorite: pinned.includes(a.id) })), [pinned])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('All')
  const [layout, setLayout] = useState('grid')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return apps.filter((a) => {
      if (category !== 'All' && a.category !== category) return false
      if (!needle) return true
      return a.name.toLowerCase().includes(needle)
        || a.category.toLowerCase().includes(needle)
        || a.type.toLowerCase().includes(needle)
        || a.owner.toLowerCase().includes(needle)
    })
  }, [apps, q, category])

  const favorites = filtered.filter((a) => a.favorite)
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((a) => { (map[a.category] = map[a.category] || []).push(a) })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const launch = useCallback((a) => toast('info', `Opening ${a.name}`, `Hands off to ${a.type} sign-in. The service provider completes the session.`), [toast])

  const toggleFavorite = useCallback((a) => {
    setPinned((list) => (list.includes(a.id) ? list.filter((x) => x !== a.id) : [...list, a.id]))
    toast('ok', a.favorite ? 'Removed from favorites' : 'Added to favorites', a.name)
  }, [setPinned, toast])

  const requestAccess = () => {
    const draft = { entitlement: '', duration: '1 week', justification: '' }
    const open = (errors) => setDrawer({
      title: 'Request access',
      sub: 'Pick an entitlement and it routes to the group owner for approval.',
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="request"
            onClick={() => {
              const next = {}
              if (!draft.entitlement) next.entitlement = 'Select the entitlement you need.'
              if (draft.justification.trim().length < 10) next.justification = 'Give the approver at least a sentence of justification.'
              if (Object.keys(next).length) { open(next); return }
              setDrawer(null)
              toast('ok', 'Request submitted', `${draft.entitlement} · ${draft.duration}. Routed to the group owner.`)
            }}
          >
            Submit request
          </Button>
        </>
      ),
      children: (
        <div className="stack">
          <Field label="Application or entitlement" required error={errors.entitlement}>
            <Select
              options={GROUPS.map((g) => g.name)}
              placeholder="Select an entitlement"
              defaultValue={draft.entitlement}
              aria-label="Entitlement"
              onChange={(e) => { draft.entitlement = e.target.value }}
            />
          </Field>
          <Field label="Duration" hint="Time-bound access is approved faster than permanent grants.">
            <Select
              options={['8 hours', '1 day', '1 week', '30 days', 'Permanent']}
              defaultValue={draft.duration}
              aria-label="Duration"
              onChange={(e) => { draft.duration = e.target.value }}
            />
          </Field>
          <Field label="Business justification" required error={errors.justification} hint="Shown to the approver and retained as audit evidence.">
            <TextInput
              as="textarea"
              rows={4}
              defaultValue={draft.justification}
              placeholder="Why is this access needed?"
              onChange={(e) => { draft.justification = e.target.value }}
            />
          </Field>
        </div>
      ),
    })
    open({})
  }

  return (
    <>
      <PageBar
        title="My Apps"
        sub="Every application provisioned to your identity. Sign-in is federated, so no additional credentials are required."
        actions={
          <>
            <Button variant="pri" icon="request" onClick={requestAccess}>Request access</Button>
          </>
        }
        rail={
          <>
            <div className="wb-search" style={{ maxWidth: 300 }}>
              <Icon name="search" size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications" aria-label="Search applications" />
              {q && <button type="button" className="btn-icon sm" onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={12} /></button>}
            </div>
            <div className="seg seg-wrap" role="group" aria-label="Filter by category">
              <button
                type="button"
                data-on={category === 'All' || undefined}
                aria-pressed={category === 'All'}
                onClick={() => setCategory('All')}
              >
                All
              </button>
              {APP_CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  data-on={category === c || undefined}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="spacer" />
            <div className="seg">
              <button type="button" data-on={layout === 'grid' || undefined} aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} aria-label="Grid view"><Icon name="group" size={13} /></button>
              <button type="button" data-on={layout === 'category' || undefined} aria-pressed={layout === 'category'} onClick={() => setLayout('category')} aria-label="Group by category"><Icon name="layers" size={13} /></button>
            </div>
            <StatChip icon="apps" title="Applications shown by the current filter">{num(filtered.length)} of {num(apps.length)}</StatChip>
          </>
        }
      />

      <div className="stack">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="apps"
              title="No application found"
              body="Nothing in your assigned estate matches that search."
            />
          </Card>
        ) : layout === 'grid' ? (
          <>
            {favorites.length > 0 && (
              <Card title="Favorites" sub={`${pinned.length} pinned for quick access`} flush>
                <div className="appgrid">{favorites.map((a) => <AppTile a={a} key={a.id} onLaunch={launch} onToggleFavorite={toggleFavorite} />)}</div>
              </Card>
            )}
            <Card
              title="Assigned applications"
              sub="Access granted through your role and group memberships"
              actions={<Button size="sm" iconRight="chevR" onClick={() => navigate('/iam/profile')}>My access</Button>}
              flush
            >
              <div className="appgrid">{filtered.map((a) => <AppTile a={a} key={a.id} onLaunch={launch} onToggleFavorite={toggleFavorite} />)}</div>
            </Card>
          </>
        ) : (
          grouped.map(([cat, list]) => (
            <Card key={cat} title={cat} sub={`${list.length} ${list.length === 1 ? 'application' : 'applications'}`} flush>
              <div className="appgrid">{list.map((a) => <AppTile a={a} key={a.id} onLaunch={launch} onToggleFavorite={toggleFavorite} />)}</div>
            </Card>
          ))
        )}

        <div className="banner" data-tone="info">
          <Icon name="info" size={15} />
          <div>
            Missing something you need?{' '}
            <button type="button" className="link" onClick={requestAccess}>Request access</button>
            {' '}and it routes to the group owner. Requests are usually decided within one working day.
          </div>
        </div>
      </div>
    </>
  )
}
