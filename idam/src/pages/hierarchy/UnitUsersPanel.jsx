import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Pill from '../../components/primitives/Pill'
import { num, statusTone } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { useState } from 'react'
import { fullName } from './hierarchyData'

export default function UnitUsersPanel({ users }) {
  const { navigate } = useApp()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? users.filter((u) => `${fullName(u)} ${u.username} ${u.email}`.toLowerCase().includes(needle))
    : users

  return (
    <div className="stack">
      <div className="wb-search is-block">
        <Icon name="search" size={14} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, username or email…"
          aria-label="Filter users"
        />
        {q && <IconButton icon="x" size="sm" label="Clear filter" onClick={() => setQ('')} />}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          size="sm"
          icon="users"
          title="No users"
          body={needle ? 'No user in this unit matches the filter.' : 'No identity is assigned to this unit yet.'}
        />
      ) : (
        <div className="hier-users">
          {shown.map((u) => (
            <div className="hier-user" key={u.id}>
              <span className="feed-ic" data-tone="mut"><Icon name="user" size={13} /></span>
              <span className="hier-user-m">
                <span className="hier-user-n trunc">{fullName(u)}</span>
                <span className="hier-user-s trunc"><span className="mono">{u.username}</span> · {u.email}</span>
              </span>
              <Pill tone={statusTone(u.status)} dot>{u.status}</Pill>
              <IconButton icon="chevR" size="sm" label={`Open ${fullName(u)}`} onClick={() => navigate(`/iam/users/${u.id}`)} />
            </div>
          ))}
        </div>
      )}
      <div className="t-xs t-faint">{num(shown.length)} of {num(users.length)} users shown</div>
    </div>
  )
}

