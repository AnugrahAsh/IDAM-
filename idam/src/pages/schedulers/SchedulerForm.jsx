import { useMemo, useRef, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import SearchSelect from '../../components/primitives/SearchSelect'
import Select from '../../components/primitives/Select'
import Tag from '../../components/primitives/Tag'
import TextInput from '../../components/primitives/TextInput'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import StickyActions from '../../components/shell/StickyActions'
import { SchedulerFormSkeleton } from './SchedulersSkeleton'
import { useApp } from '../../store/AppContext'
import { useLoading } from '../../lib/useLoading'
import { SERVICE_OPTIONS, applicationRequired, configIssues, serviceFor } from './serviceCatalog'
import ExecutionPanel from './ExecutionPanel'
import ScheduleFields from './ScheduleFields'
import ServiceConfigPanel from './ServiceConfigPanel'
import {
  BASE, SCHEDULE_TYPES, applicationOptions, bindService, blankScheduler,
  nextRunAt, relFuture, scheduleDescription, schedulerIssues, stamp,
  withApplicationBinding, withDerived,
} from './schedulerModel'

/**
 * Create and modify a scheduler.
 *
 * One component for both, because they are one form — Modify hydrates it from
 * the record and Add starts it blank. The service binding stays editable on an
 * existing scheduler; it is a binding, not an identity.
 *
 * Two things the form owns that the record does not:
 *
 *   `configByService` — every service's configuration held under its own code.
 *     Configuration used to be one flat object keyed by field name, so toggling
 *     Data Export's notifications left License Validation's notifications on
 *     the moment you switched to it: any key two schemas happen to share leaked
 *     between them. Rebinding reads that service's own values, or its declared
 *     defaults.
 *
 *   `touched` — validation is silent until the first Submit, then live.
 */
export default function SchedulerForm({ record, onSave }) {
  const { toast, navigate } = useApp()
  const isNew = !record

  /* Hydrated through the binding migration: a service whose application picker
     became a multi-select declares where the record's single `application_id`
     now lives, and the draft opens holding it as the first selection instead of
     an empty required field. */
  const [draft, setDraft] = useState(() => (record ? withApplicationBinding({ ...record }) : blankScheduler()))
  const [touched, setTouched] = useState(false)
  const [dirty, setDirty] = useState(false)
  /* Modify is hydrated from a record a deployment goes and reads, so it waits.
     Create is a blank form the operator starts typing into — `ms: 0` because
     there is nothing on its way, and a wait invented for an empty form is just
     a delay. */
  const loading = useLoading(record ? record.id : null, record ? undefined : 0)
  /* Seeded from the record being edited so returning to its own service shows
     the values it was saved with, not the catalogue defaults. */
  const configByService = useRef(
    record?.service_code
      ? { [record.service_code]: { ...withApplicationBinding({ ...record }).service_config } }
      : {},
  )

  const svc = serviceFor(draft.service_code)
  const meta = svc?.metadata
  const appField = meta?.requiresApplication ? meta.applicationField : null
  const appRequired = applicationRequired(draft.service_code, draft.service_config)

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true) }
  const replace = (next) => { setDraft(next); setDirty(true) }

  const chooseService = (code) => {
    // Bank the configuration of the service being left before rebinding.
    if (draft.service_code) configByService.current[draft.service_code] = { ...draft.service_config }
    replace(bindService(draft, code, configByService.current))
  }

  const setConfig = (config) => {
    configByService.current[draft.service_code] = config
    set({ service_config: config })
  }

  const issues = useMemo(
    () => [...schedulerIssues(draft), ...configIssues(draft.service_code, draft.service_config).map((l) => `${l} is required.`)],
    [draft],
  )
  const preview = useMemo(() => nextRunAt({ ...draft, active_status: true }), [draft])

  const submit = () => {
    setTouched(true)
    if (issues.length) {
      toast('warn', 'Scheduler incomplete', issues[0])
      return
    }
    const saved = withDerived({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      display_name: draft.name.trim(),
      // The service's declared defaults are written onto the record rather than
      // left to a runtime fallback, so what runs is what the form showed.
      service_config: { ...draft.service_config },
    })
    onSave(saved, isNew)
  }

  const cancel = () => navigate(BASE)

  if (loading) return <SchedulerFormSkeleton />

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="Scheduler"
        eyebrow={isNew ? 'Create scheduler' : 'Modify scheduler'}
        title={draft.name || (isNew ? 'New scheduler' : record.name)}
        sub={svc ? svc.description : 'Bind a service to a schedule. The service you choose decides what can be configured below.'}
        badges={
          <>
            {svc && <Tag>{svc.serviceCode}</Tag>}
            {!isNew && <Pill tone={draft.active_status ? 'ok' : 'mut'} dot>{draft.active_status ? 'Active' : 'Inactive'}</Pill>}
          </>
        }
        meta={
          svc && draft.schedule_type ? (
            <>
              <Fact icon="clock" label="Schedule" value={scheduleDescription(draft)} />
              <Fact icon="calendar" label="Next run" value={preview == null ? '—' : `${stamp(preview)} UTC · in ${relFuture(preview)}`} />
            </>
          ) : undefined
        }
        actions={<Button icon="x" onClick={cancel}>Cancel</Button>}
      />

      <div className="detail-body">
        <div className="stack">
          <Card title="Scheduler" sub="What runs, under what name, and when">
            <div className="stack">
              <div className="grid grid-2">
                <Field
                  label="Service name"
                  required
                  span={appField ? 1 : 2}
                  hint={svc
                    ? svc.description
                    : 'Choose the job this scheduler will run. The settings below change depending on the service.'}
                  keepHint
                  error={touched && !draft.service_code ? 'Select a service name.' : undefined}
                  htmlFor="automationServiceName"
                >
                  <SearchSelect
                    id="automationServiceName"
                    value={draft.service_code}
                    options={SERVICE_OPTIONS}
                    placeholder="Select a service"
                    searchPlaceholder="Search services…"
                    onChange={(e) => chooseService(e.target.value)}
                  />
                </Field>

                {appField && (
                  <Field
                    label={appField.label}
                    required={appRequired}
                    /* A service may declare its application optional under some
                       configurations; the hint says so rather than leaving a
                       field that looks required and is not. */
                    hint={appRequired ? appField.help : `${appField.help} Not needed with the options selected below.`}
                    keepHint
                    error={touched && appRequired && !draft.application_id ? `${appField.label} is required.` : undefined}
                    htmlFor="applicationId"
                  >
                    <SearchSelect
                      id="applicationId"
                      value={draft.application_id == null ? '' : String(draft.application_id)}
                      options={applicationOptions(appField.source)}
                      placeholder={appField.placeholder}
                      searchPlaceholder="Search applications…"
                      onChange={(e) => set({ application_id: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </Field>
                )}

                <Field
                  label="Scheduler name"
                  required
                  hint="A unique name that identifies this scheduler in the list, logs and notifications. Use a short, descriptive name, e.g. Daily_Dormant_Account_Check."
                  keepHint
                  error={touched && !draft.name.trim() ? 'A scheduler name is required.' : undefined}
                  htmlFor="schedulerName"
                >
                  <TextInput
                    id="schedulerName"
                    name="schedulerName"
                    value={draft.name}
                    placeholder="Enter scheduler name"
                    onChange={(e) => set({ name: e.target.value })}
                  />
                </Field>

                <Field
                  label="Description"
                  hint='Optional note on why this scheduler exists, who owns it, or what it covers, e.g. "Weekly export of active users for HR audit".'
                  htmlFor="description"
                >
                  <TextInput
                    id="description"
                    name="description"
                    value={draft.description}
                    placeholder="Description"
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </Field>

                <Field
                  label="Schedule type"
                  required
                  span={2}
                  hint="How this scheduler is triggered. Manual runs only when started from the list. One Time runs once at a set date and time. Periodic repeats every N minutes, hours or days. Recurring runs daily, weekly or monthly at a set time of day."
                  keepHint
                  error={touched && !draft.schedule_type ? 'Select a schedule type.' : undefined}
                  htmlFor="scheduleType"
                >
                  <Select
                    id="scheduleType"
                    name="scheduleType"
                    value={draft.schedule_type}
                    placeholder="Select a schedule type"
                    options={SCHEDULE_TYPES}
                    onChange={(e) => set({ schedule_type: e.target.value })}
                  />
                </Field>
              </div>

              <ScheduleFields draft={draft} onChange={replace} />

              {draft.schedule_type && (
                <div className="banner" data-tone="ok">
                  <Icon name="calendar" size={15} />
                  <div>
                    <b>{scheduleDescription(draft)}</b>
                    {preview != null && <> — first run {stamp(preview)} UTC, in {relFuture(preview)}.</>}
                    {preview == null && draft.schedule_type !== 'manual' && <> — nothing is due; check the start and end window.</>}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {draft.service_code && (
            <>
              <ServiceConfigPanel code={draft.service_code} config={draft.service_config} onChange={setConfig} />
              <ExecutionPanel draft={draft} onChange={replace} />
            </>
          )}

          {touched && issues.length > 0 && (
            <Banner tone="warn">
              <b>{issues.length} {issues.length === 1 ? 'thing' : 'things'} left to settle.</b>
              <ul className="issue-list">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </Banner>
          )}

          <StickyActions
            flow
            dirty={dirty}
            message={dirty ? 'Unsaved changes' : isNew ? 'Nothing saved yet' : 'No changes'}
          >
            <Button onClick={cancel}>Cancel</Button>
            <Button variant="pri" icon="save" onClick={submit}>Submit</Button>
          </StickyActions>
        </div>
      </div>
    </>
  )
}
