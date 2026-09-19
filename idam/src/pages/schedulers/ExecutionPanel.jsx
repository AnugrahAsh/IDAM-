import { useState } from 'react'
import Field from '../../components/primitives/Field'
import TextInput from '../../components/primitives/TextInput'
import Select from '../../components/primitives/Select'
import SearchSelect from '../../components/primitives/SearchSelect'
import Switch from '../../components/primitives/Switch'
import Icon from '../../components/primitives/Icon'
import ConfigField from './ConfigField'
import { serviceFor } from './serviceCatalog'
import {
  ATTEMPT_RANGE, BACKOFF_RANGE, MISFIRE_POLICIES, TIMEOUT_RANGE,
  backoffOptions, summariseExecution, timezoneOptions,
} from './schedulerModel'

const BATCH_RANGE = { min: 1, max: 100000 }
const CONCURRENCY_RANGE = { min: 1, max: 64 }

const RECIPIENTS_FIELD = {
  key: 'notification_emails',
  label: 'Recipients',
  type: 'string-list',
  required: true,
  maxItems: 50,
  placeholder: 'admin, it_ops',
  help: 'IDAM usernames to notify about failures; email addresses come from their user profiles. Separate multiple values with commas, e.g. admin, it_ops.',
}

function SwitchRow({ id, label, help, checked, disabled, onChange }) {
  return (
    <div className="cfg-switch">
      <div className="cfg-switch-m">
        <label className="cfg-switch-t" htmlFor={id}>{label}</label>
        <div className="cfg-switch-s">{help}</div>
      </div>
      <Switch checked={checked} disabled={disabled} label={label} onChange={onChange} />
    </div>
  )
}

/**
 * Execution, retry and timezone — the policy every service shares.
 *
 * Collapsed by default, because the defaults are almost always right and the
 * panel is a dozen controls deep. The summary strip states what it currently
 * holds so it is legible without opening: zone, timeout, and whether a failure
 * is retried at all.
 */
