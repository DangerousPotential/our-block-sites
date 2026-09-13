import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOREST_PLATFORMS,
  CLIMB_ERAS,
  climbPlatforms,
  climbLinks,
  FOREST_TOP,
  stepForestRunner,
} from '../lib/game/forest-course.ts';
import { makePlayer, makeRoom } from '../lib/game/engine.ts';
import {
  createMinigame,
  stepContender,
  finishMinigame,
} from '../lib/game/party-games.ts';
function runner(extra = {}) {
  return {
    x: 0,
    y: 0,
    vy: 0,
    grounded: true,
    checkpoint: 8,
    grace: 0,
    direction: 0,
    jump: false,
    inputAt: 0,
    seq: 0,
    finished: 0,
    boost: 0,
    steady: 0,
    shield: 0,
    breeze: 0,
    used: false,
    ...extra,
  };
}
test('every consecutive foothold can be reached with an ordinary jump at 30 and 60 Hz', () => {
  for (const hz of [30, 60])
    for (let i = 0; i < FOREST_PLATFORMS.length - 1; i++) {
      const from = FOREST_PLATFORMS[i],
        target = FOREST_PLATFORMS[i + 1];
      const r = runner({ x: from.x, y: from.y });
      for (let tick = 0; tick < hz * 2; tick++) {
        r.jump = tick === 0;
        r.direction =
          Math.abs(target.x - r.x) < 0.1 ? 0 : Math.sign(target.x - r.x);
        stepForestRunner(r, 1000 + (tick * 1000) / hz, 1 / hz);
        if (tick > 0 && r.grounded) break;
      }
      assert.equal(r.y, target.y, `step ${i + 1} at ${hz} Hz`);
      assert.equal(r.falls ?? 0, 0);
    }
});
test('missing a high foothold falls below old checkpoints and lands at the actual floor x', () => {
  const r = runner({ x: 8, y: 22, grounded: false, fallPeak: 22 });
  for (let i = 0; i < 100; i++) stepForestRunner(r, 1000 + (i * 1000) / 30);
  assert.equal(r.x, 8);
  assert.equal(r.y, 0);
  assert.equal(r.falls, 1);
});
test('lower footholds catch a falling player instead of teleporting uphill', () => {
  const lower = FOREST_PLATFORMS[2];
  const r = runner({ x: lower.x, y: lower.y + 1, grounded: false, vy: -3 });
  for (let i = 0; i < 20 && !r.grounded; i++)
    stepForestRunner(r, 1000 + (i * 1000) / 30);
  assert.equal(r.y, lower.y);
  assert.equal(r.x, lower.x);
  assert.equal(r.falls ?? 0, 0);
});
test('hard landing damages once, staggers input, then restores control; shield prevents damage', () => {
  for (const shield of [0, 10000]) {
    const r = runner({
      x: 8,
      y: 0.1,
      vy: -20,
      grounded: false,
      fallPeak: 12,
      shield,
    });
    stepForestRunner(r, 1000);
    assert.equal(r.falls ?? 0, shield ? 0 : 1);
    if (shield) continue;
    r.jump = true;
    r.direction = -1;
    stepForestRunner(r, 1100);
    assert.equal(r.y, 0);
    assert.equal(r.x, 8);
    assert.equal(r.falls, 1);
    stepForestRunner(r, 1700);
    assert.ok(r.y > 0);
    assert.ok(r.x < 8);
  }
});
test('falling loses current climb progress and damage changes unfinished ranking', () => {
  const a = makePlayer('A', 'merly', 0),
    b = makePlayer('B', 'kopi', 0);
  const room = makeRoom('TEST', a);
  room.players.push(b);
  room.party = { game: createMinigame(room, 1000) };
  const g = room.party.game,
    p = g.players[a.id],
    q = g.players[b.id];
  p.progress = FOREST_TOP.y;
  Object.assign(p.runner, runner({ x: 8, y: 1, grounded: false }));
  stepContender(g, p, 2000);
  assert.ok(p.progress < 2);
  p.progress = 10;
  p.drops = 2;
  q.progress = 8;
  q.drops = 0;
  finishMinigame(room, 100000);
  assert.equal(g.results[0], b.id);
});

test('all six era routes remain jumpable at 30 and 60 Hz', () => {
  for (const { year } of CLIMB_ERAS)
    for (const hz of [30, 60]) {
      const platforms = climbPlatforms(year);
      for (let i = 0; i < platforms.length - 1; i++) {
        const from = platforms[i],
          target = platforms[i + 1];
        const r = runner({ x: from.x, y: from.y });
        for (let tick = 0; tick < hz * 2; tick++) {
          r.jump = tick === 0;
          r.direction =
            Math.abs(target.x - r.x) < 0.1 ? 0 : Math.sign(target.x - r.x);
          stepForestRunner(r, 1000 + (tick * 1000) / hz, 1 / hz, year);
          if (tick > 0 && r.grounded) break;
        }
        assert.equal(r.y, target.y, `${year} step ${i + 1} at ${hz}Hz`);
      }
    }
});
test('ropes and ladders require deliberate grabbing, hold position and dismount onto a real platform', () => {
  for (const { year } of CLIMB_ERAS)
    for (const link of climbLinks(year)) {
      const r = runner({ x: link.x, y: link.bottom, climb: 0 });
      stepForestRunner(r, 1000, 1 / 30, year);
      assert.equal(r.climbing, undefined);
      r.climb = -1;
      stepForestRunner(r, 1033, 1 / 30, year);
      assert.notEqual(r.climbing, undefined);
      r.climb = 0;
      const y = r.y;
      stepForestRunner(r, 1066, 1 / 30, year);
      assert.equal(r.y, y);
      r.climb = -1;
      for (let i = 0; i < 80 && !r.grounded; i++)
        stepForestRunner(r, 1100 + (i * 1000) / 30, 1 / 30, year);
      assert.equal(r.y, link.top);
      assert.equal(r.grounded, true);
      assert.equal(r.climbing, undefined);
    }
});
test('jumping releases a rope, prevents immediate re-grab and supports downward climbing', () => {
  const link = climbLinks()[0];
  const r = runner({
    x: link.x,
    y: link.bottom + 1,
    grounded: false,
    climb: -1,
  });
  stepForestRunner(r, 1000);
  assert.equal(r.climbing, 0);
  const y = r.y;
  r.climb = 1;
  stepForestRunner(r, 1033);
  assert.ok(r.y < y);
  r.jump = true;
  r.direction = 1;
  stepForestRunner(r, 1066);
  assert.equal(r.climbing, undefined);
  assert.ok(r.x > link.x);
  assert.ok(r.vy > 0);
  r.jump = false;
  stepForestRunner(r, 1099);
  assert.equal(r.climbing, undefined);
});
