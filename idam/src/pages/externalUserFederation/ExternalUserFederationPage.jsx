import './ExternalUserFederationPage.css'
import { useState } from 'react'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'
import { nextId } from '../../data/seed'
import ProviderList from './ProviderList'
import EditProvider, { AddProvider } from './ProviderForm'
import { BASE, recordOf } from './federationData'
import { FEDERATIONS } from './federationSeed'

/* ---------------------------------------------------------------------------
   External User Federation.

   /iam/externalUserFederation          the provider list
   /iam/externalUserFederation/new      Add Provider
   /iam/externalUserFederation/:id      Edit Provider

   The route ids are the ones the console registers and the ones the legacy
   redirects in data/nav.js land on, so /iam/connectorHub still resolves —
   it now reaches Add Provider rather than a hub of connectors.
   ------------------------------------------------------------------------- */
export default function ExternalUserFederationPage({ segments = [] }) {
  const { toast, navigate } = useApp()
  const [rows, setRows] = useState(() => FEDERATIONS.map((r) => ({ ...r })))

  const create = (draft) => {
    const rec = recordOf(draft, nextId(rows))
    setRows((rs) => [...rs, rec])
    toast('ok', 'Provider added', `${rec.name} · federating users from ${rec.connectionUrl}.`)
    /* Back to the list. Add asks for everything the provider needs, so there is
       nothing left to send the operator into the form for — the card they just
       created is the thing worth showing them. */
    navigate(BASE)
  }

  /* The revision is what tells the open form that its draft has been committed;
     the form rebases on the saved record itself, without being remounted, so
     the sections the operator opened and the test they just ran stay put. */
  const save = (id, draft) => {
    setRows((rs) => rs.map((r) => {
      if (String(r.id) !== String(id)) return r
      const { bindCredentials, ...rest } = draft
      return {
        ...r,
        ...rest,
        name: String(draft.name || '').trim(),
        // A blank credential field means "keep the stored one", never "clear it".
        credentialStored: r.credentialStored || !!String(bindCredentials || '').trim(),
        rev: (r.rev || 0) + 1,
      }
    }))
    toast('ok', 'Changes saved', String(draft.name || '').trim())
  }

  const toggleEnabled = (p) => {
    setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, enabled: !r.enabled } : r)))
    toast(
      'ok',
      p.enabled ? 'Provider disabled' : 'Provider enabled',
      p.enabled
        ? `${p.name} stops answering for its users until it is enabled again.`
        : `${p.name} answers for its users again.`,
    )
  }

  const [mode] = segments

  if (mode === 'new') return <AddProvider rows={rows} onCreate={create} />

  if (mode) {
    const record = rows.find((r) => String(r.id) === String(mode))
    if (!record) {
      return (
        <>
          <PageBar
            title="Provider not found"
            crumbs={[{ label: 'External User Federation', to: BASE }, { label: String(mode) }]}
          />
          <EmptyState
            icon="plug"
            title="Provider not found"
            body={`No provider has id ${mode}. It may have been removed, or the link may be stale.`}
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to providers</Button>}
          />
        </>
      )
    }
    /* Keyed on the provider alone: moving to a different provider is a
       different form and starts clean, but saving this one is not. */
    return (
      <EditProvider
        key={record.id}
        record={record}
        rows={rows}
        onSave={save}
      />
    )
  }

  return <ProviderList rows={rows} onToggle={toggleEnabled} />
}
