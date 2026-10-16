import { useEffect, useState } from 'react'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Activity, BellRing, Check,
  CircleDot, Command, Fingerprint, LockKeyhole, Menu,
  Monitor, Play, ScanEye, ShieldCheck, Sparkles, X,
} from 'lucide-react'

type ModalName = 'access' | 'product' | 'login' | 'pricing' | null

const features = [
  { number: '01', icon: ScanEye, title: 'Context before noise', text: 'AI-assisted detection helps bring potentially important moments to the attention of the people responsible for reviewing them.' },
  { number: '02', icon: BellRing, title: 'Alerts with a next step', text: 'A clear incident workflow helps staff inspect an alert, review the available footage and record what happened next.' },
  { number: '03', icon: Fingerprint, title: 'Local-first by design', text: 'Video analysis is designed around the Windows desktop application. Website sync, where enabled, should be limited to explicitly selected data.' },
]

const workflow = [
  { n: '01', title: 'Connect', text: 'Bring compatible camera feeds into the CampusGuard desktop application.' },
  { n: '02', title: 'Understand', text: 'Local AI models analyse video and flag events that may need a human review.' },
  { n: '03', title: 'Review', text: 'Staff inspect alerts and manage incident records from a single workflow.' },
]

function Brand() {
  return <a className="brand" href="#top" aria-label="CampusGuard home"><span className="brand-mark"><ShieldCheck size={19} strokeWidth={1.8} /></span><span>campus<span className="brand-light">guard</span><i>®</i></span></a>
}

