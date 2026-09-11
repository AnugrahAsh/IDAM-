import Button from '../../components/primitives/Button'
import Pill from '../../components/primitives/Pill'

/** Every settings card states whether it has pending changes and offers the
 *  same two actions, so no section is saved by a control the operator has to
 *  hunt for. */
export default function SectionFooter({ dirty, onSave, onRevert, saveLabel = 'Save' }) {
  return (
    <>
      <span>{dirty ? 'Changes are not yet applied' : 'No pending changes'}</span>
      <div className="spacer" />
      <Button size="sm" disabled={!dirty} onClick={onRevert}>Revert</Button>
      <Button size="sm" variant="pri" icon="save" disabled={!dirty} onClick={onSave}>{saveLabel}</Button>
    </>
  )
}

export const DirtyPill = ({ dirty }) => (dirty ? <Pill tone="warn" dot>Unsaved</Pill> : null)
