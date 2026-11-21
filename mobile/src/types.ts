export type Server = {
  server_id: string;
  server_name: string;
  app_version: string | null;
  cameras_total: number;
  cameras_ai_enabled: number;
  cameras_online: number | null;
  open_incidents: number;
  last_seen: string;
};

export type Incident = {
  server_id: string;
  incident_id: string;
  camera_name: string;
  happened_at: string;
  event: string;
  confidence: number; // 0..1
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  has_footage: boolean;
};

export type SyncData = { servers: Server[]; incidents: Incident[] };
