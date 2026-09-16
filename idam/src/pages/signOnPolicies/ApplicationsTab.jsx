import { useState } from 'react'
import AppLogo from '../../components/primitives/AppLogo'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import EmptyState from '../../components/primitives/EmptyState'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import { useApp } from '../../store/AppContext'
import { serialColumn } from '../../lib/format'
import { appById, plural } from './signOnPolicyData'
import { usePolicies } from './signOnPolicyStore'
import { usePolicyActions } from './usePolicyActions'
import { deniedTitle, usePolicyAccess } from './signOnPolicyAccess'
import AttachApplications from './AttachApplications'

export default function ApplicationsTab({ policy }) {
  const { navigate } = useApp()
  const policies = usePolicies()
  const access = usePolicyAccess()
  const { attach, detach } = usePolicyActions()
  const [picking, setPicking] = useState(false)

  const rows = policy.applications
    .map((m) => ({ ...appById(m.appId), appId: m.appId, mappingId: m.mappingId, attachedOn: m.attachedOn, attachedBy: m.attachedBy }))
    .filter((r) => r.name)

  /* An application can sit under more than one policy. Saying which others
     govern it is the difference between a deliberate overlap and an accident. */
  const others = (appId) => policies
    .filter((p) => p.id !== policy.id && p.applications.some((m) => String(m.appId) === String(appId)))
    .map((p) => p.name)

  const columns = [
    serialColumn('S.No.'),
    {
      key: 'displayName', label: 'Application', locked: true, cls: 'td-main',
      render: (a) => (
        <span className="cell-id">
          <AppLogo name={a.displayName} size={24} />
          <span className="trunc">
            <span style={{ display: 'block' }}>{a.displayName}</span>
            <span className="cell-sub mono">{a.name}</span>
          </span>
        </span>
      ),
    },
    { key: 'protocol', label: 'Type', render: (a) => <Tag>{a.protocol}</Tag> },
    { key: 'url', label: 'URL', cls: 'td-mono' },
    {
      key: 'enabled', label: 'Application status',
      value: (a) => (a.enabled ? 'Enabled' : 'Disabled'),
      render: (a) => <Pill tone={a.enabled ? 'ok' : 'mut'} dot>{a.enabled ? 'Enabled' : 'Disabled'}</Pill>,
    },
    {
      key: 'others', label: 'Also governed by', sortable: false,
      value: (a) => others(a.appId).join(' '),
      render: (a) => {
        const names = others(a.appId)
        return names.length > 0 ? <span title={names.join(', ')}>{names.join(', ')}</span> : <span className="t-mut">—</span>
      },
    },
    { key: 'attachedOn', label: 'Attached on', cls: 'td-mono', optional: true },
    { key: 'attachedBy', label: 'Attached by', optional: true },
  ]

  const rowActions = (a) => [
    { id: 'open', label: 'Open in Applications', icon: 'external', onSelect: () => navigate('/iam/applications') },
    { divider: true },
    {
      id: 'detach', label: 'Detach', icon: 'x', danger: true,
      disabled: !access.detach, title: access.detach ? undefined : deniedTitle('detach'),
      onSelect: () => detach(policy, [a]),
    },
  ]

  const bulkActions = (ids, clear) => (
    <Button size="sm" variant="danger" icon="x" onClick={() => detach(policy, rows.filter((r) => ids.includes(r.mappingId)), clear)}>
      Detach
    </Button>
  )

  const attachButton = access.attach
    ? <Button size="sm" variant="pri" icon="plus" onClick={() => setPicking(true)}>Attach applications</Button>
    : undefined

  return (
    <>
      <div className="section">
        <div className="section-head">
          <span className="section-title">Applications</span>
          <span className="section-sub">Rules in this policy run when an identity signs in to one of these applications.</span>
        </div>

        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon="apps"
              title="No applications attached"
              body={policy.rules.length > 0
                ? `${policy.name} has ${plural(policy.rules.length, 'rule')}, and ${policy.rules.length === 1 ? 'it does' : 'they do'} not run until an application is attached.`
                : 'Attach the SSO applications this policy should govern.'}
              actions={attachButton}
            />
          </Card>
        ) : (
          <DataWorkbench
            id="sign-on-policy-applications"
            rows={rows}
            columns={columns}
            getRowId={(r) => r.mappingId}
            selectable={access.detach}
            bulkActions={bulkActions}
            rowActions={rowActions}
            toolbar={attachButton}
            searchPlaceholder="Search attached applications…"
            emptyTitle="No attached application matches"
            emptyBody="Adjust the search."
            emptyIcon="apps"
          />
        )}
      </div>

      {picking && (
        <AttachApplications
          policy={policy}
          policies={policies}
          onAttach={(ids) => { attach(policy, ids); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}
