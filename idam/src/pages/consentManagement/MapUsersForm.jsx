import { useMemo, useState } from 'react'
import Check from '../../components/primitives/Check'
import Avatar from '../../components/primitives/Avatar'
import Icon from '../../components/primitives/Icon'
import IconButton from '../../components/primitives/IconButton'
import Button from '../../components/primitives/Button'
import Banner from '../../components/primitives/Banner'
import EmptyState from '../../components/primitives/EmptyState'
import { USERS } from '../../data/seed'
import { num } from '../../lib/format'

/**
 * Map users to, or remove users from, a consent.
 *
 * Adding searches the whole directory; removing only ever offers identities the
 * consent actually holds, so it is impossible to "remove" someone who was never
 * mapped.
 */
export default function MapUsersForm({ mode, held, value, onChange }) {
  const [q, setQ] = useState('')
  const pool = useMemo(
    () => (mode === 'add' ? USERS.filter((u) => !held.includes(u.id)) : USERS.filter((u) => held.includes(u.id))),
    [mode, held],
  )

  const matches = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? pool.filter((u) => `${u.firstName} ${u.lastName} ${u.username} ${u.email} ${u.organization}`.toLowerCase().includes(n))
      : pool
    return list.slice(0, 60)
  }, [pool, q])

  const allShown = matches.length > 0 && matches.every((u) => value.includes(u.id))

  if (pool.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon="users"
        title={mode === 'add' ? 'Every identity is already mapped' : 'No identity is mapped'}
        body={mode === 'add'
          ? 'There is nobody left in the directory to map to this consent.'
          : 'Map identities to this consent before removing any.'}
      />
    )
  }

  return (
    <div className="stack">
      <div className="row-between">
        <span className="wb-search" style={{ flex: 1 }}>
          <Icon name="search" size={13} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or organization…" aria-label="Search identities" />
          {q && <IconButton icon="x" size="sm" label="Clear search" onClick={() => setQ('')} />}
        </span>
        <Button
          size="sm"
          onClick={() => onChange(allShown
            ? value.filter((id) => !matches.some((u) => u.id === id))
            : [...new Set([...value, ...matches.map((u) => u.id)])])}
        >
          {allShown ? 'Clear shown' : 'Select shown'}
        </Button>
      </div>

      <div className="ci-picker" style={{ maxHeight: 340 }}>
        {matches.map((u) => (
          <label className="ci-pick" key={u.id}>
            <Check
              checked={value.includes(u.id)}
              label={`Select ${u.username}`}
              onChange={() => onChange(value.includes(u.id) ? value.filter((x) => x !== u.id) : [...value, u.id])}
            />
            <Avatar first={u.firstName} last={u.lastName} size="sm" />
            <span className="trunc">
              <span style={{ display: 'block' }}>{u.firstName} {u.lastName}</span>
              <span className="cell-sub">{u.username} · {u.organization}</span>
            </span>
          </label>
        ))}
        {matches.length === 0 && <div className="t-sm t-mut" style={{ padding: 10 }}>No identity matches.</div>}
      </div>

      <div className="t-xs t-mut">
        {num(value.length)} selected · showing {num(matches.length)} of {num(pool.length)} available
      </div>

      {mode === 'remove' && value.length > 0 && (
        <Banner tone="warn">
          Removing takes {num(value.length)} {value.length === 1 ? 'identity' : 'identities'} out of scope. Acceptance
          records already captured are retained as evidence and stay visible under Records.
        </Banner>
      )}
    </div>
  )
}
