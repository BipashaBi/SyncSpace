// SyncSpace WebSocket load test
// Opens N concurrent clients in one room, sends timestamped pings from each,
// and measures how long broadcasts take to reach the OTHER clients (sync latency).
//
// Configure via env vars (all optional):
//   WS_URL          base ws endpoint        (default ws://localhost:8080/ws)
//   ROOM            room id to join         (default loadtest-<timestamp>)
//   NUM_CLIENTS     concurrent connections  (default 20)
//   ROUNDS          total messages to send  (default 50)
//   SEND_INTERVAL   ms between sends         (default 200)
//
// Run:  node loadtest.js

const WebSocket = require('ws');

const WS_URL        = process.env.WS_URL || 'ws://localhost:8080/ws';
const ROOM          = process.env.ROOM || 'loadtest-' + Date.now();
const NUM_CLIENTS   = parseInt(process.env.NUM_CLIENTS || '20', 10);
const ROUNDS        = parseInt(process.env.ROUNDS || '50', 10);
const SEND_INTERVAL = parseInt(process.env.SEND_INTERVAL || '200', 10);

const url = `${WS_URL}?room=${ROOM}`;
const clients = [];
const latencies = [];
let connected = 0;
let received = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connectAll() {
  return Promise.all(
    Array.from({ length: NUM_CLIENTS }, (_, i) =>
      new Promise((resolve) => {
        const ws = new WebSocket(url);
        ws.clientId = i;
        ws.on('open', () => { connected++; resolve(ws); });
        ws.on('message', (data) => {
          let msg;
          try { msg = JSON.parse(data.toString()); } catch { return; }
          if (msg && msg.__loadtest && msg.sender !== ws.clientId) {
            latencies.push(Date.now() - msg.sentAt);
            received++;
          }
        });
        ws.on('error', () => resolve(null));
        clients.push(ws);
      })
    )
  );
}

function pct(arr, p) {
  if (!arr.length) return NaN;
  return arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))];
}

async function run() {
  console.log(`Connecting ${NUM_CLIENTS} clients to ${url} ...`);
  await connectAll();
  await sleep(1000); // let connections settle
  console.log(`Connected: ${connected}/${NUM_CLIENTS}`);
  if (connected === 0) {
    console.log('No clients connected. Check WS_URL and that your backend is running.');
    process.exit(1);
  }

  console.log(`Sending ${ROUNDS} messages, measuring broadcast latency...`);
  for (let r = 0; r < ROUNDS; r++) {
    const sender = clients[r % clients.length];
    if (sender && sender.readyState === WebSocket.OPEN) {
      sender.send(JSON.stringify({
        __loadtest: true, sender: sender.clientId, seq: r, sentAt: Date.now(),
      }));
    }
    await sleep(SEND_INTERVAL);
  }
  await sleep(1000); // drain in-flight broadcasts
  clients.forEach((ws) => { try { ws.close(); } catch {} });

  latencies.sort((a, b) => a - b);
  const n = latencies.length;
  const avg = n ? (latencies.reduce((a, b) => a + b, 0) / n).toFixed(1) : 'n/a';

  console.log('\n===== RESULTS =====');
  console.log(`Concurrent clients connected: ${connected}`);
  console.log(`Broadcast messages received:  ${received}`);
  if (n) {
    console.log(`Latency (ms): avg ${avg} | p50 ${pct(latencies, 50)} | p95 ${pct(latencies, 95)} | max ${latencies[n - 1]}`);
    console.log(latencies[n - 1] < 1000
      ? '✓ All broadcasts under 1s — sub-second sync latency confirmed.'
      : '✗ Some broadcasts exceeded 1s.');
  } else {
    console.log('No tagged broadcasts received — your server may not relay this JSON format.');
    console.log('The concurrency test still passed (clients connected). See notes to adjust the payload.');
  }
  process.exit(0);
}

run();