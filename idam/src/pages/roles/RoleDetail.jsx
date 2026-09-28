import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import PermissionPicker, { PermissionReview } from './PermissionPicker'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Menu from '../../components/primitives/Menu'
import Pill from '../../components/primitives/Pill'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Tag from '../../components/primitives/Tag'
import Tabs from '../../components/primitives/Tabs'
import { useApp } from '../../store/AppContext'
import { num } from '../../lib/format'
import { useLoading } from '../../lib/useLoading'
import { WRITE_PERMS, permCount as countGranted, permTotal } from '../../lib/permissions'
import { PERM_CATALOG } from '../../data/seed'
import { countPerms, headTone, membersFor, normalize, riskTag, rulesFor, usePermDraft } from './roleModel'
import { ActivityTab, MembersTab, RulesTab } from './RoleTabs'
import { RolePanelSkeleton, RoleRecordSkeleton } from './RolesSkeleton'

export default function RoleDetail({ role, onPatch, onDuplicate, onDelete }) {
  const { navigate, toast } = useApp()
  const [tab, setTab] = useState('permissions')
  const [menu, setMenu] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  // One source of truth for membership. Header fact, tab badge and the members
  // table all read this list, so they cannot drift apart.
  const [memberIds, setMemberIds] = useState(() => (
    Array.isArray(role.memberIds) ? role.memberIds : membersFor(role).map((u) => u.id)
  ))
  const matrix = usePermDraft(role.perms)
  /* Two scopes off one timer, as the organization record does. `arriving` is
     the whole record — masthead, tab strip and panel resolve together, so
     landing on a role settles as one thing. `settling` is the panel alone,
     which is all a tab change fetches: the tab bar is chrome and stays where
     the pointer left it. */
  const arriving = useLoading(role.id)
  const settling = useLoading(`${role.id}:${tab}`)
  const memberCount = memberIds.length
  const rules = rulesFor(role, memberCount)

  const dirty = normalize(matrix.perms) !== normalize(role.perms)
  const granted = countGranted(PERM_CATALOG, matrix.perms)
  const modules = Object.keys(matrix.perms).filter((k) => matrix.perms[k].length).length
  const writeModules = Object.entries(matrix.perms).filter(([, ps]) => ps.some((p) => WRITE_PERMS.has(p))).length

  const savePerms = () => {
    onPatch(role.id, {
      perms: matrix.perms,
      permCount: countPerms(matrix.perms),
      moduleCount: Object.keys(matrix.perms).length,
    })
    toast('ok', 'Permissions saved', `${role.name} now grants ${num(granted)} permissions across ${num(modules)} modules.`)
  }

  // Every membership change writes the list and its length together, so the
  // catalog card, the header fact and the tab badge stay in step.
  const applyMembers = (next) => {
    setMemberIds(next)
    onPatch(role.id, { memberIds: next, members: next.length })
  }

  const addMembers = (ids) => {
    applyMembers([...new Set([...memberIds, ...ids])])
    toast('ok', 'Members added', `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} added to ${role.name}.`)
  }

  const removeMembers = (ids) => {
    const set = new Set(ids)
    applyMembers(memberIds.filter((id) => !set.has(id)))
    toast('ok', 'Members removed', `${ids.length} ${ids.length === 1 ? 'identity loses' : 'identities lose'} ${role.name} at the next provisioning run.`)
  }

  if (arriving) return <RoleRecordSkeleton tab={tab} />

  return (
    <>
      <DetailHeader
        backTo="/iam/roles"
        backLabel="Roles"
        eyebrow={role.system ? 'System role' : 'Custom role'}
        title={role.name}
        sub={role.description}
        media={(
          <span className="feed-ic" data-tone={headTone(role.risk)} style={{ width: 52, height: 52 }}>
            <Icon name="roles" style={{ width: 24, height: 24 }} />
          </span>
        )}
        badges={(
          <>
            {role.risk && <SeverityBadge level={role.risk}>{riskTag(role.risk)} risk</SeverityBadge>}
            <Tag tone={role.system ? undefined : 'acc'}>{role.type}</Tag>
            {role.scope && <Pill tone="mut" icon="target">{role.scope}</Pill>}
            {role.system && <Pill tone="mut" icon="lock">Read-only</Pill>}
          </>
        )}
        meta={(
          <>
            <Fact icon="users" label="Members" value={num(memberCount)} />
            <Fact icon="key" label="Permissions" value={`${num(granted)} of ${num(permTotal(PERM_CATALOG))}`} />
            <Fact icon="layers" label="Modules" value={num(modules)} />
            {role.scope && <Fact icon="target" label="Scope" value={role.scope} />}
          </>
        )}
        actions={(
          <>
            <Button icon="copy" onClick={() => onDuplicate(role)}>Duplicate</Button>
            {role.system
              ? <Pill tone="mut" icon="lock">System role</Pill>
              : <Button variant="pri" icon="edit" onClick={() => navigate(`/iam/roles/${role.id}/edit`)}>Edit role</Button>}
            <Button
              icon="kebab"
              aria-label="More actions"
              onClick={(e) => setMenu({
                anchor: e.currentTarget,
                items: [
                  { label: role.name, header: true },
                  { id: 'export', label: 'Export permissions', icon: 'download', onSelect: () => toast('ok', 'Export queued', `${role.name} permissions queued as CSV.`) },
                  { id: 'sod', label: 'Check for duty conflicts', icon: 'sod', onSelect: () => navigate('/iam/segregationofduties/rules') },
                  { divider: true },
                  {
                    id: 'del', label: 'Delete role', icon: 'trash', danger: true, disabled: !!role.system,
                    onSelect: () => onDelete([role.id], `Delete ${role.name}?`),
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
              { id: 'permissions', label: 'Permissions', icon: 'key', count: granted },
              { id: 'members', label: 'Members', icon: 'users', count: memberCount },
              { id: 'rules', label: 'Assignment rules', icon: 'policy', count: rules.length },
              { id: 'activity', label: 'Activity', icon: 'activity' },
            ]}
          />
        )}
      />

      <div className="detail-body">
        {/* The card and picker tabs are redrawn as shapes while they settle;
            Members keeps its own toolbar and settles its rows instead. */}
        {settling && tab !== 'members' && <RolePanelSkeleton tab={tab} />}

        {tab === 'permissions' && !settling && (
          <div className="stack">
            <div className="stat-strip">
              <div className="stat-cell">
                <span className="stat-k"><Icon name="key" size={12} />Permissions granted</span>
                <span className="stat-v">{num(granted)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="layers" size={12} />Modules reached</span>
                <span className="stat-v">{num(modules)} / {num(PERM_CATALOG.length)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="bolt" size={12} />Write-capable modules</span>
                <span className="stat-v">{num(writeModules)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-k"><Icon name="users" size={12} />Identities affected</span>
                <span className="stat-v">{num(memberCount)}</span>
              </div>
            </div>

            {role.system && (
              <div className="banner" data-tone="info">
                <Icon name="info" size={15} />
                <div>
                  {role.name} is defined by the platform. Its permissions cannot be edited or deleted. Duplicate it to
                  create a custom role you can narrow down.
                </div>
              </div>
            )}

            {!role.system && writeModules > 0 && (
              <div className="banner" data-tone="warn">
                <Icon name="warn" size={15} />
                <div>
                  This role can write in {num(writeModules)} {writeModules === 1 ? 'module' : 'modules'}. Every change
                  to the permission set is written to the audit trail.
                </div>
              </div>
            )}

            <PermissionPicker
              catalog={PERM_CATALOG}
              granted={matrix.perms}
              readOnly={!!role.system}
              onToggle={matrix.toggle}
              onSetModule={matrix.setModule}
              note={role.system ? 'System role · read-only' : 'Changes apply at the next provisioning run'}
              maxHeight={560}
            />

            {!role.system && (
              <StickyActions dirty={dirty} message={dirty ? `Unsaved permission changes · ${num(granted)} granted` : `${num(granted)} permissions granted`}>
                <Button disabled={!dirty} onClick={() => matrix.setPerms(role.perms)}>Discard</Button>
                <Button variant="pri" icon="save" disabled={!dirty} onClick={() => setReviewing(true)}>Review & save</Button>
              </StickyActions>
            )}
          </div>
        )}

        {tab === 'members' && (
          <MembersTab role={role} memberIds={memberIds} onAdd={addMembers} onRemove={removeMembers} loading={settling} />
        )}

        {tab === 'rules' && !settling && <RulesTab role={role} rules={rules} memberCount={memberCount} />}

        {tab === 'activity' && !settling && <ActivityTab role={role} memberCount={memberCount} />}
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}

      {reviewing && (
        <PermissionReview
          catalog={PERM_CATALOG}
          granted={matrix.perms}
          title={`Save permission changes to ${role.name}?`}
          body="Confirm that every permission below belongs in this role before the change is committed."
          confirmLabel="Save permissions"
          onConfirm={savePerms}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  )
}
