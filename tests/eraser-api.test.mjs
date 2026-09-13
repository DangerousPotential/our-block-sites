import assert from 'node:assert/strict';
const base = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3000';
let code = '';
async function post(action, seat = {}, extra = {}) {
  const response = await fetch(`${base}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(seat.token ? { Authorization: `Bearer ${seat.token}` } : {}),
    },
    body: JSON.stringify({ action, mode: 'eraser', code, ...extra }),
  });
  return { status: response.status, ...(await response.json()) };
}
async function get(seat) {
  const response = await fetch(`${base}/api/rooms?code=${code}`, {
    headers: { Authorization: `Bearer ${seat.token}` },
  });
  return { status: response.status, ...(await response.json()) };
}
const a = await post('create', {}, { name: 'Eraser API A', character: 'mei' });
assert.equal(a.status, 200);
code = a.room.code;
assert.equal(a.room.rulesVersion, 4);
assert.equal((await post('start', a)).status, 400, 'one player cannot start');
assert.equal(
  (await post('join', {}, { mode: 'party' })).status,
  400,
  'party entry cannot join an eraser room',
);
const b = await post('join', {}, { name: 'Eraser API B', character: 'arun' });
assert.equal(b.status, 200);
assert.equal((await post('join')).status, 400, 'exactly two seats');
assert.equal((await post('start', b)).status, 400, 'host starts');
assert.equal((await post('flag', a, { flag: 2 })).status, 200);
assert.equal((await post('start', a)).status, 200);
const shot = { match: 1, turn: 1, x: 1, y: 0, power: 36 / 46 };
assert.equal(
  (await post('flick', {}, shot)).status,
  401,
  'anonymous input rejected',
);
assert.equal(
  (await post('flick', b, shot)).status,
  400,
  'opponent cannot move host eraser',
);
assert.equal(
  (await post('flick', a, shot)).status,
  400,
  'intro blocks early input',
);
await new Promise((resolve) => setTimeout(resolve, 4600));
const concurrent = await Promise.all([
  post('flick', a, shot),
  post('flick', a, shot),
]);
assert.equal(
  concurrent.filter((r) => r.status === 200).length,
  1,
  'same turn launches once',
);
await new Promise((resolve) => setTimeout(resolve, 1200));
const first = await get(a),
  second = await get(b);
assert.equal(first.status, 200);
assert.equal(second.status, 200);
assert.equal(first.room.eraser.winner, undefined);
assert.equal(first.room.eraser.stock[b.playerId], 2);
assert.equal(first.room.eraser.capture.winner, a.playerId);
assert.deepEqual(
  first.room.eraser,
  second.room.eraser,
  'both phones agree on positions and winner',
);
assert.equal(first.room.eraser.pieces[a.playerId].flag, 2);
assert.ok(first.room.players.every((p) => !('token' in p)));
// Alternate successful captures; the fifth capture removes B's final reserve.
for (let duel = 2; duel <= 5; duel++) {
  await new Promise((resolve) => setTimeout(resolve, 1900));
  const current = (await get(a)).room;
  const seat = current.eraser.active === a.playerId ? a : b;
  const direction = seat === a ? 1 : -1;
  assert.equal(
    (
      await post('flick', seat, {
        match: 1,
        turn: current.eraser.turn,
        x: direction,
        y: 0,
        power: 36 / 46,
      })
    ).status,
    200,
  );
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const landed = (await get(a)).room;
  if (duel < 5) assert.equal(landed.phase, 'playing');
  else {
    assert.equal(landed.eraser.winner, a.playerId);
    assert.equal(landed.eraser.stock[b.playerId], 0);
  }
}
assert.equal((await post('restart', a)).status, 200);
assert.equal((await post('start', a)).status, 200);
assert.equal(
  (await post('flick', a, shot)).status,
  400,
  'old match input rejected after rematch',
);
assert.equal(
  (await get(b)).room.eraser.match,
  2,
  'reconnecting phone sees the new match',
);
console.log(
  'PASS: two authenticated phones, two-seat capacity, independent mode, concurrent replay protection, shared landing/winner, rematch and reconnect.',
);
