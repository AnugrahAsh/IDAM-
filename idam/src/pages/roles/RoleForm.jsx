import { useState } from 'react'
import DetailHeader from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import PermissionPicker, { PermissionReview } from './PermissionPicker'
import Card from '../../components/primitives/Card'
import Button from '../../components/primitives/Button'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import { num } from '../../lib/format'
import { permCount as countGranted } from '../../lib/permissions'
import { PERM_CATALOG } from '../../data/seed'
import { normalize, usePermDraft } from './roleModel'

export default function RoleForm({ role, roles, onSave, onCancel }) {
  const initial = {
    name: role ? role.name : '',
    description: role ? role.description : '',
  }
  const [draft, setDraft] = useState(initial)
  const [touched, setTouched] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const matrix = usePermDraft(role ? role.perms : {})
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  const clash = roles.some((r) => (!role || r.id !== role.id) && r.name.toLowerCase() === draft.name.trim().toLowerCase())
  const nameError = touched && !draft.name.trim()
    ? 'A role name is required.'
    : clash ? 'Another role already uses this name.' : null

  const granted = countGranted(PERM_CATALOG, matrix.perms)
  const modules = Object.keys(matrix.perms).filter((k) => matrix.perms[k].length).length
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
    || normalize(matrix.perms) !== normalize(role ? role.perms : {})

  const submit = () => {
    setTouched(true)
    if (!draft.name.trim() || clash) return
    setReviewing(true)
  }

  const commit = () => onSave({ ...draft, name: draft.name.trim(), perms: matrix.perms })

  return (
    <>
      <DetailHeader
        backTo={role ? `/iam/roles/${role.id}` : '/iam/roles'}
        backLabel={role ? role.name : 'Roles'}
        eyebrow={role ? 'Edit role' : 'New role'}
        title={draft.name.trim() || 'Untitled role'}
        sub="A role is a named bundle of permissions. Keep it narrow enough that an owner can defend every entitlement inside it."
        media={(
          <span className="feed-ic" data-tone="acc" style={{ width: 44, height: 44 }}>
            <Icon name="roles" style={{ width: 20, height: 20 }} />
          </span>
        )}
        badges={(
          <>
            <Pill tone="acc" icon="key">{num(granted)} permissions</Pill>
            <Pill tone="mut" icon="layers">{num(modules)} modules</Pill>
          </>
        )}
        actions={(
          <>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="pri" icon="save" onClick={submit}>{role ? 'Review & save' : 'Review & create'}</Button>
          </>
        )}
      />

      <div className="detail-body">
        <div className="stack">
          <Card title="Definition" sub="What the role is called and how it is described to approvers.">
            <div className="grid grid-2">
              <Field label="Role name" required span={2} htmlFor="role-name" error={nameError}>
                <TextInput
                  id="role-name"
                  value={draft.name}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Finance Access Approver"
                />
              </Field>
              <Field label="Description" required span={2} htmlFor="role-desc" hint="Shown to approvers and auditors when this role is requested or reviewed.">
                <TextInput
                  as="textarea"
                  id="role-desc"
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Reviews and approves access requests within an assigned organizational scope."
                />
              </Field>
            </div>
          </Card>

          <div className="section">
            <div className="section-head">
              <span className="section-title">Permissions</span>
              <span className="section-sub">
                Pick a module on the left, then tick the permissions it should carry. Each module lists its own
                action set — Users, Recertification and Provisioning go beyond plain create/read/update/delete.
                The panel on the right keeps a running summary of everything granted.
              </span>
            </div>
            <PermissionPicker
              catalog={PERM_CATALOG}
              granted={matrix.perms}
              onToggle={matrix.toggle}
              onSetModule={matrix.setModule}
              note="Changes apply at the next provisioning run"
            />
          </div>
        </div>

        <StickyActions dirty={dirty} message={dirty ? `Unsaved changes · ${num(granted)} permissions selected` : 'No changes'}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="pri" icon="save" onClick={submit}>{role ? 'Review & save' : 'Review & create'}</Button>
        </StickyActions>
      </div>

      {reviewing && (
        <PermissionReview
          catalog={PERM_CATALOG}
          granted={matrix.perms}
          title={role ? `Save changes to ${draft.name.trim()}?` : `Create ${draft.name.trim()}?`}
          body="Confirm that every permission below belongs in this role before it is written to the catalog."
          confirmLabel={role ? 'Save role' : 'Create role'}
          onConfirm={commit}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  )
}
