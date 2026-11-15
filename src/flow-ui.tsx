import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Progress bars + "Step n of N", shared by the contact, login and application flows. */
export function FlowProgress({ step, total, label = 'Step' }: { step: number; total: number; label?: string }) {
  return (
    <>
      <ol className="cf-progress" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-label={`${label} ${step + 1} of ${total}`}>
        {Array.from({ length: total }, (_, index) => <li key={index} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}><span /></li>)}
      </ol>
      <p className="cf-step">{label} {step + 1} of {total}</p>
    </>
  )
}

type PasswordProps = {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
  minLength?: number
  maxLength?: number
}

/** Password input with a show/hide switch so a long password can be checked before it is sent. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordProps>(function PasswordField(
  { id, value, onChange, autoComplete, placeholder, minLength, maxLength }, ref,
) {
  const [shown, setShown] = useState(false)
  return (
    <div className="cf-pw">
      <input
        id={id} ref={ref} type={shown ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder}
        minLength={minLength} maxLength={maxLength} value={value} onChange={event => onChange(event.target.value)}
        spellCheck={false} autoCapitalize="none"
      />
      <button type="button" className="cf-pw-toggle" onClick={() => setShown(current => !current)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
})

/** Length meter for a new password: it only reflects what the server enforces (12 to 72 characters). */
export function PasswordMeter({ length }: { length: number }) {
  const level = length === 0 ? 0 : length < 12 ? 1 : length < 16 ? 2 : 3
  const text = ['At least 12 characters. A short phrase of several words works well.', `${12 - length} more to go`, 'Good. Longer is stronger.', 'Strong length.'][level]
  return (
    <div className="cf-meter" data-level={level} aria-live="polite">
      <span><i /><i /><i /></span>
      <small>{text}</small>
    </div>
  )
}
