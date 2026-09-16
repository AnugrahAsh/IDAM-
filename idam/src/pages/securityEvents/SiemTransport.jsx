import { useState } from 'react'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Select from '../../components/primitives/Select'
import TextInput from '../../components/primitives/TextInput'
import Button from '../../components/primitives/Button'
import Banner from '../../components/primitives/Banner'
import Pill from '../../components/primitives/Pill'
import Toggle from '../settings/Toggle'
import { DirtyPill } from '../settings/SectionFooter'
import { changeMetaFor, recordChange, useSettings, writeSection } from '../settings/settingsStore'
import { SYSLOG_FRAMINGS, TLS_VERSIONS } from '../../lib/datetime'
import { useApp } from '../../store/AppContext'

/* Carried over from the Syslog config tab this screen replaced. The severity
   threshold, the RFC 5424 facility and the masking switch describe the message
   that goes on the wire, and nothing else on the platform sets them. */
const SEVERITIES = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
const FACILITIES = ['LOCAL0', 'LOCAL1', 'LOCAL2', 'LOCAL3', 'LOCAL4', 'LOCAL5', 'LOCAL6', 'LOCAL7']

const numberOr = (v, fallback) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * Direct SIEM delivery over TLS.
 *
 * The local file and the Splunk forwarder are always on; this is a second,
 * direct path to a collector. Every field below the toggle is disabled while
 * the path is off, because a half-filled endpoint that is not delivering is
 * worse than an empty one — it reads as configured.
 *
 * There is deliberately no passphrase field. The TLS key passphrase is read
 * from the server environment: a form that accepts one puts it into a
 * configuration export and into this screen's change history.
 *
 * The draft lives here rather than on the page, because this is the only
 * writer of the `siem` section now that it is no longer a Settings section.
 * The value itself stays in the settings store, so it survives a reload and
 * the tenant configuration export still carries it.
 */