export default function ExecutionPanel({ draft, onChange, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const svc = serviceFor(draft.service_code)
  const meta = svc?.metadata
  const set = (patch) => onChange({ ...draft, ...patch })
  const baseSeconds = Math.round((draft.backoff_delay_ms || 0) / 1000)
  // A service that is not safe to run twice at once, or that must not be
  // retried, cannot be made to; the control stays visible and off so the
  // reason is on screen rather than absent.
  const concurrencyLocked = meta ? !meta.idempotent : false
  const retryLocked = meta ? !meta.retryable : false
  const concurrent = !concurrencyLocked && !!draft.allow_concurrent
  const retry = !retryLocked && !!draft.retry_enabled
  const queue = svc && ['EMAIL_QUEUE_PROCESSOR', 'SMS_QUEUE_PROCESSOR'].includes(svc.serviceCode)

  return (
    <section className="card acc" data-open={open || undefined}>
      <button type="button" className="acc-h" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon name="chevR" size={14} className="acc-chev" />
        <span className="acc-meta">
          <span className="acc-t">Execution, retry &amp; timezone</span>
          <span className="acc-s">{summariseExecution(draft)}</span>
          <span className="acc-s">Advanced run settings. The defaults are recommended for this service.</span>
        </span>
      </button>

      {open && (
        <div className="card-b">
          <div className="stack">
            <div className="cfg-group">
              <div className="cfg-group-h">Schedule</div>
              <div className="grid grid-2">
                <Field
                  label="Timezone"
                  required
                  keepHint
                  hint="The timezone used for all dates and times in this scheduler; times are stored in UTC. Choose the timezone of the team or system this job serves."
                  htmlFor="adv-timezone"
                >
                  <SearchSelect
                    id="adv-timezone"
                    value={draft.timezone}
                    options={timezoneOptions()}
                    onChange={(e) => set({ timezone: e.target.value })}
                  />
                </Field>
                <Field
                  label="If a scheduled run was missed"
                  required
                  keepHint
                  hint='What happens if the application was down at the scheduled time. "Run once" catches up with one run; "Skip" waits for the next slot; "Run every" replays each missed run — use with care.'
                  htmlFor="adv-misfire"
                >
                  <Select
                    id="adv-misfire"
                    value={draft.misfire_policy}
                    options={MISFIRE_POLICIES}
                    onChange={(e) => set({ misfire_policy: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="cfg-group">
              <div className="cfg-group-h">Execution</div>
              <div className="grid grid-2">
                <Field
                  label="Timeout (minutes)"
                  required
                  keepHint
                  hint={`The run is cancelled if it takes longer than this. Enter minutes, ${TIMEOUT_RANGE.min}–${TIMEOUT_RANGE.max.toLocaleString()}, e.g. 60. Set it above the job’s normal duration.`}
                  htmlFor="adv-timeout"
                >
                  <TextInput
                    id="adv-timeout"
                    type="number"
                    min={TIMEOUT_RANGE.min}
                    max={TIMEOUT_RANGE.max}
                    value={Math.round((draft.timeout_ms || 0) / 60000)}
                    onChange={(e) => set({ timeout_ms: Math.max(0, Number(e.target.value) || 0) * 60000 })}
                  />
                </Field>
                {meta?.supportsBatch && (
                  <Field
                    label="Batch size"
                    keepHint
                    hint={`How many records are processed and saved together in one batch, ${BATCH_RANGE.min}–${BATCH_RANGE.max.toLocaleString()}, default 500. Lower it (e.g. 100) if the database is busy; raise it for faster runs on large data.`}
                    htmlFor="adv-batch"
                  >
                    <TextInput
                      id="adv-batch"
                      type="number"
                      min={BATCH_RANGE.min}
                      max={BATCH_RANGE.max}
                      value={draft.batch_size ?? ''}
                      onChange={(e) => set({ batch_size: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                <SwitchRow
                  id="adv-concurrency"
                  label="Allow overlapping runs"
                  help={concurrencyLocked
                    ? 'This service can’t run concurrently, so overlap is disabled.'
                    : 'ON lets a new run start while the previous one is still running. Keep OFF unless the job is safe to run in parallel.'}
                  checked={concurrent}
                  disabled={concurrencyLocked}
                  onChange={(v) => set({ allow_concurrent: v })}
                />
              </div>
              {concurrent && (
                <div className="grid grid-2" style={{ marginTop: 12 }}>
                  <Field
                    label="Maximum concurrent runs"
                    required
                    keepHint
                    hint={`The maximum number of runs of this scheduler that can execute at the same time. Enter ${CONCURRENCY_RANGE.min}–${CONCURRENCY_RANGE.max}.`}
                    htmlFor="adv-max-concurrent"
                  >
                    <TextInput
                      id="adv-max-concurrent"
                      type="number"
                      min={CONCURRENCY_RANGE.min}
                      max={CONCURRENCY_RANGE.max}
                      value={draft.max_concurrent ?? ''}
                      onChange={(e) => set({ max_concurrent: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="cfg-group">
              <div className="cfg-group-h">Retry</div>
              <SwitchRow
                id="adv-retry"
                label="Retry on failure"
                help={retryLocked
                  ? 'This service doesn’t use automatic retries.'
                  : `ON retries the run automatically after a temporary failure, such as a timeout or connection error.${queue ? ' This retries the whole scheduler run, not individual messages.' : ''}`}
                checked={retry}
                disabled={retryLocked}
                onChange={(v) => set({ retry_enabled: v })}
              />

              {retry && (
                <div className="grid grid-3" style={{ marginTop: 12 }}>
                  <Field
                    label="Maximum attempts"
                    required
                    keepHint
                    hint={`Total number of tries, including the first run. ${ATTEMPT_RANGE.min}–${ATTEMPT_RANGE.max}, e.g. 3 = one run plus up to two retries.`}
                    htmlFor="adv-attempts"
                  >
                    <TextInput
                      id="adv-attempts"
                      type="number"
                      min={ATTEMPT_RANGE.min}
                      max={ATTEMPT_RANGE.max}
                      value={draft.max_attempts}
                      onChange={(e) => set({ max_attempts: Number(e.target.value) || 1 })}
                    />
                  </Field>
                  <Field
                    label="Backoff"
                    required
                    keepHint
                    hint="How the wait between retries grows. Exponential is recommended, so a struggling system isn’t overloaded."
                    htmlFor="adv-backoff"
                  >
                    <Select
                      id="adv-backoff"
                      value={draft.backoff_strategy}
                      options={backoffOptions(baseSeconds)}
                      onChange={(e) => set({ backoff_strategy: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Backoff base delay (seconds)"
                    required
                    keepHint
                    hint={`The first wait before retrying, ${BACKOFF_RANGE.min}–${BACKOFF_RANGE.max.toLocaleString()} seconds, e.g. 10. The backoff pattern builds on it.`}
                    htmlFor="adv-backoff-delay"
                  >
                    <TextInput
                      id="adv-backoff-delay"
                      type="number"
                      min={BACKOFF_RANGE.min}
                      max={BACKOFF_RANGE.max}
                      value={baseSeconds}
                      onChange={(e) => set({ backoff_delay_ms: Math.max(0, Number(e.target.value) || 0) * 1000 })}
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="cfg-group">
              <div className="cfg-group-h">Failure handling</div>
              <SwitchRow
                id="adv-continue"
                label="Continue after an individual record fails"
                help="ON skips a failing record, logs it, and carries on with the rest. OFF stops the whole run at the first failure. Keep ON for bulk jobs."
                checked={!!draft.continue_on_error}
                onChange={(v) => set({ continue_on_error: v })}
              />
              <SwitchRow
                id="adv-notify"
                label="Flag failures for notification"
                help="ON sends a notification to the recipients below when records fail."
                checked={!!draft.notify_on_failure}
                onChange={(v) => set({ notify_on_failure: v })}
              />
              {draft.notify_on_failure && (
                <div className="grid grid-2" style={{ marginTop: 12 }}>
                  <ConfigField
                    field={RECIPIENTS_FIELD}
                    idPrefix="adv"
                    value={draft.notification_emails || []}
                    onChange={(v) => set({ notification_emails: v })}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
