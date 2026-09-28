import './DirectoryPage.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import Menu from '../../components/primitives/Menu'
import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'
import Avatar from '../../components/primitives/Avatar'
import EmptyState from '../../components/primitives/EmptyState'
import StatCards from '../../components/workbench/StatCards'
import { Skeleton, SkeletonPageBar, SkeletonStats } from '../../components/primitives/Skeleton'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import Icon from '../../components/primitives/Icon'
import Tag from '../../components/primitives/Tag'
import AdvancedFilters, { BLANK_ADV, activeRules, matchesAdv as matchesRules, ruleLabel } from './AdvancedFilters'
import { openResetPassword } from './ResetPasswordForm'
import { useApp } from '../../store/AppContext'
import { useUsers, writeUsers } from './usersStore'
import { num, statusTone } from '../../lib/format'
import { useLocalState } from '../../lib/useLocalState'
import { useLoading } from '../../lib/useLoading'
import {
  DORMANT_DAYS, RISK_ORDER, dormantDays, isDormant, isPrivileged, lastActive,
  mfaGap, mfaOf, needsAttention, riskOf, sourceOf,
} from './posture'
import { USERS } from '../../data/seed'
import { columnAttrs, useAttrs } from '../configurations/schemaStore'
import SelectionSync from './SelectionSync'
import UploadForm from './UploadForm'
import UploadResult from './UploadResult'

const USER_SAMPLE = [
  'username,firstName,lastName,email,employeeType,organization,department,mobileNo,manager',
  'JANE_DOE,Jane,Doe,jane.doe@tanflow.com,Internal,Tanflow,Engineering,+91 9800000001,Shubham Jain',
  'RAVI_KUMAR,Ravi,Kumar,ravi.kumar@tanflow.com,Contractor,Tanflow · IT Ops,IT Operations,+91 9800000002,Priya Nair',
].join('\n')

