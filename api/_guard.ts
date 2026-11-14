import { createHash } from 'node:crypto'

/**
 * Shared abuse protection for the public API routes.
 * Files starting with an underscore are not exposed as routes by Vercel.
 */

function header(req: any, name: string): string {
  const value = req?.headers?.[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Best-effort caller address. Vercel overwrites these headers, so a visitor cannot forge them. */
export function callerAddress(req: any): string {
  return (
    header(req, 'x-vercel-forwarded-for') ||
    header(req, 'x-real-ip') ||
    header(req, 'x-forwarded-for').split(',')[0].trim() ||
    req?.socket?.remoteAddress ||
    'unknown'
  )
}

/**
 * Returns false once the caller has used `limit` requests inside the window.
 * Counters live in Postgres (public.rate_limit_hit), so they hold across serverless instances.
 * Only a salted hash of the address is stored. If the counter cannot be reached the request is
 * allowed and the problem is logged, so a database hiccup never locks real visitors out.
 */
export async function withinLimit(db: any, req: any, route: string, limit: number, windowSeconds: number, subject?: string): Promise<boolean> {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const who = subject || callerAddress(req)
  const bucket = `${route}:${createHash('sha256').update(`${salt}|${who}`).digest('hex').slice(0, 32)}`
  try {
    const { data, error } = await db.rpc('rate_limit_hit', { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds })
    if (error) { console.error('Rate limit check failed:', error.message); return true }
    return data !== false
  } catch (error) {
    console.error('Rate limit check failed:', error instanceof Error ? error.message : 'Unknown error')
    return true
  }
}

export function tooManyRequests(res: any, retryAfterSeconds = 3600) {
  res.setHeader('Retry-After', String(retryAfterSeconds))
  return res.status(429).json({ error: 'Too many requests from this connection. Please wait a while and try again.' })
}

/** Hidden "website" field that people never see. Bots that fill every input reveal themselves. */
export function looksLikeBot(body: any): boolean {
  return typeof body?.website === 'string' && body.website.trim().length > 0
}
