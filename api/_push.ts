/** Sends phone notifications through Expo's push service. Never throws: a failed push must not fail a sync. */

const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

export type NewIncident = { camera_name: string; severity: string; confidence: number; event: string }

const WORDS: Record<string, string> = { LOW: 'Low alert', MEDIUM: 'Possible fight', HIGH: 'Fight detected', CRITICAL: 'Danger: fight detected' }

export function describe(incident: NewIncident): { title: string; body: string } {
  const pct = Math.round(incident.confidence * 100)
  return { title: WORDS[incident.severity] ?? 'CampusGuard alert', body: `${incident.camera_name} · ${pct}% sure` }
}

/** Several new incidents in one sync become one notification, so a busy moment does not flood the phone. */
export function buildMessages(tokens: string[], incidents: NewIncident[]) {
  if (!tokens.length || !incidents.length) return []
  const rank = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const worst = [...incidents].sort((a, b) => rank.indexOf(b.severity) - rank.indexOf(a.severity))[0]
  const { title, body } = incidents.length === 1
    ? describe(worst)
    : { title: `${incidents.length} new alerts`, body: `Most serious: ${worst.camera_name} · ${Math.round(worst.confidence * 100)}% sure` }
  return tokens.map(to => ({ to, title, body, sound: 'default', priority: 'high', channelId: 'alerts', data: { type: 'incident' } }))
}

/** Returns the tokens Expo says no longer exist, so the caller can delete them. */
export async function sendPush(messages: ReturnType<typeof buildMessages>): Promise<string[]> {
  if (!messages.length) return []
  try {
    const response = await fetch(EXPO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) { console.error('Push send failed:', response.status); return [] }
    const result = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> }
    const dead: string[] = []
    result.data?.forEach((ticket, index) => {
      if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(messages[index].to)
    })
    return dead
  } catch (error) {
    console.error('Push send failed:', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}
