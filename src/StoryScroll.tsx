import { useEffect, useRef, useState } from 'react'

const SCENES = [
  { id: 'watch', time: '10:42:07', label: 'Watching', title: 'An ordinary corridor, watched quietly', body: 'CampusGuard reads the CCTV feeds a school already has. No new cameras, and nobody has to stare at a wall of screens.', meta: ['Works with existing CCTV', 'Runs on a school PC', 'Nothing leaves the building by default'], score: 6, tone: 'calm' },
  { id: 'notice', time: '10:42:31', label: 'Noticing', title: 'Movement changes, and the model notices', body: 'Two streams look at each moment: body shapes in each frame, and how fast people move between frames. A sequence model joins them over time.', meta: ['Spatial and motion streams', 'Sequence model over time', 'Scores every few seconds'], score: 64, tone: 'warn' },
  { id: 'alert', time: '10:42:38', label: 'Alerting', title: 'A tiered alert reaches the right person', body: 'High confidence sends an urgent message with a short clip. Medium confidence sends a quieter heads-up, so horseplay and sport do not flood staff.', meta: ['80%+ urgent alert', '60–79% review notice', 'Clip and timeline attached'], score: 91, tone: 'hot' },
  { id: 'review', time: '10:58:02', label: 'Reviewing', title: 'Afterwards, people decide what happened', body: 'Every incident is saved with its timeline and clip. Staff review the evidence and decide. The system flags, it does not accuse.', meta: ['Timeline and saved clip', 'Human review first', 'Fair, evidence-based follow-up'], score: 0, tone: 'done' },
]

export default function StoryScroll() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
      })
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 })
    refs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const scene = SCENES[active]
  return (
    <section className="story-section" id="story" data-theme="dark" aria-labelledby="story-title">
      <div className="section-shell">
        <div className="story-head">
          <span className="eyebrow"><span className="eyebrow-line" /> One incident, start to finish</span>
          <h2 id="story-title">From a quiet corridor to a reviewed report</h2>
        </div>
        <div className="story-grid">
          <div className="story-steps">
            {SCENES.map((s, i) => (
              <article key={s.id} data-i={i} ref={el => { refs.current[i] = el }} className={`story-step${i === active ? ' is-active' : ''}`}>
                <span className="story-time">{s.time}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul>{s.meta.map(m => <li key={m}>{m}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="story-stage" aria-hidden="true">
            <div className={`story-screen tone-${scene.tone}`}>
              <div className="story-bar"><span><i className="story-dot" /> Camera 04 · Corridor B</span><span>{scene.time}</span></div>
              <div className="story-floor">
                <span className="story-figure f1" /><span className="story-figure f2" /><span className="story-figure f3" />
                <span className="story-box" />
              </div>
              <div className="story-foot">
                <span>{scene.label}</span>
                <div className="story-meter"><b style={{ width: `${scene.score}%` }} /></div>
                <strong>{scene.id === 'review' ? 'Reviewed' : `${scene.score}%`}</strong>
              </div>
            </div>
            <p className="story-caption">Illustration of the workflow, not live footage.</p>
            <div className="story-dots">{SCENES.map((s, i) => <span key={s.id} className={i === active ? 'on' : ''} />)}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
