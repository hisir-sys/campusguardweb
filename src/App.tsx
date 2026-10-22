import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
import {
  ArrowRight, ArrowUpRight, Activity, BellRing, Check,
  Fingerprint, LockKeyhole, Menu,
  Monitor, ScanEye, ShieldCheck, Sparkles, X,
} from 'lucide-react'

type ModalName = 'access' | 'product' | 'login' | 'pricing' | 'inquiry' | null

const features = [
  { number: '01', icon: ScanEye, title: 'Context before noise', text: 'AI-assisted detection helps bring potentially important moments to the attention of the people responsible for reviewing them.' },
  { number: '02', icon: BellRing, title: 'Alerts with a next step', text: 'A clear incident workflow helps staff inspect an alert, review the available footage and record what happened next.' },
  { number: '03', icon: Fingerprint, title: 'Local-first by design', text: 'Video analysis is designed around the Windows desktop application. Website sync, where enabled, should be limited to explicitly selected data.' },
]

function Brand() {
  return <a className="brand" href="#top" aria-label="CampusGuard home"><span className="brand-mark"><ShieldCheck size={19} strokeWidth={1.8} /></span><span>campus<span className="brand-light">guard</span><i>®</i></span></a>
}

function AccessModal({ close, onLogin }: { close: () => void; onLogin: () => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', organisation: '', role: '', purpose: '' })
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submitApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/access-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'We could not submit your application. Please try again.')
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <section className="access-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-close" onClick={close} aria-label="Close application"><X size={18} /></button>
      {submitted ? <div className="success-state"><span className="success-icon"><Check size={25} /></span><span className="eyebrow">APPLICATION RECEIVED</span><h2 id="modal-title">You’re on our radar.</h2><p>Thanks! Your application has been received. Please check your inbox and spam/junk folder—we’ll follow up by email with next steps. We aim to contact you within 24 hours. You can also reach us directly:</p><div className="success-contact-actions"><a className="button button-lime" href="https://wa.me/917003276998?text=Hello%20CampusGuard%2C%20I%20submitted%20an%20early%20access%20application%20and%27d%20like%20to%20discuss%20a%20demo." target="_blank" rel="noopener noreferrer">WhatsApp: +91 70032 76998 <ArrowUpRight size={15}/></a><a className="button button-outline" href="https://mail.google.com/mail/?view=cm&fs=1&to=campusguard43%40gmail.com&su=CampusGuard%20early%20access%20follow-up" target="_blank" rel="noopener noreferrer">Email: campusguard43@gmail.com <ArrowUpRight size={15}/></a></div><button className="button button-dark" onClick={close}>Back to CampusGuard <ArrowRight size={16} /></button></div> :
      <><span className="eyebrow">EARLY ACCESS</span><h2 id="modal-title">Let’s make your campus more aware.</h2><p className="modal-intro">Tell us a little about your institution. Applications are intended to be reviewed before access is granted.</p>
      <form onSubmit={submitApplication}>
        <label>Your name<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Full name" /></label>
        <label>Work email<input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@institution.org" /></label>
        <label>Create password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.password} onChange={e => update('password', e.target.value)} placeholder="At least 12 characters" /></label>
        <label>Institution / organisation<input required value={form.organisation} onChange={e => update('organisation', e.target.value)} placeholder="Organisation name" /></label>
        <label>Your role<select required value={form.role} onChange={e => update('role', e.target.value)}><option value="">Choose a role</option><option>School / campus leadership</option><option>IT / security team</option><option>Facilities / operations</option><option>Research / evaluation</option><option>Other</option></select></label>
        <label>What are you hoping to evaluate?<textarea value={form.purpose} onChange={e => update('purpose', e.target.value)} placeholder="A short description (optional)" rows={3} /></label>
        <button className="button button-lime form-submit" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'} <ArrowUpRight size={16} /></button>
        {submitError && <p className="form-note" role="alert">{submitError}</p>}
        <p className="form-note"><LockKeyhole size={12} /> Your application is sent securely for review. Do not include sensitive personal information.</p>
      </form><p className="account-prompt">Already have an account? <button type="button" onClick={onLogin}>Log in <ArrowUpRight size={13} /></button></p></>}
    </section>
  </div>
}


function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('Checking your recovery link…')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    const check = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!active) return
      if (error || !data.session) {
        setMessage('This recovery link is invalid or expired. Please request a new password-reset email and open the latest link.')
        return
      }
      setReady(true)
      setMessage('')
    }
    void check()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true)
        setMessage('')
      }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (password.length < 12) { setMessage('Choose a password with at least 12 characters.'); return }
    if (password !== confirmPassword) { setMessage('The passwords do not match.'); return }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      setReady(false)
      setDone(true)
      setPassword('')
      setConfirmPassword('')
      setMessage('Your password has been updated. Return to CampusGuard and sign in with your new password.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not update your password. Please request a new reset link and try again.')
    } finally { setBusy(false) }
  }

  return <main className="admin-page">
    <header className="admin-header"><a className="brand" href="/"><span className="brand-mark"><ShieldCheck size={19} /></span><span>campus<span className="brand-light">guard</span><i>®</i></span></a><span className="admin-label">ACCOUNT SECURITY</span><a href="/" className="admin-back">Back to website ↗</a></header>
    <section className="admin-login access-modal" aria-labelledby="reset-title">
      <span className="eyebrow">PASSWORD RECOVERY</span>
      <h1 id="reset-title">{done ? 'Password updated.' : 'Choose a new password.'}</h1>
      {message && <p className="form-note" role="status">{message}</p>}
      {ready && !done && <form onSubmit={updatePassword}>
        <label>New password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 12 characters" /></label>
        <label>Confirm new password<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter it again" /></label>
        <button className="button button-lime form-submit" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'} <ArrowUpRight size={16} /></button>
      </form>}
      <p className="account-prompt"><a href="/">Return to CampusGuard</a></p>
    </section>
  </main>
}


