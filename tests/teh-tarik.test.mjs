import test from 'node:test';
import assert from 'node:assert/strict';
import {
  teaStreamX,
  teaSource,
  moveTeaCup,
  teaFoamMultiplier,
  teaPourHeight,
  tiltAxes,
  stepTeaArena,
  resolveTeaCollisions,
  TEA_FLOW_ML,
  TEA_CAPACITY_ML,
} from '../lib/game/teh-tarik.ts';
import { makeRoom, makePlayer } from '../lib/game/engine.ts';
import { enableParty } from '../lib/game/party.ts';
import {
  createMinigame,
  settleMinigame,
  finishMinigame,
} from '../lib/game/party-games.ts';
function fixture(count = 4) {
  const room = enableParty(makeRoom('TEAA', makePlayer('You', 'merly', 0)));
  for (let i = 1; i < count; i++)
    room.players.push(makePlayer(`Rival ${i}`, 'kopi', 0));
  room.round = 2;
  const game = createMinigame(room, 1000);
  room.party.game = game;
  return { room, game, cups: room.players.map((p) => game.players[p.id]) };
}
test('stream is shared, continuous and reachable; greater physical drop increases foam', () => {
  for (let t = 0; t < 35; t += 0.2)
    for (let y = -6; y <= 6; y++) assert.ok(Math.abs(teaStreamX(23, t, y)) < 6);
  assert.equal(teaPourHeight(-6), 0.4);
  assert.equal(teaPourHeight(6), 1.6);
  assert.equal(teaFoamMultiplier(-6), 1);
  assert.equal(teaFoamMultiplier(6), 2);
  assert.ok(teaFoamMultiplier(3) > teaFoamMultiplier(-3));
});
test('only upper intercepting cup gets finite stream; lower cup can catch after it moves aside', () => {
  const { game, cups } = fixture(2),
    now = 3000;
  for (let i = 0; i < 2; i++) {
    cups[i].y = i ? 4 : -4;
    cups[i].x = teaStreamX(game.seed, 2, cups[i].y);
  }
  stepTeaArena(game, now);
  assert.ok(cups[0].teaMl > 0);
  assert.equal(cups[1].teaMl, 0);
  assert.ok(
    Math.abs(cups.reduce((sum, p) => sum + p.teaMl, 0) - TEA_FLOW_ML / 30) <
      1e-8,
  );
  cups[0].x = -6;
  stepTeaArena(game, now);
  assert.ok(cups[1].teaMl > 0);
  assert.ok(cups[1].points / cups[1].teaMl > cups[0].points / cups[0].teaMl);
});
test('no catch before countdown, no phantom volume when stream missed, finite capacity', () => {
  const { game, cups } = fixture(1),
    p = cups[0];
  p.x = -6;
  p.y = 6;
  stepTeaArena(game, 999);
  assert.equal(p.teaMl, 0);
  stepTeaArena(game, 3000);
  assert.equal(p.teaMl, 0);
  p.x = teaStreamX(game.seed, 2, p.y);
  p.teaMl = TEA_CAPACITY_ML - 0.1;
  stepTeaArena(game, 3000);
  assert.equal(p.teaMl, TEA_CAPACITY_ML);
  const score = p.points;
  stepTeaArena(game, 36001);
  assert.equal(p.points, score);
});
test('head-on cups separate, knock back and spill bounded volume; shields protect tea', () => {
  const {
    game,
    cups: [a, b],
  } = fixture(2);
  Object.assign(a, { x: -0.7, y: 0, axisX: 1, teaMl: 100, points: 150 });
  Object.assign(b, {
    x: 0.7,
    y: 0,
    axisX: -1,
    teaMl: 100,
    points: 150,
    shield: 5000,
  });
  resolveTeaCollisions(game, 3000);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 1.59);
  assert.ok(a.vx < 0 && b.vx > 0);
  assert.ok(a.teaMl < 100 && a.teaMl >= 88);
  assert.equal(b.teaMl, 100);
  assert.equal(a.points / a.teaMl, 1.5);
  assert.equal(a.drops, 1);
  assert.equal(b.drops, 0);
});
test('collision and catch outcomes do not depend on player object insertion order', () => {
  const { game, cups } = fixture(4);
  cups.forEach((p, i) =>
    Object.assign(p, {
      x: i * 0.3,
      y: 0,
      axisX: i % 2 ? 1 : -1,
      teaMl: 100,
      points: 150,
    }),
  );
  const reverse = structuredClone(game);
  reverse.players = Object.fromEntries(
    Object.entries(reverse.players).reverse(),
  );
  stepTeaArena(game, 3000);
  stepTeaArena(reverse, 3000);
  assert.deepEqual(reverse.players, game.players);
});
test('four CPUs compete without creating tea; settlement ends once and score determines winner', () => {
  const { room, game, cups } = fixture(4);
  room.players.forEach((p) => (p.bot = true));
  settleMinigame(room, 40000);
  assert.equal(game.tick, 1050);
  assert.ok(cups.filter((p) => p.teaMl > 0).length >= 2);
  assert.ok(
    cups.reduce((sum, p) => sum + (p.teaMl ?? 0) + (p.spilledMl ?? 0), 0) <=
      TEA_FLOW_ML * 35 + 0.001,
  );
  assert.ok(
    cups.every(
      (p) =>
        p.teaMl >= 0 && p.teaMl <= TEA_CAPACITY_ML && Number.isFinite(p.points),
    ),
  );
  const snapshot = structuredClone(game.players);
  settleMinigame(room, 60000);
  assert.deepEqual(game.players, snapshot);
  finishMinigame(room, 60000);
  assert.equal(
    game.players[game.results[0]].points,
    Math.max(...cups.map((p) => p.points)),
  );
});
test('tilt calibration handles portrait, landscape, wraparound and invalid readings', () => {
  const base = { beta: 30, gamma: 0 };
  assert.deepEqual(tiltAxes(30, 0, base, 0), { x: 0, y: 0 });
  assert.deepEqual(tiltAxes(30, 22, base, 0), { x: 1, y: 0 });
  assert.deepEqual(tiltAxes(52, 0, base, 90), { x: 1, y: 0 });
  assert.ok(Math.abs(tiltAxes(-179, 0, { beta: 179, gamma: 0 }, 0).y) < 0.1);
  assert.deepEqual(tiltAxes(NaN, 0, base, 0), { x: 0, y: 0 });
});

