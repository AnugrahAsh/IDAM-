import './styles/DirectoryPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageBar from '../components/shell/PageBar'
import DataWorkbench from '../components/workbench/DataWorkbench'
import Menu from '../components/primitives/Menu'
import Button from '../components/primitives/Button'
import Pill from '../components/primitives/Pill'
import Avatar from '../components/primitives/Avatar'
import Icon from '../components/primitives/Icon'
import Field from '../components/primitives/Field'
import TextInput from '../components/primitives/TextInput'
import EmptyState from '../components/primitives/EmptyState'
import StatChip from '../components/primitives/StatChip'
import IdentityDetail from './directory/IdentityDetail'
import IdentityForm from './directory/IdentityForm'
import { openResetPassword } from './directory/ResetPasswordForm'
import { stampStr } from './directory/identityData'
import { useApp } from '../store/AppContext'
import { num } from '../lib/format'
import { USERS, ATTRS, ME, nextId } from '../data/seed'

const attrsOf = (payload) => {
  const out = {}
  ATTRS.forEach((a) => { out[a.id] = payload[a.id] == null ? '' : payload[a.id] })
  return out
}

const csvHref = (text) => `data:text/csv;charset=utf-8,${encodeURIComponent(text)}`

const USER_SAMPLE = [
  'username,firstName,lastName,email,employeeType,organization,department,mobileNo,manager',
  'JANE_DOE,Jane,Doe,jane.doe@tanflow.com,Internal,Tanflow,Engineering,+91 9800000001,Shubham Jain',
  'RAVI_KUMAR,Ravi,Kumar,ravi.kumar@tanflow.com,Contractor,Tanflow · IT Ops,IT Operations,+91 9800000002,Priya Nair',
].join('\n')

const MODIFY_SAMPLE = [
  'username,department,designation,officeLevel,manager,organization',
  'JANE_DOE,Finance,Senior Engineer,Corporate,Priya Nair,Tanflow · Finance',
  'RAVI_KUMAR,IT Operations,Analyst,Zonal,Shubham Jain,Tanflow · IT Ops',
].join('\n')

const PASSWORD_SAMPLE = [
  'username,forceChangeAtNextSignIn',
  'JANE_DOE,true',
  'RAVI_KUMAR,true',
].join('\n')

const DELETE_SAMPLE = ['username', 'JANE_DOE', 'RAVI_KUMAR'].join('\n')

const GROUP_SAMPLE = [
  'username,groupName,groupType,action',
  'JANE_DOE,FIN_GL_POST,Access,add',
  'RAVI_KUMAR,ENG_REPO_ADMIN,Application,remove',
].join('\n')

const UPLOADS = {
  users: {
    title: 'Import users',
    sub: 'Create identities in bulk from an HR export. Nothing is written until every row has been validated.',
    sample: USER_SAMPLE,
    sampleName: 'tanflow-users-sample.csv',
    expects: ['username', 'firstName', 'lastName', 'email', 'employeeType', 'organization', 'department'],
    note: 'Credentials are never taken from the file. Every created identity receives a single-use enrollment link by email that expires after 24 hours and forces a change at first sign-in.',
    dupNote: 'Rows whose username already exists in the directory are rejected automatically and returned as failed entries. Existing identities are never overwritten.',
    report: true,
    okLabel: 'Imported',
    okVerb: 'imported',
    submitLabel: 'Submit',
    icon: 'upload',
  },
  modify: {
    title: 'Modify Bulk',
    sub: 'Apply attribute changes across many identities in a single run.',
    sample: MODIFY_SAMPLE,
    sampleName: 'tanflow-modify-sample.csv',
    expects: ['username', 'department', 'designation', 'officeLevel', 'manager'],
    dupNote: 'A username may appear only once in the file. Duplicate usernames are never processed — every duplicate row is rejected automatically and returned as a failed entry.',
    report: true,
    okLabel: 'Updated',
    okVerb: 'updated',
    submitLabel: 'Apply changes',
    icon: 'edit',
  },
  password: {
    title: 'Set / Reset Password Bulk',
    sub: 'Force a credential reset for every identity listed in the file.',
    sample: PASSWORD_SAMPLE,
    sampleName: 'tanflow-password-sample.csv',
    expects: ['username', 'forceChangeAtNextSignIn'],
    note: 'Each identity in the file receives a single-use reset link at its registered email address. The link expires after 24 hours and a password change is forced at next sign-in.',
    submitLabel: 'Reset credentials',
    icon: 'key',
  },
  delete: {
    title: 'Delete Bulk',
    sub: 'Remove every identity listed in the file and revoke what it holds.',
    sample: DELETE_SAMPLE,
    sampleName: 'tanflow-delete-sample.csv',
    expects: ['username'],
    danger: true,
    submitLabel: 'Delete identities',
    icon: 'trash',
  },
  groups: {
    title: 'Import Groups',
    sub: 'Add or remove group memberships for identities that already exist.',
    sample: GROUP_SAMPLE,
    sampleName: 'tanflow-groups-sample.csv',
    expects: ['username', 'groupName', 'groupType', 'action'],
    submitLabel: 'Import memberships',
    icon: 'group',
  },
}

