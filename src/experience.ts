/**
 * Page-level experience layer for the public site: hero entrance, scroll-linked hero exit,
 * header that follows the section colour and tucks away while reading, a section rail,
 * a scroll-speed marquee, magnetic buttons, tilting cards and a few staged reveals.
 *
 * Everything decorative is skipped for visitors who prefer reduced motion. Navigation helpers
 * (header colour, section rail) still work for them.
 */
import { splitWords } from './motion'

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

const RAIL_LABELS: Record<string, string> = {
  overview: 'Overview', platform: 'Platform', story: 'The story', challenges: 'The challenge', workflow: 'Workflow',
  'designed-for': 'Designed for', pipeline: 'AI pipeline', principles: 'Our approach', 'how-it-works': 'How it works',
  faqs: 'FAQs', download: 'Desktop app', 'final-cta': 'Contact',
}

const LOGO_ON_LIGHT = '/campusguard-logo.svg'
const LOGO_ON_DARK = '/campusguard-logo-white.svg'
const MAGNET = '.button-lime, .button-dark, .nav-cta, .hero-actions .text-link'
const TILT = '.feature-card, .public-challenge-card, .public-workflow-step, .how-steps article, .app-fact'

export function initExperience(): () => void {
  const site = document.querySelector<HTMLElement>('.public-site-content')
  if (!site) return () => {}
  const root = document.documentElement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const header = document.querySelector<HTMLElement>('.site-header')
  const logo = header?.querySelector<HTMLImageElement>('.brand-image') ?? null
  // warm the cache so the logo swap never flashes
  ;[LOGO_ON_LIGHT, LOGO_ON_DARK].forEach(src => { const img = new Image(); img.src = src })
  const hero = site.querySelector<HTMLElement>('.public-hero')
  const sections = Array.from(site.querySelectorAll<HTMLElement>(':scope > section[id]'))
  const cleanups: Array<() => void> = []
  const timers: number[] = []

  /* ------------------------------------------------------------ hero entrance */
  if (!reduced && hero) {
    hero.classList.add('cg-hero-intro')
    const copy = hero.querySelector<HTMLElement>('.public-hero-copy')
    copy?.querySelectorAll<HTMLElement>(':scope > *').forEach((el, index) => el.style.setProperty('--d', String(index)))
    const h1 = hero.querySelector<HTMLElement>('h1')
    if (h1) {
      splitWords(h1)
      h1.classList.add('cg-split')
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => h1.classList.add('cg-split-in')) })
      cleanups.push(() => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) })
    }
  }

  /* ------------------------------------------------------------ marquee (hero foot) */
  const marquee = site.querySelector<HTMLElement>('.strip-track')
  let marqueeAnim: Animation | null = null
  if (marquee && !reduced) {
    marqueeAnim = marquee.getAnimations()[0] ?? null
  }

  /* ------------------------------------------------------------ section rail */
  const rail = document.createElement('nav')
  rail.className = 'section-rail'
  rail.setAttribute('aria-label', 'Page sections')
  const list = document.createElement('ol')
  const dots = new Map<string, HTMLAnchorElement>()
  sections.forEach(section => {
    const label = RAIL_LABELS[section.id]
    if (!label) return
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.href = `#${section.id}`
    link.dataset.label = label
    link.setAttribute('aria-label', label)
    link.innerHTML = '<i></i>'
    item.appendChild(link)
    list.appendChild(item)
    dots.set(section.id, link)
  })
  rail.appendChild(list)
  document.querySelector('main')?.appendChild(rail)
  cleanups.push(() => rail.remove())

  /* ------------------------------------------------------------ scroll handler */
  let lastY = window.scrollY
  let lastT = performance.now()
  let rate = 1
  let decayFrame = 0
  let headerHidden = false
  let queued = false
  let activeId = ''

  const decay = () => {
    rate = 1 + (rate - 1) * 0.9
    if (rate < 1.02) rate = 1
    if (marqueeAnim) marqueeAnim.playbackRate = rate
    decayFrame = rate > 1 ? requestAnimationFrame(decay) : 0
  }

  const update = () => {
    queued = false
    const y = window.scrollY
    const vh = window.innerHeight
    const now = performance.now()
    const dy = y - lastY

    if (hero && !reduced) {
      const hp = clamp(y / Math.max(1, hero.offsetHeight * 0.85))
      hero.style.setProperty('--hp', hp.toFixed(4))
    }

    if (marqueeAnim && Math.abs(dy) > 0) {
      const speed = Math.abs(dy) / Math.max(8, now - lastT) // px per ms
      rate = Math.min(6, Math.max(rate, 1 + speed * 5))
      marqueeAnim.playbackRate = rate
      if (!decayFrame) decayFrame = requestAnimationFrame(decay)
    }

    if (header) {
      const mid = (header.offsetHeight || 78) / 2
      const under = sections.find(section => { const r = section.getBoundingClientRect(); return r.top <= mid && r.bottom > mid })
      const onLight = under?.dataset.theme === 'light'
      if (header.classList.contains('header-light') !== onLight) {
        header.classList.toggle('header-light', onLight)
        if (logo) logo.src = onLight ? LOGO_ON_LIGHT : LOGO_ON_DARK
      }
      const menuOpen = !!header.querySelector('.nav-open')
      if (!reduced) {
        const shouldHide = y > 360 && dy > 4 && !menuOpen && !header.contains(document.activeElement)
        const shouldShow = dy < -4 || y < 200 || menuOpen
        if (shouldHide && !headerHidden) { headerHidden = true; header.classList.add('header-hidden') }
        else if (shouldShow && headerHidden) { headerHidden = false; header.classList.remove('header-hidden') }
      }
    }

    // Section rail: the section crossing the upper-middle of the viewport is current
    const line = vh * 0.42
    let current = sections.find(section => { const r = section.getBoundingClientRect(); return r.top <= line && r.bottom > line })
    if (!current) current = sections[0]
    if (current && current.id !== activeId) {
      activeId = current.id
      dots.forEach((link, id) => { if (id === activeId) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current') })
      rail.dataset.tone = current.dataset.theme === 'light' ? 'light' : 'dark'
    }
    const scrollable = document.documentElement.scrollHeight - vh
    rail.style.setProperty('--rp', (scrollable > 0 ? clamp(y / scrollable) : 0).toFixed(4))
    rail.classList.toggle('is-visible', y > vh * 0.35)

    lastY = y
    lastT = now
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update) } }
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  update()
  cleanups.push(() => {
    window.removeEventListener('scroll', request)
    window.removeEventListener('resize', request)
    cancelAnimationFrame(decayFrame)
    header?.classList.remove('header-hidden', 'header-light')
    if (logo) logo.src = LOGO_ON_DARK
  })

  /* ------------------------------------------------------------ settle revealed cards back to normal hover timing */
  const onTransitionEnd = (event: TransitionEvent) => {
    const el = event.target as HTMLElement
    if (event.propertyName !== 'opacity' || !el.classList?.contains('cg-reveal') || !el.classList.contains('cg-is-visible')) return
    el.classList.add('cg-settled')
    el.style.setProperty('--cg-reveal-delay', '0ms')
  }
  site.addEventListener('transitionend', onTransitionEnd)
  cleanups.push(() => site.removeEventListener('transitionend', onTransitionEnd))

  /* ------------------------------------------------------------ staged reveals for pieces without their own */
  if (!reduced && 'IntersectionObserver' in window) {
    const staged = Array.from(site.querySelectorAll<HTMLElement>('.site-footer .footer-top > *, .site-footer .footer-bottom > *, .contact-card, .contact-copy > *'))
    staged.forEach((el, i) => { el.setAttribute('data-fx', 'up'); el.style.setProperty('--fx-d', `${(i % 6) * 80}ms`) })
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('fx-in'); observer.unobserve(entry.target) } })
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' })
    staged.forEach(el => observer.observe(el))
    cleanups.push(() => { observer.disconnect(); staged.forEach(el => { el.removeAttribute('data-fx'); el.classList.remove('fx-in') }) })
  }

  /* ------------------------------------------------------------ pointer effects (fine pointers only) */
  if (!reduced && finePointer) {
    let magnetic: HTMLElement | null = null
    let tilted: HTMLElement | null = null
    const release = (el: HTMLElement | null) => { if (el) { el.style.translate = ''; el.classList.remove('cg-magnet') } }
    const unTilt = (el: HTMLElement | null) => { if (el) { el.classList.remove('cg-hovering'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry') } }

    const onMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const button = target.closest<HTMLElement>(MAGNET)
      if (button !== magnetic) { release(magnetic); magnetic = button }
      if (button) {
        const r = button.getBoundingClientRect()
        const dx = ((event.clientX - (r.left + r.width / 2)) / r.width) * 14
        const dy = ((event.clientY - (r.top + r.height / 2)) / r.height) * 12
        button.classList.add('cg-magnet')
        button.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`
      }
      const card = target.closest<HTMLElement>(TILT)
      if (card !== tilted) { unTilt(tilted); tilted = card }
      // A card that is still fading in keeps its entrance; tilt starts once it has settled
      const entering = !!card && card.classList.contains('cg-reveal') && !card.classList.contains('cg-is-visible')
      if (card && !entering) {
        const r = card.getBoundingClientRect()
        const px = (event.clientX - r.left) / r.width - 0.5
        const py = (event.clientY - r.top) / r.height - 0.5
        card.classList.add('cg-hovering')
        card.style.setProperty('--rx', (px * 7).toFixed(2))
        card.style.setProperty('--ry', (py * -7).toFixed(2))
      }
    }
    const onLeave = () => { release(magnetic); unTilt(tilted); magnetic = null; tilted = null }
    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    cleanups.push(() => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      onLeave()
    })
  }

  root.classList.add('cg-experience')
  return () => {
    timers.forEach(id => window.clearTimeout(id))
    cleanups.forEach(fn => fn())
    root.classList.remove('cg-experience')
    hero?.classList.remove('cg-hero-intro')
    hero?.querySelector('h1')?.classList.remove('cg-split', 'cg-split-in')
  }
}
