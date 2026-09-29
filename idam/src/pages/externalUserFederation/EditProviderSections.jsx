import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import Pill from '../../components/primitives/Pill'
import { useApp } from '../../store/AppContext'
import { STEPS, SectionBody, stepEmptyCount, stepInvalidCount, useProviderDraft } from './ProviderFields'
import { BASE, vendorLabel } from './federationData'

/* ---------------------------------------------------------------------------
   Edit Provider, as a record.

   Editing is not creating: the operator already knows what this provider is
   and almost always wants one field, not a guided tour of thirty-five. Every
   section is reachable at any time and nothing is gated the way a fresh form's
   steps are — a rejected field locks nothing.

   It is the same rail Add draws rather than a tab strip. Seven tabs carrying
   seven labels and their badges could not survive a narrow canvas: they either
   overflowed their row or collapsed the labels to nothing, which is the "does
   not look good on smaller devices" of this screen. The rail holds seven
   labels at any width, collapses to a scrollable strip on a phone, and makes
   Add and Edit one screen an operator learns once rather than two.
   ------------------------------------------------------------------------- */
export default function EditProviderSections({ record, rows, onSave }) {
  const { navigate } = useApp()
  const { d, errors, ctx, dirty, trySubmit, progress, leftText, credentialStored } = useProviderDraft(record, rows)
  const [section, setSection] = useState('identity')
  const current = STEPS.find((s) => s.id === section) || STEPS[0]

  /* Three states, the same three Add's rail uses and for the same reasons: a
     section holding a rejected value, a section with every required field
     answered, and one still short of some. Nothing here is "not reached yet",
     because on a saved record every section already has values in it. */
  const stateOf = (s) => {
    if (s.id === section) return 'active'
    if (stepInvalidCount(s, errors, d) > 0) return 'error'
    return stepEmptyCount(s, d, credentialStored) === 0 ? 'done' : 'future'
  }

  const submit = () => {
    const res = trySubmit((draft) => onSave(record.id, draft))
    if (!res.ok) {
      if (res.errors.name || res.errors.vendor) { setSection('identity'); return }
      const firstBad = STEPS.find((s) => s.id !== 'identity' && stepInvalidCount(s, res.errors, d) > 0)
      if (firstBad) setSection(firstBad.id)
    }
  }

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="External User Federation"
        eyebrow="External User Federation"
        title={record.name}
        badges={<Pill tone={record.enabled ? 'ok' : 'mut'} dot>{record.enabled ? 'Enabled' : 'Disabled'}</Pill>}
        meta={(
          <>
            <Fact icon="tag" label="Vendor" value={vendorLabel(record.vendor)} />
            <Fact icon="edit" label="Edit mode" value={record.editMode || 'Not set'} />
            <Fact icon="link" label="Connection URL" value={record.connectionUrl || 'Not set'} />
          </>
        )}
      />

      <div className="detail-body">
        <div className="fed-bar" data-dirty={dirty || undefined}>
          <span className="fed-bar-m">
            <span className="fed-bar-dot" aria-hidden="true" />
            {progress.left > 0 ? leftText : (dirty ? 'Unsaved changes' : 'No changes')}
          </span>
          <span className="fed-bar-a">
            <Button onClick={() => navigate(BASE)}>Cancel</Button>
            <Button variant="pri" icon="save" onClick={submit}>Update Provider</Button>
          </span>
        </div>

        <div className="wizard">
          <div className="wiz-rail fed-rail">
            {STEPS.map((s) => {
              const invalid = stepInvalidCount(s, errors, d)
              const empty = stepEmptyCount(s, d, credentialStored)
              const state = stateOf(s)
              return (
                <button key={s.id} type="button" className="wiz-step" data-state={state} onClick={() => setSection(s.id)}>
                  <span className="wiz-n">
                    {state === 'done' ? <Icon name="check" size={12} stroke={3} /> : <Icon name={s.icon} size={12} />}
                  </span>
                  <span className="wiz-m">
                    <span className="wiz-t">{s.title}</span>
                    <span className="wiz-s">
                      {invalid > 0
                        ? `${invalid} field${invalid === 1 ? '' : 's'} to fix`
                        : empty > 0
                          ? `${empty} required left`
                          : s.sub}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="wiz-body stack">
            {/* Card's own title and sub line, the way every other record in this
                console heads its body — not a second, home-grown heading
                sitting inside an otherwise bare card. */}
            <Card title={current.title} sub={current.sub}>
              <SectionBody id={section} ctx={ctx} />
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
