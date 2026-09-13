import assert from 'node:assert/strict';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { pathTo } from '../lib/game/trip-navigation.ts';
const base = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3002';
async function request(action, seat = {}, extra = {}) {
  const response = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(seat.token ? { Authorization: `Bearer ${seat.token}` } : {}),
    },
    body: JSON.stringify({ action, code: seat.code, ...extra }),
  });
  return { status: response.status, ...(await response.json()) };
}
const host = await request(
  'create',
  {},
  { mode: 'trip', name: 'Trip QA Host', character: 'merly', age: 0 },
);
assert.equal(host.status, 200, JSON.stringify(host));
const code = host.room.code;
host.code = code;
const guests = await Promise.all(
  ['kopi', 'pandan', 'otto'].map((character, i) =>
    request(
      'join',
      { code },
      { name: `Trip QA Guest ${i}`, character, age: 0 },
    ),
  ),
);
for (const g of guests) {
  assert.equal(g.status, 200);
  g.code = code;
}
assert.equal(
  (await request('join', { code }, { character: 'merly', age: 0 })).status,
  400,
);
assert.equal((await request('board', guests[0])).status, 400);
const started = await request('board', host);
assert.equal(started.room.phase, 'revealing');
assert.equal(new Set(started.room.trip.eras).size, 3);
await new Promise((r) => setTimeout(r, 3200));
const get = async (seat) => {
  const response = await fetch(`${base}/api/rooms?code=${code}`, {
    headers: { Authorization: `Bearer ${seat.token}` },
  });
  return { status: response.status, ...(await response.json()) };
};
const view = await get(host);
assert.equal(view.room.phase, 'exploring');
assert.equal((await fetch(`${base}/api/rooms?code=${code}`)).status, 401);
assert.equal((await request('claim', host, { round: 1, npc: 0 })).status, 400);
const layout = LAYOUTS[view.room.trip.eras[0]],
  path = pathTo(layout, layout.spawn, layout.npcs[0]);
// Walk the actual authored route at a human speed; no state or token injection.
for (let i = 0; i < path.length; i += 2) {
  await new Promise((r) => setTimeout(r, 200));
  const p = path[Math.min(i + 1, path.length - 1)];
  assert.equal((await request('walk', host, { round: 1, ...p })).status, 200);
}
const claimed = await request('claim', host, { round: 1, npc: 0 });
assert.equal(claimed.status, 200, JSON.stringify(claimed));
assert.deepEqual(claimed.room.trip.hands[host.playerId], [0]);
assert.equal((await request('claim', host, { round: 1, npc: 0 })).status, 400);
const other = await get(guests[0]);
assert.equal(other.room.trip.hands[host.playerId], undefined);
assert.equal(other.room.trip.counts[host.playerId], 1);
await Promise.all(
  [host, ...guests].map((s) => request('ready', s, { round: 1 })),
);
const board = await get(host);
assert.equal(board.room.phase, 'board');
const rolls = await Promise.all([
  request('roll', host, { round: 1, turn: 0 }),
  request('roll', host, { round: 1, turn: 0 }),
]);
assert.equal(rolls.filter((r) => r.status === 200).length, 1);
const reconnect = await get(host);
assert.equal(reconnect.room.move.playerId, host.playerId);
assert.deepEqual(reconnect.room.trip.hands[host.playerId], [0]);
console.log(
  'PASS: four-player rooms, host authority, auth, walking, NPC proximity, reward replay, private hands, shared readiness, concurrent roll protection, reconnect.',
);
