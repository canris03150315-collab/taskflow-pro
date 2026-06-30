// WebSocket realtime test
import WebSocket from 'ws';

const BASE = 'https://central.wuk-on.com';
const WS_URL = 'wss://central.wuk-on.com/ws';

async function api(token, method, path, body) {
  const headers = { 'Authorization': 'Bearer ' + token };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})), ok: res.ok };
}

(async () => {
  console.log('=== WebSocket Realtime Test ===\n');

  const login = await api(null, 'POST', '/api/auth/login', { username: 'canris', password: 'kico123123' });
  const token = login.data.token;
  const userId = login.data.user.id;
  console.log('Logged in.');

  const events = [];
  console.log('\n1. Opening WebSocket connection...');
  const ws = new WebSocket(WS_URL, { headers: { 'Authorization': 'Bearer ' + token }, rejectUnauthorized: false });
  await new Promise((resolve, reject) => {
    ws.on('open', () => { console.log('  WS opened'); resolve(); });
    ws.on('error', (e) => { console.log('  WS error:', e.message); reject(e); });
    setTimeout(() => reject(new Error('WS open timeout')), 8000);
  });

  // Auth message (required by server before broadcasts)
  ws.send(JSON.stringify({ type: 'AUTH', payload: { userId } }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      events.push(msg);
      console.log(`  📡 Event: ${msg.type || msg.event || 'unknown'} ${msg.id ? '(id:' + msg.id.slice(0,15) + ')' : ''}`);
    } catch (e) {
      events.push({ raw: data.toString().slice(0, 80) });
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('\n2. Creating a work log (should fire work_log_created)...');
  let freeDate = null;
  const list = await api(token, 'GET', '/api/work-logs');
  const existing = (list.data.work_logs || list.data.logs || []).filter(l => l.user_id === userId).map(l => l.date);
  for (let d = 100; d < 150; d++) {
    const date = new Date(Date.now() - d * 86400000).toISOString().slice(0,10);
    if (!existing.includes(date)) { freeDate = date; break; }
  }

  const startCount = events.length;
  const create = await api(token, 'POST', '/api/work-logs', {
    date: freeDate, todayTasks: 'WS test', tomorrowTasks: 'WS test', notes: ''
  });
  const logId = create.data.log?.id || create.data.id;
  console.log(`  Created log ${logId}, date=${freeDate}`);

  await new Promise(r => setTimeout(r, 2000));
  const newEvents = events.slice(startCount);
  console.log(`\n3. Events after create: ${newEvents.length}`);
  const createEvent = newEvents.find(e => /work_log_created|created/i.test(JSON.stringify(e)));
  if (createEvent) console.log('  ✅ work_log_created delivered via WS');
  else console.log('  🟡 No matching event detected');

  console.log('\n4. Cleanup — deleting test log');
  const delStartCount = events.length;
  await api(token, 'DELETE', '/api/work-logs/' + logId);
  await new Promise(r => setTimeout(r, 1500));
  const delEvents = events.slice(delStartCount);
  console.log(`  Events on delete: ${delEvents.length}`);
  const deleteEvent = delEvents.find(e => /work_log_deleted|deleted/i.test(JSON.stringify(e)));
  if (deleteEvent) console.log('  ✅ work_log_deleted delivered via WS');
  else console.log('  🟡 No delete event detected');

  console.log(`\n5. Total events: ${events.length}`);
  const types = {};
  for (const e of events) {
    const t = e.type || e.event || 'unknown';
    types[t] = (types[t]||0)+1;
  }
  console.log('  Event types:', types);

  ws.close();
  console.log('\n=== Test complete ===');
  process.exit(0);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
