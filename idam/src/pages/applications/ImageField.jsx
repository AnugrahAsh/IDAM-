import { useState } from 'react'
import AppLogo from '../../components/primitives/AppLogo'
import Banner from '../../components/primitives/Banner'
import Button from '../../components/primitives/Button'
import FileDrop, { formatSize } from '../../components/primitives/FileDrop'

/**
 * The application image.
 *
 * The field used to record the file's name and nothing else: an operator chose
 * a logo, the form said `acme.png`, and every screen carried on drawing the
 * vendor mark or the generated initials. The image is read here and held with
 * the record, so what is chosen is what the register, the record header, the
 * launchpad and the sign-in screen then show.
 *
 * `value` is `{ name, src }`; `src` is a data URL, which is what makes the
 * image survive a re-render without a file server to put it on.
 */
export default function ImageField({ value, onChange, idPrefix = 'img' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = value && value.name
  const src = value && value.src

  const take = (files) => {
    const file = files && files[0]
    if (!file) return
    setBusy(true)
    setError('')
    const reader = new FileReader()
    reader.onerror = () => { setBusy(false); setError('That file could not be read.') }
    reader.onload = () => {
      setBusy(false)
      onChange({ name: file.name, src: String(reader.result), size: file.size })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="img-field">
      <span className="img-field-preview">
        <AppLogo src={src} name={name || 'Application image'} size={52} />
      </span>
      <div className="img-field-m">
        <FileDrop
          accept=".png,.jpg,.jpeg,.svg,.webp"
          // A mark is read at 22px in a register row and 56px on a record, so
          // the useful advice is about shape, not resolution.
          hint="PNG, JPG, SVG or WebP up to 1 MB. A square image reads best — it is drawn as small as 22px in a register."
          maxSize={1024 * 1024}
          label={busy ? 'Reading the image…' : (name || 'Drop an image, or choose a file')}
          onFiles={take}
        />
        {(name || error) && (
          <div className="img-field-f">
            {error
              ? <span className="img-field-err">{error}</span>
              : <span className="img-field-n trunc">{name}{value.size ? ` · ${formatSize(value.size)}` : ''}</span>}
            {name && (
              <Button size="sm" icon="trash" id={`${idPrefix}-clear`} onClick={() => { setError(''); onChange({ name: '', src: '' }) }}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Change an application's image on its own, from wherever the application is
 * on screen.
 *
 * The field also sits on the registration wizard and the SSO form, but both of
 * those are long forms whose Save is gated on their own required fields — so
 * changing a logo meant completing a federation form. This writes the image
 * and nothing else.
 */
export function openImageEditor({ app, onPatch, setDrawer, toast }) {
  const draft = { name: app.logo || '', src: app.logoSrc || '' }

  const Body = () => {
    const [value, setValue] = useState(draft)
    Object.assign(draft, value)
    return (
      <div className="stack">
        <Banner tone="info">
          Shown in the application register, on this record, on the launchpad and on the sign-in screen. Without one the
          application takes its vendor mark, or initials from its name.
        </Banner>
        <ImageField idPrefix="img-drawer" value={value} onChange={setValue} />
      </div>
    )
  }

  setDrawer({
    title: 'Application image',
    sub: app.displayName,
    size: 'md',
    children: <Body />,
    footer: (
      <>
        <Button onClick={() => setDrawer(null)}>Cancel</Button>
        <Button
          variant="pri"
          icon="save"
          onClick={() => {
            onPatch(app.id, { logo: draft.name, logoSrc: draft.src })
            setDrawer(null)
            toast('ok', draft.src ? 'Image updated' : 'Image removed', draft.src
              ? `${app.displayName} now shows ${draft.name}.`
              : `${app.displayName} is back to its vendor mark.`)
          }}
        >
          Save image
        </Button>
      </>
    ),
  })
}
