import { createClient } from '@supabase/supabase-js'

async function verifiedOwner(req: any, res: any, db: ReturnType<typeof createClient>) {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!ownerEmail) { res.status(503).json({ error: 'Admin access is not configured.' }); return false }
  const token = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : ''
  if (!token) { res.status(401).json({ error: 'Owner sign-in required.' }); return false }
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) { res.status(401).json({ error: 'Invalid owner session.' }); return false }
  if ((data.user.email || '').trim().toLowerCase() !== ownerEmail || !data.user.email_confirmed_at) { res.status(403).json({ error: 'Not authorised as owner.' }); return false }
  return true
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed.' }) }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(503).json({ error: 'Application storage is not configured.' })
  try {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    if (!await verifiedOwner(req, res, db)) return
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const id = typeof body.id === 'string' ? body.id.trim() : ''
      const decision = body.decision
      const status = body.status
      if (!/^[0-9a-f-]{36}$/i.test(id) || !['login', 'payment'].includes(decision) || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'A valid application, approval type and decision are required.' })
      }
      const { data: current, error: readError } = await db.from('access_applications')
        .select('login_status,payment_status').eq('id', id).maybeSingle()
      if (readError) return res.status(500).json({ error: 'Could not load this application.' })
      if (!current) return res.status(404).json({ error: 'Application not found.' })
      const loginStatus = decision === 'login' ? status : (current.login_status || 'pending')
      const paymentStatus = decision === 'payment' ? status : (current.payment_status || 'pending')
      const combined = loginStatus === 'rejected' || paymentStatus === 'rejected' ? 'rejected' : loginStatus === 'approved' && paymentStatus === 'approved' ? 'approved' : 'pending'
      const now = new Date().toISOString()
      const patch: Record<string, unknown> = { login_status: loginStatus, payment_status: paymentStatus, status: combined }
      if (decision === 'login') { patch.login_reviewed_at = now; patch.login_reviewed_by = process.env.ADMIN_EMAIL }
      else { patch.payment_reviewed_at = now; patch.payment_reviewed_by = process.env.ADMIN_EMAIL }
      const { error } = await db.from('access_applications').update(patch).eq('id', id)
      if (error) { console.error('Application decision failed:', error.message); return res.status(500).json({ error: 'Could not update this approval. Apply the latest Supabase migration and retry.' }) }
    }
    const { data: apps, error } = await db.from('access_applications')
      .select('id,name,email,organisation,role,purpose,status,login_status,payment_status,created_at')
      .order('created_at', { ascending: false }).limit(500)
    if (error) { console.error('Admin application list failed:', error.message); return res.status(500).json({ error: 'Could not load applications. Apply the latest Supabase migration first.' }) }
    const applications = (apps ?? []).map((row: any) => ({
      ...row,
      login_status: row.login_status || (row.status === 'approved' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending'),
      payment_status: row.payment_status || 'pending',
    }))
    const { data: inquiries, error: inquiryError } = await db.from('pilot_inquiries')
      .select('id,name,email,organisation,topic,message,created_at').order('created_at', { ascending: false }).limit(500)
    if (inquiryError) return res.status(500).json({ error: 'Could not load pilot inquiries.' })
    return res.status(200).json({
      applications, inquiries: inquiries ?? [],
      inquiryStats: { total: (inquiries ?? []).length, pilots: (inquiries ?? []).filter((x: any) => x.topic === 'Request pilot details').length, deployments: (inquiries ?? []).filter((x: any) => x.topic === 'Plan a deployment').length, multiSite: (inquiries ?? []).filter((x: any) => x.topic === 'Discuss multi-site needs').length },
      stats: {
        pending: applications.filter((x: any) => x.login_status === 'pending' || x.payment_status === 'pending').length,
        approved: applications.filter((x: any) => x.login_status === 'approved' && x.payment_status === 'approved').length,
        rejected: applications.filter((x: any) => x.login_status === 'rejected' || x.payment_status === 'rejected').length,
      },
    })
  } catch (error) {
    console.error('Admin applications endpoint failed:', error instanceof Error ? error.message : 'Unknown error')
    return res.status(500).json({ error: 'Admin request failed. Please try again.' })
  }
}