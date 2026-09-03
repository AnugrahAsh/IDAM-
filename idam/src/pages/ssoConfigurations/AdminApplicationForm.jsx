import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import KeyValue from '../../components/primitives/KeyValue'
import Select from '../../components/primitives/Select'
import { SSO_APPS } from '../../data/seed'
import { num } from '../../lib/format'
import { useState } from 'react'

export default function AdminApplicationForm({ current, onCancel, onSubmit }) {
  const [choice, setChoice] = useState(current)
  const app = SSO_APPS.find((a) => a.name === choice)

  return (
    <>
      <Banner tone="info">
        The admin application is the federated client the administration console itself authenticates through.
        Changing it forces every administrator to re-authenticate at their next request.
      </Banner>

      <div className="stack" style={{ marginTop: 16 }}>
        <Field label="Administration application" required htmlFor="admin-app">
          <Select
            id="admin-app"
            value={choice}
            options={SSO_APPS.map((a) => ({ value: a.name, label: `${a.displayName} · ${a.protocol}` }))}
            onChange={(e) => setChoice(e.target.value)}
          />
        </Field>

        {app && (
          <KeyValue
            cols={2}
            rows={[
              { k: 'Protocol', v: app.protocol, icon: 'shield' },
              { k: 'Client identifier', v: app.clientId, icon: 'key' },
              { k: 'Assigned users', v: num(app.users), icon: 'users' },
              { k: 'Status', v: app.status, icon: 'activity' },
            ]}
          />
        )}

        {app && !app.enabled && (
          <Banner tone="warn">
            <b>{app.displayName} is disabled.</b> Enable it before making it the administration application, or nobody
            will be able to sign in to this console.
          </Banner>
        )}
      </div>

      <div className="row" style={{ marginTop: 22, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="pri" icon="save" disabled={!app} onClick={() => onSubmit(app)}>Set admin application</Button>
      </div>
    </>
  )
}

