import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import IconButton from '../../components/primitives/IconButton'
import KeyValue from '../../components/primitives/KeyValue'
import Switch from '../../components/primitives/Switch'
import Tag from '../../components/primitives/Tag'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'
import { BASE, PROVIDER_KIND, vendorLabel } from './federationData'

/* ---------------------------------------------------------------------------
   The provider list.

   One card per provider, carrying the four facts the client's screen carries —
   vendor, connection URL, users DN, edit mode — plus the switch that turns it
   on and off. All five are read off the record, so a provider edited on the
   form is a provider changed here, and the switch is the record's own state
   rather than a light beside it.
   ------------------------------------------------------------------------- */

function ProviderCard({ provider, onOpen, onToggle }) {
  return (
    <Card
      className="fed-card"
      title={<button type="button" className="link fed-card-name" onClick={onOpen}>{provider.name}</button>}
      actions={<IconButton icon="edit" size="sm" label={`Edit ${provider.name}`} onClick={onOpen} />}
    >
      <div className="stack">
        <div className="fed-card-state">
          <Tag>{PROVIDER_KIND}</Tag>
          <span className="spacer" />
          {/* The label reads the record, not the intent: a provider switched
              off says so, rather than leaving the operator to read the switch
              graphic as the only difference between two identical cards. */}
          <Switch
            checked={provider.enabled}
            label={`${provider.name} enabled`}
            onChange={onToggle}
          />
          <span className="fed-card-state-t">{provider.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>

        <KeyValue
          dense
          cols={1}
          rows={[
            { k: 'Vendor', icon: 'tag', v: vendorLabel(provider.vendor) },
            { k: 'Connection URL', icon: 'link', node: <span className="mono">{provider.connectionUrl}</span> },
            { k: 'Users DN', icon: 'folder', node: <span className="mono">{provider.usersDn}</span> },
            { k: 'Edit mode', icon: 'edit', v: provider.editMode },
          ]}
        />
      </div>
    </Card>
  )
}

export default function ProviderList({ rows, onToggle }) {
  const { navigate } = useApp()

  return (
    <>
      <PageBar
        title="User Federation"
        sub="User federation provides access to external databases and directories."
        crumbs={[{ label: 'External User Federation' }]}
        actions={<Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/new`)}>Add Provider</Button>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="plug"
          title="No providers yet"
          body="Add a provider to federate users from an external database or directory."
          actions={<Button variant="pri" icon="plus" onClick={() => navigate(`${BASE}/new`)}>Add Provider</Button>}
        />
      ) : (
        <div className="fed-grid">
          {rows.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onOpen={() => navigate(`${BASE}/${p.id}`)}
              onToggle={() => onToggle(p)}
            />
          ))}
        </div>
      )}
    </>
  )
}