const MODIFY_SAMPLE = [
  'username,department,designation,officeLevel,manager,organization',
  'JANE_DOE,Finance,Senior Engineer,Corporate,Priya Nair,Tanflow · Finance',
  'RAVI_KUMAR,IT Operations,Analyst,Regional,Shubham Jain,Tanflow · IT Ops',
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

// The directory answers five questions about sign-in state, and each headline
// doubles as the filter for it.
// Posture filters. These are the questions an administrator opens the
// directory to answer, and each one is also a headline card.
const FACETS = {
  all: () => true,
  privileged: isPrivileged,
  service: (u) => u.employeeType === 'Service Account',
  dormant: isDormant,
  mfa: mfaGap,
}

// Scope narrows whatever the facet selected, rather than replacing it.
const SCOPES = [
  { id: 'all', label: 'All', of: () => true },
  { id: 'active', label: 'Active', of: (u) => u.status === 'Active' },
  { id: 'attention', label: 'Needs attention', of: needsAttention },
]

const QUICK = [
  { id: 'privileged', label: 'Privileged', icon: 'key' },
  { id: 'mfa', label: 'MFA gaps', icon: 'shield' },
  { id: 'dormant', label: 'Dormant', icon: 'clock' },
]

const FACET_LABEL = {
  all: 'All identities', privileged: 'Privileged', service: 'Service accounts',
  dormant: 'Dormant', mfa: 'MFA gaps',
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

export default function UsersList() {
  const { toast, confirm, setDrawer, navigate } = useApp()
  const schema = useAttrs()
  const rows = useUsers()
  /* The directory is the console's heaviest register, and it is the one screen
     an administrator opens first — so it is the one where arriving at a page
     that is already complete reads as a jump rather than as speed. It settles
     as one thing: masthead, headline tiles and rows all resolve on the same
     tick rather than each appearing as it is ready. */
  const loading = useLoading()
  const setRows = writeUsers
  /* Generated columns: every visible schema attribute that the hand-built
     columns above do not already carry. */
  const HAND_BUILT = new Set(['username', 'firstName', 'lastName', 'email', 'department', 'designation',
    'employeeType', 'organization', 'manager', 'empCode'])
  const schemaColumns = useMemo(() => columnAttrs(schema)
    .filter((a) => !HAND_BUILT.has(a.id))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((a) => ({
      key: a.id,
      label: a.label,
      optional: true,
      cls: a.type === 'textarea' ? 'td-flex' : undefined,
      render: (r) => (r[a.id] ? <span className="trunc">{String(r[a.id])}</span> : <span className="t-faint">—</span>),
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [schema])
  const [picked, setPicked] = useState([])
  const [menu, setMenu] = useState(null)
  const [facet, setFacet] = useState('all')
  const [scope, setScope] = useState('all')
  const [adv, setAdv] = useState(BLANK_ADV)
  const advRef = useRef(BLANK_ADV)
  const [views, setViews] = useLocalState('tf-idam-dir-views', [
    { id: 'v-priv', name: 'Privileged · needs attention', facet: 'privileged', scope: 'attention' },
    { id: 'v-mfa', name: 'MFA gaps', facet: 'mfa', scope: 'all' },
  ])
  const uploadRef = useRef({ file: '' })

  const syncSelection = useCallback((ids) => setPicked(ids), [])

  const stats = useMemo(() => {
    const departments = new Set()
    let privileged = 0; let service = 0; let dormant = 0; let gaps = 0
    let privGaps = 0; let privDormant = 0; let unowned = 0; let recent = 0
    rows.forEach((u) => {
      if (u.department) departments.add(u.department)
      const priv = isPrivileged(u)
      if (priv) privileged += 1
      if (u.employeeType === 'Service Account') {
        service += 1
        if (!u.manager) unowned += 1
      }
      if (isDormant(u)) { dormant += 1; if (priv) privDormant += 1 }
      if (mfaGap(u)) { gaps += 1; if (priv) privGaps += 1 }
      // `createdOn` is a date stamp; anything inside the last quarter counts as
      // intake rather than an established record.
      if (u.createdOn && Date.parse(u.createdOn) >= Date.parse('2026-05-07')) recent += 1
    })
    return {
      total: rows.length,
      departments: departments.size,
      privileged, service, dormant, gaps, privGaps, privDormant, unowned, recent,
    }
  }, [rows])

  const pct = (n) => (rows.length ? `${Math.round((n / rows.length) * 100)}%` : '0%')

  const cards = [
    {
      id: 'all', icon: 'users', label: 'Total identities', value: stats.total,
      chip: `+${stats.recent}`, chipTone: 'ok', sub: '90-day intake',
      hint: 'Every identity the platform governs',
    },
    {
      id: 'privileged', icon: 'key', label: 'Privileged', value: stats.privileged,
      chip: pct(stats.privileged), sub: 'of the directory',
      hint: 'Identities holding administrative entitlements',
    },
    {
      id: 'service', icon: 'server', label: 'Service accounts', value: stats.service,
      chip: `${stats.unowned} unowned`, chipTone: stats.unowned ? 'warn' : undefined,
      sub: 'non-human identities',
      hint: 'Accounts that authenticate with a stored secret',
    },
    {
      id: 'dormant', icon: 'clock', label: `Dormant ${DORMANT_DAYS}+ days`, value: stats.dormant,
      chip: `${stats.privDormant} privileged`, chipTone: stats.privDormant ? 'warn' : undefined,
      sub: 'excludes disabled',
      hint: `No sign-in recorded in the last ${DORMANT_DAYS} days. Disabled accounts are not counted — they cannot sign in at all.`,
    },
    {
      id: 'mfa', icon: 'shield', label: 'MFA not enrolled', value: stats.gaps,
      chip: `${stats.privGaps} privileged`, chipTone: stats.privGaps ? 'bad' : undefined,
      sub: 'no second factor',
      hint: 'Identities that can sign in with a password alone',
    },
  ]

  const scopeOf = (SCOPES.find((sc) => sc.id === scope) || SCOPES[0]).of
  const matchesFacet = FACETS[facet] || FACETS.all
  const matchesAdv = (u) => matchesRules(u, adv)
  const shown = useMemo(
    () => rows.filter((u) => matchesFacet(u) && scopeOf(u) && matchesAdv(u)),
    [rows, facet, scope, adv],
  )

  const advChips = activeRules(adv)

  const openAdvanced = () => {
    advRef.current = adv
    setDrawer({
      title: 'Advanced filters',
      sub: 'Narrow the register by the fields that are not on the toolbar.',
      children: (
        <AdvancedFilters
          initial={adv}
          suggestions={{
            department: [...new Set(rows.map((u) => u.department).filter(Boolean))].sort(),
            manager: [...new Set(rows.map((u) => u.manager).filter(Boolean))].sort(),
            organization: [...new Set(rows.map((u) => u.organization).filter(Boolean))].sort(),
            designation: [...new Set(rows.map((u) => u.designation).filter(Boolean))].sort(),
            city: [...new Set(rows.map((u) => u.city).filter(Boolean))].sort(),
            officeLevel: [...new Set(rows.map((u) => u.officeLevel).filter(Boolean))].sort(),
          }}
          onChange={(v) => { advRef.current = v }}
        />
      ),
      footer: (
        <>
          <Button onClick={() => { setAdv(BLANK_ADV); setDrawer(null) }}>Clear all</Button>
          <Button variant="pri" icon="filter" onClick={() => { setAdv(advRef.current); setDrawer(null) }}>
            Apply filters
          </Button>
        </>
      ),
    })
  }

  // A saved view is the whole filter set under a name, so restoring one is the
  // same state change as rebuilding it by hand.
  const advLabel = activeRules(adv).map(ruleLabel)
  const viewName = [
    FACET_LABEL[facet],
    scope === 'all' ? null : scope === 'active' ? 'active only' : 'needs attention',
    ...advLabel,
  ].filter(Boolean).join(' · ')
  const sameFilters = (v) => v.facet === facet && v.scope === scope
    && JSON.stringify({ ...BLANK_ADV, ...v.adv }) === JSON.stringify(adv)
  const activeView = views.find(sameFilters)

  const saveView = () => {
    if (activeView) {
      toast('warn', 'Already saved', `"${activeView.name}" matches the current filters.`)
      return
    }
    const entry = { id: `v-${views.length + 1}-${facet}-${scope}`, name: viewName, facet, scope, adv }
    setViews((vs) => [...vs, entry])
    toast('ok', 'View saved', `"${entry.name}" is pinned above the register.`)
  }

  const applyView = (v) => {
    setFacet(v.facet)
    setScope(v.scope)
    setAdv({ ...BLANK_ADV, ...v.adv })
  }
  const dropView = (id) => setViews((vs) => vs.filter((v) => v.id !== id))


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
      // Identity, with the two facts that change how the row should be read:
      // whether the access is privileged, and whether the person is staff.
      key: 'username', label: 'Identity', locked: true, cls: 'td-main td-wide', width: 258,
      value: (r) => `${r.firstName} ${r.lastName} ${r.username} ${r.email}`,
      render: (r) => (
        <span className="cell-id">
          <Avatar first={r.firstName} last={r.lastName} size="sm" />
          <span className="trunc">
            <span className="dir-name">
              <span className="trunc">{`${r.firstName} ${r.lastName}`}</span>
              {isPrivileged(r) && <Tag tone="viol">Privileged</Tag>}
              {r.employeeType !== 'Internal' && <Tag>{r.employeeType}</Tag>}
            </span>
            <span className="cell-sub">{r.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'department', label: 'Department / Source', cls: 'td-flex', width: 156,
      value: (r) => `${r.department} ${r.designation} ${sourceOf(r)}`,
      render: (r) => (
        <span className="cell-stack">
          <span className="trunc">{r.department || '—'}</span>
          <span className="cell-sub trunc">{sourceOf(r)}</span>
        </span>
      ),
    },
    {
      key: 'mfa', label: 'MFA', width: 168,
      value: (r) => { const m = mfaOf(r); return m.state === 'on' ? `Enrolled ${m.factor}` : m.state === 'na' ? 'Not applicable' : 'Not enrolled' },
      render: (r) => {
        const m = mfaOf(r)
        if (m.state === 'na') {
          return <span className="t-faint" title="Service accounts authenticate with a stored secret">Not applicable</span>
        }
        if (m.state === 'none') return <Pill tone="bad" dot>Not enrolled</Pill>
        return (
          <span className="dir-mfa">
            <Pill tone="ok" dot>Enrolled</Pill>
            <Tag>{m.factor}</Tag>
          </span>
        )
      },
    },
    {
      key: 'risk', label: 'Risk', width: 104,
      value: (r) => RISK_ORDER[riskOf(r).level],
      render: (r) => {
        const risk = riskOf(r)
        return (
          <span title={risk.reasons.join(' · ')}>
            <SeverityBadge level={risk.level}>
              {risk.level[0].toUpperCase() + risk.level.slice(1)}
            </SeverityBadge>
          </span>
        )
      },
    },
    {
      key: 'status', label: 'Status', width: 104,
      render: (r) => <Pill tone={statusTone(r.status)} dot>{r.status}</Pill>,
    },
    {
      key: 'lastLogin', label: 'Last active', width: 112,
      value: (r) => -(dormantDays(r) ?? 99999),
      render: (r) => {
        const days = dormantDays(r)
        if (days == null) return <span className="t-faint">Never</span>
        return (
          <span className={isDormant(r) ? 'dir-stale' : undefined} title={r.lastLogin}>
            {lastActive(r)}
          </span>
        )
      },
    },
    { key: 'employeeType', label: 'Type', width: 118, optional: true },
    { key: 'organization', label: 'Organization', cls: 'td-flex', optional: true },
    {
      key: 'manager', label: 'Manager', cls: 'td-flex', optional: true,
      render: (r) => (r.manager ? <span className="trunc">{r.manager}</span> : <span className="t-faint">Unassigned</span>),
    },
    { key: 'designation', label: 'Designation', cls: 'td-flex', optional: true },
    { key: 'empCode', label: 'Employee code', cls: 'td-mono', optional: true },
    // Everything else the identity schema defines. The register is not a fixed
    // set of eleven fields: an attribute added in Configurations is selectable
    // as a column the moment it is saved, and an attribute an administrator may
    // not see is never offered.
    ...schemaColumns,
  ]

  const openRecord = (r) => navigate(`/iam/users/${r.id}`)

  const rowActions = (r) => [
    { id: 'view', label: 'View', icon: 'eye', onSelect: () => openRecord(r) },
    {
      // Deactivating is a lifecycle decision and locking is a security one, so
      // both are offered here rather than folding the two into one control.
      id: 'active',
      label: r.status === 'Disabled' ? 'Activate account' : 'Deactivate account',
      icon: r.status === 'Disabled' ? 'checkC' : 'ban',
      onSelect: () => mutate(
        [r.id],
        { status: r.status === 'Disabled' ? 'Active' : 'Disabled' },
        r.status === 'Disabled' ? 'Identity activated' : 'Identity deactivated',
      ),
    },
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
      {/* One announcing region for the whole screen. The register below draws
          its own body skeleton from the `loading` prop, and that skeleton is
          decoration — so a reader is told "loading the identity directory"
          once rather than once per shape. */}
      {loading ? (
        <Skeleton label="Loading the identity directory">
          <SkeletonPageBar actions={3} crumbs={1} />
          <SkeletonStats count={cards.length} />
        </Skeleton>
      ) : (
        <>
          <PageBar
            title="Users"
            sub="Every identity the platform governs."
            crumbs={[{ label: 'Users' }]}
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
          />

          <StatCards
            items={cards}
            value={facet}
            onChange={setFacet}
            label="Directory summary and posture filters"
          />
        </>
      )}

      <DataWorkbench
        id="directory"
        rows={shown}
        loading={loading}
        columns={columns}
        selectable
        filters={(
          <>
            {QUICK.map((f) => (
              <button
                key={f.id}
                type="button"
                className="chip"
                data-on={facet === f.id ? 'true' : undefined}
                aria-pressed={facet === f.id}
                onClick={() => setFacet(facet === f.id ? 'all' : f.id)}
              >
                <Icon name={f.icon} size={12} />
                {f.label}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              data-on={advChips.length ? 'true' : undefined}
              onClick={openAdvanced}
            >
              <Icon name="filter" size={12} />
              Advanced
              {advChips.length > 0 && <b className="chip-n num">{advChips.length}</b>}
            </button>
            {advChips.map((rule, i) => (
              <span key={`${rule.attribute}-${rule.operator}-${rule.value}-${i}`} className="chip" data-on="true">
                {ruleLabel(rule)}
                <button
                  type="button"
                  className="chip-x"
                  aria-label={`Remove ${ruleLabel(rule)} filter`}
                  onClick={() => setAdv((a) => ({ ...a, rules: a.rules.filter((r) => r !== rule) }))}
                >
                  <Icon name="x" size={9} />
                </button>
              </span>
            ))}
          </>
        )}
        toolbar={(
          <>
            <div className="seg" role="group" aria-label="Scope">
              {SCOPES.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  data-on={scope === sc.id || undefined}
                  aria-pressed={scope === sc.id}
                  onClick={() => setScope(sc.id)}
                >
                  {sc.label}
                </button>
              ))}
            </div>
            <Button size="sm" icon="download" onClick={() => exportRows('identities', shown.length)}>Export</Button>
          </>
        )}
        subBar={(
          <div className="views">
            <span className="views-k">Views</span>
            {views.map((v) => (
              <span
                key={v.id}
                className="view-chip"
                data-on={activeView && activeView.id === v.id ? true : undefined}
                role="presentation"
              >
                <button type="button" className="view-open" onClick={() => applyView(v)}>
                  <Icon name="star" size={11} />
                  {v.name}
                </button>
                <button
                  type="button"
                  className="view-x"
                  aria-label={`Remove saved view ${v.name}`}
                  onClick={() => dropView(v.id)}
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            <button type="button" className="view-add" onClick={saveView}>
              <Icon name="plus" size={11} />
              Save view
            </button>
          </div>
        )}
        searchPlaceholder="Search name, email, username, department…"
        bulkActions={bulkActions}
        rowActions={rowActions}
        onRowClick={openRecord}
        emptyTitle="No identities match"
        emptyBody="Widen the filters above, or clear the search, to see more of the directory."
        emptyIcon="users"
        footNote="Directory synchronized 6 minutes ago"
      />

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </>
  )
}
