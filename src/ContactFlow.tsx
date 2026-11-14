import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, LockKeyhole } from 'lucide-react'

export const PRIVACY_NOTICE_VERSION = '2026-11-12'
const WHATSAPP_URL = 'https://wa.me/917003276998?text=Hello%20CampusGuard%2C%20I%20just%20sent%20an%20enquiry%20from%20the%20website.'

/** Topics must match the list the API accepts (api/pilot-inquiries.ts). */
const NEEDS = [
  { topic: 'Request pilot details', title: 'A pilot', hint: 'Start with a few cameras' },
  { topic: 'Plan a deployment', title: 'A deployment plan', hint: 'Scope, hardware, timeline' },
  { topic: 'Discuss multi-site needs', title: 'Several campuses', hint: 'One setup across sites' },
  { topic: 'Book a demo', title: 'A walkthrough', hint: 'See the app with the team' },
] as const

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STEP_TITLES = ['What do you need?', 'Who are we speaking to?', 'Where should we reply?']

type Props = { initialTopic?: string }

/**
 * One question at a time. Fewer fields on screen, the same data and the same consent
 * as the old form: name, organisation, email, topic, optional note, privacy consent.
 */
export default function ContactFlow({ initialTopic = '' }: Props) {
  const uid = useId()
  const known = NEEDS.some(need => need.topic === initialTopic)
  const [step, setStep] = useState(known ? 1 : 0)
  const [topic, setTopic] = useState(known ? initialTopic : '')
  const [form, setForm] = useState({ name: '', organisation: '', email: '', message: '', website: '' })
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const mounted = useRef(false)

  const set = (key: keyof typeof form, value: string) => { setForm(current => ({ ...current, [key]: value })); setError('') }

  // Move focus to the new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    const target = firstField.current ?? headingRef.current
    target?.focus({ preventScroll: true })
  }, [step, sent])

  const choose = (value: string) => { setTopic(value); setError(''); window.setTimeout(() => setStep(1), 140) }

  const next = (event: React.FormEvent) => {
    event.preventDefault()
    if (step === 1) {
      if (form.name.trim().length < 2) { setError('Please tell us your name.'); return }
      if (form.organisation.trim().length < 2) { setError('Please tell us your school or organisation.'); return }
      setError(''); setStep(2)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!EMAIL.test(form.email.trim())) { setError('Please enter an email address we can reply to.'); return }
    if (!consent) { setError('Please agree to the Privacy Policy so we can respond.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/pilot-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(), organisation: form.organisation.trim(), topic,
          message: form.message.trim(), website: form.website, privacy_consent: true, privacy_notice_version: PRIVACY_NOTICE_VERSION,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'We could not send your message. Please try again.')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error. Please try again.')
    } finally { setBusy(false) }
  }

  if (sent) {
    const first = form.name.trim().split(/\s+/)[0]
    return (
      <div className="cf cf-done" role="status">
        <span className="cf-check"><Check size={26} strokeWidth={2.4} /></span>
        <h3 ref={headingRef} tabIndex={-1}>Thanks{first ? `, ${first}` : ''}. It’s with us.</h3>
        <p>A person on the team will reply by email, usually within a day. Please check your spam folder if you don’t see it.</p>
        <a className="button button-lime" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Message us on WhatsApp <ArrowUpRight size={15} /></a>
      </div>
    )
  }

  return (
    <div className="cf">
      <ol className="cf-progress" aria-label={`Question ${step + 1} of 3`}>
        {[0, 1, 2].map(index => <li key={index} className={index < step ? 'is-done' : index === step ? 'is-current' : ''}><span /></li>)}
      </ol>
      <p className="cf-step">Question {step + 1} of 3</p>
      <h3 className="cf-title" ref={headingRef} tabIndex={-1} aria-live="polite">{STEP_TITLES[step]}</h3>

      {step === 0 && (
        <div className="cf-options" role="group" aria-label="What do you need?">
          {NEEDS.map(need => (
            <button key={need.topic} type="button" className={'cf-option' + (topic === need.topic ? ' is-picked' : '')} onClick={() => choose(need.topic)}>
              <b>{need.title}</b><span>{need.hint}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={next} noValidate>
          <button type="button" className="cf-chip" onClick={() => setStep(0)} aria-label="Change what you need">{NEEDS.find(n => n.topic === topic)?.title ?? topic}<span>Change</span></button>
          <label htmlFor={`${uid}-name`}>Your name</label>
          <input id={`${uid}-name`} ref={firstField} autoComplete="name" maxLength={120} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
          <label htmlFor={`${uid}-org`}>School, college or organisation</label>
          <input id={`${uid}-org`} autoComplete="organization" maxLength={180} value={form.organisation} onChange={e => set('organisation', e.target.value)} placeholder="Where do you work?" />
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-back" onClick={() => setStep(0)}><ArrowLeft size={14} /> Back</button><button type="submit" className="button button-lime">Continue <ArrowRight size={15} /></button></div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submit} noValidate>
          <label htmlFor={`${uid}-email`}>Email address</label>
          <input id={`${uid}-email`} ref={firstField} type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@institution.org" />
          <label htmlFor={`${uid}-note`}>Anything we should know? <em>Optional</em></label>
          <textarea id={`${uid}-note`} rows={3} maxLength={3000} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Roughly how many cameras, or any questions" />
          <input className="cf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={e => set('website', e.target.value)} />
          <label className="cf-consent" htmlFor={`${uid}-consent`}>
            <input id={`${uid}-consent`} type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setError('') }} />
            <span>I have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and agree to you using my details to reply to this enquiry.</span>
          </label>
          {error && <p className="cf-error" role="alert">{error}</p>}
          <div className="cf-actions"><button type="button" className="cf-back" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button><button type="submit" className="button button-lime" disabled={busy}>{busy ? 'Sending…' : 'Send'} <ArrowUpRight size={15} /></button></div>
          <p className="cf-note"><LockKeyhole size={12} /> Please don’t include sensitive personal or security details.</p>
        </form>
      )}
    </div>
  )
}