export default function SiemTransport() {
  const { toast } = useApp()
  const settings = useSettings()
  const saved = settings.siem
  const [draft, setDraft] = useState(saved)

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const off = !draft.enabled
  const incomplete = draft.enabled && !String(draft.host).trim() && !String(draft.failover).trim()
  const meta = changeMetaFor('siem', settings)

  const save = () => {
    writeSection('siem', draft)
    recordChange('siem')
    toast('ok', 'SIEM transport applied', draft.enabled
      ? `${draft.minSeverity} and above are dispatched to the collector over TLS.`
      : 'Direct delivery is off. Events still reach the file and the forwarder.')
  }

  const reload = () => {
    setDraft(saved)
    toast('ok', 'Transport reloaded', 'The form was reloaded from the configuration the transport is running with.')
  }

  return (
    <Card
      title="SIEM Transport — Syslog over TLS"
      sub="Adds direct delivery of RFC 5424 security events to a SIEM over TLS, in addition to the always-on local file and Splunk forwarder path. The TLS passphrase is set via the server environment, not here."
      actions={
        <>
          <DirtyPill dirty={dirty} />
          <Pill tone={saved.enabled ? 'ok' : 'mut'} dot>{saved.enabled ? 'Delivering' : 'Not enabled'}</Pill>
        </>
      }
      footer={
        <>
          <span>
            {dirty
              ? 'Changes are not yet applied to the transport'
              : saved.enabled
                ? 'Transport is running with the configuration shown'
                : 'Direct delivery is off — logs still reach the file and the forwarder'}
          </span>
          <div className="spacer" />
          <Button size="sm" icon="refresh" onClick={reload}>Reload</Button>
          <Button size="sm" variant="pri" icon="save" disabled={!dirty || incomplete} onClick={save}>Save &amp; Apply</Button>
        </>
      }
    >
      <Toggle
        title="Enable direct Syslog-over-TLS delivery"
        body="When off, nothing below is dispatched. The local file and the Splunk forwarder are unaffected either way."
        checked={draft.enabled}
        onChange={(v) => set('enabled', v)}
      />

      {incomplete && (
        <div style={{ marginTop: 12 }}>
          <Banner tone="warn">
            Delivery is enabled but no collector host or failover destination is set. Nothing will be dispatched
            until one is given.
          </Banner>
        </div>
      )}

      <div className="grid grid-3" style={{ marginTop: 14 }}>
        <Field label="Collector host" hint="The SIEM listener that accepts RFC 5424 over TLS." htmlFor="si-host">
          <TextInput id="si-host" placeholder="siem.example.com" disabled={off} value={draft.host} onChange={(e) => set('host', e.target.value)} />
        </Field>
        <Field label="Port" htmlFor="si-port">
          <TextInput id="si-port" type="number" min="1" max="65535" disabled={off} value={draft.port} onChange={(e) => set('port', numberOr(e.target.value, 6514))} />
        </Field>
        <Field label="Framing" hint="How message boundaries are marked on the stream." htmlFor="si-fr">
          <Select id="si-fr" options={SYSLOG_FRAMINGS} disabled={off} value={draft.framing} onChange={(e) => set('framing', e.target.value)} />
        </Field>
        <Field
          label="Failover destinations"
          span={2}
          hint="Optional. Comma-separated host:port pairs, tried in order. Overrides the host and port above."
          htmlFor="si-fo"
        >
          <TextInput id="si-fo" placeholder="host1:6514,host2:6514" disabled={off} value={draft.failover} onChange={(e) => set('failover', e.target.value)} />
        </Field>
        <Field
          label="Spill / dead-letter path"
          hint="Optional. Where undeliverable messages are written rather than dropped."
          htmlFor="si-dl"
        >
          <TextInput id="si-dl" placeholder="/var/log/siem/syslog_deadletter.log" disabled={off} value={draft.deadLetterPath} onChange={(e) => set('deadLetterPath', e.target.value)} />
        </Field>
      </div>

      <h3 className="set-sub-k">Message content</h3>
      <div className="grid grid-2">
        <Field label="Minimum severity" hint="Events at this severity and above are dispatched. Which events exist at all is set on the capture register." htmlFor="si-sev">
          <Select id="si-sev" options={SEVERITIES} disabled={off} value={draft.minSeverity} onChange={(e) => set('minSeverity', e.target.value)} />
        </Field>
        <Field label="Syslog facility" hint="The RFC 5424 facility stamped on every message, so the collector can route it." htmlFor="si-fac">
          <Select id="si-fac" options={FACILITIES} disabled={off} value={draft.facility} onChange={(e) => set('facility', e.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: 12 }}>
        <Toggle
          title="Mask sensitive values"
          body="Redact credentials, tokens and secrets from the message body before it leaves the platform."
          checked={draft.maskSensitive}
          onChange={(v) => set('maskSensitive', v)}
        />
      </div>

      {draft.enabled && !draft.maskSensitive && (
        <div style={{ marginTop: 12 }}>
          <Banner tone="bad">
            With masking off, credentials and tokens can reach the collector in clear text and are retained there
            under the SIEM's own policy, not this platform's.
          </Banner>
        </div>
      )}

      <h3 className="set-sub-k">TLS / mTLS</h3>
      <div className="grid grid-2">
        <Field label="CA bundle path" hint="Trust anchors used to verify the collector." htmlFor="si-ca">
          <TextInput id="si-ca" disabled={off} value={draft.caBundlePath} onChange={(e) => set('caBundlePath', e.target.value)} />
        </Field>
        <Field label="Server name (SNI)" hint="Sent in the handshake when it differs from the host." htmlFor="si-sni">
          <TextInput id="si-sni" disabled={off} value={draft.sni} onChange={(e) => set('sni', e.target.value)} />
        </Field>
        <Field label="Client certificate path" hint="mTLS. Leave empty for one-way TLS." htmlFor="si-cc">
          <TextInput id="si-cc" disabled={off} value={draft.clientCertPath} onChange={(e) => set('clientCertPath', e.target.value)} />
        </Field>
        <Field label="Client key path" hint="mTLS. The passphrase is read from the server environment." htmlFor="si-ck">
          <TextInput id="si-ck" disabled={off} value={draft.clientKeyPath} onChange={(e) => set('clientKeyPath', e.target.value)} />
        </Field>
        <Field label="Minimum TLS version" htmlFor="si-tls">
          <Select id="si-tls" options={TLS_VERSIONS} disabled={off} value={draft.minTlsVersion} onChange={(e) => set('minTlsVersion', e.target.value)} />
        </Field>
      </div>

      <div style={{ marginTop: 12 }}>
        <Toggle
          title="Verify server certificate"
          body="Reject the connection when the collector presents a certificate the CA bundle does not trust. Turning this off sends audit logs over a channel nobody has authenticated."
          checked={draft.verifyServerCert}
          onChange={(v) => set('verifyServerCert', v)}
        />
      </div>

      {draft.enabled && !draft.verifyServerCert && (
        <div style={{ marginTop: 12 }}>
          <Banner tone="bad">
            Certificate verification is off. Audit and security events would be shipped to whatever answers on
            that address. Enable verification before applying this in a production tenant.
          </Banner>
        </div>
      )}

      <h3 className="set-sub-k">Reliability</h3>
      <div className="grid grid-3">
        <Field label="Retry attempts" hint="Per message, before it goes to the dead-letter path." htmlFor="si-ra">
          <TextInput id="si-ra" type="number" min="0" max="20" disabled={off} value={draft.retryAttempts} onChange={(e) => set('retryAttempts', numberOr(e.target.value, 5))} />
        </Field>
        <Field label="Base backoff (ms)" htmlFor="si-bb">
          <TextInput id="si-bb" type="number" min="0" disabled={off} value={draft.baseBackoffMs} onChange={(e) => set('baseBackoffMs', numberOr(e.target.value, 200))} />
        </Field>
        <Field label="Max backoff (ms)" htmlFor="si-mb">
          <TextInput id="si-mb" type="number" min="0" disabled={off} value={draft.maxBackoffMs} onChange={(e) => set('maxBackoffMs', numberOr(e.target.value, 5000))} />
        </Field>
        <Field label="Breaker threshold" hint="Consecutive failures before the transport opens the circuit." htmlFor="si-bt">
          <TextInput id="si-bt" type="number" min="1" disabled={off} value={draft.breakerThreshold} onChange={(e) => set('breakerThreshold', numberOr(e.target.value, 5))} />
        </Field>
        <Field label="Breaker cooldown (ms)" hint="How long the circuit stays open before a probe." htmlFor="si-bc">
          <TextInput id="si-bc" type="number" min="0" disabled={off} value={draft.breakerCooldownMs} onChange={(e) => set('breakerCooldownMs', numberOr(e.target.value, 30000))} />
        </Field>
      </div>

      {/* Settings showed who last touched each section in a card beside the
          form. That card does not follow the transport here, so the same fact
          is stated on the form it describes. */}
      <div className="t-xs t-mut" style={{ marginTop: 14 }}>
        {meta
          ? `Last changed by ${meta.by} on ${meta.at} under ${meta.ticket}.`
          : 'Never changed. The transport is running the configuration the platform shipped with.'}
      </div>
    </Card>
  )
}
