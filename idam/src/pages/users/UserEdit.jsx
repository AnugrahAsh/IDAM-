import { useMemo } from 'react'
import IdentityForm from './IdentityForm'
import { IdentityFormSkeleton } from './IdentitySkeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { useSchema, visibleAttrs } from '../configurations/schemaStore'
import { patchUser, useUsers, userByKey } from './usersStore'
import UserNotFound from './UserNotFound'

/* The three cards the editor prints after the schema sections: Documents,
   Policy exception and Entitlements. They are fixed in IdentityForm rather than
   configured, so the count is stated once here beside the shape it sizes. */
const FIXED_SECTIONS = 3

/** Edit one identity. */
export default function UserEdit({ id }) {
  const { toast, navigate } = useApp()
  const schema = useSchema()
  const rows = useUsers()
  const record = userByKey(rows, id)
  /* The editor opens filled with the identity it is editing, and filling it is
     a read — so it waits behind a shape the way the record does. Creating an
     identity reads nothing, which is why UserAdd holds no shape at all. */
  const loading = useLoading(id)

  /* The editor's height is the schema's, so the shape reads the schema rather
     than guessing at it. The rail prints one step per section plus the three
     fixed ones; the body prints a card only for a section that has an
     attribute on it, and only the first of those opens. */
  const shape = useMemo(() => {
    const visible = visibleAttrs(schema.attrs)
    const ordered = schema.sections.slice().sort((a, b) => a.order - b.order)
    return {
      steps: ordered.length + FIXED_SECTIONS,
      sections: ordered
        .map((s) => visible.filter((a) => a.section === s.id).length)
        .filter((n) => n > 0),
      extras: FIXED_SECTIONS,
    }
  }, [schema])

  if (!record) return <UserNotFound id={id} />
  if (loading) return <IdentityFormSkeleton {...shape} />

  const save = (payload) => {
    const username = String(payload.username || record.username).trim().toUpperCase()
    patchUser(record.id, { ...payload, username })
    toast('ok', 'Identity updated', `${username} saved and queued for provisioning.`)
    navigate(`/iam/users/${record.id}`)
  }

  return (
    <IdentityForm
      key={`edit-${record.id}`}
      user={record}
      existing={rows}
      onSave={save}
      onCancel={() => navigate(`/iam/users/${record.id}`)}
    />
  )
}
