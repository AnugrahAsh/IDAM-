import { useState } from 'react'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'
import './PoliciesPage.css'
import { POLICIES, GROUPS, USERS, SCHEDULERS, LOOKUPS, ORGS, DEPARTMENTS, nextId } from '../../data/seed'
import { useAttrs } from '../configurations/schemaStore'
import { BASE } from './policyPageData'
import PolicyList from './PolicyList'
import PolicyDetail from './PolicyDetail'
import PolicyBuilder from './PolicyBuilder'

const DETAIL_TABS = ['overview', 'condition', 'simulation', 'history']

const byDepartment = (list) => {
  const counts = {}
  list.forEach((u) => { counts[u.department] = (counts[u.department] || 0) + 1 })
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value, color: value > 8 ? 'var(--sev-high)' : 'var(--s1)' }))
    .sort((a, b) => b.value - a.value)
}

export default function PoliciesPage({ segments = [] }) {
  const { confirm, toast, navigate } = useApp()
  // Subscribed so a schema change in Configurations re-renders the condition
  // builder's attribute list rather than leaving it a render behind.
  useAttrs()
  const [rows, setRows] = useState(() => POLICIES.map((p) => ({ ...p })))
  const [head, sub] = segments

  const onDelete = (ids, title, done) => confirm({
    title,
    body: 'Entitlements already granted by the policy are retained, but they will no longer be maintained or revoked automatically.',
    confirmLabel: 'Delete policy',
    onConfirm: () => {
      const set = new Set(ids.map(String))
      setRows((rs) => rs.filter((r) => !set.has(String(r.id))))
      if (done) done()
      toast('ok', 'Policies deleted', `${ids.length} ${ids.length === 1 ? 'policy' : 'policies'} removed.`)
    },
  })

  if (head === 'add') return <PolicyBuilder setRows={setRows} />

  if (head) {
    const policy = rows.find((r) => String(r.id) === String(head))
    if (!policy) {
      return (
        <>
          <PageBar title="Policy not found" sub="This dynamic policy no longer exists or was deleted in this session." crumbs={[{ label: 'Dynamic Policy', to: BASE }, { label: 'Not found' }]} />
          <EmptyState
            icon="policy"
            title={`No policy with id ${head}`}
            body="The record may have been deleted. Return to the register to pick another policy."
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to Dynamic Policies</Button>}
          />
        </>
      )
    }
    if (sub === 'edit') return <PolicyBuilder policy={policy} setRows={setRows} />
    return (
      <PolicyDetail
        policy={policy}
        tab={DETAIL_TABS.includes(sub) ? sub : 'overview'}
        setRows={setRows}
        onDelete={onDelete}
      />
    )
  }

  return <PolicyList rows={rows} setRows={setRows} onDelete={onDelete} />
}
