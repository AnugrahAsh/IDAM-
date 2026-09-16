import './SodPage.css'
import { useMemo, useState } from 'react'
import PageBar from '../../components/shell/PageBar'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import { useApp } from '../../store/AppContext'
import { SOD_RULES, SOD_VIOLATIONS, USERS, GROUPS, APPLICATIONS, nextId } from '../../data/seed'
import { BASE } from './sodData'
import RuleDetail from './RuleDetail'
import RuleBuilder from './RuleBuilder'
import SodList from './SodList'

export default function SodPage({ segments = [] }) {
  const { confirm, toast, navigate } = useApp()
  const [rules, setRules] = useState(() => SOD_RULES.map((r) => ({ ...r, groups: [...r.groups] })))
  const [violations, setViolations] = useState(() => SOD_VIOLATIONS.map((v) => ({ ...v })))
  const [head, sub] = segments

  const onDelete = (ids, title, done) => confirm({
    title,
    body: 'Breaches detected by the rule are removed from the register and the control stops being evaluated. This cannot be undone.',
    confirmLabel: 'Delete rule',
    onConfirm: () => {
      const set = new Set(ids.map(String))
      const names = rules.filter((r) => set.has(String(r.id))).map((r) => r.name)
      setRules((rs) => rs.filter((r) => !set.has(String(r.id))))
      setViolations((vs) => vs.filter((v) => !names.includes(v.rule)))
      if (done) done()
      toast('ok', 'Rules deleted', `${ids.length} ${ids.length === 1 ? 'rule' : 'rules'} removed from the control register.`)
    },
  })

  if (head === 'add') return <RuleBuilder rules={rules} setRules={setRules} />

  if (head) {
    const rule = rules.find((r) => String(r.id) === String(head))
    if (!rule) {
      return (
        <>
          <PageBar title="Rule not found" sub="This segregation-of-duties rule no longer exists or was deleted in this session." crumbs={[{ label: 'Segregation of Duties', to: BASE }, { label: 'Not found' }]} />
          <EmptyState
            icon="sod"
            title={`No rule with id ${head}`}
            body="The record may have been deleted. Return to the control register to pick another rule."
            actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to Segregation of Duties</Button>}
          />
        </>
      )
    }
    if (sub === 'edit') return <RuleBuilder rule={rule} rules={rules} setRules={setRules} />
    return (
      <RuleDetail
        rule={rule}
        tab={sub}
        violations={violations.filter((v) => v.rule === rule.name)}
        onDelete={onDelete}
      />
    )
  }

  return (
    <SodList
      rules={rules}
      violations={violations}
      onDelete={onDelete}
    />
  )
}
