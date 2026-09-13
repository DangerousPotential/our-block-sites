import { climbPlatforms } from '../lib/game/forest-course.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRoom,
  makePlayer,
  publicRoom,
  applyAction,
  settle,
} from '../lib/game/engine.ts';
import { enableParty } from '../lib/game/party.ts';
import {
  createMinigame,
  updateGetaiPlayback,
  inputMinigame,
  settleMinigame,
  finishMinigame,
  orderForParty,
  noteLane,
  playMinigameCard,
  canEnterForestPortal,
} from '../lib/game/party-games.ts';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { eraOf } from '../lib/game/trip.ts';
function setup() {
  const p = makePlayer('Host', 'merly', 0),
    r = enableParty(makeRoom('TEST', p));
  r.players.push(makePlayer('Friend', 'kopi', 0));
  r.displayToken = 'display-private';
  return [r, p];
}
test('era dice starts exploration, allows three proximity-checked random cards, and readies all phones', () => {
  const [r, p] = setup(),
    t = 1000;
  applyAction(r, p.id, 'board', {}, t);
  assert.equal(r.party.stage, 'dice');
  assert.throws(() => applyAction(r, r.players[1].id, 'roll', { round: 1 }, t));
  applyAction(r, p.id, 'roll', { round: 1 }, t);
  assert.ok(r.party.die.value >= 1 && r.party.die.value <= 6);
  assert.throws(() => applyAction(r, p.id, 'roll', { round: 1 }, t + 1));
  settle(r, t + 3500);
  assert.equal(r.party.stage, 'explore');
  const m = LAYOUTS[eraOf(r).id];
  assert.throws(() =>
    applyAction(r, p.id, 'claim', { round: 1, npc: 0 }, t + 3501),
  );
  for (let n = 0; n < 3; n++) {
    r.trip.positions[p.id] = { ...m.npcs[n], at: t + 3500 };
    applyAction(r, p.id, 'claim', { round: 1, npc: n }, t + 3600 + n);
  }
  assert.equal(r.trip.hands[p.id].length, 3);
  assert.deepEqual(r.trip.hands[p.id], r.party.offers[p.id].slice(0, 3));
  assert.throws(() =>
    applyAction(r, p.id, 'claim', { round: 1, npc: 3 }, t + 3700),
  );
  for (const player of r.players)
    applyAction(r, player.id, 'ready', { round: 1 }, t + 4000);
  assert.equal(r.party.stage, 'briefing');
  assert.equal(r.trip.ready.length, 0);
  for (const player of r.players)
    applyAction(r, player.id, 'ready', { round: 1 }, t + 5000);
  assert.equal(r.party.stage, 'game');
  assert.equal(r.party.game.kind, 'forest');
});
test('public display never exposes player credentials, its own credential, or private cards/offers', () => {
  const [r, p] = setup();
  r.trip.hands[p.id] = [1, 2];
  r.party.offers[p.id] = [0, 1, 2, 3];
  const view = publicRoom(r);
  assert.equal(view.displayToken, undefined);
  assert.ok(view.players.every((p) => !('token' in p)));
  assert.deepEqual(view.trip.hands, {});
  assert.deepEqual(view.party.offers, {});
  assert.deepEqual(publicRoom(r, p.id).trip.hands, { [p.id]: [1, 2] });
});
test('all four games settle once with finite authoritative positions and scores', () => {
  for (let round = 1; round <= 4; round++) {
    const [r, p] = setup();
    r.round = round;
    r.party.game = createMinigame(r, 1000);
    for (const player of r.players) player.bot = true;
    if (round === 4)
      updateGetaiPlayback(
        r,
        r.host,
        { position: 255, duration: 255, playing: false, ended: true, seq: 1 },
        100000,
      );
    settleMinigame(r, 100000);
    assert.equal(finishMinigame(r, 100000), true);
    for (const state of Object.values(r.party.game.players))
      for (const field of ['x', 'y', 'points', 'progress'])
        assert.ok(Number.isFinite(state[field]));
    const score = p.score;
    finishMinigame(r, 100001);
    assert.equal(p.score, score);
    assert.equal(r.party.game.results.length, 2);
  }
});
test('forest requires deliberate portal entry; stale, impossible and replayed input cannot award a finish', () => {
  const [r, p] = setup();
  r.party.game = createMinigame(r, 1000);
  const g = r.party.game,
    s = g.players[p.id];
  const packet = {
    game: g.id,
    seq: 1,
    x: 0,
    y: 0,
    jump: false,
    press: 'portal',
  };
  inputMinigame(r, p.id, packet, 1200);
  assert.equal(s.finished, 0);
  const FOREST_TOP = climbPlatforms(g.year).at(-1);
  s.runner.y = FOREST_TOP.y;
  s.runner.x = FOREST_TOP.x;
  s.runner.grounded = true;
  inputMinigame(r, p.id, packet, 1300);
  assert.equal(s.finished, 0);
  s.runner.grounded = false;
  assert.equal(canEnterForestPortal(s.runner, g.year), false);
  inputMinigame(r, p.id, { ...packet, seq: 2 }, 1350);
  assert.equal(s.finished, 0, 'airborne players cannot enter');
  s.runner.grounded = true;
  s.runner.x += 1.5;
  assert.equal(canEnterForestPortal(s.runner, g.year), false);
  inputMinigame(r, p.id, { ...packet, seq: 3 }, 1400);
  assert.equal(s.finished, 0, 'the edge of the branch is outside the portal');
  s.runner.x = FOREST_TOP.x;
  assert.equal(canEnterForestPortal(s.runner, g.year), true);
  inputMinigame(r, p.id, { ...packet, seq: 4 }, 1450);
  assert.equal(s.finished, 1450);
  assert.throws(() =>
    inputMinigame(r, p.id, { ...packet, seq: 5, x: Infinity }, 1500),
  );
});
test('hawker and rhythm validate order, timing and action sequence on server', () => {
  const [r, p] = setup();
  r.round = 3;
  r.party.game = createMinigame(r, 1000);
  let g = r.party.game,
    s = g.players[p.id];
  const packet = {
    game: g.id,
    seq: 1,
    x: 0,
    y: 0,
    jump: false,
    press: orderForParty(g, 0, 0),
  };
  inputMinigame(r, p.id, packet, 1400);
  assert.equal(s.points, 3);
  inputMinigame(r, p.id, packet, 1700);
  assert.equal(s.points, 3);
  r.round = 4;
  r.party.game = createMinigame(r, 1000);
  g = r.party.game;
  s = g.players[p.id];
  updateGetaiPlayback(
    r,
    r.host,
    { position: 15.7, duration: 255, playing: true, ended: false, seq: 1 },
    1700,
  );
  inputMinigame(
    r,
    p.id,
    { ...packet, game: g.id, press: noteLane(g, 1) },
    1700,
  );
  assert.equal(s.points, 3);
  inputMinigame(
    r,
    p.id,
    { ...packet, game: g.id, seq: 2, press: noteLane(g, 1) },
    1900,
  );
  assert.equal(s.points, 3);
});
test('cards apply once, remain private, and cannot target an absent player', () => {
  const [r, p] = setup();
  r.party.game = createMinigame(r, 1000);
  const g = r.party.game;
  r.trip.hands[p.id] = [3, 0];
  assert.throws(() =>
    playMinigameCard(r, p.id, { game: g.id, slot: 0, target: 'missing' }, 1500),
  );
  playMinigameCard(
    r,
    p.id,
    { game: g.id, slot: 0, target: r.players[1].id },
    1500,
  );
  assert.equal(g.players[r.players[1].id].breeze, 4500);
  assert.throws(() => playMinigameCard(r, p.id, { game: g.id, slot: 0 }, 1600));
  assert.deepEqual(r.trip.hands[p.id], [0]);
});

