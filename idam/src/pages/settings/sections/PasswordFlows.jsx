import { useState } from 'react'
import Card from '../../../components/primitives/Card'
import Switch from '../../../components/primitives/Switch'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Tag from '../../../components/primitives/Tag'
import Banner from '../../../components/primitives/Banner'
import Icon from '../../../components/primitives/Icon'
import { useApp } from '../../../store/AppContext'
import { FLOW_TYPES, MAX_COMBINED_FLOWS, flowAvailability, writeSection } from '../settingsStore'
import SectionFooter, { DirtyPill } from '../SectionFooter'

/**
 * Which credential-delivery journeys the tenant runs. The combination rules
 * are enforced by disabling what cannot be turned on and saying why, rather
 * than by rejecting the save afterwards.
 */
export default function PasswordFlows({ value }) {
  const { toast } = useApp()
  const [draft, setDraft] = useState(value)
  const dirty = JSON.stringify(draft) !== JSON.stringify(value)
  const avail = flowAvailability(draft.active)
  const activeCount = FLOW_TYPES.filter((t) => draft.active[t.id]).length

  const toggle = (id, on) => setDraft((d) => ({ ...d, active: { ...d.active, [id]: on } }))

  const save = () => {
    writeSection('passwordFlows', draft)
    toast('ok', 'Password flows saved', `${activeCount} ${activeCount === 1 ? 'flow is' : 'flows are'} active for credential delivery.`)
  }

  return (
    <Card
      title="Password flow configuration"
      sub="How a credential reaches the identity. Disabled status is managed automatically from the active combination."
      actions={<DirtyPill dirty={dirty} />}
      footer={<SectionFooter dirty={dirty} onSave={save} onRevert={() => setDraft(value)} />}
    >
      <div className="set-rules">
        <div className="set-rules-t"><Icon name="info" size={13} /> Configuration rules</div>
        <ul className="set-rules-l">
          <li>Email Link + SMS must be used alone.</li>
          <li>Other flows can be combined, at most {MAX_COMBINED_FLOWS} at a time.</li>
          <li>Valid combinations: Email Link + Email OTP · Email Link + SMS OTP · Email OTP + SMS OTP.</li>
        </ul>
      </div>

      <div style={{ overflowX: 'auto', marginTop: 14 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Flow type</th>
              <th style={{ width: 150 }}>Active status</th>
              <th>Disabled status</th>
            </tr>
          </thead>
          <tbody>
            {FLOW_TYPES.map((t) => {
              const on = !!draft.active[t.id]
              const a = avail[t.id]
              return (
                <tr key={t.id}>
                  <td className="td-main">
                    {t.label}
                    {t.exclusive && <Tag tone="warn" style={{ marginLeft: 8 }}>Exclusive</Tag>}
                  </td>
                  <td>
                    <span className="row" style={{ gap: 8 }}>
                      <Switch checked={on} disabled={!on && a.disabled} onChange={(v) => toggle(t.id, v)} label={`${t.label} active`} />
                      <span className="t-xs t-mut">{on ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>
                    {on
                      ? <span className="t-xs t-mut">Enabled</span>
                      : a.disabled
                        ? <span className="t-xs" style={{ color: 'var(--warn)' }}>Disabled — {a.reason}</span>
                        : <span className="t-xs t-mut">Enabled</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {activeCount === 0 && (
        <div style={{ marginTop: 14 }}>
          <Banner tone="warn">
            No flow is active. No identity can be sent a credential until at least one is turned on.
          </Banner>
        </div>
      )}

      {/* One field, so no grid: a two-column row holding a single control left
          an empty half beside a box that takes two digits. */}
      <div style={{ marginTop: 14, maxWidth: 260 }}>
        <Field
          label="Max limit"
          required
          hint="How many credential-delivery attempts an identity may make before the flow locks."
          htmlFor="pf-max"
        >
          <TextInput
            id="pf-max"
            type="number"
            min="1"
            max="100"
            value={draft.maxLimit}
            onChange={(e) => setDraft((d) => ({ ...d, maxLimit: Number(e.target.value) }))}
          />
        </Field>
      </div>
    </Card>
  )
}
