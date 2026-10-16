import { createClient } from '@supabase/supabase-js'

function textField(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return null
  return trimmed
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !secretKey) {
    return res.status(503).json({ error: 'Application submissions are temporarily unavailable. Please try again later.' })
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const name = textField(body.name, 120)
  const email = textField(body.email, 254)
  const organisation = textField(body.organisation, 180)
  const role = textField(body.role, 100)
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim().slice(0, 2000) : ''

  if (!name || !email || !organisation || !role) {
    return res.status(400).json({ error: 'Please complete all required fields.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  const allowedRoles = new Set([
    'School / campus leadership', 'IT / security team', 'Facilities / operations',
    'Research / evaluation', 'Other',
  ])
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: 'Please choose a valid role.' })
  }

  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { error } = await supabase.from('access_applications').insert({
      name, email, organisation, role, purpose, status: 'pending',
    })
    if (error) {
      console.error('Access application insert failed:', JSON.stringify({ code: error.code, message: error.message, hint: error.hint }))
      return res.status(500).json({ error: 'We could not save your application right now. Please try again later.' })
    }
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Access application endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'We could not submit your application right now. Please try again later.' })
  }
}
