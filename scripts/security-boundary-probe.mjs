// Authorized, bounded negative tests. No stored credentials, file uploads or destructive calls.
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const origin = process.argv[2];
if (!['https://demo.kingslanguageacademy.pl', 'http://127.0.0.1:3220'].includes(origin)) {
  throw new Error('Provide an explicitly supported owned origin.');
}
const denied = [400, 401, 403, 404, 405, 307, 308, 429];
const id = '11111111-1111-4111-8111-111111111111';
const cases = [
  ['owner without session', '/panel/bog'],
  ['settings without session', '/panel/bog/ustawienia'],
  ['private editor without session', '/api/site-content?scope=editor'],
  ['export without session', `/panel/bog/eksport/${id}`],
  ['material without session', `/panel/nauka/plik/${id}`],
  ['attachment without session', `/panel/wiadomosci/zalacznik/${id}`],
  ['contract without session', `/panel/umowy/${id}/plik`],
  ['director CSV without session', '/panel/szkola/importy/eksport'],
  ['finished bootstrap', '/pierwsze-uruchomienie'],
  ['admin API without session', '/api/auth/admin/list-users'],
  ['fake session cookie', '/panel/bog', { headers: { Cookie: 'kla.session_token=invalid.unsigned' } }],
  ['middleware header forgery', '/panel/bog', { headers: { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware', 'x-user-role': 'SYSTEM_OWNER' } }],
  ['cross-site editor write', '/api/site-content', { method: 'PUT', headers: { Origin: 'https://invalid.example', 'Content-Type': 'application/json' }, body: '{}' }],
  ['same-origin editor write without session', '/api/site-content', { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }],
  ['cross-site import', '/panel/bog/import', { method: 'POST', headers: { Origin: 'https://invalid.example', 'Content-Type': 'application/json' }, body: '{}' }],
  ['signup role injection', '/api/auth/sign-up/email', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Authorized security probe', email: `probe-${randomUUID()}@invalid.example`, password: randomUUID(), role: 'SYSTEM_OWNER', emailVerified: true }) }],
  ['dot-env exposure', '/.env'],
  ['git exposure', '/.git/config'],
  ['encoded traversal', '/%2e%2e%2f%2e%2e%2fetc%2fpasswd'],
];
const results = [];
for (const [name, path, options = {}] of cases) {
  const start = performance.now();
  const response = await fetch(origin + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  const location = response.headers.get('location');
  const loginRedirect = ![307, 308].includes(response.status) || Boolean(location && new URL(location, origin).pathname.startsWith('/panel/logowanie'));
  const passed = denied.includes(response.status) && loginRedirect && !/root:x:0:0:/.test(text);
  results.push({ name, status: response.status, passed, milliseconds: Math.round(performance.now() - start) });
  console.log(`${passed ? 'PASS' : 'REVIEW'} ${name}: ${response.status}`);
  if (response.status >= 500 || !passed) break; // Stop early on unexpected access or server failure.
  await new Promise(resolve => setTimeout(resolve, 300));
}
const health = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(10000) });
await mkdir('outputs/qa/security-20260905', { recursive: true });
await writeFile('outputs/qa/security-20260905/boundaries.json', JSON.stringify({ timestamp: new Date().toISOString(), origin, scope: 'bounded anonymous negative tests; not a full pentest', results, health: health.status }, null, 2));
if (results.length !== cases.length || results.some(row => !row.passed) || health.status !== 200) process.exitCode = 1;
