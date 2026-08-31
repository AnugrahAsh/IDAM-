import Icon from './Icon'
import { useId, useRef, useState } from 'react'

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const extensionOf = (name) => {
  const dot = String(name).lastIndexOf('.')
  return dot === -1 ? '' : String(name).slice(dot).toLowerCase()
}

// A drop target that is also a button and also a file input: dragging, clicking
// and tabbing to it all reach the same picker, because a drag-only affordance
// strands anyone on a keyboard or a touch screen.
export default function FileDrop({
  accept = '',
  multiple = false,
  maxSize = 5 * 1024 * 1024,
  label = 'Drag a file here, or browse',
  hint,
  onFiles,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const depth = useRef(0)
  const [over, setOver] = useState(false)
  const [error, setError] = useState('')
  const errorId = useId()

  const accepted = accept.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean)

  const reject = (msg) => {
    setError(msg)
    return null
  }

  const validate = (list) => {
    const files = [...list]
    if (files.length === 0) return null
    if (!multiple && files.length > 1) return reject('Attach one file at a time.')

    const badType = accepted.length > 0 && files.find((f) => !accepted.includes(extensionOf(f.name)))
    if (badType) return reject(`${badType.name} is not a ${accepted.join(' or ')} file.`)

    const tooBig = files.find((f) => f.size > maxSize)
    if (tooBig) return reject(`${tooBig.name} is ${formatSize(tooBig.size)}. The limit is ${formatSize(maxSize)}.`)

    setError('')
    return files
  }

  const take = (list) => {
    const files = validate(list)
    if (files && onFiles) onFiles(files)
  }

  const open = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div className="filedrop-wrap">
      <div
        className="filedrop"
        data-over={over || undefined}
        data-disabled={disabled || undefined}
        data-invalid={error ? true : undefined}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={error ? errorId : undefined}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        // dragenter/dragleave fire for every child element, so the highlight is
        // driven by a counter rather than by the last event seen.
        onDragEnter={(e) => {
          e.preventDefault()
          if (disabled) return
          depth.current += 1
          setOver(true)
        }}
        onDragOver={(e) => { e.preventDefault() }}
        onDragLeave={(e) => {
          e.preventDefault()
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          depth.current = 0
          setOver(false)
          if (disabled) return
          take(e.dataTransfer.files)
        }}
      >
        <span className="filedrop-ic"><Icon name="upload" size={18} /></span>
        <span className="filedrop-m">
          <span className="filedrop-t">{label}</span>
          {hint && <span className="filedrop-s">{hint}</span>}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="filedrop-input"
          aria-label={label}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          onChange={(e) => {
            take(e.target.files)
            // Reset so choosing the same file twice in a row still fires.
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <div className="filedrop-err" id={errorId} role="alert">
          <Icon name="warn" size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export { formatSize }
