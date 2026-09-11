import { useEffect, useState } from 'react'
import Card from '../../../components/primitives/Card'
import Field from '../../../components/primitives/Field'
import Select from '../../../components/primitives/Select'
import Button from '../../../components/primitives/Button'
import Banner from '../../../components/primitives/Banner'
import Toggle from '../Toggle'
import SectionFooter, { DirtyPill } from '../SectionFooter'
import {
  DATE_FORMATS, LOCALES, TIMEZONES, TIME_FORMATS, WEEK_STARTS,
  formatDate, formatDateTime, formatIsoOffset, formatRelative, formatTime, offsetIn,
} from '../../../lib/datetime'

/**
 * Date and time rendering.
 *
 * Two cards, because they answer two different questions. The first is the
 * decision — how the tenant wants time written — and it carries a live preview,
 * since nobody can tell `dd-MM-yyyy` from `MM-dd-yyyy` on the 5th of June until
 * they see it rendered. The second is diagnostic: what the server clock
 * actually says versus what the application is configured to show, which is the
 * first thing checked when a report and a gateway log disagree.
 */
export default function DateTime({ draft, saved, set, onSave, onRevert, dirty }) {
  const [now, setNow] = useState(() => new Date())

  // The preview is only honest if it moves.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const soon = new Date(now.getTime() + 45 * 60 * 1000)
  const serverZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  return (
    <div className="stack">
      <Card
        title="Date & Time Settings"
        sub="Everything is stored in UTC; these settings control how times are displayed and exported across the application."
        actions={<DirtyPill dirty={dirty} />}
        footer={<SectionFooter dirty={dirty} onSave={onSave} onRevert={onRevert} />}
      >
        <div className="grid grid-3">
          <Field
            label="Application timezone (IANA)"
            hint={`Currently ${offsetIn(now, draft.timezone)} from UTC.`}
            htmlFor="dt-tz"
          >
            <Select id="dt-tz" options={TIMEZONES} value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} />
          </Field>
          <Field label="Date format" htmlFor="dt-df">
            <Select
              id="dt-df"
              value={draft.dateFormat}
              options={DATE_FORMATS.map((d) => ({ value: d.value, label: `${d.value} (${d.sample})` }))}
              onChange={(e) => set('dateFormat', e.target.value)}
            />
          </Field>
          <Field label="Time format" htmlFor="dt-tf">
            <Select id="dt-tf" value={draft.timeFormat} options={TIME_FORMATS} onChange={(e) => set('timeFormat', e.target.value)} />
          </Field>
          <Field label="Locale" hint="Drives month names, number grouping and relative phrasing." htmlFor="dt-loc">
            <Select id="dt-loc" value={draft.locale} options={LOCALES} onChange={(e) => set('locale', e.target.value)} />
          </Field>
          <Field label="Week starts on" hint="Used by calendars, campaign windows and scheduler previews." htmlFor="dt-ws">
            <Select id="dt-ws" options={WEEK_STARTS} value={draft.weekStartsOn} onChange={(e) => set('weekStartsOn', e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <Toggle
            title="Display seconds"
            body="Show seconds wherever a time is rendered. Audit and job records are written to the second either way — this only decides whether the console prints them."
            checked={draft.displaySeconds}
            onChange={(v) => set('displaySeconds', v)}
          />
        </div>

        <Card flush title="Live preview" sub="The current moment, rendered with the settings above" style={{ marginTop: 14 }}>
          <div className="dt-preview">
            <div>
              <span className="dt-preview-k">Date</span>
              <span className="dt-preview-v">{formatDate(now, draft)}</span>
            </div>
            <div>
              <span className="dt-preview-k">Date &amp; time</span>
              <span className="dt-preview-v">{formatDateTime(now, draft)}</span>
            </div>
            <div>
              <span className="dt-preview-k">Time · relative</span>
              <span className="dt-preview-v">{formatTime(soon, draft)} · {formatRelative(soon, draft, now)}</span>
            </div>
            <div>
              <span className="dt-preview-k">ISO with offset</span>
              <span className="dt-preview-v mono">{formatIsoOffset(now, draft.timezone)}</span>
            </div>
          </div>
        </Card>

        {draft.timezone !== saved.timezone && (
          <div style={{ marginTop: 12 }}>
            <Banner tone="warn">
              Changing the application timezone re-renders every timestamp in the console and every scheduled
              window. Stored values do not move — they are UTC — but a report exported before and after this
              change will print different clock times for the same event.
            </Banner>
          </div>
        )}
      </Card>

      <Card
        title="Server & application time"
        sub="What the clock actually says, against what the application is configured to show"
        actions={<Button size="sm" icon="refresh" onClick={() => setNow(new Date())}>Refresh</Button>}
        flush
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <tbody>
              <tr>
                <td className="td-main">Current UTC</td>
                <td className="td-mono">{now.toISOString()}</td>
              </tr>
              <tr>
                <td className="td-main">Current server time</td>
                <td className="td-mono">{formatIsoOffset(now, serverZone)}</td>
              </tr>
              <tr>
                <td className="td-main">Current server timezone</td>
                <td><span className="dt-zone">{serverZone}</span></td>
              </tr>
              <tr>
                <td className="td-main">Configured application timezone</td>
                <td><span className="dt-zone">{saved.timezone}</span></td>
              </tr>
              <tr>
                <td className="td-main">Current application time (formatted)</td>
                <td className="td-mono">{formatDateTime(now, saved)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {serverZone !== saved.timezone && (
          <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
            <Banner tone="info">
              This browser runs in <b>{serverZone}</b> while the application renders in <b>{saved.timezone}</b>.
              That is expected for an operator working from another region — every timestamp on screen is the
              application zone, not this machine&rsquo;s.
            </Banner>
          </div>
        )}
      </Card>
    </div>
  )
}
