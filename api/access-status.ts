import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Please sign in first.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !secretKey) {
    return res.status(503).json({ error: 'Access checks are temporarily unavailable.' })
  }

  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    }

    const { data: application, error } = await supabase
      .from('access_applications')
      .select('status')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle()

    if (error) {
      console.error('Access status lookup failed:', error.message)
      return res.status(503).json({ error: 'We could not verify your application status.' })
    }
    if (!application) return res.status(403).json({ status: 'missing', error: 'No access application is linked to this account.' })
    return res.status(200).json({ status: application.status })
  } catch (error) {
    console.error('Access status check failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'We could not verify your application status.' })
  }
}
