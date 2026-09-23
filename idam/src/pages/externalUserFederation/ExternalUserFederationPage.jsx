import './ExternalUserFederationPage.css'
import { useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import { probeConnection } from '../applications/appModel'
import ConnectorHub from './ConnectorHub'
import FederationForm from './FederationForm'
import FederationRegister from './FederationRegister'
import { BASE, FEDERATIONS, fullConnection, hubConnector, isTracked, ldapAppById, recordOf } from './federationData'

function NotFound({ title, body, crumb, backTo, backLabel }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar title={title} crumbs={[{ label: 'External User Federation', to: BASE }, { label: crumb }]} />
      <EmptyState
        icon="plug"
        title={title}
        body={body}
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(backTo)}>{backLabel}</Button>}
      />
    </>
  )
}

/* ---------------------------------------------------------------------------
   External User Federation.

   /iam/externalUserFederation            the register of federated applications
   /iam/externalUserFederation/new        the Connector Hub
   /iam/externalUserFederation/new/:id    the setup form for one connector
   /iam/externalUserFederation/:id        a federated application, on the same form
   ------------------------------------------------------------------------- */
export default function ExternalUserFederationPage({ segments = [] }) {
  const { toast, confirm, navigate } = useApp()
  const [rows, setRows] = useState(() => FEDERATIONS.map((r) => ({ ...r })))

  const patch = (id, changes) => setRows((rs) => rs.map((r) => (String(r.id) === String(id)
    ? { ...r, ...(typeof changes === 'function' ? changes(r) : changes) }
    : r)))

  const create = (draft) => {
    const rec = recordOf(draft, nextId(rows))
    setRows((rs) => [rec, ...rs])
    const directory = ldapAppById(rec.ldapAppId)
    toast('ok', 'Application created', isTracked(rec.connector)
      ? `${rec.displayName} is tracked against ${directory.displayName}.`
      : `${rec.displayName} · its first sync into ${directory.displayName} is queued.`)
    navigate(BASE)
  }

  // The form remounts on the new revision, so it reopens clean on what was saved.
  const save = (id, draft) => {
    patch(id, (r) => ({
      name: draft.name.trim(),
      displayName: draft.displayName.trim(),
      description: draft.description.trim(),
      ldapAppId: Number(draft.ldapAppId),
      ouDn: draft.ouDn,
      operations: { ...draft.operations },
      connection: { ...draft.connection },
      schedule: draft.schedule,
      matchKey: draft.matchKey,
      rev: (r.rev || 0) + 1,
    }))
    toast('ok', 'Changes saved', draft.displayName.trim())
  }

  const remove = (r) => confirm({
    title: `Delete ${r.displayName}?`,
    body: 'The federation stops and its record is removed. Users already written into the directory stay where they are. This cannot be undone.',
    confirmLabel: 'Delete application',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== r.id))
      toast('ok', 'Application deleted', r.displayName)
      navigate(BASE)
    },
  })

  const removeMany = (ids, clear) => confirm({
    title: `Delete ${ids.length} federated applications?`,
    body: 'The selected federations stop and their records are removed. Users already written into the directories stay where they are.',
    confirmLabel: `Delete ${ids.length}`,
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (clear) clear()
      toast('ok', 'Applications deleted', `${ids.length} removed from the register.`)
    },
  })

  const sync = (r) => {
    if (r.status === 'Failed') {
      toast('warn', 'Sync failed', `${r.displayName} · ${r.lastError}`)
      return
    }
    // A first sync reads the source's whole population; later ones pick up
    // whatever joined since the last run.
    const added = r.status === 'Pending' ? 18 + ((r.id * 13) % 60) : (r.id * 3) % 7
    patch(r.id, { status: 'Healthy', lastError: undefined, lastSyncMins: 0, users: (r.users || 0) + added })
    toast('ok', 'Sync complete', `${r.displayName} · ${added} ${added === 1 ? 'user' : 'users'} added.`)
  }

  const test = (r) => {
    if (r.status === 'Failed') {
      toast('warn', 'Connection failed', `${r.displayName} · ${r.lastError}`)
      return
    }
    const p = probeConnection(r.connector, fullConnection(r))
    if (p.ok) toast('ok', 'Connection succeeded', `${r.displayName} · ${p.steps.filter((s) => s.state !== 'skip').length} checks in ${p.ms}ms`)
    else toast('warn', 'Connection failed', `${r.displayName} · ${(p.steps.find((s) => s.state === 'fail') || {}).detail || p.summary}`)
  }

  const togglePause = (r) => {
    if (r.status === 'Paused') {
      patch(r.id, { status: r.pausedFrom || 'Healthy', pausedFrom: undefined })
      toast('ok', 'Federation resumed', `${r.displayName} syncs on its schedule again.`)
    } else {
      patch(r.id, { status: 'Paused', pausedFrom: r.status })
      toast('ok', 'Federation paused', `${r.displayName} stops syncing until it is resumed.`)
    }
  }

  const [mode, sub] = segments

  if (mode === 'new' && !sub) return <ConnectorHub />

  if (mode === 'new') {
    const hub = hubConnector(sub)
    if (!hub) {
      return (
        <NotFound
          title="Connector not found"
          crumb={String(sub)}
          body={`The Connector Hub has no connector called “${sub}”. Choose one from the hub to set up an application.`}
          backTo={`${BASE}/new`}
          backLabel="Open the Connector Hub"
        />
      )
    }
    return (
      <FederationForm
        key={`new-${hub.id}`}
        mode="create"
        hub={hub}
        rows={rows}
        onCreate={create}
        onCancel={() => navigate(BASE)}
      />
    )
  }

  if (mode) {
    const r = rows.find((x) => String(x.id) === String(mode))
    const hub = r && hubConnector(r.connector)
    if (!r || !hub) {
      return (
        <NotFound
          title="Federated application not found"
          crumb={String(mode)}
          body={`No federated application has id ${mode}. It may have been deleted, or the link may be stale.`}
          backTo={BASE}
          backLabel="Back to federated applications"
        />
      )
    }
    return (
      <FederationForm
        key={`${r.id}-${r.rev || 0}`}
        mode="edit"
        hub={hub}
        record={r}
        rows={rows}
        onSave={save}
        onDelete={remove}
        onSync={sync}
      />
    )
  }

  return (
    <FederationRegister
      rows={rows}
      onDelete={remove}
      onBulkDelete={removeMany}
      onSync={sync}
      onTest={test}
      onTogglePause={togglePause}
    />
  )
}
