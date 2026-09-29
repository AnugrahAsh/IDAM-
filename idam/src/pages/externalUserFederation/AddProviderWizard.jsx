import { useState } from 'react'
import DetailHeader, { Fact } from '../../components/shell/DetailHeader'
import Button from '../../components/primitives/Button'
import Card from '../../components/primitives/Card'
import Icon from '../../components/primitives/Icon'
import KeyValue from '../../components/primitives/KeyValue'
import Pill from '../../components/primitives/Pill'
import Banner from '../../components/primitives/Banner'
import { useApp } from '../../store/AppContext'
import { STEPS, SectionBody, stepEmptyCount, stepInvalidCount, useProviderDraft } from './ProviderFields'
import { BASE, vendorLabel } from './federationData'

/* ---------------------------------------------------------------------------
   Add Provider, as a wizard.

   The client's Add Provider is the whole form — the header pair plus all six
   sections, thirty-five fields — because there is nothing simpler underneath
   it to offer instead. What was wrong was showing all thirty-five at once,
   six accordions deep, to somebody who has answered none of them yet. This
   console already has the right shape for exactly that situation: AppWizard
   steps an operator through connecting an application one screen at a time,
   with a rail that shows where they are and what is still ahead. A directory
   federation is the same kind of thing to set up, so it gets the same pattern
   — the client's own field order, one section per step, ending on a review
   that names anything still unanswered before Submit is pressed for real.

   The bar carrying Cancel, Back and Continue is above the fields rather than
   below them. Under a section of eleven switches it was off the bottom of the
   screen on arrival, so the only way to find out the form could be left was to
   scroll past every field in it.
   ------------------------------------------------------------------------- */

const REVIEW = { id: 'review', title: 'Review', sub: 'Confirm and submit', icon: 'checkC' }

