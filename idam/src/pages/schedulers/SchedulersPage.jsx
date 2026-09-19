import './SchedulersPage.css'
import { useState } from 'react'
import Button from '../../components/primitives/Button'
import EmptyState from '../../components/primitives/EmptyState'
import PageBar from '../../components/shell/PageBar'
import { useApp } from '../../store/AppContext'
import { NOW_MS } from '../../lib/clock'
import SchedulerList from './SchedulerList'
import SchedulerForm from './SchedulerForm'
import ExecutionHistory from './ExecutionHistory'
import { seedSchedulers } from './schedulerApi'
import { BASE, stamp, withDerived } from './schedulerModel'
import { nextId } from '../../data/seed'

/**
 * The Scheduler module.
 *
 *   /iam/schedulers                     the register
 *   /iam/schedulers/add                 create
 *   /iam/schedulers/modify/:id          edit
 *   /iam/schedulers/logs/:SERVICE_CODE  execution history for a service
 *   /iam/schedulers/logs/scheduler/:id  execution history for one scheduler
 *
 * The register lives here rather than in the list screen so that creating a
 * scheduler, editing one and coming back does not rebuild it — and so the four
 * screens are reading one set of records rather than four copies.
 */
export default function SchedulersPage({ segments = [] }) {
  const { navigate, toast } = useApp()
  const [rows, setRows] = useState(() => seedSchedulers())
  const [head, a, b] = segments

  const notFound = (what, body) => (
    <>
      <PageBar title={what} sub={body} crumbs={[{ label: 'Scheduler', to: BASE }, { label: 'Not found' }]} />
      <EmptyState
        icon="clock"
        title={what}
        body={body}
        actions={<Button variant="pri" icon="chevL" onClick={() => navigate(BASE)}>Back to Scheduler</Button>}
      />
    </>
  )

  const save = (saved, isNew) => {
    if (isNew) {
      const created = withDerived({
        ...saved,
        id: nextId(rows),
        created_on: stamp(NOW_MS),
        created_by: 'you',
        last_modified_on: stamp(NOW_MS),
        last_modified_by: 'you',
      })
      setRows((rs) => [...rs, created])
      toast('ok', 'Scheduler created', `${created.name} — ${created.schedule_description}. It is inactive until you activate it.`)
      navigate(BASE)
      return
    }
    setRows((rs) => rs.map((r) => (r.id === saved.id
      ? withDerived({ ...saved, last_modified_on: stamp(NOW_MS), last_modified_by: 'you', update_status: true })
      : r)))
    toast('ok', 'Scheduler saved', `${saved.name} — ${saved.schedule_description}.`)
    navigate(BASE)
  }

  const run = (r) => {
    setRows((rs) => rs.map((x) => (x.id === r.id
      ? { ...x, is_start: true, last_status: 'Running', last_run_at: stamp(NOW_MS), last_execution_id: `exec-${x.id}-${Math.floor(NOW_MS / 60000) % 9000}` }
      : x)))
    toast('ok', 'Execution queued', `${r.name} was queued on ${r.service_display_name}.`)
  }

  const toggleActive = (r, active) => {
    setRows((rs) => rs.map((x) => (x.id === r.id ? withDerived({ ...x, active_status: active }) : x)))
    toast('ok', active ? 'Scheduler activated' : 'Scheduler deactivated', active
      ? `${r.name} returned to its configured schedule.`
      : `${r.name} will not dispatch until it is activated again.`)
  }

  const remove = (r) => {
    setRows((rs) => rs.filter((x) => x.id !== r.id))
    toast('ok', 'Scheduler deleted', `${r.name} was removed. Its execution history is retained.`)
  }

  if (head === 'add') return <SchedulerForm onSave={save} />

  if (head === 'modify') {
    const record = rows.find((r) => String(r.id) === String(a))
    if (!record) return notFound('Scheduler not found', `No scheduler with id ${a}. It may have been deleted in this session.`)
    return <SchedulerForm record={record} onSave={save} />
  }

  if (head === 'logs') {
    if (a === 'scheduler') {
      const record = rows.find((r) => String(r.id) === String(b))
      if (!record) return notFound('Scheduler not found', `No scheduler with id ${b}. It may have been deleted in this session.`)
      return <ExecutionHistory rows={rows} serviceCode={record.service_code} schedulerId={record.id} />
    }
    return <ExecutionHistory rows={rows} serviceCode={a} />
  }

  return <SchedulerList rows={rows} onRun={run} onToggleActive={toggleActive} onDelete={remove} />
}