test('moving pot and stream share their origin; actual source height drives foam', () => {
  assert.notDeepEqual(teaSource(20, 0), teaSource(20, 4));
  for (let t = 0; t < 35; t += 0.25) {
    const source = teaSource(20, t);
    assert.equal(teaStreamX(20, t, source.y), source.x);
    assert.ok(source.y < -6);
  }
  const {
      game,
      cups: [p],
    } = fixture(1),
    now = 8000;
  p.y = 2;
  p.x = teaStreamX(game.seed, 7, p.y);
  stepTeaArena(game, now);
  assert.ok(
    Math.abs(
      p.points / p.teaMl - teaFoamMultiplier(p.y, teaSource(game.seed, 7).y),
    ) < 1e-8,
  );
});
test('strong hits launch cups multiple widths and arena edges rebound them', () => {
  const {
    game,
    cups: [a, b],
  } = fixture(2);
  Object.assign(a, { x: -0.7, y: 0, axisX: 1 });
  Object.assign(b, { x: 0.7, y: 0, axisX: -1 });
  resolveTeaCollisions(game, 3000);
  assert.ok(Math.abs(a.vx) > 14 && Math.abs(b.vx) > 14);
  const start = a.x;
  a.axisX = b.axisX = 0;
  for (let frame = 1; frame <= 6; frame++)
    moveTeaCup(a, 3000 + (frame * 1000) / 30, 1 / 30);
  assert.ok(
    start - a.x > 2.4,
    'impact must displace more than one cup diameter',
  );
  Object.assign(a, { x: 5.9, y: 0, vx: 18, vy: 0, axisX: 0 });
  moveTeaCup(a, 4000, 1 / 30);
  assert.equal(a.x, 6);
  assert.ok(a.vx < 0);
  moveTeaCup(a, 4034, 1 / 30);
  assert.ok(a.x < 6);
});
