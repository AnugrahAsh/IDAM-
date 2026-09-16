import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import Switch from '../../components/primitives/Switch'
import { num, pct } from '../../lib/format'
import { providerHealth } from './authData'
import Control from './Control'
import TestResult from './TestResult'

export default function ProviderBlock({ provider, values, enabled, onChange, onToggle, onTest, result, onOpen }) {
  const health = providerHealth(provider)
  return (
    <Card
      title={
        <span className="row" style={{ gap: 8 }}>
          <Icon name={provider.icon} size={14} />
          {provider.name}
        </span>
      }
      sub={`${provider.vendor} · ${provider.protocol} · ${provider.hosting}`}
      actions={
        <>
          <Pill tone={enabled ? 'ok' : 'mut'} dot>{enabled ? 'Enabled' : 'Disabled'}</Pill>
          <Switch checked={enabled} onChange={onToggle} label={`Enable ${provider.name}`} />
          {onOpen && <Button size="sm" iconRight="chevR" onClick={onOpen}>Open</Button>}
        </>
      }
      footer={
        <>
          <Icon name="activity" size={12} />
          <span>{num(health.challenges7d)} challenges in 7 days · {pct(health.successRate, 2)} succeeded · {health.latencyMs} ms median</span>
          <span className="spacer" />
          <span>Last tested {health.lastTest}</span>
        </>
      }
    >
      {provider.groups.map((g) => (
        <div key={g.label}>
          <div className="t-micro t-mut" style={{ margin: '0 0 10px' }}>{g.label}</div>
          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            {g.fields.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                required={f.required}
                hint={f.hint}
                span={f.span}
                htmlFor={`${provider.id}-${f.key}`}
              >
                <Control
                  f={{ ...f, id: `${provider.id}-${f.key}` }}
                  value={values[f.key]}
                  onChange={(v) => onChange(f.key, v)}
                />
              </Field>
            ))}
          </div>
        </div>
      ))}

      <div className="row">
        <Button icon="bolt" onClick={onTest}>Test Connection</Button>
        <span className="t-xs t-mut">
          Runs the probe sequence against the values currently in the form. Nothing is saved and no challenge is issued.
        </span>
      </div>

      <TestResult result={result} />
    </Card>
  )
}