function AccessModal({ close, onLogin }: { close: () => void; onLogin: () => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', organisation: '', role: '', purpose: '' })
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
      {submitted ? <div className="success-state"><span className="success-icon"><Check size={25} /></span><span className="eyebrow">APPLICATION RECEIVED</span><h2 id="modal-title">You’re on our radar.</h2><p>Your access application has been submitted successfully. The CampusGuard team can review it and follow up using the contact details you provided.</p><button className="button button-dark" onClick={close}>Back to CampusGuard <ArrowRight size={16} /></button></div> :
      <><span className="eyebrow">EARLY ACCESS</span><h2 id="modal-title">Let’s make your campus more aware.</h2><p className="modal-intro">Tell us a little about your institution. Applications are intended to be reviewed before access is granted.</p>
      <form onSubmit={submitApplication}>
        <label>Your name<input required value={form.name} onChange={e => update('name', e.target.value)} placeholder="Full name" /></label>
        <label>Work email<input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@institution.org" /></label>
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


function LoginModal({ close, onApply }: { close: () => void; onApply: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [attempted, setAttempted] = useState(false)
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
    <section className="access-modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button className="modal-close" onClick={close} aria-label="Close login"><X size={18} /></button>
      <span className="eyebrow">CUSTOMER SIGN IN</span>
      <h2 id="login-title">Welcome back.</h2>
      <p className="modal-intro">Sign in to your CampusGuard account to continue to your organisation workspace.</p>
      {attempted && <div className="login-prototype-note" role="status"><LockKeyhole size={16} /><span><b>Sign-in is not connected yet.</b><small>This website preview does not verify passwords or access accounts. Secure authentication must be connected before customer sign-in goes live.</small></span></div>}
      <form onSubmit={e => { e.preventDefault(); setAttempted(true) }}>
        <label>Email address<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@institution.org" /></label>
        <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label>
        <button className="button button-lime form-submit" type="submit">Log in <ArrowUpRight size={16} /></button>
        <p className="form-note"><LockKeyhole size={12} /> Secure sign-in will be enabled when authentication is connected.</p>
      </form>
      <p className="account-prompt">New to CampusGuard? <button type="button" onClick={onApply}>Request early access <ArrowUpRight size={13} /></button></p>
    </section>
  </div>
}

function App() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) return
    const targets = document.querySelectorAll(
      '.section-heading, .feature-card, .pricing-card, .pricing-disclaimer, .workflow-intro, .workflow-item, .neural-heading, .neural-visual, .pipeline-node, .interface-copy, .interface-art, .dark-band-inner > *, .faq-layout > *, .final-cta-inner, .strip-inner > span:not(.strip-label)'
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
  const openAccess = () => { setModal('access'); setMenuOpen(false) }
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
  return <main id="top">
    <div className="reading-progress" aria-hidden="true"><span style={{ width: `${scrollProgress}%` }} /></div>
    <header className={headerLight ? "site-header header-light" : "site-header"}>
      <div className="header-inner"><Brand />
        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Main navigation">
          <a href="#product" onClick={event => navigateToSection(event, 'product')}>Product</a><a href="#pipeline" onClick={event => navigateToSection(event, 'pipeline')}>AI pipeline</a><a href="#principles" onClick={event => navigateToSection(event, 'principles')}>Our approach</a><a href="#platform" onClick={event => navigateToSection(event, 'platform')}>Platform</a><a href="#how-it-works" onClick={event => navigateToSection(event, 'how-it-works')}>How it works</a>
          <a href="#pricing" onClick={event => { event.preventDefault(); setModal('pricing'); setMenuOpen(false) }}>Pricing</a>
          <button className="nav-login" onClick={() => { setModal('login'); setMenuOpen(false) }}>Log in <ArrowUpRight size={14} /></button>
          <button className="button button-lime nav-cta" onClick={openAccess}>Apply for access <ArrowUpRight size={15} /></button>
        </nav>
        <button className="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    <section className="hero" data-theme="dark">
      <div className="hero-grid" aria-hidden="true" /><div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy"><div className="status-pill"><span className="status-dot" /> CAMPUS SAFETY, WITH MORE CONTEXT</div>
          <h1>See the moment.<br />Understand <em>what matters.</em></h1>
          <p className="hero-lede">A more considered approach to campus monitoring. CampusGuard brings camera feeds, AI-assisted alerts and incident review into one focused desktop workflow.</p>
          <div className="hero-actions"><button className="button button-lime" onClick={openAccess}>Request early access <ArrowUpRight size={16} /></button><a className="text-link" href="#how-it-works"><span className="play-circle"><Play size={12} fill="currentColor" /></span> Explore the approach</a></div>
          <div className="hero-proof"><span><Check size={13} /> Windows desktop application</span><span><Check size={13} /> Local-first processing approach</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="visual-topline"><span><span className="live-dot" /> CONCEPTUAL INTERFACE</span><span>CG / 001</span></div>
          <div className="monitor-frame">
            <div className="monitor-toolbar"><span className="window-dots"><i /><i /><i /></span><span className="monitor-title"><Command size={12} /> CAMPUSGUARD / LIVE VIEW</span><span className="monitor-status"><CircleDot size={9} /> LOCAL</span></div>
            <div className="camera-grid">
              <div className="camera-feed feed-a"><div className="feed-label">NORTH QUAD <span>CAM—01</span></div><div className="feed-scan" /><div className="detection-box box-a"><span>PERSON / TRACK 04</span></div><div className="feed-time">10:42:08</div><span className="corner-mark tl" /><span className="corner-mark br" /></div>
              <div className="camera-feed feed-b"><div className="feed-label">MAIN HALL <span>CAM—02</span></div><div className="feed-scan" /><div className="detection-box box-b"><span>TRACK 02</span></div><div className="feed-time">10:42:09</div><span className="corner-mark tl" /><span className="corner-mark br" /></div>
              <div className="camera-feed feed-c"><div className="feed-label">EAST WALKWAY <span>CAM—03</span></div><div className="feed-scan" /><div className="feed-time">10:42:10</div></div>
              <div className="camera-feed feed-d"><div className="feed-label">LIBRARY ENTRY <span>CAM—04</span></div><div className="feed-scan" /><div className="feed-time">10:42:10</div></div>
            </div>
            <div className="monitor-bottom"><span><Activity size={12} /> AI ENGINE <b>READY</b></span><span>4 VIEWPORTS <i /> LOCAL SESSION</span></div>
          </div>
          <div className="floating-alert"><span className="alert-icon"><BellRing size={16} /></span><span><b>Incident for review</b><small>Human review recommended</small></span><span className="alert-chevron"><ArrowUpRight size={14} /></span></div>
          <div className="visual-caption"><span>ILLUSTRATIVE PRODUCT VISUAL</span><span>DESIGNED FOR HUMAN REVIEW</span></div>
        </div>
        <div className="hero-index"><span>01 — AWARENESS</span><span>BUILT FOR THE PEOPLE WHO KEEP CAMPUSES MOVING <ArrowDownRight size={13} /></span></div>
      </div>
    </section>

    <section className="section interface-section" id="product" data-theme="light"><div className="section-shell interface-layout"><div className="interface-copy"><span className="eyebrow"><span className="eyebrow-line" /> PURPOSEFUL BY DESIGN</span><h2>Less hunting.<br /><em>More understanding.</em></h2><p>A focused workspace for viewing feeds, reviewing alerts and keeping incident records organised—without turning every signal into a conclusion.</p><ul className="check-list"><li><Check size={15} /> Review alerts with useful context</li><li><Check size={15} /> Keep incident status and follow-up visible</li><li><Check size={15} /> Keep a human in the decision loop</li></ul><button className="button button-dark" onClick={openAccess}>Apply to evaluate CampusGuard <ArrowRight size={15} /></button></div><div className="interface-art"><div className="art-backdrop" /><div className="art-window"><div className="art-window-head"><span>INCIDENT REVIEW</span><span className="art-window-dots">•••</span></div><div className="art-event"><span className="event-time">10:42:08</span><span className="event-type"><i /> REVIEW REQUIRED</span></div><div className="art-preview"><div className="art-scanline" /><div className="art-person person-one" /><div className="art-person person-two" /><div className="art-bbox" /><span className="art-camera-label">NORTH QUAD / CAM 01</span></div><div className="art-meta"><span>STATUS</span><b><i /> Open for review</b></div><div className="art-meta"><span>RECORD</span><b>CG-INC-0042</b></div><div className="art-actions"><span>View event</span><span>Mark reviewed <Check size={12} /></span></div></div><div className="art-stamp"><ShieldCheck size={15} /> HUMAN REVIEW FIRST</div></div></div></section>

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
        </div>
      </div>
    </section>

    <section className="dark-band" id="principles" data-theme="light"><div className="section-shell dark-band-inner"><div><span className="eyebrow"><span className="eyebrow-line" /> A MORE THOUGHTFUL APPROACH</span><h2>Technology should<br />support <em>people.</em></h2></div><p>CampusGuard is designed as an aid to awareness and review—not a substitute for trained staff, established safety procedures or human judgement.</p><div className="dark-band-mark"><ShieldCheck size={35} strokeWidth={1} /></div></div></section>

    <section className="principle-strip" data-theme="light"><div className="strip-inner"><span className="strip-label">A DIFFERENT KIND OF MONITORING</span><span><ShieldCheck size={17} /> Human-led decisions</span><span><Monitor size={17} /> Desktop-first workflow</span><span><LockKeyhole size={17} /> Privacy-aware by design</span></div></section>

    <section className="section platform-section" id="platform" data-theme="dark"><div className="section-shell">
      <div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> THE PLATFORM</span><h2>From camera feeds to<br /><em>clearer decisions.</em></h2></div><p>Security teams already have a lot to watch. CampusGuard is being built to help make the important moments easier to find, review and document.</p></div>
      <div className="feature-grid">{features.map(({ number, icon: Icon, title, text }) => <article className="feature-card" key={number}><div className="feature-top"><span>{number}</span><Icon size={21} strokeWidth={1.5} /></div><h3>{title}</h3><p>{text}</p><span className="feature-arrow"><ArrowUpRight size={17} /></span></article>)}</div>
      <div className="platform-note"><Sparkles size={17} /><p><b>Built around a desktop application.</b> CampusGuard’s Windows app remains the primary place for camera capture and local analysis. A future web workspace may support account and incident-review experiences once secure authentication and data services are connected.</p></div>
    </div></section>




    <section className="workflow-section" id="how-it-works" data-theme="light"><div className="section-shell workflow-shell"><div className="workflow-intro"><span className="eyebrow"><span className="eyebrow-line" /> HOW IT WORKS</span><h2>A clear path from<br /><em>signal to response.</em></h2><p>AI can help surface a moment. People still provide the context, judgement and next step.</p><button className="button button-outline" onClick={() => setModal('product')}>Explore the product <ArrowUpRight size={15} /></button></div><div className="workflow-list">{workflow.map(({ n, title, text }) => <article className="workflow-item" key={n}><span className="workflow-number">{n}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight className="workflow-arrow" size={19} /></article>)}</div></div></section>

    <section className="final-cta" data-theme="dark"><div className="cta-grid" aria-hidden="true" /><div className="final-cta-inner"><span className="eyebrow"><span className="eyebrow-line" /> EARLY ACCESS PROGRAMME</span><h2>Make room for<br /><em>a clearer picture.</em></h2><p>We’re looking to work with institutions that want to evaluate a more considered, human-led approach to campus monitoring.</p><button className="button button-lime" onClick={openAccess}>Apply for early access <ArrowUpRight size={16} /></button><span className="cta-footnote">INSTITUTIONAL ENQUIRIES · APPLICATIONS REVIEWED INDIVIDUALLY</span></div></section>

    <footer className="site-footer"><div className="footer-top"><Brand /><p>More context. Better review.<br />People at the centre.</p><div className="footer-links"><a href="#platform">Platform</a><a href="#how-it-works">How it works</a><a href="#principles">Our approach</a><button onClick={openAccess}>Apply for access</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CampusGuard. All rights reserved.</span><span>AI-ASSISTED · HUMAN-LED · PRIVACY-AWARE</span><a href="#top">BACK TO TOP ↑</a></div></footer>

    {modal === 'access' && <AccessModal close={() => setModal(null)} onLogin={() => setModal('login')} />}\n    {modal === 'pricing' && <div className="modal-backdrop pricing-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><section className="pricing-modal" role="dialog" aria-modal="true" aria-labelledby="pricing-modal-title"><button className="modal-close pricing-modal-close" onClick={() => setModal(null)} aria-label="Close pricing"><X size={18} /></button><div className="pricing-modal-content"><div className="section-heading pricing-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> PRICING &amp; PILOTS</span><h2 id="pricing-modal-title">A plan that fits<br /><em>your campus.</em></h2></div><p>Start with a focused evaluation, then shape a deployment around your cameras, team and operational needs. Final pricing will be confirmed with each institution.</p></div><div className="pricing-grid"><article className="pricing-card"><span className="pricing-kicker">01 / EVALUATE</span><h3>Campus pilot</h3><p className="pricing-summary">For teams exploring the workflow before a wider rollout.</p><div className="pricing-price">Discuss your pilot</div><ul><li><Check size={15} /> Guided evaluation scope</li><li><Check size={15} /> Desktop-first workflow review</li><li><Check size={15} /> Feedback and setup discussion</li></ul><button className="button button-outline pricing-action" onClick={openAccess}>Request pilot details <ArrowUpRight size={15} /></button></article><article className="pricing-card pricing-featured"><span className="pricing-kicker">02 / DEPLOY</span><span className="pricing-badge">RECOMMENDED TO DISCUSS</span><h3>Single campus</h3><p className="pricing-summary">For an institution planning a day-to-day operational deployment.</p><div className="pricing-price">Custom quote</div><ul><li><Check size={15} /> Camera and team requirements review</li><li><Check size={15} /> Deployment planning conversation</li><li><Check size={15} /> Support needs scoped with your team</li></ul><button className="button button-lime pricing-action" onClick={openAccess}>Discuss your campus <ArrowUpRight size={15} /></button></article><article className="pricing-card"><span className="pricing-kicker">03 / EXPAND</span><h3>Multi-campus</h3><p className="pricing-summary">For groups coordinating needs across multiple locations.</p><div className="pricing-price">Custom quote</div><ul><li><Check size={15} /> Multi-site requirements review</li><li><Check size={15} /> Organisation-level planning</li><li><Check size={15} /> Rollout scope defined together</li></ul><button className="button button-outline pricing-action" onClick={openAccess}>Talk to our team <ArrowUpRight size={15} /></button></article></div><p className="pricing-disclaimer"><LockKeyhole size={13} /> Pricing is not published yet. These are planning options, not live subscriptions; final features, availability and fees will be confirmed before purchase.</p></div></section></div>}
    {modal === 'login' && <LoginModal close={() => setModal(null)} onApply={() => setModal('access')} />}
    {modal === 'product' && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><section className="access-modal info-modal" role="dialog" aria-modal="true" aria-labelledby="portal-title"><button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button><span className="eyebrow">CUSTOMER ACCESS</span><h2 id="portal-title">A portal with purpose.</h2><p className="modal-intro">The customer portal is planned for approved institutions. Secure sign-in, organisation-scoped incident access and invitation-based account setup will be connected in a later phase.</p><div className="portal-status"><LockKeyhole size={18} /><span><b>Private access is not live yet</b><small>This preview does not authenticate users or display real incidents.</small></span></div><button className="button button-dark" onClick={() => { setModal(null); openAccess() }}>Apply for early access <ArrowUpRight size={15} /></button></section></div>}
  </main>
}

export default App
