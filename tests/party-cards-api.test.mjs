import assert from 'node:assert/strict';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { pathTo } from '../lib/game/trip-navigation.ts';
const base = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3000';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let code = '';
async function request(action, seat = {}, extra = {}) {
  const response = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(seat.token ? { Authorization: `Bearer ${seat.token}` } : {}),
    },
    body: JSON.stringify({ action, code, ...extra }),
  });
  return { status: response.status, ...(await response.json()) };
}
async function get(seat) {
  const response = await fetch(`${base}/api/rooms?code=${code}`, {
    headers: { Authorization: `Bearer ${seat.token}` },
  });
  assert.equal(response.status, 200);
  return await response.json();
}
const display = await request('create-display');
assert.equal(display.status, 200);
code = display.room.code;
const host = await request(
    'join',
    {},
    { name: 'Card walker', character: 'merly' },
  ),
  guest = await request(
    'join',
    {},
    { name: 'Card privacy', character: 'kopi' },
  );
assert.equal(host.status, 200);
assert.equal(guest.status, 200);
await request('board', host);
await request('roll', host, { round: 1 });
await sleep(3600);
let room = (await get(host)).room;
const layout = LAYOUTS[room.trip.eras[0]];
for (let npc = 0; npc < 3; npc++) {
  const position = room.trip.positions[host.playerId] ?? layout.spawn,
    path = pathTo(layout, position, layout.npcs[npc]);
  assert.ok(path.length);
  for (let i = 0; i < path.length; i += 2) {
    await sleep(200);
    const point = path[Math.min(i + 1, path.length - 1)];
    assert.equal(
      (await request('walk', host, { round: 1, ...point })).status,
      200,
    );
  }
  const claim = await request('claim', host, { round: 1, npc });
  assert.equal(claim.status, 200, claim.error);
  room = claim.room;
  assert.equal(room.trip.hands[host.playerId].length, npc + 1);
  assert.equal((await request('claim', host, { round: 1, npc })).status, 400);
  await get(guest);
}
assert.equal(
  (await request('claim', host, { round: 1, npc: 3, replace: 0 })).status,
  400,
  'three is the per-visit reward limit',
);
const privateView = (await get(guest)).room,
  screen = (await get(display)).room;
assert.equal(privateView.trip.hands[host.playerId], undefined);
assert.equal(privateView.party.offers[host.playerId], undefined);
assert.deepEqual(screen.trip.hands, {});
assert.deepEqual(screen.party.offers, {});
assert.equal(screen.trip.counts[host.playerId], 3);
for (const stage of ['explore', 'briefing'])
  for (const seat of [host, guest])
    assert.equal(
      (await request('ready', seat, { round: 1, stage })).status,
      200,
    );
await sleep(3150);
room = (await get(host)).room;
const game = room.party.game.id;
const spent = await request('card', host, {
  round: 1,
  game,
  slot: 0,
  target: guest.playerId,
});
assert.equal(spent.status, 200, spent.error);
assert.equal(spent.room.trip.hands[host.playerId].length, 2);
assert.equal(spent.room.party.game.players[host.playerId].used, true);
assert.equal(
  (
    await request('card', host, {
      round: 1,
      game,
      slot: 0,
      target: guest.playerId,
    })
  ).status,
  400,
);
assert.equal((await get(display)).room.trip.counts[host.playerId], 2);
console.log(
  'PASS: physical authored paths → three nearby NPC rewards → private hand → shared game → one-use card → reconnect.',
);
