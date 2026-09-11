import { useState } from 'react'
import Card from '../../../components/primitives/Card'
import Button from '../../../components/primitives/Button'
import Banner from '../../../components/primitives/Banner'
import FileDrop from '../../../components/primitives/FileDrop'
import Icon from '../../../components/primitives/Icon'
import { useApp } from '../../../store/AppContext'
import { writeSection } from '../settingsStore'
import SectionFooter, { DirtyPill } from '../SectionFooter'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = '.jpg,.jpeg,.png'

const sizeLabel = (b) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`)

/**
 * The organization logo is what an end user sees on the sign-in screen and on
 * every mail the platform sends, so the section shows the mark it is about to
 * publish rather than only the file name.
 */
export default function Branding({ value }) {
  const { toast } = useApp()
  const [pending, setPending] = useState(null)
  const shown = pending || value

  const take = (files) => {
    const f = files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setPending({ logoName: f.name, logoSize: f.size, logoDataUrl: String(reader.result) })
    reader.readAsDataURL(f)
  }

  const save = () => {
    writeSection('branding', pending)
    setPending(null)
    toast('ok', 'Logo saved', 'The organization mark was published across the console and outbound mail.')
  }

  return (
    <Card
      title="Branding"
      sub="The mark shown in the console header, on the sign-in screen and in every notification the platform sends."
      actions={<DirtyPill dirty={!!pending} />}
      footer={<SectionFooter dirty={!!pending} onSave={save} onRevert={() => setPending(null)} saveLabel="Save logo" />}
    >
      <div className="set-logo">
        <div className="set-logo-preview" aria-label="Current organization logo">
          {shown.logoDataUrl
            ? <img src={shown.logoDataUrl} alt="Organization logo preview" />
            : <span className="set-logo-empty"><Icon name="building" size={22} /><span className="t-xs t-mut">No logo uploaded</span></span>}
        </div>
        <div className="set-logo-meta">
          <div className="t-sm" style={{ fontWeight: 600 }}>{shown.logoName || 'No file'}</div>
          <div className="t-xs t-mut">
            {shown.logoSize ? sizeLabel(shown.logoSize) : '—'}{pending ? ' · staged, not yet saved' : ''}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <FileDrop
          accept={ACCEPT}
          maxSize={MAX_BYTES}
          label="Drag the organization logo here, or browse"
          hint="Allowed types: JPG, JPEG, PNG. Maximum file size: 2 MB."
          onFiles={take}
        />
      </div>

      {pending && (
        <div style={{ marginTop: 14 }}>
          <Banner tone="info">
            The new mark replaces the current one on save. Mail already queued keeps the previous logo.
          </Banner>
        </div>
      )}

      {!pending && value.logoDataUrl && (
        <div style={{ marginTop: 14 }}>
          <Button
            size="sm"
            variant="danger"
            icon="trash"
            onClick={() => {
              writeSection('branding', { logoName: '', logoSize: 0, logoDataUrl: '' })
              toast('ok', 'Logo removed', 'The console falls back to the platform wordmark.')
            }}
          >
            Remove logo
          </Button>
        </div>
      )}
    </Card>
  )
}
