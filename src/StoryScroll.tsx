// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import { useEffect, useRef, useState } from 'react'

const SCENES = [
  { id: 'watch', time: '10:42:07', label: 'Watching', title: 'An ordinary corridor, watched quietly', body: 'CampusGuard reads the CCTV feeds a school already has. No new cameras, and nobody has to stare at a wall of screens.', meta: ['Works with existing CCTV', 'Runs on a school PC', 'Nothing leaves the building by default'], score: 6, tone: 'calm', detail: 'The desktop app receives local camera streams and keeps the video workflow on the school system.' },
  { id: 'notice', time: '10:42:31', label: 'Noticing', title: 'Movement changes, and the model notices', body: 'Spatial and motion signals are evaluated over time. A sequence model helps distinguish a moment that may need a closer look.', meta: ['Spatial and motion streams', 'Sequence model over time', 'Signals are not conclusions'], score: 64, tone: 'warn', detail: 'The model produces a signal for review. It does not identify people or decide that someone is responsible.' },
  { id: 'alert', time: '10:42:38', label: 'Alerting', title: 'A tiered alert reaches the right person', body: 'A notification helps staff find the relevant moment without watching every camera continuously.', meta: ['Priority-based notification', 'Relevant camera and timestamp', 'Staff decide what to do next'], score: 91, tone: 'hot', detail: 'The alert carries context to the authorised staff workflow. Avoid treating a model score as proof.' },
  { id: 'review', time: '10:58:02', label: 'Reviewing', title: 'People review the evidence and decide', body: 'Staff inspect the available timeline and footage, then record the outcome. The system flags a moment; people make the decision.', meta: ['Timeline and saved clip', 'Human review first', 'Documented follow-up'], score: 0, tone: 'done', detail: 'The incident record supports a consistent follow-up while keeping the final judgement with trained people.' },
]

const STEP_MS = 2600

export default function StoryScroll() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const scene = SCENES[active]
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // The walkthrough plays by itself once it is on screen (no scroll-jacking, no long pinned section).
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.45), { threshold: [0, 0.45, 0.7] })
    observer.observe(el.querySelector('.story-grid') || el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || paused || reduced || active >= SCENES.length - 1) return
    const timer = window.setTimeout(() => setActive(index => Math.min(SCENES.length - 1, index + 1)), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [inView, paused, reduced, active])

  const selectScene = (index: number) => { setPaused(true); setActive(index) }

  return (
    <section ref={sectionRef} className="story-section" id="story" data-theme="dark" aria-labelledby="story-title">
      <div className="story-pin">
        <div className="section-shell">
          <div className="story-head">
            <span className="eyebrow"><span className="eyebrow-line" /> One incident, start to finish</span>
            <h2 id="story-title">From a quiet corridor<br />to a reviewed report</h2>
            <p className="story-scroll-hint">Plays automatically. Pick any step below to jump to it.</p>
          </div>
          <div className="story-grid">
            <div className="story-story-copy" aria-live="polite">
              <span className="story-time" key={'t' + scene.id}>{String(active + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')} · {scene.time}</span>
              <div className="story-swap" key={scene.id}>
                <h3>{scene.title}</h3>
                <p>{scene.body}</p>
                <div className="story-step-meta">{scene.meta.map(item => <i key={item}>{item}</i>)}</div>
              </div>
            </div>
            <div className="story-stage">
              <div className={`story-screen tone-${scene.tone}`} aria-live="polite" aria-label={`Illustrative walkthrough stage: ${scene.label}`}>
                <div className="story-bar"><span><i className="story-dot" /> Camera 04 · Corridor B</span><span>{scene.time}</span></div>
                <div className="story-floor">
                  <span className="story-figure f1" /><span className="story-figure f2" /><span className="story-figure f3" />
                  <span className="story-box" /><span className="story-scan-beam" />
                  <span className="story-event-chip">{scene.id === 'review' ? 'HUMAN REVIEW' : scene.label.toUpperCase()}</span>
                </div>
                <div className="story-foot"><span>{scene.label}</span><div className="story-meter"><b style={{ width: `${scene.score}%` }} /></div><strong>{scene.id === 'review' ? 'Reviewed' : `${scene.score}%`}</strong></div>
              </div>
              <p className="story-caption">Illustration of the workflow, not live footage.</p>
              <div className="story-progress" aria-label={`Stage ${active + 1} of ${SCENES.length}`}>{SCENES.map((item, index) => <button key={item.id} type="button" onClick={() => selectScene(index)} className={(index <= active ? 'is-complete' : '') + (index === active ? ' is-current' : '')} aria-label={`Go to ${item.label}`} aria-current={index === active ? 'step' : undefined}><span>{item.label}</span></button>)}</div>
              <p className="story-detail">{scene.detail}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
