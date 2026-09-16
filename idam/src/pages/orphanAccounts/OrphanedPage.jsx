import './OrphanedPage.css'
import { useMemo, useRef, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { ORPHANS, APPLICATIONS, USERS, SCHEDULERS, nextId } from '../../data/seed'
import { BASE, ageDays } from './orphanedData'
import AssignForm from './AssignForm'
import RuleDetail from './RuleDetail'
import RuleBuilder from './RuleBuilder'
import OrphanList from './OrphanList'

const DETAIL_TABS = ['overview', 'conditions', 'accounts', 'history']

// Conditions are a single flat list: collapse any legacy multi-group model.

const SEED_RULES = [
  {
    id: 1,
    name: 'No matching identity',
    description: 'Target account cannot be correlated to any identity held in the directory.',
    createdOn: '2026-01-14 09:20', createdBy: 'admin', modifiedOn: '2026-06-02 10:11', modifiedBy: 'admin',
    scope: 'All applications', active: true, lastRun: '2026-08-05 03:30',
    risk: 'Inherit from account', action: 'Raise a reconciliation task', suppression: '30 days', owner: 'IT Operations', ticket: 'CHG-3308',
    model: {
      join: 'AND',
      groups: [{
        join: 'AND',
        rules: [
          { attribute: 'matchedIdentity', operator: 'is empty', value: '' },
          { attribute: 'status', operator: '!=', value: 'Disabled' },
        ],
      }],
    },
  },
  {
    id: 2,
    name: 'Owner deactivated',
    description: 'Account correlates to an identity that is no longer active in the directory.',
    createdOn: '2026-02-02 11:05', createdBy: 'admin', modifiedOn: '2026-07-11 08:40', modifiedBy: 'priya.nair',
    scope: 'All applications', active: true, lastRun: '2026-08-05 03:30',
    risk: 'high', action: 'Notify the application owner', suppression: '14 days', owner: 'IT Operations', ticket: 'CHG-3401',
    model: {
      join: 'AND',
      groups: [{
        join: 'AND',
        rules: [
          { attribute: 'ownerStatus', operator: '=', value: 'Disabled' },
          { attribute: 'lastUsedDays', operator: '>', value: '30' },
        ],
      }],
    },
  },
  {
    id: 3,
    name: 'Retired employee',
    description: 'Account belongs to an identity past its recorded date of retirement.',
    createdOn: '2026-03-19 15:42', createdBy: 'shubham.jain', modifiedOn: '2026-05-30 16:05', modifiedBy: 'shubham.jain',
    scope: 'Workday HR', active: true, lastRun: '2026-08-04 03:30',
    risk: 'Inherit from account', action: 'Raise a reconciliation task', suppression: '30 days', owner: 'Human Resources', ticket: 'CHG-3512',
    model: {
      join: 'AND',
      groups: [{
        join: 'AND',
        rules: [
          { attribute: 'ownerStatus', operator: '=', value: 'Retired' },
          { attribute: 'employeeType', operator: '!=', value: 'Service Account' },
        ],
      }],
    },
  },
  {
    id: 4,
    name: 'Never reconciled',
    description: 'Account has existed on the target since discovery without ever matching a reconciliation run.',
    createdOn: '2026-04-08 08:15', createdBy: 'admin', modifiedOn: '2026-07-22 12:30', modifiedBy: 'admin',
    scope: 'All applications', active: true, lastRun: '2026-08-05 03:30',
    risk: 'Inherit from account', action: 'Report only', suppression: '60 days', owner: 'IT Operations', ticket: 'CHG-3620',
    model: {
      join: 'AND',
      groups: [{
        join: 'AND',
        rules: [
          { attribute: 'discoveredDays', operator: '>', value: '20' },
          { attribute: 'matchedIdentity', operator: 'is empty', value: '' },
        ],
      }],
    },
  },
  {
    id: 5,
    name: 'Dormant privileged service account',
    description: 'Privileged service account with no recorded use for six months.',
    createdOn: '2026-05-27 17:30', createdBy: 'vansh.makhija', modifiedOn: '2026-07-01 09:18', modifiedBy: 'vansh.makhija',
    scope: 'Active Directory · Corporate', active: false, lastRun: '2026-07-12 03:30',
    risk: 'critical', action: 'Disable the account automatically', suppression: 'Never', owner: 'Security', ticket: 'CHG-3744',
    model: {
      join: 'AND',
      groups: [
        {
          join: 'AND',
          rules: [
            { attribute: 'lastUsedDays', operator: '>', value: '180' },
          ],
        },
        {
          join: 'OR',
          rules: [
            { attribute: 'account', operator: 'starts with', value: 'svc_' },
            { attribute: 'account', operator: 'starts with', value: 'sa_' },
          ],
        },
      ],
    },
  },
]

export default function OrphanedPage({ segments = [] }) {
  const { toast, confirm, setDrawer, navigate } = useApp()
  const [rows, setRows] = useState(ORPHANS)
  const [rules, setRules] = useState(() => SEED_RULES.map((r) => ({ ...r })))
  const assignRef = useRef({ identity: '', justification: '' })

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === 'Open')
    return {
      open: open.length,
      suppressed: rows.filter((r) => r.status === 'Suppressed').length,
      oldest: rows.reduce((m, r) => Math.max(m, ageDays(r.discovered)), 0),
      critical: open.filter((r) => r.risk === 'critical').length,
      activeRules: rules.filter((r) => r.active).length,
    }
  }, [rows, rules])

  const ruleRows = useMemo(
    () => rules.map((r, i) => ({ ...r, sno: i + 1, matched: rows.filter((a) => a.rule === r.name).length })),
    [rules, rows],
  )

  const mutate = (ids, patch, title, body) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...patch } : r)))
    toast('ok', title, body)
  }

  const disable = (list, clear) => confirm({
    title: list.length === 1 ? `Disable ${list[0].account}?` : `Disable ${list.length} accounts?`,
    body: 'The account is disabled on the target application at the next provisioning run. Any session it holds is terminated.',
    confirmLabel: list.length === 1 ? 'Disable account' : `Disable ${list.length}`,
    onConfirm: () => {
      mutate(list.map((r) => r.id), { status: 'Disabled' }, 'Accounts disabled', `${list.length} ${list.length === 1 ? 'account' : 'accounts'} queued for deprovisioning.`)
      if (clear) clear()
    },
  })

  const suppress = (list, clear) => {
    mutate(
      list.map((r) => r.id),
      { status: 'Suppressed' },
      'Accounts suppressed',
      `${list.length} ${list.length === 1 ? 'account is' : 'accounts are'} excluded from orphan reporting until rediscovered.`,
    )
    if (clear) clear()
  }

  const deleteAccount = (account) => confirm({
    title: `Delete ${account.account}?`,
    body: 'The account is deleted on the target application and removed from reconciliation. This cannot be undone.',
    confirmLabel: 'Delete account',
    onConfirm: () => {
      setRows((rs) => rs.filter((x) => x.id !== account.id))
      toast('ok', 'Account deleted', `${account.account} removed from ${account.application}.`)
    },
  })

  const openAssign = (list, clear) => {
    assignRef.current = { identity: '', justification: '' }
    setDrawer({
      title: list.length === 1 ? 'Assign to identity' : `Assign ${list.length} accounts`,
      sub: list.length === 1 ? `${list[0].account} · ${list[0].application}` : 'Bulk reconciliation',
      children: <AssignForm accounts={list} onChange={(v) => { assignRef.current = v }} />,
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="link"
            onClick={() => {
              const { identity } = assignRef.current
              if (!identity) {
                toast('warn', 'No identity selected', 'Choose the identity that will own these accounts.')
                return
              }
              mutate(list.map((r) => r.id), { status: 'Claimed', owner: identity }, 'Accounts assigned', `${list.length} ${list.length === 1 ? 'account' : 'accounts'} linked to ${identity}.`)
              setDrawer(null)
              if (clear) clear()
            }}
          >
            Assign accounts
          </Button>
        </>
      ),
    })
  }

  const deleteRules = (list, clear) => confirm({
    title: list.length === 1 ? `Delete ${list[0].name}?` : `Delete ${list.length} rules?`,
    body: 'Accounts already surfaced by the rule stay in the register, but nothing new will be detected. This cannot be undone.',
    confirmLabel: list.length === 1 ? 'Delete rule' : `Delete ${list.length}`,
    onConfirm: () => {
      const ids = new Set(list.map((r) => String(r.id)))
      setRules((rs) => rs.filter((r) => !ids.has(String(r.id))))
      if (clear) clear()
      toast('ok', 'Rules deleted', `${list.length} ${list.length === 1 ? 'rule' : 'rules'} removed from detection.`)
    },
  })

  const actions = { openAssign, disable, suppress, deleteAccount, deleteRules }

  if (segments[0] === 'rules') {
    const [, head, sub] = segments
    if (head === 'add') return <RuleBuilder rules={rules} setRules={setRules} accounts={rows} />
    if (head) {
      const rule = rules.find((r) => String(r.id) === String(head))
      if (!rule) {
        return (
          <>
            <PageBar title="Rule not found" sub="This detection rule no longer exists or was deleted in this session." crumbs={[{ label: 'Orphan Accounts', to: BASE }, { label: 'Not found' }]} />
            <EmptyState
              icon="policy"
              title={`No rule with id ${head}`}
              body="The record may have been deleted. Return to the register to pick another rule."
              actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to Orphan Accounts</Button>}
            />
          </>
        )
      }
      if (sub === 'edit') return <RuleBuilder rule={rule} rules={rules} setRules={setRules} accounts={rows} />
      return (
        <RuleDetail
          rule={rule}
          tab={DETAIL_TABS.includes(sub) ? sub : 'overview'}
          accounts={rows}
          setRules={setRules}
          actions={actions}
        />
      )
    }
  }

  return <OrphanList rows={rows} rules={rules} stats={stats} ruleRows={ruleRows} actions={actions} />
}
