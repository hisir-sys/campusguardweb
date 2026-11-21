import type { SyncData } from './types';

/** Made-up data for trying the app without a school PC. Always labelled "Demo" in the UI. */
export function demoData(now = Date.now()): SyncData {
  const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();
  return {
    servers: [
      { server_id: 'demo-a', server_name: 'Demo: Main Block', app_version: 'demo', cameras_total: 48, cameras_ai_enabled: 46, cameras_online: 44, open_incidents: 1, last_seen: ago(1) },
      { server_id: 'demo-b', server_name: 'Demo: Junior Wing', app_version: 'demo', cameras_total: 12, cameras_ai_enabled: 12, cameras_online: 12, open_incidents: 0, last_seen: ago(2) },
    ],
    incidents: [
      { server_id: 'demo-a', incident_id: 'd1', camera_name: 'Corridor 2F', happened_at: ago(4), event: 'Fight', confidence: 0.91, severity: 'HIGH', status: 'NEW', has_footage: true },
      { server_id: 'demo-a', incident_id: 'd2', camera_name: 'Playground', happened_at: ago(130), event: 'Possible fight', confidence: 0.66, severity: 'MEDIUM', status: 'REVIEWED', has_footage: false },
      { server_id: 'demo-b', incident_id: 'd3', camera_name: 'Canteen', happened_at: ago(1500), event: 'Fight', confidence: 0.84, severity: 'HIGH', status: 'REVIEWED', has_footage: true },
    ],
  };
}
