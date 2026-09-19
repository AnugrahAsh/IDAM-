import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import SearchSelect from '../../components/primitives/SearchSelect'
import Banner from '../../components/primitives/Banner'
import {
  DATE_OPTIONS, DAY_OPTIONS, FREQUENCIES, INTERVAL_TYPES,
  fromLocalInput, toLocalInput,
} from './schedulerModel'

/**
 * The timing block, driven entirely by `schedule_type`.
 *
 * One component rather than four branches spread through the form: the four
 * modes then cannot drift apart, and the fields they share — the start and end
 * window — are declared once.
 *
 * Every date and time here is a wall-clock reading in the scheduler's own
 * timezone. It is converted to UTC on the way into the record and back on the
 * way out, so changing the timezone re-reads the same instants rather than
 * silently moving the schedule.
 */
export default function ScheduleFields({ draft, onChange }) {
  const tz = draft.timezone
  const set = (patch) => onChange({ ...draft, ...patch })
  const setStamp = (key, value) => set({ [key]: fromLocalInput(value, tz) })

  if (!draft.schedule_type) return null

  if (draft.schedule_type === 'manual') {
    return (
      <Banner tone="info">
        This scheduler will not run automatically. Start it from the Schedulers list using <b>Run now</b>.
      </Banner>
    )
  }

  if (draft.schedule_type === 'one-time') {
    return (
      <div className="grid grid-2">
        <Field
          label="Start time"
          required
          keepHint
          hint={`The date and time the job runs, in ${tz} (set under Execution, retry & timezone). Must be a future date and time.`}
          htmlFor="startTime"
        >
          <TextInput
            id="startTime"
            name="startTime"
            type="datetime-local"
            value={toLocalInput(draft.start_time, tz)}
            onChange={(e) => setStamp('start_time', e.target.value)}
          />
        </Field>
      </div>
    )
  }

  const periodic = draft.schedule_type === 'periodic'

  const window = (
    <div className="grid grid-2">
      <Field
        label="Start date & time"
        required={periodic}
        keepHint
        hint={periodic
          ? 'When the first run happens. Later runs are counted from this time.'
          : 'The schedule starts from this date and time. No runs happen before it.'}
        htmlFor="startDate"
      >
        <TextInput
          id="startDate"
          name="startDate"
          type="datetime-local"
          value={toLocalInput(draft.start_date, tz)}
          onChange={(e) => setStamp('start_date', e.target.value)}
        />
      </Field>
      <Field
        label="End date & time"
        keepHint
        hint="The scheduler stops after this date and time. Leave empty to run indefinitely. Must be later than the start."
        htmlFor="endDate"
      >
        <TextInput
          id="endDate"
          name="endDate"
          type="datetime-local"
          value={toLocalInput(draft.end_date, tz)}
          onChange={(e) => setStamp('end_date', e.target.value)}
        />
      </Field>
    </div>
  )

  if (periodic) {
    return (
      <>
        <div className="grid grid-2">
          <Field label="Interval type" required keepHint hint="The unit for the repeat interval." htmlFor="intervalType">
            <Select
              id="intervalType"
              value={draft.interval_type}
              options={INTERVAL_TYPES}
              onChange={(e) => set({ interval_type: e.target.value })}
            />
          </Field>
          <Field
            label="Interval value"
            required
            keepHint
            hint="How often the job repeats, in the unit chosen. Enter a whole number of 1 or more, e.g. 30 with Minutes = every 30 minutes. Avoid intervals shorter than the job’s timeout."
            htmlFor="timeBetweenRun"
          >
            <TextInput
              id="timeBetweenRun"
              name="timeBetweenRun"
              type="number"
              min="1"
              value={draft.run_between ?? ''}
              onChange={(e) => set({ run_between: e.target.value === '' ? '' : Number(e.target.value) })}
            />
          </Field>
        </div>
        {window}
      </>
    )
  }

  return (
    <>
      <div className="grid grid-2">
        <Field label="Frequency" required keepHint hint="How often the job repeats on the calendar." htmlFor="frequency">
          <Select
            id="frequency"
            value={draft.frequency}
            options={FREQUENCIES}
            onChange={(e) => set({ frequency: e.target.value })}
          />
        </Field>
        <Field
          label="Time of day"
          required
          keepHint
          hint={`The time the job runs on each selected day, in ${tz}. E.g. 02:00 to run outside business hours.`}
          htmlFor="timeOfDay"
        >
          <TextInput
            id="timeOfDay"
            name="timeOfDay"
            type="time"
            value={draft.time_of_day || ''}
            onChange={(e) => set({ time_of_day: e.target.value })}
          />
        </Field>
      </div>

      {draft.frequency === 'weekly' && (
        <Field label="Days" required keepHint hint="The weekdays the job runs. Select one or more days, e.g. Monday and Thursday." htmlFor="days">
          <SearchSelect
            id="days"
            multiple
            value={draft.days || []}
            options={DAY_OPTIONS}
            placeholder="Select at least one day"
            onChange={(e) => set({ days: e.target.value })}
          />
        </Field>
      )}

      {draft.frequency === 'monthly' && (
        <Field
          label="Dates"
          required
          keepHint
          hint="The days of the month the job runs (1–31). Select one or more dates. If a month doesn’t have the date (e.g. 31), that month is skipped."
          htmlFor="dates"
        >
          <SearchSelect
            id="dates"
            multiple
            value={draft.dates || []}
            options={DATE_OPTIONS}
            placeholder="Select at least one date"
            searchPlaceholder="Filter dates…"
            onChange={(e) => set({ dates: e.target.value })}
          />
        </Field>
      )}

      {window}
    </>
  )
}
