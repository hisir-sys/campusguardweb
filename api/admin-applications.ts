import { createClient } from '@supabase/supabase-js'

async function verifiedOwner(req: any, res: any, supabase: ReturnType<typeof createClient>) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!configuredEmail) {
    res.status(503).json({ error: 'Admin access is not configured. Set ADMIN_EMAIL in the deployment environment.' })
    return false
  }
  const authorization = typeof req.headers.authorization === 'string' ? req.headers.authorization : ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Sign in with the owner account to continue.' })
    return false
  }
  const { data, error } = await supabase.auth.getUser(token)
  const user = data?.user
  if (error || !user) {
    res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    return false
  }
  if ((user.email ?? '').trim().toLowerCase() !== configuredEmail || !user.email_confirmed_at) {
    res.status(403).json({ error: 'This verified account is not authorised as the CampusGuard owner.' })
    return false
  }
  return true
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }


  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'Application storage is not configured.' })

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    if (!await verifiedOwner(req, res, supabase)) return

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
    const { data: inquiries, error: inquiryError } = await supabase
      .from('pilot_inquiries')
      .select('id,name,email,organisation,topic,message,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (inquiryError) {
      console.error('Admin inquiry list failed:', inquiryError.message)
      return res.status(500).json({ error: 'Could not load pilot inquiries. Please check the pilot_inquiries table.' })
    }
    return res.status(200).json({
      applications: rows,
      inquiries: inquiries ?? [],
      inquiryStats: {
        total: (inquiries ?? []).length,
        pilots: (inquiries ?? []).filter((row: any) => row.topic === 'Request pilot details').length,
        deployments: (inquiries ?? []).filter((row: any) => row.topic === 'Plan a deployment').length,
        multiSite: (inquiries ?? []).filter((row: any) => row.topic === 'Discuss multi-site needs').length,
      },
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
