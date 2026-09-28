import { useMemo, useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import { useApp } from '../../store/AppContext'
import { num, statusTone } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { membersOf, profileFor, resolvePolicy } from './orgModel'
import { AuditTab, ChildrenTab, IdentitiesTab, OverviewTab } from './OrgTabs'
import { OrgPanelSkeleton, OrgRecordSkeleton } from './OrganizationsSkeleton'

export default function OrgDetail({ org, orgs, onPatch, onDelete }) {
  const { navigate, toast, confirm } = useApp()
  const [tab, setTab] = useState('overview')
  const [menu, setMenu] = useState(null)
  /* Two scopes off one timer. `arriving` is the record — masthead, tab strip
     and panel resolve on the same tick, so landing on an organization settles
     as one thing. `settling` is the panel alone, which is all a tab change
     fetches: the tab bar is chrome and stays where the pointer left it. */
  const arriving = useLoading(org.id)
  const settling = useLoading(`${org.id}:${tab}`)

  const members = useMemo(() => membersOf(org.name), [org.name])
  const children = useMemo(() => orgs.filter((o) => o.parent === org.name), [orgs, org.name])
  const resolved = useMemo(() => resolvePolicy(org, orgs), [org, orgs])
  const prof = profileFor(org)

  const toggleStatus = () => {
    if (org.status === 'Active') {
      confirm({
        title: `Disable ${org.name}?`,
        body: `Sign-in is blocked for every identity scoped to this organization until it is enabled again. ${num(org.users)} identities are affected.`,
        confirmLabel: 'Disable organization',
        onConfirm: () => onPatch(org.id, { status: 'Disabled' }, 'Organization disabled', org.name),
      })
      return
    }
    onPatch(org.id, { status: 'Active' }, 'Organization enabled', org.name)
  }

  if (arriving) return <OrgRecordSkeleton tab={tab} />

  return (
    <>
      <DetailHeader
        backTo="/iam/organizations"
        backLabel="Organizations"
        eyebrow="Organization"
        title={org.name}
        sub={prof.description}
        media={(
          <span className="feed-ic" data-tone={org.parent ? 'mut' : 'acc'} style={{ width: 52, height: 52 }}>
            <Icon name={org.parent ? 'layers' : 'building'} style={{ width: 24, height: 24 }} />
          </span>
        )}
        badges={(
          <>
            <Pill tone={statusTone(org.status)} dot>{org.status}</Pill>
            <Tag tone="acc">{prof.code}</Tag>
            <Pill tone={org.inherit ? 'acc' : 'mut'} icon={org.inherit ? 'link' : 'target'}>
              {org.inherit ? 'Inherits policy' : 'Explicit policy'}
            </Pill>
          </>
        )}
        meta={(
          <>
            <Fact icon="hierarchy" label="Parent" value={org.parent || 'None (root)'} />
            <Fact icon="users" label="Identities" value={num(org.users)} />
            <Fact icon="lock" label="Policy" value={resolved.name} />
            <Fact icon="checkC" label="Status" value={org.status} />
            <Fact icon="layers" label="Children" value={num(children.length)} />
          </>
        )}
        actions={(
          <>
            <Button icon="hierarchy" onClick={() => navigate('/iam/organizationHierarchy')}>Hierarchy</Button>
            <Button
              icon={org.status === 'Active' ? 'ban' : 'checkC'}
              onClick={toggleStatus}
            >
              {org.status === 'Active' ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="pri" icon="edit" onClick={() => navigate(`/iam/organizations/${org.id}/edit`)}>Edit</Button>
            <Button
              icon="kebab"
              aria-label="More actions"
              onClick={(e) => setMenu({
                anchor: e.currentTarget,
                items: [
                  { label: org.name, header: true },
                  { id: 'policy', label: 'Manage password policy', icon: 'lock', onSelect: () => navigate('/iam/passwordPolicy') },
                  { id: 'child', label: 'New sub-organization', icon: 'plus', onSelect: () => navigate('/iam/organizations/add') },
                  { id: 'export', label: 'Export organization record', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${org.name} queued for CSV export.`) },
                  { divider: true },
                  {
                    id: 'inherit',
                    label: org.inherit ? 'Pin an explicit policy' : 'Restore policy inheritance',
                    icon: org.inherit ? 'target' : 'link',
                    disabled: !org.parent,
                    onSelect: () => onPatch(
                      org.id,
                      org.inherit ? { inherit: false, passwordPolicy: resolved.name } : { inherit: true, passwordPolicy: 'Inherited' },
                      org.inherit ? 'Explicit policy pinned' : 'Policy inheritance restored',
                      org.name,
                    ),
                  },
                  { divider: true },
                  {
                    id: 'del', label: 'Delete organization', icon: 'trash', danger: true, disabled: !org.parent || children.length > 0,
                    onSelect: () => onDelete(org),
                  },
                ],
              })}
            />
          </>
        )}
        tabs={(
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'Overview', icon: 'building' },
              { id: 'identities', label: 'Identities', icon: 'users', count: members.length },
              { id: 'children', label: 'Child organizations', icon: 'layers', count: children.length },
              { id: 'audit', label: 'Audit', icon: 'history' },
            ]}
          />
        )}
      />

      <div className="detail-body">
        {/* The card tabs are redrawn as shapes while they settle; the register
            tabs keep their own chrome and settle their rows instead. */}
        {settling && (tab === 'overview' || tab === 'audit') && <OrgPanelSkeleton tab={tab} />}

        {tab === 'overview' && !settling && (
          <OverviewTab
            org={org}
            orgs={orgs}
            members={members}
            kids={children}
            resolved={resolved}
            onTab={setTab}
            onInherit={(v) => onPatch(
              org.id,
              v ? { inherit: true, passwordPolicy: 'Inherited' } : { inherit: false, passwordPolicy: resolved.name },
              v ? 'Policy inheritance restored' : 'Explicit policy pinned',
              org.name,
            )}
          />
        )}
        {tab === 'identities' && <IdentitiesTab org={org} members={members} loading={settling} />}
        {tab === 'children' && <ChildrenTab org={org} kids={children} loading={settling} />}
        {tab === 'audit' && !settling && <AuditTab org={org} members={members} kids={children} />}
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
