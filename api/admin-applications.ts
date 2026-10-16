import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function validAdminPassword(candidate: unknown): boolean {
  const configured = process.env.ADMIN_PANEL_PASSWORD
  if (!configured || typeof candidate !== 'string' || !candidate) return false
  const a = Buffer.from(configured, 'utf8')
  const b = Buffer.from(candidate, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'X-Admin-Password')

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!process.env.ADMIN_PANEL_PASSWORD) {
    return res.status(503).json({ error: 'Admin panel is not configured. Set ADMIN_PANEL_PASSWORD in deployment environment variables.' })
  }
  if (!validAdminPassword(req.headers['x-admin-password'])) {
    return res.status(401).json({ error: 'Incorrect admin password.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Application storage is not configured.' })

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      const status = body.status
      if (!/^[0-9a-f-]{36}$/i.test(id) || (status !== 'approved' && status !== 'rejected')) {
        return res.status(400).json({ error: 'A valid application and decision are required.' })
      }
      const { data, error } = await supabase
        .from('access_applications')
        .update({ status })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id,status')
        .maybeSingle()
      if (error) {
        console.error('Admin application update failed:', error.message)
        return res.status(500).json({ error: 'Could not update this application. Please try again.' })
      }
      if (!data) return res.status(409).json({ error: 'This application was already reviewed or no longer exists. Refresh the list.' })
    }

    const { data: applications, error } = await supabase
      .from('access_applications')
      .select('id,name,email,organisation,role,purpose,status,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      console.error('Admin application list failed:', error.message)
      return res.status(500).json({ error: 'Could not load applications. Please check the access_applications table.' })
    }
    const rows = applications ?? []
    return res.status(200).json({
      applications: rows,
      stats: {
        pending: rows.filter((row: any) => row.status === 'pending').length,
        approved: rows.filter((row: any) => row.status === 'approved').length,
        rejected: rows.filter((row: any) => row.status === 'rejected').length,
      },
    })
  } catch (error) {
    console.error('Admin applications endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Admin request failed. Please try again.' })
  }
}
