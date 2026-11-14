/**
 * Scroll-linked motion for the public site.
 *
 * One passive scroll listener, batched in requestAnimationFrame, writes a few CSS custom
 * properties. All visuals live in CSS (scroll-motion.css), so the effects stay cheap and
 * everything is skipped when the visitor prefers reduced motion.
 *
 *  --sp   (sections)    0 -> 1 while the section travels through the viewport
 *  --pc   ([data-scroll]) -1 -> 1 around the viewport centre (0 = centred)
 *  --p    ([data-scroll]) 0 -> 1 while the element travels through the viewport
 */
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

const GLOW_TARGETS = '.feature-card, .public-challenge-card, .public-workflow-step, .how-steps article, .faq-item, .app-fact'

function splitWords(heading: HTMLElement) {
  if (heading.dataset.split) return
  heading.dataset.split = '1'
  let index = 0
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? ''
        if (!text.trim()) return
        const frag = document.createDocumentFragment()
        text.split(/(\s+)/).forEach(part => {
          if (!part) return
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return }
          const word = document.createElement('span')
          word.className = 'cg-word'
          word.style.setProperty('--i', String(index++))
          const inner = document.createElement('span')
          inner.textContent = part
          word.appendChild(inner)
          frag.appendChild(word)
        })
        child.parentNode?.replaceChild(frag, child)
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName !== 'BR') {
        walk(child)
      }
    })
  }
  walk(heading)
}

export function initScrollMotion(): () => void {
  const root = document.documentElement
  const site = document.querySelector('.public-site-content')
  if (!site) return () => {}
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('cg-static')
    return () => root.classList.remove('cg-static')
  }
  root.classList.add('cg-motion')

  site.querySelectorAll<HTMLElement>('h2').forEach(splitWords)
  site.querySelectorAll<HTMLElement>('h2').forEach(h => h.classList.add('cg-split'))

  const sections = Array.from(site.querySelectorAll<HTMLElement>(':scope > section'))
  const items = Array.from(site.querySelectorAll<HTMLElement>('[data-scroll]'))
  const draws = items
    .filter(el => el.dataset.scroll === 'draw' || el.dataset.scroll === 'draw-group')
    .flatMap(el => (el.dataset.scroll === 'draw' ? [el as unknown as SVGGeometryElement] : Array.from(el.querySelectorAll<SVGGeometryElement>('path:not(.network-pulse)')).map(p => p)))
  draws.forEach(path => {
    try {
      const length = path.getTotalLength()
      path.style.setProperty('--len', String(Math.ceil(length)))
      path.classList.add('cg-draw')
    } catch { /* element not measurable */ }
  })
  items.forEach(el => { if (el.dataset.depth) el.style.setProperty('--depth', el.dataset.depth) })
  const drawOwners = new Map<SVGGeometryElement, HTMLElement>()
  draws.forEach(path => { const owner = path.closest<HTMLElement>('[data-scroll]'); if (owner) drawOwners.set(path, owner) })

  let queued = false
  const update = () => {
    queued = false
    const vh = window.innerHeight
    sections.forEach(section => {
      const r = section.getBoundingClientRect()
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return
      section.style.setProperty('--sp', clamp((vh - r.top) / (vh + r.height)).toFixed(4))
    })
    items.forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return
      const centre = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)
      el.style.setProperty('--pc', clamp(centre, -1.2, 1.2).toFixed(4))
      el.style.setProperty('--p', clamp((vh - r.top) / (vh * 0.85 + r.height * 0.4)).toFixed(4))
    })
    drawOwners.forEach((owner, path) => {
      const p = clamp(Number(owner.style.getPropertyValue('--p') || 0) * 1.5)
      path.style.setProperty('--draw', p.toFixed(4))
    })
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(update) } }
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  update()

  // Count-up numbers, once, when they first appear
  const counters = Array.from(site.querySelectorAll<HTMLElement>('[data-count]'))
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const el = entry.target as HTMLElement
      counterObserver.unobserve(el)
      const to = Number(el.dataset.count || 0)
      if (!to) return
      const start = performance.now()
      const tick = (now: number) => {
        const t = clamp((now - start) / 1100)
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 3))))
        if (t < 1) requestAnimationFrame(tick)
      }
      el.textContent = '0'
      requestAnimationFrame(tick)
    })
  }, { threshold: 0.6 })
  counters.forEach(c => counterObserver.observe(c))

  // Headline words rise in when the heading enters
  const headObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('cg-split-in'); headObserver.unobserve(entry.target) }
    })
  }, { threshold: 0.35 })
  site.querySelectorAll<HTMLElement>('h2.cg-split').forEach(h => headObserver.observe(h))

  // Cursor-following light on cards
  const onPointer = (event: PointerEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(GLOW_TARGETS)
    if (!target) return
    const r = target.getBoundingClientRect()
    target.style.setProperty('--mx', `${event.clientX - r.left}px`)
    target.style.setProperty('--my', `${event.clientY - r.top}px`)
  }
  site.addEventListener('pointermove', onPointer as EventListener, { passive: true })
  site.querySelectorAll<HTMLElement>(GLOW_TARGETS).forEach(el => el.classList.add('cg-glow'))

  return () => {
    window.removeEventListener('scroll', request)
    window.removeEventListener('resize', request)
    site.removeEventListener('pointermove', onPointer as EventListener)
    counterObserver.disconnect()
    headObserver.disconnect()
    root.classList.remove('cg-motion')
  }
}
