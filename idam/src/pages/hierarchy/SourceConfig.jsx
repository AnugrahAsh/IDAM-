import { useMemo, useState } from 'react'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import Field from '../../components/primitives/Field'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Select from '../../components/primitives/Select'
import Switch from '../../components/primitives/Switch'
import { num } from '../../lib/format'
import { MULTI_LOOKUPS } from '../configurations/configData'
import {
  LOOKUP_ATTRS, applyOverrides, buildTree, defaultBindings, lookupById, measure, overrideReport,
} from './hierarchyData'

const NOT_BOUND = ''

/**
 * Where the shape of the tree is decided.
 *
 * Two choices make a hierarchy: the multi-level lookup that names the tiers,
 * and the lookup attribute each tier reads off an identity. Neither is useful
 * alone — a lookup with no attribute bound names levels nothing can be sorted
 * into, and an attribute with no lookup has no idea what depth it sits at — so
 * they are chosen together, on one surface, against a live count of what the
 * choice produces.
 */
export default function SourceConfig({ hierarchy, onApply, onCancel }) {
  const [draft, setDraft] = useState(() => ({
    lookupId: hierarchy.lookupId,
    bindings: { ...(hierarchy.bindings || {}) },
    unassigned: !!hierarchy.unassigned,
  }))

  const lookup = lookupById(draft.lookupId)
  const levels = lookup ? lookup.levels : []
  const bound = levels.filter((lv) => draft.bindings[lv]).length

  const current = useMemo(() => measure(applyOverrides(buildTree(hierarchy), hierarchy.overrides)), [hierarchy])
  const derived = useMemo(() => buildTree({ ...hierarchy, ...draft }), [hierarchy, draft])
  const next = useMemo(() => measure(applyOverrides(derived, hierarchy.overrides)), [derived, hierarchy])
  const report = useMemo(() => overrideReport(hierarchy, derived), [hierarchy, derived])

  const changed = draft.lookupId !== hierarchy.lookupId
    || draft.unassigned !== !!hierarchy.unassigned
    || levels.some((lv) => draft.bindings[lv] !== (hierarchy.bindings || {})[lv])

  const pickLookup = (value) => {
    const id = value === '' ? null : Number(value)
    // Bindings are per level name, so carrying them across a lookup change
    // would leave keys belonging to levels that no longer exist. Defaults for
    // the new lookup are resolved instead, and the operator overrides from there.
    setDraft((d) => ({ ...d, lookupId: id, bindings: defaultBindings(id) }))
  }

  const bindLevel = (level, attrId) => setDraft((d) => ({
    ...d,
    bindings: { ...d.bindings, [level]: attrId || undefined },
  }))

  return (
    <div className="stack">
      <Field
        label="Multi-level lookup"
        required
        hint="Defined in Configurations. Its levels become the tiers of this tree, in order."
        htmlFor="hs-lookup"
      >
        <Select
          id="hs-lookup"
          value={draft.lookupId == null ? '' : String(draft.lookupId)}
          placeholder="No source configured"
          options={MULTI_LOOKUPS.map((m) => ({ value: String(m.id), label: `${m.name} · ${m.levels.length} levels` }))}
          onChange={(e) => pickLookup(e.target.value)}
        />
      </Field>

      {!lookup ? (
        <Banner tone="warn">
          With no lookup selected this hierarchy has no levels, and the tree cannot be built. Choose the lookup whose
          levels describe the structure you want to see.
        </Banner>
      ) : (
        <>
          <div className="hier-bind">
            <div className="hier-bind-h">
              <span>Level</span>
              <span>Lookup attribute</span>
            </div>
            {levels.map((level, i) => {
              const attrId = draft.bindings[level] || NOT_BOUND
              const attr = LOOKUP_ATTRS.find((a) => a.id === attrId)
              return (
                <div className="hier-bind-row" key={level} data-off={!attr || undefined}>
                  <span className="hier-bind-lv">
                    <span className="hier-bind-n num">{i + 1}</span>
                    <span className="hier-bind-m">
                      <b className="mono">{level}</b>
                      <span>{attr ? `Reads ${attr.label} · lookup ${attr.src}` : 'Nothing is read at this level'}</span>
                    </span>
                  </span>
                  <Select
                    aria-label={`Lookup attribute for level ${level}`}
                    value={attrId}
                    placeholder="Not bound"
                    options={LOOKUP_ATTRS.map((a) => ({ value: a.id, label: a.label }))}
                    onChange={(e) => bindLevel(level, e.target.value)}
                  />
                </div>
              )
            })}
          </div>

          {bound < levels.length && (
            <Banner tone="warn">
              {levels.length - bound} of {levels.length} levels have no attribute bound. An unbound level is skipped, so
              the tree is shallower than the lookup describes.
            </Banner>
          )}

          <div className="hier-opt">
            <span className="hier-opt-m">
              <b>Keep identities with no value</b>
              <span>
                An identity missing the attribute at a level is collected under an “Unassigned” unit rather than dropped
                from the tree.
              </span>
            </span>
            <Switch
              checked={draft.unassigned}
              label="Keep identities with no value"
              onChange={(v) => setDraft((d) => ({ ...d, unassigned: v }))}
            />
          </div>

          <div className="hier-cmp">
            <div className="hier-cmp-col">
              <span className="hier-cmp-k">Now</span>
              <span className="hier-cmp-v num">{num(current.units)}</span>
              <span className="hier-cmp-s">units · {current.depth} levels · {num(current.users)} identities placed</span>
            </div>
            <Icon name="arrowRight" size={15} />
            <div className="hier-cmp-col" data-next="true">
              <span className="hier-cmp-k">{changed ? 'After this change' : 'Unchanged'}</span>
              <span className="hier-cmp-v num">{num(next.units)}</span>
              <span className="hier-cmp-s">units · {next.depth} levels · {num(next.users)} identities placed</span>
            </div>
          </div>

          <KeyValue
            cols={1}
            rows={[
              { k: 'Levels', v: lookup.levels.join(' → '), icon: 'layers' },
              { k: 'Attributes read', v: `${bound} of ${levels.length} bound`, icon: 'sliders' },
              { k: 'Lookup last updated', v: lookup.updated, icon: 'clock' },
              {
                k: 'Units added by hand',
                icon: 'plus',
                node: report.added
                  ? <span>{num(report.added)}{report.stranded ? <> · <Pill tone="warn">{report.stranded} would be stranded</Pill></> : null}</span>
                  : 'None',
              },
              { k: 'Renamed or hidden units', v: report.renamed + report.hidden ? `${report.renamed} renamed, ${report.hidden} hidden` : 'None', icon: 'edit' },
            ]}
          />

          <Banner tone={report.stranded ? 'warn' : 'info'}>
            Applying this rebuilds the tree from the lookup. Units added, renamed or hidden by hand are kept and re-applied
            wherever their parent still exists in the new source
            {report.stranded
              ? `; ${report.stranded} would have no parent under this selection and stay out of the tree until one exists again.`
              : '.'}
          </Banner>
        </>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="pri"
          icon="refresh"
          disabled={!changed}
          onClick={() => onApply(draft)}
        >
          {hierarchy.lookupId ? 'Rebuild hierarchy' : 'Build hierarchy'}
        </Button>
      </div>
    </div>
  )
}
