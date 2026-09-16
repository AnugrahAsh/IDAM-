import { useMemo, useState } from 'react'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Field from '../../components/primitives/Field'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Switch from '../../components/primitives/Switch'
import { USERS } from '../../data/seed'
import { num, serialColumn } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { downloadCsv } from '../reports/exportCsv'
import { TEMPLATE_NAME, TEMPLATE_ROWS, inDirectory, parseUsernames, plural } from './signOnPolicyData'

const DIRECTORY_BY_NAME = new Map(USERS.map((u) => [u.username.toLowerCase(), u]))

/**
 * The users a rule never applies to.
 *
 * A table rather than a file name: every excluded username is a row, so the
 * list can be searched, individual or many rows removed, and users added
 * straight from the directory. CSV upload is still the way an estate-wide list
 * arrives — one file adds usernames, another removes them — and what a file
 * produced is reported before anything is saved.
 */
export default function ExclusionEditor({ draft, issue, onChange }) {
  const { toast } = useApp()
  // Which inline panel is open: add users from the directory, add from a CSV,
  // or remove by CSV.
  const [panel, setPanel] = useState(null)
  const [picked, setPicked] = useState([])
  const [error, setError] = useState('')
  const usernames = draft.excludedUsernames
  const file = draft.excludedFile

  const rows = useMemo(() => usernames.map((u) => {
    const identity = DIRECTORY_BY_NAME.get(String(u).toLowerCase())
    return {
      id: u,
      username: u,
      known: !!identity,
      department: identity ? identity.department : '',
      organization: identity ? identity.organization : '',
      status: identity ? identity.status : '',
    }
  }), [usernames])
  const unknown = rows.filter((r) => !r.known).length

  const setList = (next, fileMeta) => onChange({
    excludedUsernames: next,
    excludedFile: fileMeta === undefined ? (next.length ? file : null) : fileMeta,
  })

  const merge = (incoming) => {
    const have = new Set(usernames)
    const added = incoming.filter((u) => !have.has(u))
    return { next: [...usernames, ...added], added: added.length, skipped: incoming.length - added.length }
  }

  const pickerOptions = useMemo(() => {
    const have = new Set(usernames)
    return USERS
      .filter((u) => !have.has(u.username.toLowerCase()))
      .map((u) => ({ value: u.username.toLowerCase(), label: `${u.username} · ${u.department}` }))
  }, [usernames])

  const openPanel = (next) => {
    setError('')
    setPicked([])
    setPanel((p) => (p === next ? null : next))
  }

  const addPicked = () => {
    if (picked.length === 0) {
      setError('Select at least one user to exclude.')
      return
    }
    const { next, added } = merge(picked)
    setList(next)
    setPicked([])
    setError('')
    setPanel(null)
    toast('ok', 'Users excluded', `${plural(added, 'user')} added to the exclusion list. Save the rule to apply it.`)
  }

  const remove = (ids, clear) => {
    const drop = new Set(ids)
    const next = usernames.filter((u) => !drop.has(u))
    setList(next)
    if (clear) clear()
    toast('ok', 'Users removed', `${plural(ids.length, 'user')} removed from the exclusion list. Save the rule to apply it.`)
  }

  const readCsv = (files, mode) => {
    const f = files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseUsernames(reader.result)
      if (parsed.usernames.length === 0) {
        setError('The CSV file does not contain any usernames.')
        return
      }
      setError('')
      if (mode === 'csv-add') {
        const { next, added, skipped } = merge(parsed.usernames)
        setList(next, { name: f.name, size: f.size, duplicates: parsed.duplicates, header: parsed.header })
        toast(added ? 'ok' : 'info', 'CSV read', added
          ? `${plural(added, 'username')} added${skipped ? `, ${plural(skipped, 'username')} already on the list` : ''}${parsed.duplicates ? `, ${plural(parsed.duplicates, 'duplicate')} dropped` : ''}.`
          : 'Every username in the file is already excluded.')
      } else {
        const drop = new Set(parsed.usernames)
        const next = usernames.filter((u) => !drop.has(u))
        const removed = usernames.length - next.length
        setList(next)
        toast(removed ? 'ok' : 'info', 'CSV read', removed
          ? `${plural(removed, 'username')} removed from the exclusion list${parsed.usernames.length - removed ? `, ${plural(parsed.usernames.length - removed, 'username')} not on the list` : ''}.`
          : 'None of the usernames in the file were on the exclusion list.')
      }
      setPanel(null)
    }
    reader.onerror = () => setError(`${f.name} could not be read. Export the file again and retry.`)
    reader.readAsText(f)
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'username', label: 'Username', locked: true, cls: 'td-main td-mono',
      render: (r) => <span className="mono">{r.username}</span>,
    },
    {
      key: 'known', label: 'Directory',
      value: (r) => (r.known ? 'Matches a directory identity' : 'Not found in the directory'),
      render: (r) => (r.known
        ? <Pill tone="ok" dot>Matched</Pill>
        : <Pill tone="warn" icon="warn">Not found</Pill>),
    },
    { key: 'department', label: 'Department', render: (r) => r.department || <span className="t-faint">—</span> },
    { key: 'organization', label: 'Organization', optional: true, render: (r) => r.organization || <span className="t-faint">—</span> },
    {
      key: 'status', label: 'Account status', optional: true,
      render: (r) => (r.status ? <Pill tone={r.status === 'Active' ? 'ok' : r.status === 'Locked' ? 'bad' : 'mut'} dot>{r.status}</Pill> : <span className="t-faint">—</span>),
    },
  ]

  return (
    <Card
      title="Excluded users"
      sub="Identities this rule never applies to"
      actions={(
        <label className="sop-switch">
          <span className="t-sm">Exclude users</span>
          <Switch checked={draft.excludeUsers} label="Exclude users" onChange={(v) => onChange({ excludeUsers: v })} />
        </label>
      )}
    >
      {!draft.excludeUsers ? (
        <div className="sop-off"><Icon name="users" size={14} />Every identity is evaluated against this rule.</div>
      ) : (
        <div className="stack" data-issue={issue ? 'true' : undefined}>
          {issue && !error && (
            <span className="field-err" role="alert"><Icon name="warn" size={11} />{issue}</span>
          )}

          <div className="sop-users-h">
            <span><b className="num">{num(usernames.length)}</b> excluded</span>
            <span><b className="num">{num(usernames.length - unknown)}</b> match a directory identity</span>
            {unknown > 0 && (
              <span className="sop-users-warn"><Icon name="warn" size={11} /><b className="num">{num(unknown)}</b> not found in the directory</span>
            )}
            {file && (
              <span className="t-xs t-mut">
                Last file {file.name}{file.size != null ? ` · ${formatSize(file.size)}` : ''}
              </span>
            )}
          </div>

          {panel === 'add' && (
            <div className="sop-panel">
              <Field
                label="Users to exclude"
                required
                error={error}
                hint="Pick one or more identities from the directory. Usernames already on the list are not offered again."
                htmlFor="sop-exclude-pick"
              >
                <SearchSelect
                  id="sop-exclude-pick"
                  multiple
                  value={picked}
                  options={pickerOptions}
                  placeholder="Select users"
                  searchPlaceholder="Search the directory…"
                  emptyLabel="No identity matches"
                  onChange={(e) => setPicked(e.target.value)}
                />
              </Field>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <Button size="sm" onClick={() => setPanel(null)}>Cancel</Button>
                <Button size="sm" variant="pri" icon="plus" onClick={addPicked}>
                  {picked.length > 1 ? `Add ${picked.length} users` : 'Add user'}
                </Button>
              </div>
            </div>
          )}

          {(panel === 'csv-add' || panel === 'csv-remove') && (
            <div className="sop-panel">
              <Field
                label={panel === 'csv-add' ? 'CSV file of users to add' : 'CSV file of users to remove'}
                required
                error={error}
                hint={panel === 'csv-add'
                  ? 'Every cell is read as a username; a leading username, user or user_name header is skipped, and values are trimmed, lowercased and de-duplicated. Usernames already on the list are skipped.'
                  : 'Every username in the file that is on the exclusion list is removed from it. Usernames not on the list are ignored.'}
              >
                <FileDrop
                  accept=".csv"
                  label="Drag a CSV file here, or browse"
                  hint=".csv up to 5 MB · read in this browser"
                  onFiles={(files) => readCsv(files, panel)}
                />
              </Field>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <Button size="sm" icon="download" onClick={() => downloadCsv(TEMPLATE_NAME, TEMPLATE_ROWS.join('\r\n'))}>
                  Download template
                </Button>
                <span className="t-xs t-mut">{TEMPLATE_NAME} — a username header and three example rows</span>
                <span className="spacer" />
                <Button size="sm" onClick={() => setPanel(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <DataWorkbench
            id="sop-excluded-users"
            rows={rows}
            columns={columns}
            selectable
            searchPlaceholder="Search excluded users…"
            toolbar={(
              <>
                <Button size="sm" icon="plus" aria-pressed={panel === 'add'} onClick={() => openPanel('add')}>Add users</Button>
                <Button size="sm" icon="upload" aria-pressed={panel === 'csv-add'} onClick={() => openPanel('csv-add')}>Add from CSV</Button>
                <Button size="sm" icon="minus" aria-pressed={panel === 'csv-remove'} onClick={() => openPanel('csv-remove')}>Remove by CSV</Button>
              </>
            )}
            bulkActions={(ids, clear) => (
              <Button size="sm" variant="danger" icon="trash" onClick={() => remove(ids, clear)}>
                Remove {ids.length > 1 ? `${ids.length} users` : 'user'}
              </Button>
            )}
            rowActions={(r) => [
              { id: 'remove', label: 'Remove from exclusions', icon: 'trash', danger: true, onSelect: () => remove([r.id]) },
            ]}
            emptyTitle="No excluded users"
            emptyBody="Add users from the directory or upload a CSV file. Until then the rule applies to every identity."
            emptyIcon="users"
            footNote={unknown > 0 ? 'Usernames not found in the directory are still saved with the rule' : 'Excluded users are saved with the rule'}
            pageSize={10}
          />
        </div>
      )}
    </Card>
  )
}
