import { useMemo, useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import IconButton from '../../../components/primitives/IconButton'
import Icon from '../../../components/primitives/Icon'
import Field from '../../../components/primitives/Field'
import TextInput from '../../../components/primitives/TextInput'
import Select from '../../../components/primitives/Select'
import SearchSelect from '../../../components/primitives/SearchSelect'
import Switch from '../../../components/primitives/Switch'
import Banner from '../../../components/primitives/Banner'
import Tag from '../../../components/primitives/Tag'
import EmptyState from '../../../components/primitives/EmptyState'
import KeyValue from '../../../components/primitives/KeyValue'
import { useApp } from '../../../store/AppContext'
import { ORGANIZATIONS } from '../../../data/seed'
import {
  BINDING_SCOPES, FLOWS_BY_WORKFLOW, PRECEDENCE, WORKFLOWS, regionInUse, resolveFlow, writeSection,
} from '../settingsStore'
import Toggle from '../Toggle'

const ORG_NAMES = ORGANIZATIONS.map((o) => o.name)

const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1

/**
 * Regions and the bindings that route a password journey through them.
 *
 * Two registers and a master toggle, in the order an administrator has to work
 * through them: a region has to exist before it can be bound, and a binding
 * does nothing until region-aware authentication is switched on. The preview at
 * the foot resolves a real workflow through the precedence rule so the
 * ordering is demonstrated rather than asserted.
 */
export default function Regions({ regions, regionFlows, settings }) {
  const { toast, confirm } = useApp()
  const [region, setRegion] = useState({ key: '', name: '' })
  const [binding, setBinding] = useState({ workflow: '', scope: 'Global (default)', region: '', org: '', flow: '', priority: 50 })
  const [override, setOverride] = useState({ org: '', state: 'Enabled' })
  const [probe, setProbe] = useState({ workflow: WORKFLOWS[1], region: 'IN', org: ORG_NAMES[0] })

  const activeRegionKeys = regions.filter((r) => r.active).map((r) => r.key)
  const flowOptions = binding.workflow ? FLOWS_BY_WORKFLOW[binding.workflow] : []
  const needsRegion = binding.scope === 'Region' || binding.scope === 'Organization + Region'
  const needsOrg = binding.scope === 'Organization' || binding.scope === 'Organization + Region'

  const regionProblem = !region.key.trim()
    ? 'Enter the key the identity record carries, for example IN.'
    : !region.name.trim()
      ? 'Enter the display name shown to administrators.'
      : regions.some((r) => r.key.toUpperCase() === region.key.trim().toUpperCase())
        ? 'A region with this key already exists.'
        : ''

  const bindingProblem = !binding.workflow
    ? 'Choose the workflow this binding routes.'
    : !binding.flow
      ? 'Choose the flow the workflow resolves to.'
      : needsRegion && !binding.region
        ? 'This scope needs a region.'
        : needsOrg && !binding.org
          ? 'This scope needs an organization.'
          : ''

  const addRegion = () => {
    if (regionProblem) { toast('warn', 'Region not added', regionProblem); return }
    writeSection('regions', (rs) => [...rs, { id: nextId(rs), key: region.key.trim().toUpperCase(), name: region.name.trim(), active: true }])
    toast('ok', 'Region added', `${region.name.trim()} is available to bindings and to the identity schema.`)
    setRegion({ key: '', name: '' })
  }

  const deleteRegion = (r) => {
    if (regionInUse(r.key, settings)) {
      toast('warn', 'Region is in use', `${r.name} is referenced by a flow binding. Deactivate it instead of deleting it.`)
      return
    }
    confirm({
      title: `Delete ${r.name}?`,
      body: 'Identities carrying this region fall back to the global default flow at their next password journey.',
      confirmLabel: 'Delete region',
      onConfirm: () => {
        writeSection('regions', (rs) => rs.filter((x) => x.id !== r.id))
        toast('ok', 'Region deleted', r.name)
      },
    })
  }

  const addBinding = () => {
    if (bindingProblem) { toast('warn', 'Binding not added', bindingProblem); return }
    writeSection('regionFlows', (f) => ({
      ...f,
      bindings: [...f.bindings, {
        id: nextId(f.bindings),
        workflow: binding.workflow,
        scope: binding.scope,
        region: needsRegion ? binding.region : '',
        org: needsOrg ? binding.org : '',
        flow: binding.flow,
        priority: Number(binding.priority) || 0,
        active: true,
      }],
    }))
    toast('ok', 'Binding added', `${binding.workflow} routes to ${binding.flow} at ${binding.scope.toLowerCase()} scope.`)
    setBinding({ workflow: '', scope: 'Global (default)', region: '', org: '', flow: '', priority: 50 })
  }

  const resolved = useMemo(
    () => resolveFlow(probe.workflow, { region: probe.region, org: probe.org }, settings),
    [probe, settings],
  )

  const scopeLabel = (b) => {
    if (b.scope === 'Global (default)') return 'Global (default)'
    if (b.scope === 'Region') return `Region · ${b.region}`
    if (b.scope === 'Organization') return `Organization · ${b.org}`
    return `${b.org} · ${b.region}`
  }

  return (
    <div className="stack">
      <Card
        title="Regions"
        sub="Optional. An identity without a region falls back to the tenant’s global default flow."
      >
        <div className="grid grid-3 set-inline-add">
          <Field label="Region key" required hint="Carried on the identity record. For example IN, UK, EU." htmlFor="rg-key">
            <TextInput
              id="rg-key"
              className="mono"
              value={region.key}
              placeholder="IN"
              maxLength={6}
              onChange={(e) => setRegion((r) => ({ ...r, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
            />
          </Field>
          <Field label="Display name" required htmlFor="rg-name">
            <TextInput id="rg-name" value={region.name} placeholder="India" onChange={(e) => setRegion((r) => ({ ...r, name: e.target.value }))} />
          </Field>
          <div className="set-inline-act">
            <Button variant="pri" icon="plus" onClick={addRegion}>Add region</Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Region key</th>
                <th style={{ width: 190 }}>Display name</th>
                {/* The flexible column is the one worth reading: which bindings
                    hold this region is the answer to "why can I not delete it". */}
                <th>Routed by</th>
                <th style={{ width: 96 }}>Active</th>
                <th style={{ width: 68 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => {
                const used = regionInUse(r.key, settings)
                return (
                  <tr key={r.id}>
                    <td className="td-main mono">{r.key}</td>
                    <td>{r.name}</td>
                    <td>
                      {used ? (
                        <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                          {settings.regionFlows.bindings
                            .filter((b) => b.region === r.key)
                            .map((b) => (
                              <Tag key={b.id} tone={b.active ? 'acc' : undefined}>
                                {b.workflow === 'Password Reset' ? 'Password Reset' : 'Set Password'} → {b.flow}
                              </Tag>
                            ))}
                        </span>
                      ) : (
                        <span className="t-faint">No binding — falls back to the global default</span>
                      )}
                    </td>
                    <td>
                      <Switch
                        checked={r.active}
                        label={`${r.name} active`}
                        onChange={(v) => writeSection('regions', (rs) => rs.map((x) => (x.id === r.id ? { ...x, active: v } : x)))}
                      />
                    </td>
                    <td>
                      <IconButton
                        icon="trash"
                        size="sm"
                        label={used ? `${r.name} is referenced by a binding` : `Delete ${r.name}`}
                        disabled={used}
                        onClick={() => deleteRegion(r)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="t-xs t-mut" style={{ marginTop: 10 }}>
          A region referenced by one or more bindings cannot be deleted — deactivate it instead.
        </div>
      </Card>

      <Card
        title="Region-aware authentication"
        sub="The master switch. While it is off the existing configured method is used and every binding below is inert."
        actions={regionFlows.enabled ? <Tag tone="ok">On</Tag> : <Tag>Off</Tag>}
      >
        <Toggle
          title="Region-aware authentication"
          body="Off — the existing configured method is used, which is backward compatible. Bindings are inactive until this is enabled."
          checked={regionFlows.enabled}
          onChange={(v) => {
            writeSection('regionFlows', (f) => ({ ...f, enabled: v }))
            toast(v ? 'ok' : 'info', v ? 'Region-aware authentication on' : 'Region-aware authentication off',
              v ? 'Flow bindings now resolve for every password journey.' : 'Every identity falls back to the configured method.')
          }}
        />

        <div className="set-sub-h">Activation and rollout · advanced</div>
        <div className="t-xs t-mut" style={{ marginBottom: 10 }}>
          Turn the behaviour on for one organization at a time before enabling it tenant-wide.
        </div>

        <div className="grid grid-3 set-inline-add">
          <Field label="Organization" htmlFor="ov-org">
            <SearchSelect
              id="ov-org"
              value={override.org}
              options={ORG_NAMES}
              placeholder="Select an organization"
              onChange={(e) => setOverride((o) => ({ ...o, org: e.target.value }))}
            />
          </Field>
          <Field label="State" htmlFor="ov-state">
            <Select id="ov-state" options={['Enabled', 'Disabled']} value={override.state} onChange={(e) => setOverride((o) => ({ ...o, state: e.target.value }))} />
          </Field>
          <div className="set-inline-act">
            <Button
              icon="save"
              disabled={!override.org}
              onClick={() => {
                writeSection('regionFlows', (f) => ({
                  ...f,
                  overrides: [...f.overrides.filter((o) => o.org !== override.org), { id: nextId(f.overrides), org: override.org, state: override.state }],
                }))
                toast('ok', 'Override saved', `${override.org} is ${override.state.toLowerCase()}.`)
                setOverride({ org: '', state: 'Enabled' })
              }}
            >
              Save override
            </Button>
          </div>
        </div>

        {regionFlows.overrides.length === 0 ? (
          <EmptyState size="sm" icon="building" title="No organization overrides" body="Every organization follows the master switch." />
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 220 }}>Organization</th>
                  <th style={{ width: 120 }}>State</th>
                  {/* What the override actually does, rather than an empty
                      column stretching to the width of the card. */}
                  <th>Effect</th>
                  <th style={{ width: 68 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {regionFlows.overrides.map((o) => (
                  <tr key={o.id}>
                    <td className="td-main">{o.org}</td>
                    <td><Tag tone={o.state === 'Enabled' ? 'ok' : undefined}>{o.state}</Tag></td>
                    <td className="t-sm t-mut">
                      {o.state === 'Enabled'
                        ? 'Flow bindings resolve for this organization, whatever the master switch says.'
                        : 'This organization keeps the configured method and ignores every binding.'}
                    </td>
                    <td>
                      <IconButton
                        icon="trash"
                        size="sm"
                        label={`Remove override for ${o.org}`}
                        onClick={() => {
                          writeSection('regionFlows', (f) => ({ ...f, overrides: f.overrides.filter((x) => x.id !== o.id) }))
                          toast('ok', 'Override removed', o.org)
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Flow bindings"
        sub={`Which flow a workflow resolves to, per scope. Resolution precedence: ${PRECEDENCE}.`}
      >
        {!regionFlows.enabled && (
          <div style={{ marginBottom: 14 }}>
            <Banner tone="warn">
              Region-aware authentication is off, so these bindings are recorded but not applied. Turn the master switch on above.
            </Banner>
          </div>
        )}

        <div className="grid grid-3 set-inline-add">
          <Field label="Workflow" required htmlFor="fb-wf">
            <Select
              id="fb-wf"
              options={WORKFLOWS}
              value={binding.workflow}
              placeholder="Select a workflow"
              onChange={(e) => setBinding((b) => ({ ...b, workflow: e.target.value, flow: '' }))}
            />
          </Field>
          <Field label="Scope" htmlFor="fb-scope">
            <Select
              id="fb-scope"
              options={BINDING_SCOPES}
              value={binding.scope}
              onChange={(e) => setBinding((b) => ({ ...b, scope: e.target.value }))}
            />
          </Field>
          <Field
            label="Flow"
            required
            htmlFor="fb-flow"
            hint={binding.workflow ? undefined : 'Select a workflow first'}
          >
            <Select
              id="fb-flow"
              options={flowOptions}
              value={binding.flow}
              disabled={!binding.workflow}
              placeholder={binding.workflow ? 'Select a flow' : 'Select a workflow first'}
              onChange={(e) => setBinding((b) => ({ ...b, flow: e.target.value }))}
            />
          </Field>
          {needsRegion && (
            <Field label="Region" required htmlFor="fb-region">
              <Select
                id="fb-region"
                options={activeRegionKeys}
                value={binding.region}
                placeholder="Select a region"
                onChange={(e) => setBinding((b) => ({ ...b, region: e.target.value }))}
              />
            </Field>
          )}
          {needsOrg && (
            <Field label="Organization" required htmlFor="fb-org">
              <SearchSelect
                id="fb-org"
                value={binding.org}
                options={ORG_NAMES}
                placeholder="Select an organization"
                onChange={(e) => setBinding((b) => ({ ...b, org: e.target.value }))}
              />
            </Field>
          )}
          <Field label="Priority" hint="Lower wins inside the same scope." htmlFor="fb-pri">
            <TextInput id="fb-pri" type="number" min="0" max="999" value={binding.priority} onChange={(e) => setBinding((b) => ({ ...b, priority: e.target.value }))} />
          </Field>
          <div className="set-inline-act">
            <Button variant="pri" icon="plus" onClick={addBinding}>Add binding</Button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 14 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Workflow</th><th>Scope</th><th>Flow</th>
                <th style={{ width: 90 }}>Priority</th><th style={{ width: 100 }}>Active</th><th style={{ width: 60 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {regionFlows.bindings.map((b) => (
                <tr key={b.id}>
                  <td className="td-main">{b.workflow}</td>
                  <td>{scopeLabel(b)}</td>
                  <td>{b.flow}</td>
                  <td className="td-num">{b.priority}</td>
                  <td>
                    <Switch
                      checked={b.active}
                      label={`Binding ${b.id} active`}
                      onChange={(v) => writeSection('regionFlows', (f) => ({ ...f, bindings: f.bindings.map((x) => (x.id === b.id ? { ...x, active: v } : x)) }))}
                    />
                  </td>
                  <td>
                    <IconButton
                      icon="trash"
                      size="sm"
                      label={`Delete binding ${b.id}`}
                      onClick={() => {
                        writeSection('regionFlows', (f) => ({ ...f, bindings: f.bindings.filter((x) => x.id !== b.id) }))
                        toast('ok', 'Binding deleted', `${b.workflow} · ${scopeLabel(b)}`)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Resolution preview" sub="Which binding actually wins for a given identity, evaluated live against the table above.">
        <div className="grid grid-3">
          <Field label="Workflow" htmlFor="pv-wf">
            <Select id="pv-wf" options={WORKFLOWS} value={probe.workflow} onChange={(e) => setProbe((p) => ({ ...p, workflow: e.target.value }))} />
          </Field>
          <Field label="Identity region" htmlFor="pv-region">
            <Select id="pv-region" options={regions.map((r) => r.key)} value={probe.region} placeholder="No region" onChange={(e) => setProbe((p) => ({ ...p, region: e.target.value }))} />
          </Field>
          <Field label="Identity organization" htmlFor="pv-org">
            <SearchSelect id="pv-org" value={probe.org} options={ORG_NAMES} placeholder="No organization" onChange={(e) => setProbe((p) => ({ ...p, org: e.target.value }))} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          {resolved ? (
            <KeyValue
              cols={1}
              rows={[
                { k: 'Resolved flow', v: <b>{resolved.flow}</b>, icon: 'check' },
                { k: 'Winning scope', v: scopeLabel(resolved), icon: 'layers' },
                { k: 'Priority', v: resolved.priority, icon: 'sort' },
                { k: 'Precedence applied', v: PRECEDENCE, icon: 'info' },
                { k: 'Applied at runtime', v: regionFlows.enabled ? 'Yes — region-aware authentication is on' : 'No — the master switch is off', icon: 'shield' },
              ]}
            />
          ) : (
            <Banner tone="warn">
              No active binding matches. The identity would fall through to the tenant’s configured method.
            </Banner>
          )}
        </div>
      </Card>
    </div>
  )
}