test('a retried phone tap has a stable action id, even when its packet sequence changes', () => {
  const [r, p] = setup();
  r.round = 3;
  r.party.game = createMinigame(r, 1000);
  const g = r.party.game,
    s = g.players[p.id];
  const input = {
    game: g.id,
    seq: 100,
    pressId: 77,
    press: orderForParty(g, 0, 0),
    x: 0,
    y: 0,
    jump: false,
  };
  inputMinigame(r, p.id, input, 1400);
  inputMinigame(r, p.id, { ...input, seq: 101 }, 1800);
  assert.equal(s.step, 1);
  assert.equal(s.points, 3);
});

test('a stay face skips another visit, stale readiness cannot start the next stage, and idle play earns no points', () => {
  const [r, p] = setup();
  r.party.visited = true;
  r.round = 2;
  r.trip.eras = ['estate', 'estate'];
  r.phase = 'board';
  const random = Math.random;
  Math.random = () => 0.99;
  try {
    applyAction(r, r.players[1].id, 'roll', { round: 2 }, 1000);
  } finally {
    Math.random = random;
  }
  assert.equal(r.party.die.value, 6);
  settle(r, 4501);
  assert.equal(r.party.stage, 'briefing');
  applyAction(r, p.id, 'ready', { round: 2, stage: 'explore' }, 4600);
  assert.deepEqual(r.trip.ready, []);
  r.round = 1;
  r.party.game = createMinigame(r, 5000);
  finishMinigame(r, 100000);
  assert.ok(r.players.every((p) => p.roundScore === 0));
});

