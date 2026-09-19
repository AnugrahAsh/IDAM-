import Card from '../../components/primitives/Card'
import Banner from '../../components/primitives/Banner'
import Tag from '../../components/primitives/Tag'
import EmptyState from '../../components/primitives/EmptyState'
import ConfigField from './ConfigField'
import { isVisible, serviceFor } from './serviceCatalog'

/**
 * The Service Configuration panel.
 *
 * Generated whole from the selected service's `configSchema` — groups, fields,
 * defaults, ranges and conditional visibility. There is no per-service branch
 * in this file and there should never be one: eleven hand-written forms is the
 * shape this module is being rebuilt away from.
 */
export default function ServiceConfigPanel({ code, config, onChange }) {
  const svc = serviceFor(code)
  if (!svc) {
    return (
      <Card title="Service configuration">
        <EmptyState
          size="sm"
          icon="sliders"
          title="No service selected"
          body="Choose a service name and its configuration appears here."
        />
      </Card>
    )
  }

  const set = (key, value) => onChange({ ...config, [key]: value })
  const meta = svc.metadata

  return (
    <Card
      title="Service configuration"
      sub={svc.description}
      actions={
        <span className="row" style={{ gap: 6 }}>
          <Tag>{svc.serviceCode}</Tag>
          {meta.supportsBatch && <Tag tone="info">Batched</Tag>}
          {meta.producesItemLogs && <Tag tone="info">Per-item logs</Tag>}
          {!meta.idempotent && <Tag tone="warn">Not concurrency-safe</Tag>}
        </span>
      }
    >
      <div className="stack">
        {svc.note && <Banner tone="info">{svc.note}</Banner>}
        {svc.configSchema.map((group) => {
          const shown = group.fields.filter((f) => isVisible(f, config))
          if (!shown.length) return null
          return (
            <div className="cfg-group" key={group.group}>
              <div className="cfg-group-h">{group.group}</div>
              <div className="grid grid-2">
                {shown.map((f) => (
                  <ConfigField
                    key={f.key}
                    field={f}
                    value={config[f.key]}
                    onChange={(v) => set(f.key, v)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
