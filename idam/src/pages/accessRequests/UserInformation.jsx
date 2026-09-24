import './UserInformation.css'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import { statusTone, userOf } from './data'

/**
 * Who the request is about.
 *
 * A request summary says what is being asked for; it never said who for. On a
 * joiner that left an approver deciding on a person whose name, email, start
 * date and manager were summarised into a single line, and on every other type
 * it left the identity's own details a click away on another screen.
 *
 * The panel reads the request as it currently stands — including anything an
 * approver has edited — so what is shown here is what will be written if it is
 * approved now.
 */

const LABEL_ROWS = [
  { group: 'Identity', icon: 'user', fields: [
    ['Sign-in name', 'username', 'user'],
    ['First name', 'firstName', 'user'],
    ['Last name', 'lastName', 'user'],
    ['Email', 'email', 'at'],
    ['Mobile no', 'mobileNo', 'phone'],
  ] },
  { group: 'Placement', icon: 'building', fields: [
    ['Organization', 'organization', 'building'],
    ['Department', 'department', 'hierarchy'],
    ['Designation', 'designation', 'tag'],
    ['Office level', 'officeLevel', 'layers'],
    ['Manager', 'manager', 'approve'],
  ] },
  { group: 'Employment', icon: 'calendar', fields: [
    ['Employee type', 'employeeType', 'roles'],
    ['Start date', 'startDate', 'calendar'],
    ['Contract end date', 'endDate', 'calendar'],
    ['Cost center', 'costCenter', 'file'],
  ] },
]

/* The directory record, for a request about an identity that already exists. */
const EXISTING_ROWS = [
  { group: 'Identity', icon: 'user', fields: [
    ['Sign-in name', 'username', 'user'],
    ['Full name', '__name', 'user'],
    ['Email', 'email', 'at'],
    ['Mobile no', 'mobileNo', 'phone'],
    ['Employee code', 'empCode', 'file'],
  ] },
  { group: 'Placement', icon: 'building', fields: [
    ['Organization', 'organization', 'building'],
    ['Department', 'department', 'hierarchy'],
    ['Designation', 'designation', 'tag'],
    ['Office level', 'officeLevel', 'layers'],
    ['Manager', 'manager', 'approve'],
  ] },
  { group: 'Account', icon: 'shield', fields: [
    ['Employee type', 'employeeType', 'roles'],
    ['Location', '__location', 'mapPin'],
    ['Created', 'createdOn', 'history'],
    ['Last sign-in', 'lastLogin', 'clock'],
  ] },
]

/* A change set, keyed by the field label it applies to, so a panel that reads
   attributes by name can say what the request does to each one. */
const byField = (changes) => {
  const out = {}
  changes.filter((c) => !c.removedByYou).forEach((c) => {
    out[String(c.field).toLowerCase()] = c
  })
  return out
}

function Value({ change, fallback }) {
  if (!change) return <span>{fallback || '—'}</span>
  const next = change.current != null ? change.current : change.to
  const prior = change.from
  const edited = change.editedByYou || (change.editedAtLevels || []).length > 0
  /* A new identity has nothing to compare against, so only a change against an
     existing value is worth showing as one. */
  const isNew = !prior || prior === 'New identity' || prior === 'Not held' || prior === '—'
  return (
    <span className="ui-val">
      {!isNew && <span className="ui-from">{prior}</span>}
      {!isNew && <Icon name="arrowRight" size={11} />}
      <span className="ui-to">{next || '—'}</span>
      {edited && (
        <Tag tone="warn">
          {change.editedByYou
            ? 'Edited by you'
            : `Edited at level ${(change.editedAtLevels || []).join(', ')}`}
        </Tag>
      )}
    </span>
  )
}

export default function UserInformation({ row, changes = [] }) {
  const map = byField(changes)
  const joiner = row.type === 'Add user'
  const u = !joiner && row.userId ? userOf(row.userId) : null
  const profile = row.profile || {}

  const valueFor = (key, label) => {
    const change = map[String(label).toLowerCase()]
    if (joiner) {
      const fallback = key === 'username' ? row.username : profile[key]
      return <Value change={change} fallback={fallback} />
    }
    const base = key === '__name' ? (u ? `${u.firstName} ${u.lastName}` : '')
      : key === '__location' ? (u ? [u.city, u.state, u.country].filter(Boolean).join(', ') : '')
        : (u ? u[key] : '')
    return <Value change={change} fallback={base} />
  }

  const groups = joiner ? LABEL_ROWS : EXISTING_ROWS

  return (
    <Card
      title="User information"
      sub={joiner
        ? 'The identity this request creates, as it currently stands. An approver may correct any of it before signing.'
        : u
          ? `The directory record for ${u.username}, with anything this request changes shown against it.`
          : 'The identity this request applies to.'}
      actions={joiner
        ? <Tag tone="acc">New identity</Tag>
        : u
          ? <Pill tone={statusTone(u.status)} dot>{u.status}</Pill>
          : null}
    >
      {!joiner && !u ? (
        <div className="banner" data-tone="info">
          <Icon name="info" size={15} />
          <div>This request is not linked to a directory identity, so there is no record to show.</div>
        </div>
      ) : (
        <div className="ui-groups">
          {groups.map((g) => {
            const rows = g.fields
              .map(([label, key, icon]) => ({ k: label, icon, node: valueFor(key, label) }))
              // A blank attribute on a joiner was never asked for; showing an
              // empty row for it pads the panel without saying anything.
              .filter((r) => !joiner || r.node)
            return (
              <div className="ui-group" key={g.group}>
                <div className="ui-group-h"><Icon name={g.icon} size={12} />{g.group}</div>
                <KeyValue rows={rows} cols={2} dense />
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
