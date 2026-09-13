import assert from 'node:assert/strict';
import { teaStreamX } from '../lib/game/teh-tarik.ts';
import {
  climbPlatforms,
  FOREST_TOP,
  nextForestPlatform,
} from '../lib/game/forest-course.ts';
import {
  orderForParty,
  noteLane,
  MINIGAMES,
  getaiTimeline,
  getaiPlaybackTime,
  getaiDuration,
} from '../lib/game/party-games.ts';
// Internal transport test: the authenticated host supplies an accelerated media clock.
// This checks transport and completion, not actual YouTube playback.
const base = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3000';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let code = '',
  seq = Date.now(),
  requests = 0,
  conflicts = 0;
const timings = [];
async function request(action, seat = {}, extra = {}) {
  for (let retry = 0; retry < 8; retry++) {
    const start = performance.now();
    const response = await fetch(base + '/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(seat.token ? { Authorization: `Bearer ${seat.token}` } : {}),
      },
      body: JSON.stringify({ action, code, ...extra }),
    });
    timings.push(performance.now() - start);
    requests++;
    const data = await response.json();
    if (response.status === 409) {
      conflicts++;
      await sleep(60);
      continue;
    }
    return { status: response.status, ...data };
  }
  throw new Error('Room stayed busy');
}
async function get(seat) {
  for (let retry = 0; retry < 8; retry++) {
    const response = await fetch(`${base}/api/rooms?code=${code}`, {
      headers: { Authorization: `Bearer ${seat.token}` },
    });
    if (response.status === 409) {
      conflicts++;
      await sleep(60);
      continue;
    }
    assert.equal(response.status, 200);
    return await response.json();
  }
  throw new Error('Display stayed busy');
}
const display = await request('create-display');
assert.equal(display.status, 200);
code = display.room.code;
assert.equal(display.room.players.length, 0);
assert.equal(display.room.displayToken, undefined);
const seats = [];
for (const [i, character] of ['merly', 'kopi', 'pandan', 'otto'].entries()) {
  const seat = await request(
    'join',
    {},
    { name: `Phone ${i + 1}`, character, age: 0 },
  );
  assert.equal(seat.status, 200);
  seats.push(seat);
}
assert.equal((await request('join', {}, { name: 'Overflow' })).status, 400);
assert.equal(
  (await request('board', display)).status,
  401,
  'display cannot mutate the game',
);
assert.equal((await request('board', seats[1])).status, 400);
let result = await request('board', seats[0]),
  room = result.room;
assert.equal(room.party.stage, 'dice');
for (let round = 1; round <= MINIGAMES.length; round++) {
  const roller = seats[(round - 1) % 4];
  const dice = await Promise.all([
    request('roll', roller, { round }),
    request('roll', roller, { round }),
  ]);
  assert.equal(
    dice.filter((r) => r.status === 200).length,
    1,
    'a concurrent roll is accepted once',
  );
  await sleep(3650);
  room = (await get(display)).room;
  if (room.party.stage === 'explore') {
    for (const seat of seats)
      assert.equal((await request('ready', seat, { round })).status, 200);
    room = (await get(display)).room;
  }
  assert.equal(room.party.stage, 'briefing');
  for (const seat of seats)
    assert.equal((await request('ready', seat, { round })).status, 200);
  room = (await get(display)).room;
  assert.equal(room.party.stage, 'game');
  const kind = room.party.game.kind;
  console.log(
    `Round ${round}: ${kind} running on four independent controller credentials and read-only display`,
  );
  const targets = {},
    lastJump = {},
    begin = Date.now();
  while (room.party.stage === 'game') {
    // Refresh after the transport interval before choosing the next jump.
    room = (await get(display)).room;
    if (room.party.stage !== 'game') break;
    const g = room.party.game,
      now = Date.now();
    const outcomes = await Promise.all(
      seats.map((seat, i) => {
        const p = g.players[seat.playerId];
        let x = 0,
          y = 0,
          jump = false,
          press;
        if (kind === 'forest') {
          if (p.runner.grounded)
            targets[seat.playerId] = nextForestPlatform(p.runner, g.year);
          const target = climbPlatforms(g.year)[targets[seat.playerId] ?? 1];
          x = Math.max(-1, Math.min(1, (target.x - p.runner.x) * 2));
          jump =
            p.runner.y < FOREST_TOP.y &&
            p.runner.grounded &&
            now - (lastJump[seat.playerId] ?? 0) > 700;
          if (jump) lastJump[seat.playerId] = now;
          if (p.runner.grounded && !jump) x = 0;
          if (p.runner.y === FOREST_TOP.y && p.runner.grounded)
            press = 'portal';
        } else if (kind === 'balance') {
          const height = -1 + Math.sin((now - g.start) / 1400 + i * 2.1) * 4.6;
          const streamX = teaStreamX(g.seed, (now - g.start) / 1000, height);
          x = Math.max(-1, Math.min(1, (streamX - p.x) * 0.9));
          y = Math.max(-1, Math.min(1, (height - p.y) * 0.8));
        } else if (kind === 'hawker') press = orderForParty(g, i, p.step);
        else {
          const timeline = getaiTimeline(
            getaiPlaybackTime(g, now),
            getaiDuration(g),
          );
          const beat = Math.round(timeline.elapsed / 700);
          press = noteLane(g, beat);
        }
        return request('input', seat, {
          round,
          game: g.id,
          seq: ++seq,
          x,
          y,
          jump,
          press,
          ...(kind === 'rhythm' && i === 0
            ? {
                music: {
                  position: Math.min(
                    255,
                    15 + (Math.max(0, now - g.start) / 1000) * 12,
                  ),
                  duration: 255,
                  playing: now - g.start < 20000,
                  ended: now - g.start >= 20000,
                  seq: ++seq,
                },
              }
            : {}),
        });
      }),
    );
    outcomes.forEach((r) => assert.equal(r.status, 200));
    room = (await get(display)).room;
    assert.deepEqual(room.trip.hands, {});
    assert.deepEqual(room.party.offers, {});
    assert.ok(Date.now() - begin < 100000, 'game must settle within duration');
    await sleep(160);
  }
  assert.equal(room.phase, 'results');
  assert.equal(room.party.game.results.length, 4);
  if (kind === 'forest')
    assert.ok(
      Object.values(room.party.game.players).every((p) => p.progress > 0),
      'each controller must move; the timer ranks unfinished climbs',
    );
  const total = room.players.map((p) => p.score);
  assert.deepEqual(
    (await get(seats[0])).room.players.map((p) => p.score),
    total,
    'reconnect cannot duplicate scoring',
  );
  console.log(
    `Round ${round}: results ${room.players.map((p) => `${p.name} +${p.roundScore}`).join(', ')}`,
  );
  result = await request(
    'next',
    seats.find((s) => s.playerId === room.host),
  );
  assert.equal(result.status, 200);
  room = result.room;
}
assert.equal(room.phase, 'finished');
timings.sort((a, b) => a - b);
console.log(
  `PASS: shared lobby → era dice → exploration → all four games → final scores; ${requests} POST requests, ${conflicts} retryable conflicts; p95 ${Math.round(timings[Math.floor(timings.length * 0.95)])}ms.`,
);
