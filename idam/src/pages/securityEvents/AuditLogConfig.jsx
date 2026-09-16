import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Check from '../../components/primitives/Check'
import EmptyState from '../../components/primitives/EmptyState'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import TextInput from '../../components/primitives/TextInput'
import StatCards from '../../components/workbench/StatCards'
import { num } from '../../lib/format'
import { useApp } from '../../store/AppContext'
import { AUDIT_GROUPS, auditEventCopy, auditModuleCopy, auditRows } from './loggingData'

// A change operation that is off leaves no trace of the change at all, which is
// the one gap worth calling out on the screen rather than in a footnote.
const CHANGE_OPS = new Set(['Create', 'Modify', 'Delete'])

const tone = (on, total) => (on === total ? 'ok' : on === 0 ? 'mut' : 'warn')

/**
 * Which activity is written to the audit log.
 *
 * The list is a module-by-operation cross product running to well over a
 * hundred switches, so it is grouped by what the section means to an operator —
 * identity, entitlement, applications, security controls, platform work — and
 * every switch states in a sentence what a record would contain. A flag named
 * "Users / Export" tells an administrator nothing about what stops being
 * recorded when it goes off.
 */
export default function AuditLogConfig() {
  const { toast } = useApp()
  const [rows, setRows] = useState(auditRows)
  const [open, setOpen] = useState(() => new Set([AUDIT_GROUPS[0].id]))
  const [q, setQ] = useState('')
  const [view, setView] = useState('all')
  const [dirty, setDirty] = useState(false)

  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => rows.filter((r) => {
    if (view === 'on' && !r.active) return false
    if (view === 'off' && r.active) return false
    if (view === 'gap' && (r.active || !CHANGE_OPS.has(r.sub))) return false
    if (!needle) return true
    const mod = auditModuleCopy(r.module)
    return `${r.module} ${r.sub} ${mod.covers} ${mod.subject}`.toLowerCase().includes(needle)
  }), [rows, needle, view])

  const toggleGroup = (id) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const setRow = (id, active) => { setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active } : r))); setDirty(true) }
  const setAll = (groupId, active) => {
    setRows((rs) => rs.map((r) => (r.group === groupId ? { ...r, active } : r)))
    setDirty(true)
  }
  const setModule = (module, active) => {
    setRows((rs) => rs.map((r) => (r.module === module ? { ...r, active } : r)))
    setDirty(true)
  }

  const activeCount = rows.filter((r) => r.active).length
  const gaps = rows.filter((r) => !r.active && CHANGE_OPS.has(r.sub)).length
  const filtered = !!needle || view !== 'all'

  const stats = [
    {
      id: 'all',
      label: 'Operations',
      value: rows.length,
      icon: 'logs',
      sub: `${AUDIT_GROUPS.length} sections`,
      hint: 'Every operation that can be written to the audit trail.',
    },
    {
      id: 'on',
      label: 'Recorded',
      value: activeCount,
      icon: 'checkC',
      chip: `${Math.round((activeCount / rows.length) * 100)}%`,
      chipTone: 'ok',
      hint: 'Operations that write an audit entry today.',
    },
    {
      id: 'off',
      label: 'Not recorded',
      value: rows.length - activeCount,
      icon: 'eyeoff',
      sub: 'no entry is written',
      hint: 'Operations that leave no audit entry at all.',
    },
    {
      id: 'gap',
      label: 'Changes not recorded',
      value: gaps,
      icon: 'warn',
      chip: gaps > 0 ? 'review' : undefined,
      chipTone: 'warn',
      sub: 'create, modify or delete',
      hint: 'Changes to data that would leave no trace. Reads and exports are excluded.',
    },
  ]

  return (
    <Card
      title="Audit Log Configurations"
      sub="Which operations are written to the audit trail. An operation that is off leaves no record at all."
      actions={
        <>
          <TextInput
            type="search"
            aria-label="Filter modules"
            placeholder="Filter by module or operation…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
          />
          <Button
            variant="pri"
            icon="save"
            disabled={!dirty}
            onClick={() => { setDirty(false); toast('ok', 'Audit configuration saved', `${num(activeCount)} operations are written to the audit trail.`) }}
          >
            Save changes
          </Button>
        </>
      }
      footer={
        <>
          <span><b className="num">{num(activeCount)}</b> of {num(rows.length)} operations logged</span>
          <span className="spacer" />
          <span>An operation that is not logged cannot be reported on or attested later.</span>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--sp-4)' }}>
        <StatCards items={stats} value={view} onChange={setView} label="Audit configuration summary" />

        {gaps > 0 && (
          <Banner tone="warn">
            <b>{num(gaps)}</b> create, modify or delete {gaps === 1 ? 'operation is' : 'operations are'} not recorded.
            A change made through {gaps === 1 ? 'it' : 'them'} leaves nothing behind to report on or attest to.
          </Banner>
        )}

        {shown.length === 0 && (
          <EmptyState
            icon="search"
            title="No operation matches"
            body="Nothing matches that text and filter. Clear them to see every operation again."
            actions={<Button onClick={() => { setQ(''); setView('all') }}>Clear filter</Button>}
          />
        )}

        {AUDIT_GROUPS.map((g) => {
          const groupShown = shown.filter((r) => r.group === g.id)
          if (groupShown.length === 0) return null
          // A filter narrows what is listed, never what the section count means.
          const groupAll = rows.filter((r) => r.group === g.id)
          const on = groupAll.filter((r) => r.active).length
          const isOpen = open.has(g.id) || filtered

          return (
            <section className="audit-sec" key={g.id}>
              <header className="audit-sec-h">
                <div className="audit-sec-top">
                  <button
                    type="button"
                    className="audit-sec-btn"
                    aria-expanded={isOpen}
                    onClick={() => toggleGroup(g.id)}
                  >
                    <Icon name={isOpen ? 'chevU' : 'chevD'} size={13} />
                    <Icon name={g.icon} size={15} className="audit-sec-i" />
                    <span className="audit-sec-t">{g.label}</span>
                  </button>
                  <Pill tone={tone(on, groupAll.length)} dot>
                    {on} of {groupAll.length} recorded
                  </Pill>
                  <Button size="sm" onClick={() => setAll(g.id, true)}>Enable all</Button>
                  <Button size="sm" onClick={() => setAll(g.id, false)}>Disable all</Button>
                </div>
                <p className="audit-sec-s">{g.blurb}</p>
              </header>

              {isOpen && (
                <div className="audit-mods">
                  {g.modules.map((m) => {
                    const modShown = groupShown.filter((r) => r.module === m.name)
                    if (modShown.length === 0) return null
                    const modAll = rows.filter((r) => r.module === m.name)
                    const modOn = modAll.filter((r) => r.active).length

                    return (
                      <div className="audit-mod" key={m.name}>
                        <div className="audit-mod-h">
                          <Check
                            checked={modOn === modAll.length}
                            mixed={modOn > 0 && modOn < modAll.length}
                            label={`Record every operation on ${m.name}`}
                            onChange={(v) => setModule(m.name, v)}
                          />
                          <div className="audit-mod-meta">
                            <h4 className="audit-mod-t">{m.name}</h4>
                            <p className="audit-mod-s">{m.covers}</p>
                          </div>
                          <Pill tone={tone(modOn, modAll.length)}>{modOn}/{modAll.length}</Pill>
                        </div>

                        <div className="audit-evts">
                          {modShown.map((r) => {
                            const copy = auditEventCopy(r)
                            return (
                              <div className="audit-evt" data-on={r.active} key={r.id}>
                                <Switch
                                  checked={r.active}
                                  label={`Record ${copy.label.toLowerCase()} on ${m.name}`}
                                  onChange={() => setRow(r.id, !r.active)}
                                />
                                <div className="audit-evt-meta">
                                  <div className="audit-evt-top">
                                    <Icon name={copy.icon} size={12} className="audit-evt-ico" />
                                    <span className="audit-evt-t">{copy.label}</span>
                                    <span className="audit-evt-st">{r.active ? 'Recorded' : 'Not recorded'}</span>
                                    <span className="audit-evt-i" title={copy.detail}>
                                      <Icon name="info" size={12} />
                                    </span>
                                  </div>
                                  <p className="audit-evt-d">{copy.line}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </Card>
  )
}
