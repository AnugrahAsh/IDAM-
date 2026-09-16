import { useMemo, useState } from 'react'
import DataWorkbench from '../../components/workbench/DataWorkbench'
import StatCards from '../../components/workbench/StatCards'
import Button from '../../components/primitives/Button'
import Switch from '../../components/primitives/Switch'
import Pill from '../../components/primitives/Pill'
import Tag from '../../components/primitives/Tag'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Banner from '../../components/primitives/Banner'
import KeyValue from '../../components/primitives/KeyValue'
import Icon from '../../components/primitives/Icon'
import { useApp } from '../../store/AppContext'
import { num, serialColumn } from '../../lib/format'
import {
  CAPTURE_CATEGORIES, CAPTURE_TOTAL, ROTATION_TYPES, archivalLabel, captureRows,
} from './loggingData'

/**
 * The capture register.
 *
 * An event that is not on this list is not captured, and an event that is on it
 * carries its own rotation and archival policy. Both facts matter to an
 * auditor: "what are you capturing" and "for how long" are separate questions,
 * and a single global retention cannot answer the second one for a tenant that
 * has to keep privilege changes for seven years and sign-ins for ninety days.
 */
export default function CaptureRegister({ globals }) {
  const { toast, setDrawer, confirm } = useApp()
  const [rows, setRows] = useState(captureRows)
  const [category, setCategory] = useState('all')

  const visible = useMemo(
    () => (category === 'all' ? rows : rows.filter((r) => r.category === category)),
    [rows, category],
  )

  const stats = useMemo(() => ({
    captured: rows.filter((r) => r.captured).length,
    silent: rows.filter((r) => !r.captured).length,
    overrides: rows.filter((r) => r.overrides).length,
    longest: rows.reduce((m, r) => Math.max(m, r.captured ? r.archivalDays : 0), 0),
  }), [rows])

  const patch = (ids, next, title, body) => {
    const set = new Set(ids.map(String))
    setRows((rs) => rs.map((r) => (set.has(String(r.id)) ? { ...r, ...(typeof next === 'function' ? next(r) : next) } : r)))
    if (title) toast('ok', title, body)
  }

  const setCaptured = (list, captured) => patch(
    list.map((r) => r.id),
    { captured },
    captured ? 'Capture enabled' : 'Capture disabled',
    captured
      ? `${list.length} ${list.length === 1 ? 'event is' : 'events are'} now written to the log.`
      : `${list.length} ${list.length === 1 ? 'event produces' : 'events produce'} no log line at all from the next restart.`,
  )

  const configure = (row) => {
    const ref = { current: { ...row } }

    const render = () => setDrawer({
      title: 'Configure capture',
      sub: `${row.label} · ${row.code}`,
      children: (
        <div className="stack">
          <Banner tone={ref.current.overrides ? 'warn' : 'info'}>
            {ref.current.overrides
              ? 'This event overrides the global rotation and archival defaults. Its own values below are what apply.'
              : `This event follows the global defaults — ${globals.level} and above, shipped to ${globals.target.toLowerCase()}, kept ${globals.retentionDays} days. Turn the override on to give it its own policy.`}
          </Banner>

          <div className="row" style={{ gap: 10 }}>
            <Switch
              checked={ref.current.overrides}
              label="Override the global defaults"
              onChange={(v) => { ref.current = { ...ref.current, overrides: v }; render() }}
            />
            <span className="t-sm">Override the global rotation and archival defaults</span>
          </div>

          <div className="grid grid-2">
            <Field label="File size" required hint="Megabytes. A file is rolled when it reaches this size." htmlFor="cap-size">
              <TextInput
                id="cap-size"
                type="number"
                min="1"
                max="2048"
                disabled={!ref.current.overrides}
                value={ref.current.fileSizeMb}
                onChange={(e) => { ref.current = { ...ref.current, fileSizeMb: Number(e.target.value) }; render() }}
              />
            </Field>
            <Field label="Max files" required hint="How many rolled files are kept on disk before the oldest is dropped." htmlFor="cap-files">
              <TextInput
                id="cap-files"
                type="number"
                min="1"
                max="500"
                disabled={!ref.current.overrides}
                value={ref.current.maxFiles}
                onChange={(e) => { ref.current = { ...ref.current, maxFiles: Number(e.target.value) }; render() }}
              />
            </Field>
            <Field label="Rotation type" required hint="By size rolls at the file size above; by date rolls at midnight." htmlFor="cap-rot">
              <Select
                id="cap-rot"
                options={ROTATION_TYPES}
                disabled={!ref.current.overrides}
                value={ref.current.rotation}
                onChange={(e) => { ref.current = { ...ref.current, rotation: e.target.value }; render() }}
              />
            </Field>
            <Field
              label="Archival period"
              required
              hint={`Days retained in cold storage — ${archivalLabel(ref.current.archivalDays)}.`}
              htmlFor="cap-arch"
            >
              <TextInput
                id="cap-arch"
                type="number"
                min="1"
                max="3650"
                disabled={!ref.current.overrides}
                value={ref.current.archivalDays}
                onChange={(e) => { ref.current = { ...ref.current, archivalDays: Number(e.target.value) }; render() }}
              />
            </Field>
          </div>

          <KeyValue
            cols={1}
            rows={[
              { k: 'Event', v: <span className="mono">{row.code}</span>, icon: 'tag' },
              { k: 'Category', v: row.categoryLabel, icon: 'layers' },
              { k: 'Captured', v: ref.current.captured ? 'Yes' : 'No — produces no log line', icon: ref.current.captured ? 'checkC' : 'ban' },
              { k: 'Effective retention', v: ref.current.overrides ? archivalLabel(ref.current.archivalDays) : `${globals.retentionDays} days (global)`, icon: 'clock' },
              { k: 'Destination', v: globals.target, icon: 'server' },
            ]}
          />
        </div>
      ),
      footer: (
        <>
          <Button onClick={() => setDrawer(null)}>Cancel</Button>
          <Button
            variant="pri"
            icon="save"
            onClick={() => {
              const d = ref.current
              patch([row.id], d)
              setDrawer(null)
              toast('ok', 'Capture configured', d.overrides
                ? `${row.label} keeps ${d.maxFiles} × ${d.fileSizeMb} MB files, rotating ${d.rotation.toLowerCase()}, archived for ${archivalLabel(d.archivalDays)}.`
                : `${row.label} follows the global defaults again.`)
            }}
          >
            Save configuration
          </Button>
        </>
      ),
    })

    render()
  }

  const columns = [
    serialColumn('S.No'),
    {
      key: 'label', label: 'Event', locked: true, cls: 'td-main', width: 300,
      value: (r) => `${r.label} ${r.code}`,
      render: (r) => (
        <span className="cell-id">
          <Icon name={r.captured ? 'logs' : 'eyeoff'} size={13} style={{ color: r.captured ? 'var(--accent)' : 'var(--faint)' }} />
          <span className="cell-stack">
            <span className="trunc">{r.label}</span>
            <span className="cell-sub mono t-xs">{r.code}</span>
          </span>
        </span>
      ),
    },
    {
      // The flexible column absorbs the slack, so on a narrower canvas
      // "Authorization and privilege changes" truncates with nothing to hover.
      key: 'categoryLabel', label: 'Category', cls: 'td-flex',
      render: (r) => <span className="trunc" title={r.categoryLabel}>{r.categoryLabel}</span>,
    },
    {
      key: 'captured', label: 'Captured', width: 118,
      value: (r) => (r.captured ? 1 : 0),
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Switch checked={r.captured} label={`Capture ${r.label}`} onChange={(v) => setCaptured([r], v)} />
        </span>
      ),
    },
    { key: 'maxFiles', label: 'Files', align: 'right', width: 82, render: (r) => (r.captured ? num(r.maxFiles) : <span className="t-faint">—</span>) },
    { key: 'fileSizeMb', label: 'Size', align: 'right', width: 92, render: (r) => (r.captured ? `${num(r.fileSizeMb)} MB` : <span className="t-faint">—</span>) },
    {
      key: 'rotation', label: 'Rotation', width: 118,
      render: (r) => (r.captured ? <Tag>{r.rotation}</Tag> : <span className="t-faint">—</span>),
    },
    {
      key: 'archivalDays', label: 'Archival period', align: 'right', width: 150,
      render: (r) => {
        if (!r.captured) return <span className="t-faint">Not captured</span>
        return r.overrides
          ? <Pill tone="warn">{archivalLabel(r.archivalDays)} · override</Pill>
          : <span className="t-mut">{globals.retentionDays} days · global</span>
      },
    },
  ]

  return (
    <div className="stack">
      <StatCards
        label="Capture summary"
        items={[
          { key: 'captured', icon: 'logs', label: 'Events captured', value: stats.captured, chip: `of ${CAPTURE_TOTAL}`, chipTone: 'ok', sub: 'writing a log line' },
          { key: 'silent', icon: 'eyeoff', label: 'Not captured', value: stats.silent, chip: stats.silent ? 'no record at all' : 'none', chipTone: stats.silent ? 'warn' : undefined, sub: 'produce no evidence' },
          { key: 'overrides', icon: 'sliders', label: 'With an override', value: stats.overrides, chip: 'own retention', sub: 'not following the global default' },
          { key: 'longest', icon: 'clock', label: 'Longest retention', value: archivalLabel(stats.longest || 0), chip: 'archival period', sub: 'across every captured event' },
        ]}
      />

      <DataWorkbench
        id="log-capture"
        rows={visible}
        columns={columns}
        selectable
        searchPlaceholder="Search by event name or code…"
        onRowClick={configure}
        filters={
          <>
            <button
              type="button"
              className="chip"
              data-on={category === 'all' ? 'true' : undefined}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              <Icon name="layers" size={12} />All
              <b className="chip-n num">{rows.length}</b>
            </button>
            {CAPTURE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                data-on={category === c.id ? 'true' : undefined}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
                {/* Counts what the chip filters to, not what is captured within
                    it — counting only captured events made the row sum to 45
                    against 46, and a chip reading 6 opened a table of 7. */}
                <b className="chip-n num">{rows.filter((r) => r.category === c.id).length}</b>
              </button>
            ))}
          </>
        }
        bulkActions={(ids, clear) => {
          const list = rows.filter((r) => ids.map(String).includes(String(r.id)))
          return (
            <>
              <Button size="sm" icon="checkC" onClick={() => { setCaptured(list, true); clear() }}>Capture</Button>
              <Button
                size="sm"
                variant="danger"
                icon="eyeoff"
                onClick={() => confirm({
                  title: `Stop capturing ${list.length} event${list.length === 1 ? '' : 's'}?`,
                  body: 'No log line is written for these events from the next restart. Evidence already retained is unaffected, but nothing new is recorded.',
                  confirmLabel: 'Stop capturing',
                  onConfirm: () => { setCaptured(list, false); clear() },
                })}
              >
                Stop capturing
              </Button>
            </>
          )
        }}
        rowActions={(r) => [
          { id: 'cfg', label: 'Configure', icon: 'sliders', onSelect: () => configure(r) },
          r.captured
            ? { id: 'off', label: 'Stop capturing', icon: 'eyeoff', danger: true, onSelect: () => setCaptured([r], false) }
            : { id: 'on', label: 'Start capturing', icon: 'checkC', onSelect: () => setCaptured([r], true) },
          {
            id: 'reset',
            label: 'Follow global defaults',
            icon: 'refresh',
            disabled: !r.overrides,
            onSelect: () => patch([r.id], { overrides: false }, 'Override removed', `${r.label} follows the global retention again.`),
          },
        ]}
        emptyTitle="No events"
        emptyBody="No capturable event matches the current filter."
        emptyIcon="logs"
        pageSize={20}
        footNote="An event with an override keeps its own rotation and archival period; everything else follows the global defaults"
      />
    </div>
  )
}
