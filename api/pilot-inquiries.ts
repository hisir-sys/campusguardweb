import { createClient } from '@supabase/supabase-js'

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 && text.length <= max ? text : null
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Inquiry submission is not configured right now.' })

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const name = clean(body.name, 120)
  const email = clean(body.email, 254)
  const organisation = clean(body.organisation, 180)
  const topic = clean(body.topic, 80)
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 3000) : ''
  const allowedTopics = new Set(['Request pilot details', 'Plan a deployment', 'Discuss multi-site needs'])
  if (!name || !email || !organisation || !topic || !allowedTopics.has(topic) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please check your name, email, organisation and inquiry type.' })
  }
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { error } = await supabase.from('pilot_inquiries').insert({ name, email, organisation, topic, message })
    if (error) {
      console.error('Pilot inquiry insert failed:', JSON.stringify({ code: error.code, message: error.message }))
      return res.status(500).json({ error: 'We could not save your inquiry. Please try again later.' })
    }
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Pilot inquiry endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'We could not submit your inquiry right now.' })
  }
}
