// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import { useEffect, useRef } from 'react'

type Dot = { x: number; y: number; vx: number; vy: number; r: number }
type Pulse = { a: number; b: number; t: number; speed: number }

const ACCENT = '131, 151, 185'

/**
 * A quiet "signal field" behind the hero: points drift, nearby points link up, and now and then a
 * pulse travels along a link. The pointer lights up the links around it. It stops drawing when the
 * hero is off screen or the tab is hidden, and shows a single still frame for reduced motion.
 */
export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !host || !context) return
    const ctx = context
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let dpr = 1
    let nodes: Dot[] = []
    const pulses: Pulse[] = []
    const pointer = { x: -9999, y: -9999, active: false }
    let frame = 0
    let running = false
    let visible = true
    let last = 0
    let sincePulse = 0

    const build = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(78, Math.max(26, (width * height) / 15000)))
      nodes = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const speed = 5 + Math.random() * 11 // px per second
        return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 0.8 + Math.random() * 1.5 }
      })
      pulses.length = 0
    }

    const LINK = () => Math.min(170, Math.max(110, width / 9))

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, width, height)
      const link = LINK()
      for (const node of nodes) {
        node.x += node.vx * dt
        node.y += node.vy * dt
        if (node.x < -20) node.x = width + 20
        else if (node.x > width + 20) node.x = -20
        if (node.y < -20) node.y = height + 20
        else if (node.y > height + 20) node.y = -20
        if (pointer.active) {
          const dx = pointer.x - node.x
          const dy = pointer.y - node.y
          const d2 = dx * dx + dy * dy
          if (d2 < 190 * 190 && d2 > 1) {
            const pull = (1 - Math.sqrt(d2) / 190) * 14 * dt
            node.x += (dx / Math.sqrt(d2)) * pull
            node.y += (dy / Math.sqrt(d2)) * pull
          }
        }
      }
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d > link) continue
          let alpha = (1 - d / link) * 0.2
          if (pointer.active) {
            const mx = (a.x + b.x) / 2 - pointer.x
            const my = (a.y + b.y) / 2 - pointer.y
            const near = Math.max(0, 1 - Math.hypot(mx, my) / 220)
            alpha += near * 0.34
          }
          ctx.strokeStyle = `rgba(${ACCENT}, ${alpha.toFixed(3)})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
      for (const node of nodes) {
        let alpha = 0.42
        if (pointer.active) alpha += Math.max(0, 1 - Math.hypot(node.x - pointer.x, node.y - pointer.y) / 200) * 0.5
        ctx.fillStyle = `rgba(${ACCENT}, ${Math.min(alpha, 0.95).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()
      }
      // Pulses travel along links that currently exist
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p]
        pulse.t += dt * pulse.speed
        const a = nodes[pulse.a]
        const b = nodes[pulse.b]
        if (!a || !b || pulse.t >= 1 || Math.hypot(a.x - b.x, a.y - b.y) > link * 1.15) { pulses.splice(p, 1); continue }
        const x = a.x + (b.x - a.x) * pulse.t
        const y = a.y + (b.y - a.y) * pulse.t
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 12)
        glow.addColorStop(0, `rgba(${ACCENT}, 0.9)`)
        glow.addColorStop(1, `rgba(${ACCENT}, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.fill()
      }
      sincePulse += dt
      if (sincePulse > 0.9 && pulses.length < 4) {
        sincePulse = 0
        const a = Math.floor(Math.random() * nodes.length)
        let best = -1
        let bestD = Infinity
        for (let j = 0; j < nodes.length; j++) {
          if (j === a) continue
          const d = Math.hypot(nodes[a].x - nodes[j].x, nodes[a].y - nodes[j].y)
          if (d < link * 0.95 && d < bestD && Math.random() > 0.35) { best = j; bestD = d }
        }
        if (best >= 0) pulses.push({ a, b: best, t: 0, speed: 0.55 + Math.random() * 0.5 })
      }
    }

    const loop = (now: number) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
      last = now
      draw(dt)
      frame = requestAnimationFrame(loop)
    }
    const start = () => {
      if (running || reduce || !visible || document.hidden) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }
    const stop = () => { running = false; cancelAnimationFrame(frame) }

    build()
    draw(0)
    start()

    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible) start(); else stop()
    }, { threshold: 0 })
    observer.observe(host)
    const onVisibility = () => { if (document.hidden) stop(); else start() }
    document.addEventListener('visibilitychange', onVisibility)
    const resizer = new ResizeObserver(() => { build(); draw(0) })
    resizer.observe(host)

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active = true
      host.style.setProperty('--hx', `${pointer.x}px`)
      host.style.setProperty('--hy', `${pointer.y}px`)
    }
    const onLeave = () => { pointer.active = false }
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)

    return () => {
      stop()
      observer.disconnect()
      resizer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-field" aria-hidden="true" />
}
