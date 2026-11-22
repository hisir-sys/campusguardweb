import { createClient } from '@supabase/supabase-js'
import { tooManyRequests, withinLimit } from './_guard.js'

// Phone numbers: optional +, then 8 to 15 digits (spaces, dashes and brackets are dropped).
function cleanPhone(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[\s\-().]/g, '')
  return /^\+?\d{8,15}$/.test(digits) ? digits : undefined
}
const cleanText = (value: unknown, max: number): string | null | undefined => {
  if (typeof value !== 'string') return undefined
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? undefined : (text || null)
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'PUT') { res.setHeader('Allow', 'GET, PUT'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Accounts are not configured.' })
  const bearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!bearer) return res.status(401).json({ error: 'Sign in first.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: auth, error: authError } = await db.auth.getUser(bearer)
    if (authError || !auth.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const userId = auth.user.id

    if (req.method === 'PUT') {
      if (!await withinLimit(db, req, 'profile-save', 40, 3600, userId)) return tooManyRequests(res, 600)
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return null } })() : req.body
      if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Send the details as JSON.' })
      const fullName = cleanText(body.full_name, 80)
      const school = cleanText(body.school_name, 120)
      if (fullName === undefined) return res.status(400).json({ error: 'Name must be 80 characters or fewer.' })
      if (school === undefined) return res.status(400).json({ error: 'School name must be 120 characters or fewer.' })
      const phone = body.phone === '' || body.phone === null ? null : cleanPhone(body.phone)
      if (phone === undefined) return res.status(400).json({ error: 'Enter a phone number with 8 to 15 digits, for example +91 70032 76998.' })
      const rawAlerts = Array.isArray(body.alert_phones) ? body.alert_phones : []
      if (rawAlerts.length > 5) return res.status(400).json({ error: 'You can add up to 5 alert numbers.' })
      const alerts: string[] = []
      for (const item of rawAlerts) {
        if (typeof item === 'string' && !item.trim()) continue
        const clean = cleanPhone(item)
        if (!clean) return res.status(400).json({ error: 'One of the alert numbers is not valid. Use 8 to 15 digits.' })
        if (!alerts.includes(clean)) alerts.push(clean)
      }
      const { error } = await db.from('account_profiles').upsert({ user_id: userId, full_name: fullName, school_name: school, phone, alert_phones: alerts, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) { console.error('Profile save failed:', error.message); return res.status(500).json({ error: 'Could not save your details.' }) }
    }

    const [profile, application] = await Promise.all([
      db.from('account_profiles').select('full_name,school_name,phone,alert_phones,updated_at').eq('user_id', userId).maybeSingle(),
      db.from('access_applications').select('name,organisation').eq('auth_user_id', userId).maybeSingle(),
    ])
    if (profile.error) return res.status(500).json({ error: 'Could not load your details.' })
    return res.status(200).json({
      email: auth.user.email ?? '',
      // Until someone edits, the name and school they applied with are shown.
      full_name: profile.data?.full_name ?? application.data?.name ?? '',
      school_name: profile.data?.school_name ?? application.data?.organisation ?? '',
      phone: profile.data?.phone ?? '',
      alert_phones: profile.data?.alert_phones ?? [],
      updated_at: profile.data?.updated_at ?? null,
    })
  } catch (error) {
    console.error('Profile failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