function SelectionSync({ ids, onSync }) {
  const key = ids.join(',')
  useEffect(() => {
    onSync(key === '' ? [] : key.split(','))
    return () => onSync([])
  }, [key, onSync])
  return null
}

function UploadForm({ spec, onChange }) {
  const [val, setVal] = useState({ file: '' })
  const set = (patch) => {
    const next = { ...val, ...patch }
    setVal(next)
    onChange(next)
  }

  return (
    <div className="stack">
      <div className="banner" data-tone={spec.danger ? 'warn' : 'info'}>
        <Icon name="file" size={15} />
        <div>
          Every row is validated before anything is written. Rows that fail validation are returned as a
          downloadable error file and the rest of the run continues.
          {' '}
          <a className="link" href={csvHref(spec.sample)} download={spec.sampleName}>Download Sample CSV</a>
        </div>
      </div>

      <div className="t-micro t-mut">Source file</div>
      <Field label="CSV file" required hint="UTF-8, comma separated, first row must be the header." htmlFor="imp-file">
        <TextInput
          id="imp-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => set({ file: e.target.files && e.target.files[0] ? e.target.files[0].name : '' })}
        />
      </Field>

      <div>
        <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Expected columns</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {spec.expects.map((c) => <span className="tag mono" key={c}>{c}</span>)}
        </div>
      </div>

      {spec.dupNote && (
        <div className="banner" data-tone="warn">
          <Icon name="noentry" size={15} />
          <div>{spec.dupNote}</div>
        </div>
      )}

      {spec.note && (
        <div className="banner" data-tone="info">
          <Icon name="mail" size={15} />
          <div>{spec.note}</div>
        </div>
      )}

      {spec.danger && (
        <div className="banner" data-tone="bad">
          <Icon name="warn" size={15} />
          <div>
            Deletion revokes every entitlement held on every connected target at the next provisioning run.
            The operation is recorded on the audit trail and cannot be undone.
          </div>
        </div>
      )}
    </div>
  )
}

const buildReport = (kind, fileName) => {
  const seedN = Array.from(fileName).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 65536, 7)
  const total = 18 + (seedN % 24)
  const dupA = USERS[seedN % USERS.length].username
  const dupB = USERS[(seedN + 11) % USERS.length].username
  const failures = kind === 'users'
    ? [
      { row: 3 + (seedN % 4), username: dupA, kind: 'Duplicate', reason: 'Username already exists in the directory — row rejected, existing identity untouched.' },
      { row: 9 + (seedN % 5), username: dupB, kind: 'Duplicate', reason: 'Username already exists in the directory — row rejected, existing identity untouched.' },
      { row: 15 + (seedN % 3), username: 'A_KHAN', kind: 'Invalid value', reason: 'Email address fails validation.' },
    ]
    : [
      { row: 4 + (seedN % 4), username: dupA, kind: 'Duplicate', reason: 'Username listed more than once in the file — no occurrence was processed.' },
      { row: 11 + (seedN % 5), username: 'M_IQBAL', kind: 'Not found', reason: 'Username does not exist in the directory.' },
    ]
  return { total, ok: total - failures.length, failures }
}

