import Banner from '../../components/primitives/Banner'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Select from '../../components/primitives/Select'
import SeverityBadge from '../../components/primitives/SeverityBadge'
import TextInput from '../../components/primitives/TextInput'
import { num } from '../../lib/format'
import { useState } from 'react'
import { IDENTITY_OPTIONS, ageDays } from './orphanedData'

export default function AssignForm({ accounts, onChange }) {
  const [val, setVal] = useState({ identity: '', justification: '' })
  const set = (patch) => {
    const next = { ...val, ...patch }
    setVal(next)
    onChange(next)
  }

  return (
    <div className="stack">
      <div className="t-micro t-mut">Accounts being claimed</div>
      <div className="stat-strip">
        <div className="stat-cell">
          <span className="stat-k"><Icon name="orphan" size={12} />Accounts</span>
          <span className="stat-v">{num(accounts.length)}</span>
        </div>
        <div className="stat-cell">
          <span className="stat-k"><Icon name="provision" size={12} />Applications</span>
          <span className="stat-v">{new Set(accounts.map((a) => a.application)).size}</span>
        </div>
      </div>

      <div className="feed">
        {accounts.slice(0, 6).map((a) => (
          <div className="feed-it" key={a.id}>
            <span className="feed-ic" data-tone="mut"><Icon name="orphan" size={13} /></span>
            <div className="feed-m">
              <div className="feed-t mono">{a.account}</div>
              <div className="feed-s">
                <span>{a.application}</span>
                <SeverityBadge level={a.risk}>{a.risk}</SeverityBadge>
              </div>
            </div>
            <span className="feed-time">{ageDays(a.discovered)}d old</span>
          </div>
        ))}
        {accounts.length > 6 && <div className="t-xs t-faint" style={{ paddingTop: 8 }}>and {accounts.length - 6} more</div>}
      </div>

      <Field label="Owning identity" required hint="The account is linked to this identity and enters the next attestation campaign." htmlFor="orphan-identity">
        <Select id="orphan-identity" value={val.identity} placeholder="Select an identity…" options={IDENTITY_OPTIONS} onChange={(e) => set({ identity: e.target.value })} />
      </Field>

      <Field label="Justification" hint="Recorded on the reconciliation audit trail." htmlFor="orphan-just">
        <TextInput id="orphan-just" as="textarea" value={val.justification} placeholder="Why does this identity own the account?" onChange={(e) => set({ justification: e.target.value })} />
      </Field>

      <Banner tone="warn">
        Claiming an account does not grant it. The entitlements it already holds on the target are
        brought under governance and reviewed at the next certification.
      </Banner>
    </div>
  )
}