function LoginModal({ close, onApply, onApproved }: { close: () => void; onApply: () => void; onApproved: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState<'error' | 'info' | 'success'>('info')
  const [resetMode, setResetMode] = useState(false)

  const requestPasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (checking) return
    setChecking(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (error) throw error
      setMessageKind('success')
      setMessage('If an account exists for that email, a password-reset link will be sent. Check your inbox and spam folder.')
    } catch (error) {
      setMessageKind('error')
      setMessage(error instanceof Error ? error.message : 'We could not request a reset email. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (checking) return
    setChecking(true)
    setMessage('')
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      setMessageKind('error')
      setMessage('Sign-in configuration is missing. Please contact the CampusGuard administrator.')
      setChecking(false)
      return
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error || !data.session) throw new Error('Email or password is incorrect. If you have not applied yet, request early access first.')
      const response = await fetch('/api/access-status', {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        await supabase.auth.signOut()
        throw new Error(typeof result.error === 'string' ? result.error : 'We could not verify your access status.')
      }
      if (result.status !== 'approved') {
        await supabase.auth.signOut()
        setMessageKind('info')
        setMessage(result.status === 'pending'
          ? 'Your application is still pending review. You can sign in after the CampusGuard team approves it.'
          : result.status === 'rejected'
            ? 'Your application has not been approved. Please contact the CampusGuard team if you need help.'
            : 'This account does not have a linked access application. Please request early access.')
        return
      }
      onApproved()
    } catch (error) {
      setMessageKind('error')
      setMessage(error instanceof Error ? error.message : 'Sign-in failed. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <section className="access-modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button className="modal-close" onClick={close} aria-label="Close login"><X size={18} /></button>
      <span className="eyebrow">CUSTOMER SIGN IN</span>
      <h2 id="login-title">{resetMode ? "Reset your password." : "Welcome back."}</h2>
      <p className="modal-intro">{resetMode ? "Enter your account email and we’ll send a secure reset link if the account exists." : "Sign in with the email and password you used when requesting early access."}</p>
      {message && <div className="login-prototype-note" role={messageKind === 'error' ? 'alert' : 'status'}><LockKeyhole size={16} /><span><b>{messageKind === 'success' ? 'Access approved' : messageKind === 'error' ? 'Could not sign in' : 'Access status'}</b><small>{message}</small></span></div>}
      <form onSubmit={resetMode ? requestPasswordReset : signIn}>
        <label>Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@institution.org" /></label>
        {!resetMode && <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label>}
        <button className="button button-lime form-submit" type="submit" disabled={checking}>{checking ? (resetMode ? 'Sending…' : 'Checking…') : (resetMode ? 'Send reset link' : 'Log in')} <ArrowUpRight size={16} /></button>
        {!resetMode && <p className="form-note"><LockKeyhole size={12} /> Account approval is checked on the server before access is granted.</p>}
      </form>
      <p className="account-prompt">{resetMode ? <button type="button" onClick={() => { setResetMode(false); setMessage('') }}>Back to log in</button> : <><button type="button" onClick={() => { setResetMode(true); setMessage('') }}>Forgot password?</button> · New to CampusGuard? <button type="button" onClick={onApply}>Request early access <ArrowUpRight size={13} /></button></>}</p>
    </section>
  </div>
}



function InquiryModal({ close, initialTopic }: { close: () => void; initialTopic: string }) {
  const [form, setForm] = useState({ name: '', email: '', organisation: '', topic: initialTopic, message: '' })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/pilot-inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'We could not send your inquiry. Please try again.')
      setSent(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <section className="access-modal inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title">
      <button className="modal-close" onClick={close} aria-label="Close inquiry"><X size={18}/></button>
      {sent ? <div className="success-state"><span className="success-icon"><Check size={25}/></span><span className="eyebrow">MESSAGE RECEIVED</span><h2 id="inquiry-title">Thanks for reaching out.</h2><p>Your inquiry has been received. Please check your inbox and spam/junk folder—we’ll follow up by email with next steps. We aim to respond within 24 hours to discuss requirements, scope and pricing, and arrange a demo. You can also contact us now:</p><div className="success-contact-actions"><a className="button button-lime" href={`https://wa.me/917003276998?text=${encodeURIComponent(`Hello CampusGuard, I submitted an inquiry about: ${form.topic}. I'd like to discuss requirements and arrange a demo.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp: +91 70032 76998 <ArrowUpRight size={15}/></a><a className="button button-outline" href={`https://mail.google.com/mail/?view=cm&fs=1&to=campusguard43%40gmail.com&su=${encodeURIComponent('CampusGuard inquiry: ' + form.topic)}`} target="_blank" rel="noopener noreferrer">Email: campusguard43@gmail.com <ArrowUpRight size={15}/></a></div><button className="button button-dark" onClick={close}>Back to CampusGuard <ArrowRight size={16}/></button></div> :
      <><span className="eyebrow">PILOTS &amp; DEPLOYMENT</span><h2 id="inquiry-title">Let’s talk through your needs.</h2><p className="modal-intro">Share a few details and the team can follow up about scope, readiness and next steps. No pricing or availability is promised by this request.</p>
      <form onSubmit={submit}>
        <label>Your name<input required maxLength={120} value={form.name} onChange={e => update('name',e.target.value)} placeholder="Full name"/></label>
        <label>Work email<input required type="email" maxLength={254} value={form.email} onChange={e => update('email',e.target.value)} placeholder="you@institution.org"/></label>
        <label>Institution / organisation<input required maxLength={180} value={form.organisation} onChange={e => update('organisation',e.target.value)} placeholder="Organisation name"/></label>
        <label>What would you like to discuss?<select required value={form.topic} onChange={e => update('topic',e.target.value)}><option value="" disabled>Choose a topic</option><option>Request pilot details</option><option>Plan a deployment</option><option>Discuss multi-site needs</option></select></label>
        <label>Anything we should know?<textarea rows={3} maxLength={3000} value={form.message} onChange={e => update('message',e.target.value)} placeholder="Your goals, approximate scale or questions (optional)"/></label>
        <button className="button button-lime form-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send inquiry'} <ArrowUpRight size={16}/></button>
        {error && <p className="form-note" role="alert">{error}</p>}
        <p className="form-note"><LockKeyhole size={12}/> Please do not include sensitive personal or security information.</p>
      </form></>}
    </section>
  </div>
}

function AdminPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ownerToken, setOwnerToken] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [applications, setApplications] = useState<Array<{id:string;name:string;email:string;organisation:string;role:string;purpose:string;status:string;created_at:string}>>([])
  const [inquiries, setInquiries] = useState<Array<{id:string;name:string;email:string;organisation:string;topic:string;message:string;created_at:string}>>([])
  const [downloadRequests, setDownloadRequests] = useState<Array<{id:string;user_email:string;user_name:string|null;product:string;status:string;payment_confirmed:boolean;requested_at:string}>>([])
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [inquiryStats, setInquiryStats] = useState({ total: 0, pilots: 0, deployments: 0, multiSite: 0 })
  const [filter, setFilter] = useState('pending')
  const [section, setSection] = useState<'all' | 'applications' | 'inquiries' | 'downloads'>('all')

  const load = async (token = ownerToken) => {
    if (!token) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin-applications', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Owner access could not be verified.')
      setApplications(result.applications || [])
      setInquiries(result.inquiries || [])
      const downloadsResponse = await fetch('/api/admin-download-requests', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const downloadsResult = await downloadsResponse.json().catch(() => ({}))
      if (!downloadsResponse.ok) throw new Error(downloadsResult.error || 'Could not load download requests.')
      setDownloadRequests(downloadsResult.requests || [])
      setStats(result.stats || { pending: 0, approved: 0, rejected: 0 })
      setInquiryStats(result.inquiryStats || { total: 0, pilots: 0, deployments: 0, multiSite: 0 })
      setAuthenticated(true)
    } catch (e) {
      setAuthenticated(false)
      setOwnerToken('')
      setError(e instanceof Error ? e.message : 'Could not load admin data.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let active = true

    const restoreOwnerSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (!active || sessionError || !data.session) return
        if (!data.session.user.email_confirmed_at) return

        // The admin API still performs the authoritative ADMIN_EMAIL check.
        // Restoring a Supabase session alone never grants owner privileges.
        setOwnerToken(data.session.access_token)
        await load(data.session.access_token)
      } catch {
        if (active) {
          setAuthenticated(false)
          setOwnerToken('')
        }
      }
    }

    void restoreOwnerSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT' || !session) {
        setOwnerToken('')
        setAuthenticated(false)
      } else {
        // Keep API calls in sync when Supabase refreshes the access token.
        setOwnerToken(session.access_token)
      }
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        throw new Error('Sign-in configuration is missing. Please contact the site administrator.')
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError || !data.session) throw new Error(signInError ? `Supabase sign-in failed (${signInError.status ?? 'no status'}): ${signInError.message}` : 'Supabase sign-in returned no session. Check the project URL and publishable key, then try again.')
      if ((data.user.email ?? '').trim().toLowerCase() !== email.trim().toLowerCase() || !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('Use the verified owner account email to access administration.')
      }
      const token = data.session.access_token
      setOwnerToken(token)
      await load(token)
    } catch (e) {
      setAuthenticated(false)
      setError(e instanceof Error ? e.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
        body: JSON.stringify({ id, status }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not update application.')
      setNotice(status === 'approved' ? 'Application approved. The user can now sign in.' : 'Application rejected.')
      await load(ownerToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update application.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setOwnerToken('')
    setPassword('')
    setAuthenticated(false)
    setApplications([])
    setInquiries([])
    setSection('applications')
  }

  const header = (
    <header className="admin-header">
      <a className="brand" href="/"><span className="brand-mark"><ShieldCheck size={19} /></span><span>campus<span className="brand-light">guard</span><i>®</i></span></a>
      <span className="admin-label">ADMINISTRATION / PRIVATE</span>
      <a href="/" className="admin-back">Back to website ↗</a>
    </header>
  )

  if (!authenticated) {
    return (
      <main className="admin-page">
        {header}
        <section className="admin-login access-modal">
          <span className="eyebrow">OWNER ACCESS</span>
          <h1>Admin sign in<span>.</span></h1>
          <p>Sign in with the verified owner account. The server checks the account email against the configured owner email.</p>
          <form onSubmit={login}>
            <label>Owner email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="Owner account email" /></label>
            <label>Owner account password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter account password" /></label>
            <button className="button button-lime form-submit" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Sign in securely'} <ArrowUpRight size={16} /></button>
            {error && <p className="form-note" role="alert">{error}</p>}
          </form>
          <p className="form-note"><LockKeyhole size={12} /> Access requires a valid Supabase session, a verified email and an exact match with the server-side ADMIN_EMAIL setting.</p>
        </section>
      </main>
    )
  }

  const visibleApplications = applications.filter(app => filter === 'all' || app.status === filter)
  const allNotifications = [
    ...applications.map(item => ({ id: 'application-' + item.id, kind: 'Access application', name: item.name, email: item.email, organisation: item.organisation, detail: [item.role, item.purpose].filter(Boolean).join(' · '), status: item.status, date: item.created_at, subject: 'CampusGuard early access follow-up', body: 'Hello ' + item.name + ',\n\nThank you for your CampusGuard early access application.\n\n[Add your update here: application status and next steps.]\n\nBest regards,\nCampusGuard' })),
    ...inquiries.map(item => ({ id: 'inquiry-' + item.id, kind: 'Pilot inquiry', name: item.name, email: item.email, organisation: item.organisation, detail: [item.topic, item.message].filter(Boolean).join(' · '), status: 'new', date: item.created_at, subject: 'CampusGuard inquiry follow-up: ' + item.topic, body: 'Hello ' + item.name + ',\n\nThank you for contacting CampusGuard about ' + item.topic + '.\n\n[Add your response and next steps here.]\n\nBest regards,\nCampusGuard' })),
    ...downloadRequests.map(item => ({ id: 'download-' + item.id, kind: 'Download request', name: item.user_name || item.user_email, email: item.user_email, organisation: item.product, detail: 'Payment: ' + (item.payment_confirmed ? 'confirmed' : 'not confirmed'), status: item.status, date: item.requested_at, subject: 'CampusGuard download request update', body: 'Hello ' + (item.user_name || item.user_email) + ',\n\nThank you for your CampusGuard desktop download request.\n\n[Add your update here: request status, payment confirmation, approval, or next steps.]\n\nBest regards,\nCampusGuard' })),
  ].sort((a, b) => (Date.parse(b.date || '') || 0) - (Date.parse(a.date || '') || 0))
  const analyticsCounts = [
    { label: 'Access applications', value: applications.length },
    { label: 'Pilot inquiries', value: inquiries.length },
    { label: 'Download requests', value: downloadRequests.length },
    { label: 'Pending items', value: applications.filter(x => x.status === 'pending').length + downloadRequests.filter(x => x.status === 'pending').length },
  ]
  const analyticsMax = Math.max(1, ...analyticsCounts.map(item => item.value))

  return (
    <main className="admin-page">
      {header}
      <section className="admin-content">
        <div className="admin-title-row">
          <div><span className="eyebrow">OWNER CONSOLE</span><h1>{section === 'all' ? 'All notifications' : section === 'applications' ? 'Applications' : section === 'inquiries' ? 'Pilot inquiries' : 'Download requests'}<span>.</span></h1><p>Private owner workspace for access requests and pilot/deployment inquiries.</p></div>
          <button className="button button-outline" onClick={() => void logout()}>Log out</button>
        </div>
        <div className="admin-commandline">
          <div className="admin-live-indicator"><i /> SYSTEM OVERVIEW <span>LIVE DATA</span></div>
          <div className="admin-commandline-right"><span><Activity size={13} /> OWNER ANALYTICS</span><span>{new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
        </div>
        <div className="admin-stats admin-kpi-grid">
          <article className="admin-kpi admin-kpi-pending"><div className="admin-kpi-top"><span>PENDING REVIEW</span><span className="admin-kpi-icon"><Activity size={16} /></span></div><strong>{stats.pending}</strong><small>{stats.pending === 1 ? 'Application needs' : 'Applications need'} attention</small><div className="admin-kpi-spark" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></article>
          <article className="admin-kpi admin-kpi-approved"><div className="admin-kpi-top"><span>APPROVED ACCESS</span><span className="admin-kpi-icon"><Check size={16} /></span></div><strong>{stats.approved}</strong><small>Approved customer accounts</small><div className="admin-kpi-spark" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></article>
          <article className="admin-kpi admin-kpi-rejected"><div className="admin-kpi-top"><span>REJECTED</span><span className="admin-kpi-icon"><X size={16} /></span></div><strong>{stats.rejected}</strong><small>Applications declined</small><div className="admin-kpi-spark" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></article>
          <article className="admin-kpi admin-kpi-inquiries"><div className="admin-kpi-top"><span>TOTAL INQUIRIES</span><span className="admin-kpi-icon"><BellRing size={16} /></span></div><strong>{inquiryStats.total}</strong><small>Potential customer conversations</small><div className="admin-kpi-spark" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></article>
        </div>
        <div className="admin-analytics-grid">
          <article className="admin-analytics-card admin-status-chart">
            <div className="admin-panel-top"><div><span className="admin-panel-eyebrow">APPLICATION HEALTH</span><h2>Access distribution</h2></div><span className="admin-panel-tag">ALL RECORDS</span></div>
            <div className="admin-chart-body">
              <div className="admin-donut" role="img" aria-label={`Application distribution: ${stats.pending} pending, ${stats.approved} approved, ${stats.rejected} rejected`}>
                <div><strong>{stats.pending + stats.approved + stats.rejected}</strong><span>APPLICATIONS</span></div>
              </div>
              <div className="admin-chart-legend">
                <div><i className="legend-pending" /><span>Pending</span><b>{stats.pending}</b></div>
                <div><i className="legend-approved" /><span>Approved</span><b>{stats.approved}</b></div>
                <div><i className="legend-rejected" /><span>Rejected</span><b>{stats.rejected}</b></div>
              </div>
            </div>
            <p className="admin-chart-footnote">Distribution is calculated from the current application records.</p>
          </article>
          <article className="admin-analytics-card admin-activity-card">
            <div className="admin-panel-top"><div><span className="admin-panel-eyebrow">WORKSPACE SNAPSHOT</span><h2>Incoming activity</h2></div><span className="admin-panel-tag"><i /> CURRENT</span></div>
            <div className="admin-activity-total"><strong>{applications.length + inquiries.length}</strong><span>records currently loaded</span></div>
            <div className="admin-activity-bars" aria-label="Current record counts">
              <div className="admin-activity-row"><span>Applications</span><div><i style={{ width: `${Math.max(4, applications.length / Math.max(applications.length, inquiries.length, 1) * 100)}%` }} /></div><b>{applications.length}</b></div>
              <div className="admin-activity-row"><span>Inquiries</span><div><i style={{ width: `${Math.max(4, inquiries.length / Math.max(applications.length, inquiries.length, 1) * 100)}%` }} /></div><b>{inquiries.length}</b></div>
            </div>
            <div className="admin-activity-note"><Activity size={15} /><span>Counts update when the owner console refreshes.</span></div>
          </article>
        </div>
        <div className="admin-list-heading">
          <h2>Owner workspace</h2>
          <div className="admin-toolbar">
            <select aria-label="Admin section" value={section} onChange={e => setSection(e.target.value as 'applications' | 'inquiries' | 'downloads')}>
              <option value="all">All notifications</option><option value="applications">Access applications</option><option value="inquiries">Pilot inquiries</option><option value="downloads">Download requests</option>
            </select>
            <button className="button button-outline" onClick={() => void load()} disabled={busy}>Refresh</button>
          </div>
        </div>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}

        {section === 'all' && (
          <div className="admin-section">
            <div className="admin-list-heading"><h2>All incoming activity</h2><p>Applications, pilot inquiries and download requests, newest first.</p></div>
            <div className="admin-application-list">
              {allNotifications.map(item => (
                <article className="admin-application" key={item.id}>
                  <div className="admin-application-main"><div><span className="admin-panel-eyebrow">{item.kind}</span><h3>{item.name}</h3><a href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.email) + '&su=' + encodeURIComponent(item.subject) + '&body=' + encodeURIComponent(item.body)} target="_blank" rel="noopener noreferrer">{item.email}</a></div><span className={'admin-status status-' + (item.status === 'new' ? 'pending' : item.status)}>{item.status}</span></div>
                  <dl><div><dt>Organisation / product</dt><dd>{item.organisation || '—'}</dd></div><div><dt>Received</dt><dd>{item.date ? new Date(item.date).toLocaleString() : '—'}</dd></div></dl>
                  {item.detail && <p className="admin-purpose">{item.detail}</p>}
                  <div className="admin-actions"><a className="button button-outline" href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.email) + '&su=' + encodeURIComponent(item.subject) + '&body=' + encodeURIComponent(item.body)} target="_blank" rel="noopener noreferrer">Reply by email <ArrowUpRight size={15}/></a></div>
                </article>
              ))}
              {allNotifications.length === 0 && <div className="admin-empty"><BellRing size={25}/><h3>No notifications yet</h3><p>New access applications, pilot inquiries and download requests will appear here.</p></div>}
            </div>
          </div>
        )}
        {section === 'applications' && (
          <div className="admin-section">
            <div className="admin-list-heading">
              <h2>Access requests</h2>
              <select aria-label="Application status filter" value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="pending">Pending</option><option value="all">All applications</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="admin-application-list">
              {visibleApplications.map(app => (
                <article className="admin-application" key={app.id}>
                  <div className="admin-application-main"><div><h3>{app.name}</h3><a href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(app.email)} target="_blank" rel="noopener noreferrer">{app.email}</a></div><span className={'admin-status status-' + app.status}>{app.status}</span></div>
                  <dl><div><dt>Organisation</dt><dd>{app.organisation}</dd></div><div><dt>Role</dt><dd>{app.role}</dd></div><div><dt>Submitted</dt><dd>{app.created_at ? new Date(app.created_at).toLocaleString() : '—'}</dd></div></dl>
                  {app.purpose && <p className="admin-purpose">{app.purpose}</p>}
                  <div className="admin-actions"><a className="button button-outline" href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(app.email) + '&su=' + encodeURIComponent('CampusGuard early access follow-up') + '&body=' + encodeURIComponent('Hello ' + app.name + ',\n\nThank you for your CampusGuard early access application. We are following up about your request.\n\nBest regards,\nCampusGuard')} target="_blank" rel="noopener noreferrer">Reply by email <ArrowUpRight size={15} /></a></div>
                  {app.status === 'pending' && <div className="admin-actions"><button className="button button-lime" disabled={busy} onClick={() => void decide(app.id, 'approved')}><Check size={15} /> Approve</button><button className="button button-outline" disabled={busy} onClick={() => void decide(app.id, 'rejected')}><X size={15} /> Reject</button></div>}
                </article>
              ))}
              {visibleApplications.length === 0 && <div className="admin-empty"><ShieldCheck size={25} /><h3>No applications here</h3><p>New requests will appear here after someone submits the access form.</p></div>}
            </div>
          </div>
        )}

        {section === 'downloads' && (
          <div className="admin-section">
            <div className="admin-list-heading"><h2>Desktop download requests</h2><p>Confirm payment separately before approving a request.</p></div>
            <div className="admin-application-list">
              {downloadRequests.map(item => <article className="admin-application" key={item.id}>
                <div className="admin-application-main"><div><h3>{item.user_name || item.user_email}</h3><a href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.user_email)} target="_blank" rel="noopener noreferrer">{item.user_email}</a></div><span className={'admin-status status-' + item.status}>{item.status}</span></div>
                <dl><div><dt>Product</dt><dd>{item.product}</dd></div><div><dt>Requested</dt><dd>{item.requested_at ? new Date(item.requested_at).toLocaleString() : '—'}</dd></div><div><dt>Payment</dt><dd>{item.payment_confirmed ? 'Confirmed' : 'Not confirmed'}</dd></div></dl>
                <div className="admin-actions"><a className="button button-outline" href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.user_email) + '&su=' + encodeURIComponent('CampusGuard download request update') + '&body=' + encodeURIComponent('Hello ' + (item.user_name || item.user_email) + ',\n\nThank you for your CampusGuard desktop download request.\n\n[Add your update here: request status, payment confirmation, approval, or next steps.]\n\nIf you have any questions, feel free to reply to this email.\n\nBest regards,\nCampusGuard')} target="_blank" rel="noopener noreferrer">Reply by email <ArrowUpRight size={15} /></a></div>
                {item.status === 'pending' && <div className="admin-actions"><button className="button button-lime" disabled={busy} onClick={async () => { if (!window.confirm('Confirm that payment has been received separately and approve download access?')) return; setBusy(true); setError(''); setNotice(''); try { const response = await fetch('/api/admin-download-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` }, body: JSON.stringify({ id: item.id, status: 'approved', payment_confirmed: true }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Could not approve download request.'); setNotice('Payment confirmed and download request approved.'); await load(ownerToken) } catch (e) { setError(e instanceof Error ? e.message : 'Could not approve request.') } finally { setBusy(false) } }}><Check size={15}/> Confirm payment &amp; approve</button><button className="button button-outline" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const response = await fetch('/api/admin-download-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` }, body: JSON.stringify({ id: item.id, status: 'rejected' }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Could not reject request.'); setNotice('Download request rejected.'); await load(ownerToken) } catch (e) { setError(e instanceof Error ? e.message : 'Could not reject request.') } finally { setBusy(false) } }}><X size={15}/> Reject</button></div>}
              </article>)}
              {downloadRequests.length === 0 && <div className="admin-empty"><Monitor size={25}/><h3>No download requests yet</h3><p>Customer requests will appear here after submission.</p></div>}
            </div>
          </div>
        )}

        {section === 'inquiries' && (
          <div className="admin-section">
            <div className="admin-stats inquiry-stats">
              <article><span>ALL INQUIRIES</span><strong>{inquiryStats.total}</strong></article>
              <article><span>PILOT DETAILS</span><strong>{inquiryStats.pilots}</strong></article>
              <article><span>DEPLOYMENT</span><strong>{inquiryStats.deployments}</strong></article>
              <article><span>MULTI-SITE</span><strong>{inquiryStats.multiSite}</strong></article>
            </div>
            <div className="admin-application-list">
              {inquiries.map(item => (
                <article className="admin-application" key={item.id}>
                  <div className="admin-application-main"><div><h3>{item.name}</h3><a href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.email)} target="_blank" rel="noopener noreferrer">{item.email}</a></div><span className="admin-status status-approved">{item.topic}</span></div>
                  <dl><div><dt>Organisation</dt><dd>{item.organisation}</dd></div><div><dt>Received</dt><dd>{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</dd></div></dl>
                  {item.message && <p className="admin-purpose">{item.message}</p>}
                  <div className="admin-actions"><a className="button button-outline" href={'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(item.email) + '&su=' + encodeURIComponent('CampusGuard inquiry follow-up: ' + item.topic) + '&body=' + encodeURIComponent('Hello ' + item.name + ',\n\nThank you for contacting CampusGuard about ' + item.topic + '.\n\nBest regards,\nCampusGuard')} target="_blank" rel="noopener noreferrer">Reply by email <ArrowUpRight size={15} /></a></div>
                </article>
              ))}
              {inquiries.length === 0 && <div className="admin-empty"><ShieldCheck size={25} /><h3>No inquiries yet</h3><p>New pilot and deployment inquiries will appear here after submission.</p></div>}
            </div>
          </div>
        )}
        <section className="admin-section" aria-labelledby="admin-analytics-title">
          <div className="admin-list-heading"><div><h2 id="admin-analytics-title">Activity &amp; scaling analytics</h2><p>Live totals from loaded records; these are operational request metrics, not visitor/page-view tracking.</p></div></div>
          <div className="admin-stats admin-kpi-grid">
            {analyticsCounts.map(item => <article className="admin-kpi" key={item.label}><div className="admin-kpi-top"><span>{item.label.toUpperCase()}</span><span className="admin-kpi-icon"><Activity size={16}/></span></div><strong>{item.value}</strong><small>Current records</small><div className="admin-kpi-spark" aria-hidden="true">{Array.from({length:10},(_,i)=><i key={i}/>)}</div></article>)}
          </div>
          <article className="admin-analytics-card" style={{ marginTop: 18 }}>
            <div className="admin-panel-top"><div><span className="admin-panel-eyebrow">REQUEST VOLUME</span><h2>Current workload by category</h2></div><span className="admin-panel-tag">CURRENT SNAPSHOT</span></div>
            <div style={{ display: 'grid', gap: 18, padding: '18px 0' }}>
              {analyticsCounts.map(item => <div key={item.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 3fr auto', gap: 14, alignItems: 'center' }}><span>{item.label}</span><div style={{ height: 10, borderRadius: 999, background: 'var(--admin-border, #252b35)', overflow: 'hidden' }}><div style={{ width: (item.value / analyticsMax * 100) + '%', height: '100%', borderRadius: 999, background: 'var(--lime, #c7ff45)', transition: 'width .3s ease' }}/></div><strong>{item.value}</strong></div>)}
            </div>
            <p className="admin-chart-footnote">Refresh the admin console to update totals. Historical traffic, unique visitors and page views require a separate analytics provider.</p>
          </article>
        </section>
      </section>
    </main>
  )
}

function CustomerWorkspace() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cameras' | 'notifications'>('overview')
  return <section className="customer-workspace" aria-labelledby="workspace-title">
    <div className="workspace-shell">
      <div className="workspace-heading">
        <div><span className="eyebrow"><span className="eyebrow-line" /> PRIVATE CUSTOMER AREA</span><h1 id="workspace-title">Campus overview<span>.</span></h1><p>A read-only view of camera availability and safety notifications. Camera controls and footage stay in the CampusGuard desktop application.</p></div>
        <div className="workspace-session"><span className="workspace-session-dot" /> APPROVED ACCOUNT <small>Read-only access</small></div>
      </div>
      <nav className="workspace-tabs" aria-label="Customer workspace">
        <button className={activeTab === 'overview' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setActiveTab('overview')}><Activity size={15} /> Overview</button>
        <button className={activeTab === 'cameras' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setActiveTab('cameras')}><Monitor size={15} /> Cameras</button>
        <button className={activeTab === 'notifications' ? 'workspace-tab active' : 'workspace-tab'} onClick={() => setActiveTab('notifications')}><BellRing size={15} /> Alerts &amp; notifications</button>
      </nav>
      {activeTab === 'overview' && <div className="workspace-content">
        <div className="workspace-stat-grid">
          <article className="workspace-stat"><span>CAMERAS REGISTERED</span><strong>—</strong><small>Waiting for desktop sync</small><Monitor size={18} /></article>
          <article className="workspace-stat"><span>CAMERAS ACTIVE</span><strong>—</strong><small>Live status not connected yet</small><Activity size={18} /></article>
          <article className="workspace-stat"><span>UNREAD NOTIFICATIONS</span><strong>0</strong><small>No notifications loaded</small><BellRing size={18} /></article>
        </div>
        <div className="workspace-panel-grid">
          <article className="workspace-panel"><div className="workspace-panel-head"><div><span className="eyebrow">CAMERA INVENTORY</span><h2>Attached cameras</h2></div><button className="workspace-text-button" onClick={() => setActiveTab('cameras')}>View inventory <ArrowRight size={14} /></button></div><div className="workspace-empty"><span className="workspace-empty-icon"><Monitor size={20} /></span><b>Camera sync is not connected</b><p>Once the desktop app shares its camera inventory securely, this area will show each camera’s name, location and active/offline status. Cameras cannot be added or controlled from the website.</p></div></article>
          <article className="workspace-panel"><div className="workspace-panel-head"><div><span className="eyebrow">RECENT UPDATES</span><h2>Alerts &amp; notifications</h2></div><button className="workspace-text-button" onClick={() => setActiveTab('notifications')}>View alerts <ArrowRight size={14} /></button></div><div className="workspace-empty"><span className="workspace-empty-icon"><BellRing size={20} /></span><b>No notifications to display</b><p>Alerts will appear here when the desktop app’s notification feed is securely connected. No live footage or incident playback is shown on the web.</p></div></article>
        </div>
        <p className="workspace-footnote"><LockKeyhole size={13} /> Read-only web access · No camera controls · No live video · No incident footage</p>
      </div>}
      {activeTab === 'cameras' && <div className="workspace-content"><article className="workspace-panel workspace-full-panel"><div className="workspace-panel-head"><div><span className="eyebrow">READ-ONLY INVENTORY</span><h2>Camera locations &amp; status</h2></div><span className="workspace-chip">Desktop sync pending</span></div><div className="workspace-empty workspace-empty-large"><span className="workspace-empty-icon"><Monitor size={22} /></span><b>No camera inventory has synced yet</b><p>This page will list only camera name, campus/building location and whether the desktop application reports it active or offline. It will not offer add-camera controls, stream previews or footage.</p></div></article></div>}
      {activeTab === 'notifications' && <div className="workspace-content"><article className="workspace-panel workspace-full-panel"><div className="workspace-panel-head"><div><span className="eyebrow">NOTIFICATION CENTRE</span><h2>Alerts &amp; notifications</h2></div><span className="workspace-chip">Feed not connected</span></div><div className="workspace-empty workspace-empty-large"><span className="workspace-empty-icon"><BellRing size={22} /></span><b>Your notification feed is ready for connection</b><p>When the desktop app’s alert feed is connected, this page will show alert level, time, camera name/location and a short text summary only. It will never show fight footage or a view-footage action.</p></div></article></div>}
    </div>
  </section>
}


function CustomerResources() {
  const [downloadRequest, setDownloadRequest] = useState<{id:string;status:string;requested_at:string}|null>(null)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [downloadNotice, setDownloadNotice] = useState('')
  const [downloadAvailable, setDownloadAvailable] = useState(false)
  const loadDownloadRequest = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    const response = await fetch('/api/download-requests', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setDownloadRequest(result.request || null); setDownloadAvailable(Boolean(result.downloadAvailable)) }
    else setDownloadError(result.error || 'Could not load download request status.')
  }
  useEffect(() => { void loadDownloadRequest() }, [])
  const applyForDownload = async () => {
    setDownloadBusy(true); setDownloadError(''); setDownloadNotice('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Please sign in again to request a download.')
      const response = await fetch('/api/download-requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({}) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not submit download request.')
      setDownloadRequest(result.request || null); setDownloadNotice(result.message || 'Your request has been submitted.')
      await loadDownloadRequest()
    } catch (e) { setDownloadError(e instanceof Error ? e.message : 'Could not submit request.') }
    finally { setDownloadBusy(false) }
  }
  const getApprovedDownload = async () => {
    setDownloadBusy(true); setDownloadError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Please sign in again.')
      const response = await fetch('/api/secure-download', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Download is not available yet.')
      window.location.assign(result.url)
    } catch (e) { setDownloadError(e instanceof Error ? e.message : 'Could not start download.') }
    finally { setDownloadBusy(false) }
  }
  return <div className="customer-resources">
    <section className="customer-resource-section" id="customer-how-it-works" data-theme="dark"><div className="section-shell"><span className="eyebrow"><span className="eyebrow-line" /> CUSTOMER GUIDE</span><h2>How CampusGuard works.</h2><p className="customer-resource-lead">A desktop-first workflow, with people making the decisions at every step.</p><div className="how-steps"><article><span>01</span><h3>Connect cameras</h3><p>Configure compatible cameras in the Windows app. Camera setup remains desktop-only.</p></article><article><span>02</span><h3>Analyse locally</h3><p>The installed AI model analyses video sequences and may flag a potential event.</p></article><article><span>03</span><h3>Review and respond</h3><p>Staff check context, follow campus procedures and decide the appropriate next action.</p></article></div></div></section>
    <section className="customer-resource-section customer-ai-section" id="customer-ai-pipeline" data-theme="light"><div className="section-shell"><span className="eyebrow"><span className="eyebrow-line" /> DETAILED AI PIPELINE</span><h2>From camera input to a<br /><em>human-reviewed alert.</em></h2><p className="customer-resource-lead">This is a conceptual flowchart of the intended workflow, not live model telemetry. Actual implementation depends on the installed model and configuration.</p><div className="customer-flowchart"><article><b>01</b><h3>Capture</h3><p>Camera frames enter the desktop workflow.</p></article><span>→</span><article><b>02</b><h3>Prepare</h3><p>Frames are sampled and shaped into model input.</p></article><span>→</span><article><b>03</b><h3>Analyse</h3><p>Temporal patterns are evaluated by the installed model.</p></article><span>→</span><article><b>04</b><h3>Flag</h3><p>A candidate event can trigger an alert for review.</p></article><span>→</span><article className="customer-flow-human"><b>05</b><h3>Human review</h3><p>Staff assess context and decide what action is appropriate.</p></article></div><p className="customer-resource-note"><LockKeyhole size={14}/> AI alerts can be wrong. They support staff review and must not be treated as proof of an incident.</p></div></section>
    <section className="customer-resource-section customer-neural-section" id="customer-neural-network" data-theme="dark"><div className="section-shell"><span className="eyebrow"><span className="eyebrow-line" /> NEURAL NETWORK / CONCEPTUAL VIEW</span><h2>The neural network<span className="customer-heading-period">.</span></h2><p className="customer-resource-lead">A visual explanation of how connected processing stages can learn patterns across a sequence. This graphic is illustrative—not a live view of model internals or performance.</p><div className="customer-neural-visual"><div className="customer-neural-meta"><span><i/> CONCEPTUAL NETWORK</span><span>SEQUENCE → SIGNAL</span></div><svg className="customer-neural-svg" viewBox="0 0 900 270" role="img" aria-label="Illustrative neural network with connected input, hidden and output nodes"><g className="customer-neural-links"><path d="M70 135L220 48L390 85L560 40L730 92L830 135M70 135L220 135L390 85L560 135L730 92L830 135M70 135L220 222L390 185L560 230L730 178L830 135M220 48L220 135L220 222M390 85L390 185M560 40L560 135L560 230M730 92L730 178"/></g><g className="customer-neural-nodes"><circle cx="70" cy="135" r="15"/><circle cx="220" cy="48" r="10"/><circle cx="220" cy="135" r="13"/><circle cx="220" cy="222" r="10"/><circle cx="390" cy="85" r="13"/><circle cx="390" cy="185" r="11"/><circle cx="560" cy="40" r="9"/><circle cx="560" cy="135" r="16"/><circle cx="560" cy="230" r="9"/><circle cx="730" cy="92" r="12"/><circle cx="730" cy="178" r="10"/><circle cx="830" cy="135" r="15"/></g><path className="customer-neural-pulse" d="M70 135L220 48L390 85L560 135L730 92L830 135"/></svg><div className="customer-neural-labels"><span>INPUT SEQUENCE</span><span>LEARNED FEATURES</span><span>MODEL OUTPUT</span></div></div><p className="customer-resource-note"><LockKeyhole size={14}/> Network visualisation is explanatory only. It does not expose actual weights, activations, confidence values or live inference.</p></div></section>
    <section className="customer-resource-section customer-download-section" id="customer-downloads" data-theme="light"><div className="section-shell customer-download-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> DESKTOP APPLICATION</span><h2>Get the full CampusGuard workflow.</h2><p>Apply for the Windows installer. Download access is granted only after the owner reviews your request and confirms payment separately.</p><div className="download-actions">{downloadRequest?.status === 'approved' ? <button className="button button-lime" disabled={downloadBusy} onClick={() => void getApprovedDownload()}>{downloadBusy ? 'Preparing secure download…' : 'Download CampusGuard for Windows'} <ArrowUpRight size={15}/></button> : <button className="button button-lime" disabled={downloadBusy || downloadRequest?.status === 'pending'} onClick={() => void applyForDownload()}>{downloadBusy ? 'Submitting…' : downloadRequest?.status === 'pending' ? 'Request pending owner approval' : 'Apply for download'} <ArrowUpRight size={15}/></button>}</div>{downloadRequest?.status === 'pending' && <small className="download-note"><LockKeyhole size={12}/> Request received. You’ll get access once the owner approves it after payment confirmation.</small>}{downloadRequest?.status === 'rejected' && <small className="download-note">Your previous request was not approved. You may apply again.</small>}{downloadNotice && <p className="form-note" role="status">{downloadNotice} Please check your email inbox and spam/junk folder for follow-up.</p>}{downloadError && <p className="form-note" role="alert">{downloadError}</p>}{downloadRequest?.status === 'approved' && !downloadAvailable && <small className="download-note"><LockKeyhole size={12}/> Your request is approved, but the private installer has not been uploaded yet. Contact the owner.</small>}</div><div className="customer-download-card"><Monitor size={34}/><b>CampusGuard for Windows</b><span>CAMERAS · LOCAL AI · INCIDENT REVIEW</span><small>Owner approval required</small></div></div></section>
    <section className="customer-resource-section customer-pilot-section" id="customer-pricing" data-theme="dark"><div className="section-shell"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> PRICING &amp; PILOTS</span><h2>Plan the right-sized<br /><em>evaluation.</em></h2></div><p>Contact us to discuss a plan that fits your campus. We’ll understand your needs and agree on scope and pricing directly.</p></div><div className="customer-pilot-grid"><article><span>01 / STARTER</span><h3>Starter</h3><p>Perfect for a focused pilot to explore the workflow and understand the impact on your campus.</p><div className="customer-plan-price">₹2,500–8,000<span>/month</span></div><ul><li>4–10 cameras</li><li>2 team members</li><li>Monthly billing</li><li>Email support only</li><li>Installation visit included</li><li>Incident logging &amp; review</li></ul><b>Pricing based on camera count</b><a className="button button-outline" href="https://wa.me/917003276998?text=Hello%20CampusGuard%2C%20I%27d%20like%20to%20request%20Starter%20pilot%20details%20for%20the%20%E2%82%B92500%E2%80%938000%2Fmonth%20plan." target="_blank" rel="noopener noreferrer">Request pilot details <ArrowUpRight size={15}/></a></article><article className="customer-plan-featured"><span>02 / PROFESSIONAL</span><h3>Professional</h3><p>Active deployment across your campus with priority support and on-site assistance for daily operations.</p><div className="customer-plan-price">₹8,000–15,000<span>/month</span></div><ul><li>10–20 cameras</li><li>5–7 team members</li><li>Monthly billing</li><li>Email + WhatsApp support</li><li>Installation visit + emergency support</li><li>Staff training &amp; onboarding</li></ul><b>Most popular · Pricing based on camera count</b><a className="button button-lime" href="https://wa.me/917003276998?text=Hello%20CampusGuard%2C%20I%27d%20like%20to%20discuss%20the%20Professional%20plan%20for%20my%20campus." target="_blank" rel="noopener noreferrer">Discuss your campus <ArrowUpRight size={15}/></a></article><article><span>03 / ENTERPRISE</span><h3>Enterprise</h3><p>Multi-site coordination with on-site support and custom integration for large educational groups.</p><div className="customer-plan-price">₹15,000–30,000<span>/month</span></div><ul><li>20–40 cameras</li><li>10–15 team members</li><li>Monthly billing</li><li>Email + WhatsApp + on-site support</li><li>Installation visit + emergency support</li><li>Dedicated account manager</li></ul><b>Pricing based on camera count</b><a className="button button-outline" href="https://wa.me/917003276998?text=Hello%20CampusGuard%2C%20I%27d%20like%20to%20discuss%20the%20Enterprise%20plan%20for%20our%20educational%20group." target="_blank" rel="noopener noreferrer">Talk to our team <ArrowUpRight size={15}/></a></article></div><p className="customer-resource-note"><LockKeyhole size={14}/> Contact us to discuss a plan that fits your campus. We’ll understand your needs and agree on scope and pricing directly.</p></div></section>
  </div>
}

