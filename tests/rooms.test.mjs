import assert from 'node:assert/strict';
const base = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3000';
async function req(action, body = {}, token) {
  const r = await fetch(base + '/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  return { status: r.status, data: await r.json() };
}
const host = await req('create', {
  mode: 'classic',
  name: 'API Host',
  character: 'merly',
  age: 0,
});
assert.equal(host.status, 200);
const code = host.data.room.code;
const token = host.data.token;
const joins = await Promise.all(
  ['kopi', 'aisyah', 'arun'].map((character, i) =>
    req('join', { code, name: `Guest ${i}`, character, age: i }),
  ),
);
joins.forEach((r) => assert.equal(r.status, 200));
const full = await req('join', {
  code,
  name: 'Extra',
  character: 'otto',
  age: 0,
});
assert.equal(full.status, 400);
assert.match(full.data.error, /full/);
const noAuth = await fetch(base + `/api/rooms?code=${code}`);
assert.equal(noAuth.status, 401);
const badStart = await req('board', { code }, joins[0].data.token);
assert.equal(badStart.status, 400);
assert.match(badStart.data.error, /host/);
const board = await req('board', { code }, token);
assert.equal(
  board.data.room.players.length,
  4,
  'concurrent joins must all survive',
);
assert.equal(board.data.room.phase, 'board');
assert.ok(board.data.room.players.every((p) => !('token' in p)));
const premature = await req('start', { code }, token);
assert.equal(premature.status, 400);
const seats = [host, ...joins];
const tokens = new Map(seats.map((x) => [x.data.playerId, x.data.token]));
let current = board.data.room;
for (let turn = 0; turn < 4; turn++) {
  const seatToken = tokens.get(current.players[turn].id);
  const payload = { code, round: 1, turn };
  const attempts = await Promise.all([
    req('roll', payload, seatToken),
    req('roll', payload, seatToken),
  ]);
  assert.equal(
    attempts.filter((x) => x.status === 200).length,
    1,
    'only one concurrent roll succeeds',
  );
  current = attempts.find((x) => x.status === 200).data.room;
  const move = current.move;
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, move.endsAt - Date.now()) + 100),
  );
  const state = await fetch(base + `/api/rooms?code=${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  current = (await state.json()).room;
  assert.equal(current.boardTurn, turn + 1);
  assert.equal(current.players[turn].position, (move.from + move.steps) % 22);
}
const start = await req('start', { code }, token);
assert.equal(start.data.room.phase, 'playing');
const early = await req('serve', { code, food: 0, step: 0 }, token);
assert.equal(early.status, 400, 'countdown must block scoring');
const resume = await fetch(base + `/api/rooms?code=${code}`, {
  headers: { Authorization: `Bearer ${token}` },
});
assert.equal(resume.status, 200);
const state = await resume.json();
assert.equal(state.room.phase, 'playing');
console.log(
  'PASS: create, concurrent joins, capacity, authorization, host-only start, countdown and reconnect.',
);