export default function AddProviderWizard({ rows, onCreate }) {
  const { navigate } = useApp()
  const { d, errors, ctx, trySubmit, progress } = useProviderDraft(null, rows)
  const [step, setStep] = useState(0)
  const [attempted, setAttempted] = useState(new Set())

  const steps = [...STEPS, REVIEW]
  const idx = Math.min(step, steps.length - 1)
  const current = steps[idx]

  /* A step is answered when its own starred fields are filled and nothing on
     it has been rejected — the same two facts the rail dot and the review
     checklist both read, so they can never disagree with each other. */
  const stepOk = (s) => (s.id === 'review' ? true : stepEmptyCount(s, d, false) === 0 && stepInvalidCount(s, errors, d) === 0)
  const requiredSteps = steps.filter((s) => s.id !== 'review')
  const allOk = requiredSteps.every(stepOk)

  const stateOf = (i) => {
    if (i === idx) return 'active'
    if (i < idx || attempted.has(steps[i].id)) return stepOk(steps[i]) ? 'done' : 'error'
    return 'future'
  }

  const go = (n) => {
    setAttempted((a) => new Set([...a, current.id]))
    setStep(Math.max(0, Math.min(steps.length - 1, n)))
  }

  const submit = () => {
    const res = trySubmit(onCreate)
    if (!res.ok) {
      setAttempted(new Set(steps.map((s) => s.id)))
      /* Read against `res.errors` — the validation this exact click just ran —
         rather than the `errors` state closure, which will not carry it until
         the render after this one. A step rejected only on shape (a malformed
         URL, not a blank field) would otherwise be skipped on the very click
         that found it. */
      const firstBad = requiredSteps.find((s) => stepEmptyCount(s, d, false) > 0 || stepInvalidCount(s, res.errors, d) > 0)
      if (firstBad) setStep(steps.findIndex((s) => s.id === firstBad.id))
    }
  }

  return (
    <>
      <DetailHeader
        backTo={BASE}
        backLabel="External User Federation"
        eyebrow="Add Provider"
        title={d.name.trim() || 'New provider'}
        sub="Federate users from an external LDAP directory."
        badges={<Pill tone="acc" dot>Draft</Pill>}
        meta={(
          <>
            <Fact icon="layers" label="Step" value={`${idx + 1} of ${steps.length}`} />
            <Fact icon="tag" label="Vendor" value={d.vendor ? vendorLabel(d.vendor) : 'Not chosen'} />
            <Fact icon="checkC" label="Required" value={progress.left === 0 ? 'All answered' : `${progress.left} left`} />
          </>
        )}
      />

      <div className="detail-body">
        <div className="fed-bar" data-dirty="true">
          <span className="fed-bar-m">
            <span className="fed-bar-dot" aria-hidden="true" />
            {progress.left > 0
              ? `${progress.left} required ${progress.left === 1 ? 'field' : 'fields'} still empty`
              : `Step ${idx + 1} of ${steps.length} · ${current.title}`}
          </span>
          <span className="fed-bar-a">
            <Button onClick={() => navigate(BASE)}>Cancel</Button>
            <Button icon="chevL" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</Button>
            {idx < steps.length - 1
              ? <Button variant="pri" iconRight="chevR" onClick={() => go(idx + 1)}>Continue</Button>
              : <Button variant="pri" icon="save" onClick={submit}>Submit</Button>}
          </span>
        </div>

        <div className="wizard">
          {/* The rail is AppWizard's, on a surface of its own: the steps were
              loose text beside a card before, which is what read as progress
              with no background behind it. */}
          <div className="wiz-rail fed-rail">
            {steps.map((s, i) => {
              const emptyCount = s.id === 'review' ? 0 : stepEmptyCount(s, d, false)
              return (
                <button key={s.id} type="button" className="wiz-step" data-state={stateOf(i)} onClick={() => go(i)}>
                  <span className="wiz-n">{stateOf(i) === 'done' ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>
                  <span className="wiz-m">
                    <span className="wiz-t">{s.title}</span>
                    <span className="wiz-s">
                      {s.id !== 'review' && emptyCount > 0 ? `${emptyCount} required left` : s.sub}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="wiz-body stack">
            {current.id !== 'review' ? (
              /* A section's fields sit in a Card, exactly as every other form
                 in this console holds its fields — Card's own title and sub
                 line are the section heading, not a bare pair of spans on the
                 page background. A field with nothing around it read as
                 unfinished work; this is what "finished" looks like here. */
              <Card title={current.title} sub={current.sub}>
                <SectionBody id={current.id} ctx={ctx} />
              </Card>
            ) : (
              <>
                <Card title="Review" sub="Everything below is what Submit will create.">
                  <div className="stack">
                    {allOk ? (
                      <Banner tone="ok">Every required field is answered. Check the summary, then press Submit.</Banner>
                    ) : (
                      <Banner tone="warn">
                        {progress.left} required {progress.left === 1 ? 'field is' : 'fields are'} still empty. Open a step below to
                        finish it before submitting.
                      </Banner>
                    )}

                    <KeyValue
                      cols={2}
                      rows={[
                        { k: 'UI display name', icon: 'tag', v: d.name.trim() || '—' },
                        { k: 'Vendor', icon: 'plug', v: d.vendor ? vendorLabel(d.vendor) : '—' },
                        { k: 'Connection URL', icon: 'link', node: <span className="mono">{d.connectionUrl || '—'}</span> },
                        { k: 'Edit mode', icon: 'edit', v: d.editMode || '—' },
                      ]}
                    />
                  </div>
                </Card>

                <div className="fed-review">
                  {requiredSteps.map((s) => {
                    const empty = stepEmptyCount(s, d, false)
                    const ok = empty === 0
                    return (
                      <button key={s.id} type="button" className="fed-review-row" data-ok={ok} onClick={() => go(steps.findIndex((x) => x.id === s.id))}>
                        <Icon name={ok ? 'checkC' : 'warn'} size={14} className="fed-review-ic" />
                        <span className="fed-review-t">{s.title}</span>
                        <span className="fed-review-s">{ok ? 'Complete' : `${empty} required field${empty === 1 ? '' : 's'} empty`}</span>
                        <span className="fed-review-go">Edit<Icon name="chevR" size={12} /></span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