function UploadResult({ spec, report, fileName }) {
  const failed = report.failures
  const errCsv = ['row,username,reason', ...failed.map((f) => `${f.row},${f.username},"${f.reason}"`)].join('\n')
  return (
    <div className="stack">
      <div className="banner" data-tone={failed.length ? 'warn' : 'ok'}>
        <Icon name={failed.length ? 'warn' : 'checkC'} size={15} />
        <div>
          {fileName} validated. {report.ok} of {report.total} rows {spec.okVerb}
          {failed.length
            ? `; ${failed.length} ${failed.length === 1 ? 'row was' : 'rows were'} rejected and left untouched.`
            : '.'}
          {failed.length > 0 && (
            <>
              {' '}
              <a className="link" href={csvHref(errCsv)} download={`${spec.sampleName.replace('.csv', '')}-failed.csv`}>
                Download failed rows
              </a>
            </>
          )}
        </div>
      </div>

      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="file" size={12} />Rows read</span>
          <span className="stat-v">{report.total}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="checkC" size={12} />{spec.okLabel}</span>
          <span className="stat-v" style={{ color: 'var(--ok)' }}>{report.ok}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="warn" size={12} />Failed</span>
          <span className="stat-v" style={{ color: failed.length ? 'var(--bad)' : undefined }}>{failed.length}</span>
        </div>
      </div>

      {failed.length > 0 && (
        <div>
          <div className="t-micro t-mut" style={{ marginBottom: 7 }}>Failed rows</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr><th>Row</th><th>Username</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {failed.map((f) => (
                  <tr key={f.row}>
                    <td className="td-mono">{f.row}</td>
                    <td className="td-mono">{f.username}</td>
                    <td>
                      <span className="row" style={{ gap: 7, alignItems: 'flex-start' }}>
                        <Pill tone={f.kind === 'Duplicate' ? 'bad' : 'warn'} dot>{f.kind}</Pill>
                        <span style={{ whiteSpace: 'normal' }}>{f.reason}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="t-xs t-mut">
        Duplicate usernames are never {spec.okVerb} or overwritten. Correct the failed rows and upload only those rows again.
      </div>
    </div>
  )
}

export default function DirectoryPage({ segments = [] }) {
  const { toast, confirm, setDrawer, navigate } = useApp()
  const [rows, setRows] = useState(USERS)
  const [picked, setPicked] = useState([])
  const [menu, setMenu] = useState(null)
  const [chip, setChip] = useState(null)
  const uploadRef = useRef({ file: '' })

  const rowFilter = useMemo(() => {
    if (chip === 'active') return (u) => u.status === 'Active'
    if (chip === 'locked') return (u) => u.status === 'Locked'
    return undefined
  }, [chip])

  const pickChip = (id) => setChip((c) => (c === id ? null : id))

  const syncSelection = useCallback((ids) => setPicked(ids), [])

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((u) => u.status === 'Active').length,
    locked: rows.filter((u) => u.status === 'Locked').length,
  }), [rows])

  const mode = segments[0]
  const record = mode && mode !== 'add' ? rows.find((r) => String(r.id) === String(mode)) : null

  const mutate = (ids, patch, message) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...patch } : r)))
    toast('ok', message, `${ids.length} ${ids.length === 1 ? 'identity' : 'identities'} updated.`)
  }

  const removeIds = (ids, clear) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
    if (clear) clear()
    toast('ok', 'Identities deleted', `${ids.length} removed from the directory.`)
  }

  const confirmDelete = (ids, clear, after) => confirm({
    title: ids.length === 1 ? 'Delete this identity?' : `Delete ${ids.length} identities?`,
    body: 'Every entitlement held by the selected identities will be revoked on the next provisioning run. This cannot be undone.',
    confirmLabel: `Delete ${ids.length}`,
    onConfirm: () => {
      removeIds(ids, clear)
      if (after) after()
    },
  })

  const runUpload = (kind) => {
    const spec = UPLOADS[kind]
    const state = uploadRef.current
    if (!state.file) {
      toast('warn', 'No file selected', `Choose a CSV file that matches the ${spec.title} template.`)
      return
    }
    const finish = () => {
      if (spec.report) {
        const report = buildReport(kind, state.file)
        setDrawer({
          title: `${spec.title} · Result`,
          sub: `${state.file} processed. Failed rows were skipped and can be corrected and re-uploaded.`,
          children: <UploadResult spec={spec} report={report} fileName={state.file} />,
          footer: <Button variant="pri" onClick={() => setDrawer(null)}>Done</Button>,
        })
        toast(
          report.failures.length ? 'warn' : 'ok',
          `${spec.title} completed`,
          `${report.ok} of ${report.total} rows ${spec.okVerb}, ${report.failures.length} failed.`,
        )
        return
      }
      setDrawer(null)
      toast(
        spec.danger ? 'warn' : 'ok',
        `${spec.title} queued`,
        `${state.file} accepted for validation.`,
      )
    }
    if (spec.danger) {
      confirm({
        title: 'Delete every identity in this file?',
        body: 'Each username in the file is deleted and its entitlements revoked. This cannot be undone.',
        confirmLabel: 'Delete identities',
        onConfirm: finish,
      })
      return
    }
    finish()
  }

  const openUpload = (kind) => {
    const spec = UPLOADS[kind]
    uploadRef.current = { file: '' }
    setDrawer({
      title: spec.title,
      sub: spec.sub,
      children: <UploadForm spec={spec} onChange={(v) => { uploadRef.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant={spec.danger ? 'danger' : 'pri'}
            icon={spec.icon}
            onClick={() => runUpload(kind)}
          >
            {spec.submitLabel}
          </Button>
        </>
      ),
    })
  }

  const exportRows = (label, count) => toast('ok', 'Export queued', `${num(count)} ${label} queued for CSV export.`)

  const createIdentity = (payload) => {
    const attrs = attrsOf(payload)
    const id = nextId(rows)
    const created = {
      ...attrs,
      id,
      username: String(attrs.username).trim().toUpperCase(),
      status: 'Pending',
      lastLogin: 'Never',
      createdOn: stampStr(0, 9),
      createdBy: ME.username,
    }
    setRows((rs) => [created, ...rs])
    toast('ok', 'Identity created', `${created.username} is pending first sign-in with ${payload.entitlements.length} entitlements.`)
    navigate(`/iam/users/${id}`)
  }

  const saveIdentity = (target, payload) => {
    const attrs = attrsOf(payload)
    const username = String(attrs.username).trim().toUpperCase()
    setRows((rs) => rs.map((r) => (r.id === target.id ? { ...r, ...attrs, username } : r)))
    toast('ok', 'Identity updated', `${username} saved and queued for provisioning.`)
    navigate(`/iam/users/${target.id}`)
  }

  if (mode === 'add') {
    return (
      <IdentityForm
        key="add"
        existing={rows}
        onCreate={createIdentity}
        onCancel={() => navigate('/iam/users')}
      />
    )
  }

  if (mode) {
    if (!record) {
      return (
        <>
          <PageBar
            title="Identity not found"
            sub="The record you followed no longer exists, or it was deleted in this session."
            crumbs={[{ label: 'Directory', to: '/iam/users' }, { label: 'Not found' }]}
          />
          <EmptyState
            icon="user"
            title={`No identity with id ${mode}`}
            body="The identity may have been deleted or you may be following a stale link. Return to the directory to search for it."
            actions={<Button variant="pri" icon="users" onClick={() => navigate('/iam/users')}>Back to directory</Button>}
          />
        </>
      )
    }

    if (segments[1] === 'edit') {
      return (
        <IdentityForm
          key={`edit-${record.id}`}
          user={record}
          existing={rows}
          onSave={(payload) => saveIdentity(record, payload)}
          onCancel={() => navigate(`/iam/users/${record.id}`)}
        />
      )
    }

    return (
      <IdentityDetail
        key={record.id}
        user={record}
        onPatch={(patch, message) => mutate([record.id], patch, message)}
        onDelete={() => confirmDelete([record.id], null, () => navigate('/iam/users'))}
      />
    )
  }

  const moreItems = () => {
    const n = picked.length
    const none = n === 0
    return [
      { id: 'delete', label: 'Delete', icon: 'trash', danger: true, disabled: none, onSelect: () => confirmDelete(picked) },
      { id: 'activate', label: 'Activate', icon: 'checkC', disabled: none, onSelect: () => mutate(picked, { status: 'Active' }, 'Identities activated') },
      { id: 'deactivate', label: 'Deactivate', icon: 'ban', disabled: none, onSelect: () => mutate(picked, { status: 'Disabled' }, 'Identities deactivated') },
      { id: 'modify-bulk', label: 'Modify Bulk', icon: 'edit', onSelect: () => openUpload('modify') },
      { id: 'password-bulk', label: 'Set/Reset Password Bulk', icon: 'key', onSelect: () => openUpload('password') },
      { id: 'delete-bulk', label: 'Delete Bulk', icon: 'trash', danger: true, onSelect: () => openUpload('delete') },
      { id: 'export', label: 'Export', icon: 'download', disabled: none, onSelect: () => exportRows('identities', n) },
      { id: 'export-all', label: 'Export all users', icon: 'download', onSelect: () => exportRows('identities', rows.length) },
      { id: 'import-groups', label: 'Import Groups', icon: 'upload', onSelect: () => openUpload('groups') },
      { id: 'export-groups', label: 'Export All Groups', icon: 'download', onSelect: () => toast('ok', 'Export queued', 'Every group membership in the directory is being written to CSV.') },
    ]
  }

  const columns = [
    {
      key: 'username', label: 'Username', locked: true, cls: 'td-main',
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">{r.username}</span>
        </span>
      ),
    },
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'email', label: 'Email' },
    {
      key: 'status', label: 'Status',
      render: (r) => (
        <Pill tone={r.status === 'Active' ? 'ok' : r.status === 'Locked' ? 'bad' : r.status === 'Pending' ? 'warn' : 'mut'} dot>
          {r.status}
        </Pill>
      ),
    },
  ]

  const openRecord = (r) => navigate(`/iam/users/${r.id}`)

  const rowActions = (r) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => openRecord(r) },
    {
      id: 'lock',
      label: r.status === 'Locked' ? 'Unlock account' : 'Lock account',
      icon: r.status === 'Locked' ? 'unlock' : 'lock',
      onSelect: () => mutate([r.id], { status: r.status === 'Locked' ? 'Active' : 'Locked' }, 'Status changed'),
    },
    { id: 'pw', label: 'Set/Reset Password', icon: 'key', onSelect: () => openResetPassword({ user: r, setDrawer, toast }) },
    { id: 'mfa', label: 'Reset MFA', icon: 'shield', onSelect: () => toast('ok', 'MFA reset', `${r.username} must enrol a factor at next sign-in.`) },
    { id: 'device', label: 'Reset Device', icon: 'refresh', onSelect: () => toast('ok', 'Device reset', `${r.username} must re-register a trusted device.`) },
    { divider: true },
    { id: 'del', label: 'Delete', icon: 'trash', danger: true, onSelect: () => confirmDelete([r.id]) },
  ]

  const bulkActions = (ids, clear) => (
    <>
      <SelectionSync ids={ids} onSync={syncSelection} />
      <Button size="sm" icon="checkC" onClick={() => { mutate(ids, { status: 'Active' }, 'Identities activated'); clear() }}>Activate</Button>
      <Button size="sm" icon="ban" onClick={() => { mutate(ids, { status: 'Disabled' }, 'Identities deactivated'); clear() }}>Deactivate</Button>
      <Button size="sm" icon="download" onClick={() => exportRows('identities', ids.length)}>Export</Button>
      <Button size="sm" variant="danger" icon="trash" onClick={() => confirmDelete(ids, clear)}>Delete</Button>
    </>
  )

  return (
    <>
      <PageBar
        title="Directory"
        sub="Every identity the platform governs."
        crumbs={[{ label: 'Directory' }]}
        actions={
          <>
            <Button variant="pri" icon="plus" onClick={() => navigate('/iam/users/add')}>Add User</Button>
            <Button icon="upload" onClick={() => openUpload('users')}>Import Users</Button>
            <Button
              icon="sliders"
              iconRight="chevD"
              onClick={(e) => setMenu({ anchor: e.currentTarget, items: moreItems() })}
            >
              More Actions
            </Button>
          </>
        }
        rail={
          <>
            <StatChip icon="users" active={!chip} onClick={() => setChip(null)}>{num(stats.total)} users</StatChip>
            <StatChip icon="checkC" active={chip === 'active'} onClick={() => pickChip('active')}>{num(stats.active)} active</StatChip>
            <StatChip icon="lock" active={chip === 'locked'} onClick={() => pickChip('locked')}>{num(stats.locked)} locked</StatChip>
          </>
        }
      />

      <div>
        <DataWorkbench
          id="directory"
          rows={rows}
          filter={rowFilter}
          columns={columns}
          selectable
          searchPlaceholder="Search by username, email, department…"
          bulkActions={bulkActions}
          rowActions={rowActions}
          onRowClick={openRecord}
          emptyTitle="No identities match"
          emptyBody="Adjust the search to widen the result set."
          emptyIcon="users"
          footNote="Directory synchronized 6 minutes ago"
        />
      </div>

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