test('CPU forest finishes persist at the original portal time', () => {
  const [r, p] = setup();
  r.players.forEach((p) => (p.bot = true));
  r.party.game = createMinigame(r, 1000);
  settleMinigame(r, 50000);
  const finishes = Object.values(r.party.game.players).map((p) => p.finished);
  assert.ok(finishes.every((time) => time > 1000 && time < 50000));
  settleMinigame(r, 90000);
  assert.deepEqual(
    Object.values(r.party.game.players).map((p) => p.finished),
    finishes,
  );
});

test('normal party runs four distinct CPUs through every remaining game to final standings', () => {
  const players = ['merly', 'kopi', 'pandan', 'otto'].map((character) => ({
    ...makePlayer(character, character, 0),
    bot: true,
  }));
  const room = enableParty(makeRoom('FOUR', players[0]));
  room.players = players;
  let now = 1000;
  applyAction(room, room.host, 'board', {}, now);
  const played = [];
  for (let round = 1; round <= room.totalRounds; round++) {
    settle(room, (now += 100));
    settle(room, (now += 3501));
    if (room.party.stage === 'explore') settle(room, (now += 120001));
    settle(room, (now += 100));
    assert.equal(room.party.stage, 'game');
    const game = room.party.game;
    played.push(game.kind);
    assert.equal(Object.keys(game.players).length, 4);
    if (game.kind === 'balance') {
      assert.equal(
        new Set(Object.values(game.players).map((p) => p.x)).size,
        4,
      );
      assert.ok(Object.values(game.players).every((p) => p.y === 4));
    }
    now = game.start + 1;
    settle(room, now);
    if (game.kind === 'rhythm') {
      updateGetaiPlayback(
        room,
        room.host,
        {
          position: 255,
          duration: 255,
          playing: false,
          ended: true,
          seq: now,
        },
        now,
      );
    }
    settle(room, (now += 91000));
    assert.equal(room.phase, 'results');
    assert.equal(game.results.length, 4);
    const scores = players.map((p) => p.score);
    settle(room, (now += 100));
    assert.deepEqual(
      players.map((p) => p.score),
      scores,
    );
    applyAction(room, room.host, 'next', {}, now);
  }
  assert.deepEqual(played, ['forest', 'balance', 'hawker', 'rhythm']);
  assert.equal(room.phase, 'finished');
});