function App() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) return
    const targets = document.querySelectorAll(
      '.section-heading, .feature-card, .pricing-card, .pricing-disclaimer, .neural-heading, .neural-visual, .pipeline-node, .interface-copy, .interface-art, .dark-band-inner > *, .faq-layout > *, .final-cta-inner, .strip-inner > span:not(.strip-label)'
    )
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('cg-is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' })
    targets.forEach((target, index) => {
      target.classList.add('cg-reveal')
      if (target instanceof HTMLElement) target.style.setProperty('--cg-reveal-delay', `${Math.min(index % 3, 2) * 90}ms`)
      observer.observe(target)
    })
    return () => observer.disconnect()
  }, [])

  const [scrollProgress, setScrollProgress] = useState(0)
  const [headerLight, setHeaderLight] = useState(false)
  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [])

  useEffect(() => {
    const updateHeaderTheme = () => {
      const section = Array.from(document.querySelectorAll('main > section')).find(item => {
        const rect = item.getBoundingClientRect()
        return rect.top <= 104 && rect.bottom > 104
      })
      setHeaderLight(section?.getAttribute('data-theme') === 'light')
    }
    updateHeaderTheme()
    window.addEventListener('scroll', updateHeaderTheme, { passive: true })
    window.addEventListener('resize', updateHeaderTheme)
    return () => {
      window.removeEventListener('scroll', updateHeaderTheme)
      window.removeEventListener('resize', updateHeaderTheme)
    }
  }, [])

  const [modal, setModal] = useState<ModalName>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const signOut = async () => { await supabase.auth.signOut(); setIsAuthenticated(false); setModal(null); window.scrollTo({ top: 0, behavior: 'auto' }) }
  useEffect(() => {
    let cancelled = false
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (!session) return
      try {
        const response = await fetch('/api/access-status', { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!cancelled && response.ok && result.status === 'approved') setIsAuthenticated(true)
        else if (!cancelled) await supabase.auth.signOut()
      } catch { if (!cancelled) await supabase.auth.signOut() }
    }
    void restoreSession()
    return () => { cancelled = true }
  }, [])
  const openAccess = () => { setModal('access'); setMenuOpen(false) }
  const [inquiryTopic, setInquiryTopic] = useState('Request pilot details')
  const openInquiry = (topic: string) => { setInquiryTopic(topic); setModal('inquiry'); setMenuOpen(false) }
  const navigateToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById(id)
    if (!target) return
    const header = document.querySelector('.site-header')
    const offset = (header instanceof HTMLElement ? header.offsetHeight : 78) + 14
    const top = target.getBoundingClientRect().top + window.scrollY - offset
    window.history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  if (window.location.pathname.replace(/\/+$/, '') === '/admin') return <AdminPanel />
  if (window.location.pathname.replace(/\/+$/, '') === '/reset-password') return <PasswordResetPage />
  return <main id="top">
    <div className="reading-progress" aria-hidden="true"><span style={{ width: `${scrollProgress}%` }} /></div>
    <header className={headerLight ? "site-header header-light" : "site-header"}>
      <div className="header-inner"><Brand />
        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Main navigation">
          {isAuthenticated ? <><a href="#customer-how-it-works" onClick={event => navigateToSection(event, 'customer-how-it-works')}>How it works</a><a href="#customer-ai-pipeline" onClick={event => navigateToSection(event, 'customer-ai-pipeline')}>AI pipeline</a><a href="#customer-downloads" onClick={event => navigateToSection(event, 'customer-downloads')}>Desktop app</a><a href="#customer-pricing" onClick={event => navigateToSection(event, 'customer-pricing')}>Plans &amp; pilots</a></> : <><a href="#pipeline" onClick={event => navigateToSection(event, 'pipeline')}>AI pipeline</a><a href="#principles" onClick={event => navigateToSection(event, 'principles')}>Our approach</a><a href="#platform" onClick={event => navigateToSection(event, 'platform')}>Platform</a><a href="#faqs" onClick={event => navigateToSection(event, 'faqs')}>FAQs</a><a href="#pricing" onClick={event => { event.preventDefault(); setModal('pricing'); setMenuOpen(false) }}>Pricing &amp; pilots</a></>}
          {isAuthenticated ? <button className="button button-lime nav-cta" onClick={() => { void signOut(); setMenuOpen(false) }}>Log out <ArrowUpRight size={15} /></button> : <><button className="nav-login" onClick={() => { setModal('login'); setMenuOpen(false) }}>Log in <ArrowUpRight size={14} /></button><button className="button button-lime nav-cta" onClick={openAccess}>Apply for access <ArrowUpRight size={15} /></button></>}
        </nav>
        <button className="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    {isAuthenticated && <><CustomerWorkspace /><CustomerResources /></>}
    {!isAuthenticated && <div className="public-site-content">

    <section className="public-hero" id="overview" data-theme="dark">
      <div className="section-shell public-hero-inner">
        <div className="public-hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> CAMPUS SAFETY, WITH MORE CONTEXT</span><h1>See the signal.<br /><em>Support the people.</em></h1><p>CampusGuard is a desktop-first, AI-assisted safety workflow designed to help campus teams notice potential incidents, review context and make informed decisions.</p><div className="hero-actions"><button className="button button-lime" onClick={openAccess}>Apply for a pilot <ArrowUpRight size={15} /></button><a className="text-link" href="#pipeline" onClick={event => navigateToSection(event, 'pipeline')}>Explore the AI pipeline <ArrowRight size={15} /></a></div><p className="public-hero-note"><LockKeyhole size={13} /> Human-led review. The AI signal is not a conclusion.</p></div>
        <div className="public-hero-art" aria-label="Illustration of the CampusGuard desktop monitoring workflow"><div className="hero-orbit hero-orbit-one"></div><div className="hero-orbit hero-orbit-two"></div><div className="hero-console"><div className="hero-console-top"><span><i></i> CAMPUSGUARD / DESKTOP</span><small>LOCAL WORKFLOW</small></div><div className="hero-console-screen"><div className="hero-console-grid"></div><div className="hero-scan-ring"><ScanEye size={38}/></div><span className="hero-console-tag">AI-ASSISTED SIGNAL</span><div className="hero-console-bars"><i></i><i></i><i></i><i></i><i></i></div></div><div className="hero-console-bottom"><span>01 / CAPTURE</span><span>02 / REVIEW</span><span>03 / RESPOND</span></div></div><span className="hero-float-tag">HUMAN REVIEW REQUIRED</span></div>
      </div>
    </section>
    <section className="section platform-section" id="platform" data-theme="dark"><div className="section-shell">
      <div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> THE PLATFORM</span><h2>From camera feeds to<br /><em>clearer decisions.</em></h2></div><p>Security teams already have a lot to watch. CampusGuard is being built to help make the important moments easier to find, review and document.</p></div>
      <div className="feature-grid">{features.map(({ number, icon: Icon, title, text }) => <article className="feature-card" key={number}><div className="feature-top"><span>{number}</span><Icon size={21} strokeWidth={1.5} /></div><h3>{title}</h3><p>{text}</p><span className="feature-arrow"><ArrowUpRight size={17} /></span></article>)}</div>
      <div className="platform-note"><Sparkles size={17} /><p><b>Built around a desktop application.</b> CampusGuard’s Windows app remains the primary place for camera capture and local analysis. A future web workspace may support account and incident-review experiences once secure authentication and data services are connected.</p></div>
    </div></section>

    <section className="neural-section" id="pipeline" data-theme="dark">
      <div className="section-shell neural-shell">
        <div className="neural-heading">
          <span className="eyebrow"><span className="eyebrow-line" /> INSIDE THE PIPELINE</span>
          <h2>From raw frames<br />to <em>useful signals.</em></h2>
          <p>A conceptual view of how the desktop workflow can turn video into a reviewable event. The diagram is illustrative, not a live model telemetry feed.</p>
        </div>
        <div className="neural-visual" aria-label="Illustrative animated neural network connecting video input, temporal analysis, event signal and human review">
          <div className="neural-visual-top"><span><i className="neural-live-dot" /> CONCEPTUAL AI PIPELINE</span><span>CG / MODEL FLOW 01</span></div>
          <svg className="neural-network" viewBox="0 0 900 300" role="img" aria-label="Animated connected network nodes">
            <defs><radialGradient id="nodeGlow"><stop offset="0%" stopColor="#d6ff78" stopOpacity=".95" /><stop offset="100%" stopColor="#c8ff52" stopOpacity=".12" /></radialGradient></defs>
            <g className="network-links">
              <path d="M70 150 L205 65 L340 115 L470 45 L610 100 L755 65 L835 150" />
              <path d="M70 150 L205 145 L340 115 L470 150 L610 100 L755 150 L835 150" />
              <path d="M70 150 L205 235 L340 195 L470 250 L610 200 L755 235 L835 150" />
              <path d="M205 65 L205 145 L205 235 M340 115 L340 195 M470 45 L470 150 L470 250 M610 100 L610 200 M755 65 L755 150 L755 235" />
              <path className="network-pulse" d="M70 150 L205 65 L340 115 L470 150 L610 100 L755 150 L835 150" />
              <path className="network-pulse pulse-delay" d="M70 150 L205 235 L340 195 L470 250 L610 200 L755 235 L835 150" />
            </g>
            <g className="network-nodes">
              <circle cx="70" cy="150" r="14" /><circle cx="205" cy="65" r="9" /><circle cx="205" cy="145" r="12" /><circle cx="205" cy="235" r="9" />
              <circle cx="340" cy="115" r="13" /><circle cx="340" cy="195" r="10" /><circle cx="470" cy="45" r="8" /><circle cx="470" cy="150" r="16" /><circle cx="470" cy="250" r="8" />
              <circle cx="610" cy="100" r="12" /><circle cx="610" cy="200" r="10" /><circle cx="755" cy="65" r="9" /><circle cx="755" cy="150" r="13" /><circle cx="755" cy="235" r="9" /><circle cx="835" cy="150" r="14" />
            </g>
          </svg>
          <div className="neural-stage-labels"><span>01 / FRAME INPUT</span><span>02 / TEMPORAL ANALYSIS</span><span>03 / EVENT SIGNAL</span><span>04 / HUMAN REVIEW</span></div>
          <div className="pipeline-flow">
            <article className="pipeline-node"><span className="pipeline-icon">01</span><b>Capture</b><small>Camera frames</small></article>
            <span className="pipeline-connector"><i /></span>
            <article className="pipeline-node"><span className="pipeline-icon">02</span><b>Analyse</b><small>Local AI model</small></article>
            <span className="pipeline-connector"><i /></span>
            <article className="pipeline-node"><span className="pipeline-icon">03</span><b>Flag</b><small>Possible event</small></article>
            <span className="pipeline-connector"><i /></span>
            <article className="pipeline-node pipeline-human"><span className="pipeline-icon"><ShieldCheck size={17} /></span><b>Review</b><small>Staff decision</small></article>
          </div>
          <p className="neural-footnote"><Activity size={13} /> Illustrative flow only · Alerts support review and are not proof of an event.</p>

          <div className="pipeline-detail-heading"><p>Each stage has a defined role. A detected signal is a prompt for review, not an automatic conclusion.</p></div>
          <div className="kinetic-flow" aria-label="Detailed conceptual flowchart from camera input to human-reviewed alert">
            <article className="kinetic-step"><span className="kinetic-step-number">01</span><div className="kinetic-step-icon"><Monitor size={19} /></div><b>Camera input</b><p>Compatible camera feed enters the Windows desktop app.</p><small>INPUT / VIDEO</small></article>
            <span className="kinetic-arrow"><ArrowRight size={17} /></span>
            <article className="kinetic-step"><span className="kinetic-step-number">02</span><div className="kinetic-step-icon"><ScanEye size={19} /></div><b>Frame preparation</b><p>Frames are sampled and prepared for model analysis.</p><small>PREPROCESSING</small></article>
            <span className="kinetic-arrow"><ArrowRight size={17} /></span>
            <article className="kinetic-step"><span className="kinetic-step-number">03</span><div className="kinetic-step-icon"><Activity size={19} /></div><b>Temporal analysis</b><p>The model evaluates motion patterns across a sequence.</p><small>MODEL INFERENCE</small></article>
            <span className="kinetic-arrow"><ArrowRight size={17} /></span>
            <article className="kinetic-step"><span className="kinetic-step-number">04</span><div className="kinetic-step-icon"><BellRing size={19} /></div><b>Alert signal</b><p>A potential event is classified and surfaced for attention.</p><small>EVENT CANDIDATE</small></article>
            <span className="kinetic-arrow"><ArrowRight size={17} /></span>
            <article className="kinetic-step kinetic-step-human"><span className="kinetic-step-number">05</span><div className="kinetic-step-icon"><ShieldCheck size={19} /></div><b>Human review</b><p>Staff assess context and decide the appropriate response.</p><small>HUMAN DECISION</small></article>
          </div>
          <p className="kinetic-disclaimer"><LockKeyhole size={13} /> Conceptual architecture only. Actual stages depend on the installed model and configuration; AI alerts can be wrong and require human assessment.</p>

        </div>
      </div>
    </section>

    <section className="dark-band" id="principles" data-theme="light"><div className="section-shell dark-band-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> A MORE THOUGHTFUL APPROACH</span><h2>Technology should<br />support <em>people.</em></h2></div><p>CampusGuard is designed as an aid to awareness and review—not a substitute for trained staff, established safety procedures or human judgement.</p><div className="dark-band-mark"><ShieldCheck size={35} strokeWidth={1} /></div></div></section>

    <section className="principle-strip" data-theme="light"><div className="strip-inner"><span className="strip-label">A DIFFERENT KIND OF MONITORING</span><span><ShieldCheck size={17} /> Human-led decisions</span><span><Monitor size={17} /> Desktop-first workflow</span><span><LockKeyhole size={17} /> Privacy-aware by design</span></div></section>







    <section className="how-it-works-section" id="how-it-works" data-theme="light">
      <div className="section-shell"><div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> A CLEARER WORKFLOW</span><h2>From connection<br />to <em>considered action.</em></h2></div><p>CampusGuard is designed to support a team’s existing safety process, not replace it.</p></div>
        <div className="how-steps"><article><span>01</span><h3>Connect</h3><p>Set up compatible cameras in the Windows desktop application.</p></article><article><span>02</span><h3>Understand</h3><p>Local AI analysis can surface a potential event for attention.</p></article><article><span>03</span><h3>Review</h3><p>Trained staff check the context and decide what to do next.</p></article></div>
      </div>
    </section>
    <section className="faq-section" id="faqs" data-theme="light">
      <div className="section-shell faq-shell">
        <div className="faq-intro"><span className="eyebrow"><span className="eyebrow-line" /> COMMON QUESTIONS</span><h2>Good questions.<br /><em>Clear answers.</em></h2><p>A quick guide to what CampusGuard is designed to do—and what it is not.</p></div>
        <div className="faq-list">
          <details className="faq-item"><summary>Does the website show live camera footage?<span>+</span></summary><p>No. The website is intended for a limited, read-only overview of camera status and text notifications. Live streams and footage remain in the Windows desktop application.</p></details>
          <details className="faq-item"><summary>Can I add or configure cameras in the browser?<span>+</span></summary><p>No. Camera setup and configuration are handled in the desktop application. The web view is intended to show registered camera names, locations and active/offline status when secure sync is available.</p></details>
          <details className="faq-item"><summary>What information can web alerts contain?<span>+</span></summary><p>The intended notification view can show an alert level, timestamp, camera name or location and a short text summary. It will not include incident playback or a view-footage control.</p></details>
          <details className="faq-item"><summary>Does an AI alert prove that an incident occurred?<span>+</span></summary><p>No. AI can make mistakes. Alerts are prompts for trained staff to assess the context and follow their institution’s established procedures.</p></details>
          <details className="faq-item"><summary>Where does the main analysis happen?<span>+</span></summary><p>CampusGuard is desktop-first. The Windows application is the primary environment for camera capture and AI-assisted analysis. Any web synchronisation should be limited to explicitly selected data.</p></details>
          <details className="faq-item"><summary>Is the customer workspace fully connected today?<span>+</span></summary><p>The workspace interface is being prepared, but real camera inventory and notification sync must be connected before the website can display live customer data.</p></details>
        </div>
      </div>
    </section>

    <section className="download-section" id="download" data-theme="dark">
      <div className="download-grid" aria-hidden="true"></div>
      <div className="section-shell download-inner">
        <div className="download-copy"><span className="eyebrow"><span className="eyebrow-line" /> THE DESKTOP APPLICATION</span><h2>Keep the full workflow<br /><em>where it belongs.</em></h2><p>Camera setup, live monitoring and incident footage stay in CampusGuard for Windows. The website remains a lightweight companion for account access and, once connected, read-only status and alerts.</p><div className="download-actions"><a className="button button-lime" href="https://github.com/hisir-sys/campusguard/releases" target="_blank" rel="noreferrer">Check desktop releases <ArrowUpRight size={15} /></a><a className="download-secondary" href="https://github.com/hisir-sys/campusguard" target="_blank" rel="noreferrer">View desktop project <ArrowRight size={14} /></a></div><small className="download-note"><LockKeyhole size={12} /> Opens the desktop project’s official GitHub page. A direct installer link will be added when a public release is available.</small></div>
        <div className="download-visual" aria-hidden="true"><div className="download-orbit download-orbit-a"></div><div className="download-orbit download-orbit-b"></div><div className="download-device"><div className="download-device-top"><span>CG / DESKTOP</span><span className="download-device-status"><i/> LOCAL</span></div><div className="download-device-body"><div className="download-device-mark"><ShieldCheck size={35}/></div><span>CAMPUSGUARD</span><small>WINDOWS APPLICATION</small><div className="download-progress"><i/></div></div><div className="download-device-bottom">CAMERAS · AI ANALYSIS · INCIDENT REVIEW</div></div><span className="download-visual-label">DESKTOP-FIRST / READ-ONLY WEB</span></div>
      </div>
    </section>


    <section className="final-cta-section" id="final-cta" data-theme="dark"><div className="section-shell final-cta-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> EARLY ACCESS PROGRAMME</span><h2>Ready to explore CampusGuard<br /><em>for your campus?</em></h2><p>We’ll understand your needs, discuss scope and pricing directly, and arrange a demo. No online checkout.</p></div><div className="final-cta-actions"><button className="button button-lime" onClick={() => setModal('login')}>WhatsApp about CampusGuard <ArrowUpRight size={16}/></button><button className="button button-outline" onClick={() => setModal('login')}>Email about CampusGuard <ArrowUpRight size={16}/></button><button className="button button-outline" onClick={() => openInquiry("Request pilot details")}>Request a demo <ArrowUpRight size={16}/></button></div></div></section>
    <footer className="site-footer"><div className="footer-top"><Brand /><p>More context. Better review.<br />People at the centre.</p><div className="footer-links"><a href="#platform">Platform</a><a href="#principles">Our approach</a><a href="#faqs">FAQs</a><a href="#download">Download</a><button onClick={() => setModal('login')}>Email about plans ↗</button><button onClick={() => setModal('login')}>WhatsApp about plans ↗</button><button onClick={openAccess}>Apply for access</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CampusGuard. All rights reserved.</span><span>AI-ASSISTED · HUMAN-LED · PRIVACY-AWARE</span><a href="#top">BACK TO TOP ↑</a></div></footer>

    {modal === 'inquiry' && <InquiryModal close={() => setModal(null)} initialTopic={inquiryTopic} />}
    {modal === 'access' && <AccessModal close={() => setModal(null)} onLogin={() => setModal('login')} />}
    {modal === 'pricing' && <div className="modal-backdrop pricing-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><section className="pricing-modal" role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title"><button className="modal-close pricing-modal-close" onClick={() => setModal(null)} aria-label="Close pricing"><X size={18} /></button><div className="pricing-modal-content"><div className="section-heading pricing-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> PRICING &amp; PILOTS</span><h2 id="pricing-modal-title">A plan that fits<br /><em>your campus.</em></h2></div><p>Explore the available plans and indicative monthly ranges. Log in to your approved customer account to access contact details and discuss the right scope for your campus.</p></div><div className="pricing-grid"><article className="pricing-card"><span className="pricing-kicker">01 / STARTER</span><h3>Starter</h3><p className="pricing-summary">A focused pilot for smaller campus teams.</p><div className="pricing-price">₹2,500–8,000<span>/month</span></div><ul><li><Check size={15} /> 4–10 cameras</li><li><Check size={15} /> 2 team members</li><li><Check size={15} /> Monthly billing</li><li><Check size={15} /> Email support only</li><li><Check size={15} /> Installation visit included</li><li><Check size={15} /> Incident logging &amp; review</li></ul><button className="button button-outline pricing-action" onClick={() => setModal('login')}>Log in to get contact details <ArrowUpRight size={15} /></button></article><article className="pricing-card pricing-featured"><span className="pricing-kicker">02 / PROFESSIONAL</span><span className="pricing-badge">MOST POPULAR</span><h3>Professional</h3><p className="pricing-summary">For active campus deployment with broader support.</p><div className="pricing-price">₹8,000–15,000<span>/month</span></div><ul><li><Check size={15} /> 10–20 cameras</li><li><Check size={15} /> 5–7 team members</li><li><Check size={15} /> Monthly billing</li><li><Check size={15} /> Email + WhatsApp support</li><li><Check size={15} /> Installation visit + emergency support</li><li><Check size={15} /> Staff training &amp; onboarding</li></ul><button className="button button-lime pricing-action" onClick={() => setModal('login')}>Log in to get contact details <ArrowUpRight size={15} /></button></article><article className="pricing-card"><span className="pricing-kicker">03 / ENTERPRISE</span><h3>Enterprise</h3><p className="pricing-summary">For larger campuses or educational groups.</p><div className="pricing-price">₹15,000–30,000<span>/month</span></div><ul><li><Check size={15} /> 20–40 cameras</li><li><Check size={15} /> 10–15 team members</li><li><Check size={15} /> Monthly billing</li><li><Check size={15} /> Email + WhatsApp + on-site support</li><li><Check size={15} /> Installation visit + emergency support</li><li><Check size={15} /> Dedicated account manager</li></ul><button className="button button-outline pricing-action" onClick={() => setModal('login')}>Log in to get contact details <ArrowUpRight size={15} /></button></article></div><p className="pricing-disclaimer"><LockKeyhole size={13} /> Contact details are available only after logging in to an approved customer account. No online checkout or payment is collected on this website.</p><div className="pricing-contact-actions"><button className="button button-outline" onClick={() => setModal('login')}><ArrowUpRight size={15}/> Email about plans</button><button className="button button-lime" onClick={() => setModal('login')}>WhatsApp about plans <ArrowUpRight size={15}/></button></div></div></section></div>}
    {modal === 'login' && <LoginModal close={() => setModal(null)} onApply={() => setModal('access')} onApproved={() => { setIsAuthenticated(true); setModal(null); window.scrollTo({ top: 0, behavior: 'auto' }) }} />}
    {modal === 'product' && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><section className="access-modal info-modal" role="dialog" aria-modal="true" aria-labelledby="portal-title"><button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button><span className="eyebrow">CUSTOMER ACCESS</span><h2 id="portal-title">A portal with purpose.</h2><p className="modal-intro">The web portal is intentionally read-only: it will show camera names, locations, active/offline status and text notifications. Camera setup, live streams and incident footage remain in the Windows desktop application.</p><div className="portal-status"><LockKeyhole size={18} /><span><b>Read-only web access</b><small>Camera and notification data appear when desktop sync is connected.</small></span></div><button className="button button-dark" onClick={() => { setModal(null); openAccess() }}>Apply for early access <ArrowUpRight size={15} /></button></section></div>}
    </div>}
    {isAuthenticated && modal === 'access' && <AccessModal close={() => setModal(null)} onLogin={() => setModal('login')} />}
    {isAuthenticated && modal === 'login' && <LoginModal close={() => setModal(null)} onApply={() => setModal('access')} onApproved={() => { setIsAuthenticated(true); setModal(null) }} />}
  </main>
}

export default App
