// Copyright (c) 2026 CampusGuard. All rights reserved. Proprietary and confidential; see LICENSE.
import { createClient } from '@supabase/supabase-js'
import { NOTICE_VERSIONS, looksLikeBot, tooManyRequests, withinLimit } from './_guard.js'

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
  if (looksLikeBot(body)) return res.status(201).json({ ok: true })
  const name = textField(body.name, 120)
  const email = textField(body.email, 254)?.toLowerCase() ?? null
  const organisation = textField(body.organisation, 180)
  const role = textField(body.role, 100)
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim().slice(0, 2000) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const privacyConsent = body.privacy_consent === true
  const privacyNoticeVersion = typeof body.privacy_notice_version === 'string' ? body.privacy_notice_version.slice(0, 32) : ''

  if (!name || !email || !organisation || !role || !password || !privacyConsent || !NOTICE_VERSIONS.has(privacyNoticeVersion)) {
    return res.status(400).json({ error: 'Please complete all required fields and agree to the Privacy Policy.' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  // The server enforces what the form promises: 12 to 72 characters (72 is the most the hashing accepts).
  if (password.length < 12 || password.length > 72) {
    return res.status(400).json({ error: 'Please choose a password between 12 and 72 characters.' })
  }
  // Nobody can apply using the owner address, so the admin account can never be claimed through this form.
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (ownerEmail && email === ownerEmail) {
    return res.status(400).json({ error: 'We could not create an account with these details. If you already applied, try logging in.' })
  }
  const allowedRoles = new Set([
    'School / campus leadership', 'IT / security team', 'Facilities / operations',
    'Research / evaluation', 'Individual / personal use', 'Other',
  ])
  if (!allowedRoles.has(role)) {
    return res.status(400).json({ error: 'Please choose a valid role.' })
  }

  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    if (!await withinLimit(supabase, req, 'access-applications', 5, 3600)) return tooManyRequests(res)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, organisation },
    })
    if (authError || !authData.user) {
      console.error('Access application account creation failed:', authError?.message ?? 'No user returned')
      // Supabase rejects passwords that are too weak or that appear in known data breaches
      // (Authentication > Sign In / Providers > Email > leaked password protection).
      if ((authError as { code?: string } | null)?.code === 'weak_password') {
        const reasons = (authError as { reasons?: string[] }).reasons ?? []
        return res.status(400).json({
          field: 'password',
          error: reasons.includes('pwned')
            ? 'That password has appeared in a public data breach, so it cannot be used. Please choose a different one.'
            : 'That password is too easy to guess. Please choose a longer, less common one.',
        })
      }
      return res.status(400).json({
        error: 'We could not create an account with these details. If you already applied, try logging in.',
      })
    }

    const { error } = await supabase.from('access_applications').insert({
      auth_user_id: authData.user.id,
      name, email, organisation, role, purpose, status: 'pending', login_status: 'pending', payment_status: 'pending', privacy_notice_version: privacyNoticeVersion, privacy_consent_at: new Date().toISOString(),
    })
    if (error) {
      console.error('Access application insert failed:', JSON.stringify({ code: error.code, message: error.message, hint: error.hint }))
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(authData.user.id)
      if (cleanupError) console.error('Failed to clean up unlinked auth user:', cleanupError.message)
      return res.status(500).json({ error: 'We could not save your application right now. Please try again later.' })
    }
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('Access application endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'We could not submit your application right now. Please try again later.' })
  }
}
