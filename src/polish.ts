// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
// Small interaction polish: a reading-progress bar, a header that settles on scroll, and a soft spotlight that
// follows the pointer over cards. Everything is skipped for reduced motion and touch screens.
const CARDS = '.feature-card, .pricing-card, .public-challenge-card, .public-workflow-step, .workspace-stat, .workspace-panel, .workspace-learning-card, .customer-pilot-grid article, .faq-item, .how-steps > article'

export function initPolish() {
  if (typeof window === 'undefined') return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const root = document.documentElement

  let bar = document.querySelector<HTMLElement>('.cg-progress')
  if (!bar) {
    bar = document.createElement('div')
    bar.className = 'cg-progress'
    bar.setAttribute('aria-hidden', 'true')
    document.body.appendChild(bar)
  }
  let frame = 0
  const update = () => {
    frame = 0
    const max = document.documentElement.scrollHeight - window.innerHeight
    bar!.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
    root.toggleAttribute('data-scrolled', window.scrollY > 24)
  }
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update) }, { passive: true })
  update()

  if (reduce || !window.matchMedia('(hover: hover)').matches) return
  document.addEventListener('pointermove', event => {
    const card = (event.target as Element | null)?.closest?.(CARDS) as HTMLElement | null
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    card.style.setProperty('--my', `${event.clientY - rect.top}px`)
    card.setAttribute('data-spot', '')
  }, { passive: true })
}
