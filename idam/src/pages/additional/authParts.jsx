import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/primitives/Icon'
import wordmark from '../../assets/tanflow-wordmark-dark.png'

/* The pieces every end-user screen is built from, in the console's sign-in
   theme: the same card, eyebrow, heading and control geometry as the console's
   own login page, so these screens read as one product with it. */

export const DEMO_OTP = '481902'

export function AuthCard({ eyebrow, title, sub, children, wide, center, art, onSubmit, className = '' }) {
  const Tag = onSubmit ? 'form' : 'div'
  return (
    <Tag
      className={`lg-card xp-card ${wide ? 'xp-card-wide' : ''} ${center ? 'xp-card-center' : ''} ${className}`.trim()}
      onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit() } : undefined}
      noValidate
    >
      <img className="xp-logo" src={wordmark} alt="Tanflow" />
      {art}
      {(eyebrow || title || sub) && (
        <header className="lg-card-h">
          {eyebrow && <span className="lg-eyebrow">{eyebrow}</span>}
          {title && <h1 className="lg-h">{title}</h1>}
          {sub && <p className="lg-sub">{sub}</p>}
        </header>
      )}
      {children}
    </Tag>
  )
}

/** A device illustration for verification screens, drawn from theme tokens. */
export function DeviceArt({ icon = 'phone' }) {
  return (
    <span className="xp-art" aria-hidden="true">
      <Icon name={icon} size={22} />
    </span>
  )
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'current-password' }) {
  const [reveal, setReveal] = useState(false)
  return (
    <span className="lg-pw">
      <input
        id={id}
        className="inp"
        type={reveal ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" className="lg-eye" onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Hide password' : 'Show password'}>
        <Icon name={reveal ? 'eyeoff' : 'eye'} size={14} />
      </button>
    </span>
  )
}

/** One box per digit, with auto-advance, backspace and paste. */
export function OtpBoxes({ length = 6, value, onChange, onComplete, invalid, label = 'Verification code', autoFocus = true }) {
  const refs = useRef([])
  const digits = Array.from({ length }, (_, i) => value[i] || '')

  useEffect(() => {
    if (autoFocus && refs.current[0]) refs.current[0].focus({ preventScroll: true })
  }, [autoFocus])

  const set = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length && onComplete) setTimeout(() => onComplete(clean), 60)
  }

  return (
    <div className="xp-otp" role="group" aria-label={label} data-invalid={invalid || undefined}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          className="xp-otp-box"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            const arr = digits.slice()
            arr[i] = ch
            set(arr.join(''))
            if (ch && refs.current[i + 1]) refs.current[i + 1].focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && refs.current[i - 1]) refs.current[i - 1].focus()
            if (e.key === 'ArrowLeft' && refs.current[i - 1]) refs.current[i - 1].focus()
            if (e.key === 'ArrowRight' && refs.current[i + 1]) refs.current[i + 1].focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text')
            set(text)
            const at = Math.min(length - 1, text.replace(/\D/g, '').length)
            if (refs.current[at]) refs.current[at].focus()
          }}
        />
      ))}
    </div>
  )
}

/** A countdown in seconds that restarts when `restartKey` changes. */
export function useCountdown(seconds, restartKey) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => { setLeft(seconds) }, [seconds, restartKey])
  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return left
}

export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** A selectable row: icon, title, description, chevron or status. */
export function MethodRow({ icon, title, sub, onClick, disabled, badge }) {
  return (
    <button type="button" className="lg-choice xp-method" disabled={disabled} onClick={onClick}>
      <span className="lg-choice-ic"><Icon name={icon} size={15} /></span>
      <span className="lg-choice-m">
        <span className="lg-choice-t">{title}{badge}</span>
        <span className="lg-choice-s">{sub}</span>
      </span>
      {!disabled && <Icon name="chevR" size={13} />}
    </button>
  )
}

export function LinkRow({ children, center }) {
  return <div className={`lg-row ${center ? 'xp-row-center' : 'lg-row-split'}`}>{children}</div>
}
