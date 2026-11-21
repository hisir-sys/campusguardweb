import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverHealth, totals } from '../src/status.ts';
import { timeAgo } from '../src/theme.ts';

const NOW = Date.parse('2026-11-19T10:00:00Z');
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60000).toISOString();
const server = (over: object) => ({ server_id: 'a', server_name: 'A', app_version: null, cameras_total: 10,
  cameras_ai_enabled: 10, cameras_online: 10, open_incidents: 0, last_seen: at(1), ...over });

test('server health', () => {
  assert.equal(serverHealth(server({}), NOW), 'online');
  assert.equal(serverHealth(server({ cameras_online: 7 }), NOW), 'degraded');
  assert.equal(serverHealth(server({ last_seen: at(30) }), NOW), 'offline');
  assert.equal(serverHealth(server({ cameras_online: null }), NOW), 'online');
});

test('totals skip silent servers', () => {
  const t = totals([server({}), server({ server_id: 'b', last_seen: at(60), open_incidents: 2 })], NOW);
  assert.deepEqual([t.cameras, t.online, t.open, t.offlineServers], [20, 10, 2, 1]);
});

test('time ago', () => {
  assert.equal(timeAgo(at(0), NOW), 'just now');
  assert.equal(timeAgo(at(5), NOW), '5 min ago');
  assert.equal(timeAgo(at(180), NOW), '3 h ago');
  assert.equal(timeAgo(at(3000), NOW), '2 d ago');
});

import { freshIncidents, notificationFor } from '../src/alerts.ts';

const inc = (id: string, minutesAgo: number, over: object = {}) => ({ server_id: 'a', incident_id: id, camera_name: 'Gate',
  happened_at: at(minutesAgo), event: 'Fight', confidence: 0.9, severity: 'HIGH', status: 'NEW', has_footage: false, ...over }) as any;

test('first load never replays old alerts, later loads only report new fresh ones', () => {
  const seen = new Set<string>();
  assert.deepEqual(freshIncidents(seen, [inc('1', 2)], NOW), []);
  assert.equal(freshIncidents(seen, [inc('1', 2)], NOW).length, 0);
  const got = freshIncidents(seen, [inc('1', 2), inc('2', 1), inc('3', 60), inc('4', 1, { status: 'REVIEWED' })], NOW);
  assert.deepEqual(got.map((i) => i.incident_id), ['2']);
});

test('notification text', () => {
  assert.equal(notificationFor([]), null);
  assert.deepEqual(notificationFor([inc('1', 1)]), { title: 'Fight detected', body: 'Gate · 90% sure' });
  assert.equal(notificationFor([inc('1', 1, { severity: 'MEDIUM' }), inc('2', 1, { severity: 'CRITICAL', camera_name: 'Hall' })])?.body, 'Most serious: Hall · 90% sure');
});
