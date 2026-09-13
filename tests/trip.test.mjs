import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeRoom,
  makePlayer,
  applyAction,
  settle,
  publicRoom,
} from '../lib/game/engine.ts';
import { enableTrip, eraOf } from '../lib/game/trip.ts';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { pathTo, walkable, meetingPoint } from '../lib/game/trip-navigation.ts';
import { readFileSync } from 'node:fs';
import { Group, Object3D, Sprite, SpriteMaterial } from 'three';
import { createWorldLife } from '../components/game/world-life.ts';

test('expanded eras double the ground area and populate eight reachable outer districts', () => {
  for (const m of Object.values(LAYOUTS)) {
    assert.ok(m.groundSize.x * m.groundSize.z >= 40 * 36 * 2, m.id);
    assert.equal(m.districts.length, 8, m.id);
    const activities = m.activities.filter((a) =>
      a.kind.startsWith('district_'),
    );
    assert.equal(
      activities.reduce((n, a) => n + a.count, 0),
      32,
      m.id,
    );
    assert.ok(
      m.districts.some((d) => d.x < -18) && m.districts.some((d) => d.x > 18),
      m.id,
    );
    assert.ok(
      m.districts.some((d) => d.z < -18) && m.districts.some((d) => d.z > 18),
      m.id,
    );
    for (const d of m.districts) {
      const p = meetingPoint(m, m.spawn, d);
      assert.ok(p, m.id + ' ' + d.name);
      assert.ok(Math.hypot(p.x - d.x, p.z - d.z) <= 6, m.id + ' ' + d.name);
    }
    for (const a of activities) assert.ok(a.dialogue.length >= 2, a.name);
  }
});

test('every era exports native social props and coordinated reduced-motion-safe ensembles', () => {
  for (const m of Object.values(LAYOUTS)) {
    assert.ok(m.activities.length >= 3, m.id);
    const bytes = readFileSync(
      new URL(`../public/assets/trip/${m.id}.glb`, import.meta.url),
    );
    const doc = JSON.parse(
      bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
    );
    assert.ok(
      doc.nodes.some((n) => n.name === 'anim_play_ball'),
      m.id,
    );
    const group = new Group();
    for (const name of [
      'anim_play_ball',
      'anim_trishaw',
      'anim_watering_can',
      'anim_coaster',
    ]) {
      const o = new Object3D();
      o.name = name;
      group.add(o);
    }
    const actors = [];
    const animate = createWorldLife(
      group,
      () => {
        const sprite = new Sprite(new SpriteMaterial());
        actors.push(sprite);
        return sprite;
      },
      m,
    );
    assert.equal(
      actors.length,
      m.activities.reduce((n, a) => n + a.count, 0),
    );
    animate(0, false, false);
    const first = actors.map((s) => s.position.toArray());
    animate(1700, false, false);
    assert.notDeepEqual(
      actors.map((s) => s.position.toArray()),
      first,
    );
    animate(1700, true, false);
    const still = actors.map((s) => s.position.toArray());
    animate(9000, true, false);
    assert.deepEqual(
      actors.map((s) => s.position.toArray()),
      still,
    );
    animate(9000, true, true);
    assert.ok(actors.slice(0, m.activities[0].count).every((s) => !s.visible));
  }
});
test('getai keeps its original ensemble while clearing the central audience approach', () => {
  const layout = LAYOUTS.fair;
  const stage = layout.activities.find((a) => a.kind === 'stage');
  const actors = [];
  const animate = createWorldLife(
    new Group(),
    () => {
      const sprite = new Sprite(new SpriteMaterial());
      actors.push(sprite);
      return sprite;
    },
    layout,
  );
  animate(1000, false, false);
  const stationId = `fair:${layout.activities.indexOf(stage)}`;
  const ensemble = actors.filter(
    (s) => s.userData.resident.stationId === stationId,
  );
  assert.equal(
    ensemble.length,
    stage.count,
    'every original performer/audience remains',
  );
  assert.equal(
    ensemble[0].position.y,
    1.05,
    'performer remains on the original deck',
  );
  const audience = ensemble.slice(1);
  for (const sprite of audience) {
    assert.ok(
      Math.abs(sprite.position.x - stage.x) >= 1.3,
      'central approach stays clear',
    );
    assert.ok(
      sprite.position.z > stage.z,
      'audience stays in front of the stage',
    );
  }
  for (let i = 0; i < audience.length; i++)
    for (let j = i + 1; j < audience.length; j++)
      assert.ok(
        audience[i].position.distanceTo(audience[j].position) > 1.3,
        'separate standing positions',
      );
});

function room() {
  const p = makePlayer('Host', 'merly', 0),
    r = enableTrip(makeRoom('TEST', p));
  return [r, p];
}
test('five unique layouts have 22 walkable anchors and four reachable NPCs', () => {
  for (const m of Object.values(LAYOUTS)) {
    assert.equal(m.board.length, 22);
    assert.ok(walkable(m, m.spawn), m.id + ' spawn');
    for (const p of m.board)
      assert.ok(walkable(m, p), m.id + ' board ' + JSON.stringify(p));
    for (const p of m.npcs)
      assert.ok(
        pathTo(m, m.spawn, p).length,
        m.id + ' NPC ' + JSON.stringify(p),
      );
  }
});
test('three unique eras, private cards, nearby encounters and replay protection', () => {
  const [r, p] = room();
  const guest = makePlayer('Guest', 'kopi', 0);
  r.players.push(guest);
  assert.equal(new Set(r.trip.eras).size, 3);
  applyAction(r, p.id, 'board', {}, -2000);
  assert.equal(r.phase, 'revealing');
  settle(r, 1000);
  assert.equal(r.phase, 'exploring');
  assert.equal(r.trip.deadline, 121000);
  assert.throws(() =>
    applyAction(r, p.id, 'claim', { round: 1, npc: 0 }, 2000),
  );
  const m = LAYOUTS[eraOf(r).id];
  r.trip.positions[p.id] = { ...m.npcs[0], at: 2000 };
  applyAction(r, p.id, 'claim', { round: 1, npc: 0 }, 2000);
  assert.deepEqual(r.trip.hands[p.id], [0]);
  assert.throws(() =>
    applyAction(r, p.id, 'claim', { round: 1, npc: 0 }, 2001),
  );
  assert.deepEqual(publicRoom(r, guest.id).trip.hands, { [guest.id]: [] });
  assert.equal(publicRoom(r, guest.id).trip.counts[p.id], 1);
  assert.ok(!JSON.stringify(publicRoom(r, p.id)).includes(p.token));
  applyAction(r, p.id, 'ready', { round: 1 }, 3000);
  assert.equal(r.phase, 'exploring');
  applyAction(r, guest.id, 'ready', { round: 1 }, 3000);
  assert.equal(r.phase, 'board');
});
test('quest tiles interrupt once, reward once and resume next turn', () => {
  const [r, p] = room();
  applyAction(r, p.id, 'board', {}, -3000);
  settle(r, 0);
  applyAction(r, p.id, 'ready', { round: 1 }, 1);
  r.move = {
    playerId: p.id,
    from: 0,
    steps: 2,
    startedAt: 0,
    endsAt: 2,
    turn: 0,
    round: 1,
    reward: 3,
  };
  settle(r, 3);
  assert.equal(r.phase, 'quest');
  assert.equal(r.boardTurn, 1);
  assert.equal(p.score, 3);
  settle(r, r.trip.quest.start + 90000);
  assert.equal(r.phase, 'quest-results');
  assert.equal(p.score, 3);
  applyAction(r, p.id, 'resume', {}, 100000);
  assert.equal(r.phase, 'board');
  settle(r, 100001);
  assert.equal(p.score, 3);
  assert.equal(r.trip.questPlayed, true);
});
test('CPU racers complete using the same platform physics', () => {
  const [r, p] = room();
  p.bot = true;
  applyAction(r, p.id, 'board', {}, 0);
  settle(r, 124000);
  r.boardTurn = 1;
  r.move = null;
  applyAction(r, p.id, 'start', {}, 125000);
  settle(r, r.trip.quest.start + 90000);
  assert.equal(r.phase, 'quest-results');
  assert.equal(
    r.trip.quest.results.length,
    1,
    JSON.stringify(r.trip.quest.runners[p.id]),
  );
  assert.equal(p.roundScore, 10);
});
test('cards are one-use, shield and breeze cannot stack or replay', () => {
  const [r, p] = room(),
    g = makePlayer('Guest', 'kopi', 0);
  r.players.push(g);
  applyAction(r, p.id, 'board', {}, 0);
  settle(r, 124000);
  r.boardTurn = 2;
  applyAction(r, p.id, 'start', {}, 125000);
  const now = r.trip.quest.start + 1;
  r.trip.hands[p.id] = [3, 0];
  r.trip.hands[g.id] = [2];
  applyAction(
    r,
    g.id,
    'card',
    { round: 1, quest: r.trip.quest.id, slot: 0, target: g.id },
    now,
  );
  assert.ok(r.trip.quest.runners[g.id].shield > now);
  applyAction(
    r,
    p.id,
    'card',
    { round: 1, quest: r.trip.quest.id, slot: 0, target: g.id },
    now,
  );
  assert.equal(r.trip.hands[p.id].length, 1);
  assert.throws(() =>
    applyAction(
      r,
      p.id,
      'card',
      { round: 1, quest: r.trip.quest.id, slot: 0 },
      now,
    ),
  );
});
test('a late input packet publishes race results instead of trapping clients in the race', () => {
  const [r, p] = room();
  applyAction(r, p.id, 'board', {}, 0);
  settle(r, 124000);
  r.boardTurn = 1;
  applyAction(r, p.id, 'start', {}, 125000);
  applyAction(
    r,
    p.id,
    'input',
    { round: 1, quest: r.trip.quest.id, seq: 1, direction: 0, jump: false },
    r.trip.quest.start + 90001,
  );
  assert.equal(r.phase, 'quest-results');
});
test('a complete three-era match carries cards and reaches the final scoreboard', () => {
  const [r, p] = room();
  r.players.push(
    ...['kopi', 'pandan', 'otto'].map((c) => ({
      ...makePlayer(c, c, 0),
      bot: true,
    })),
  );
  applyAction(r, p.id, 'board', {}, 0);
  const visited = new Set(),
    races = new Set();
  let now = 0;
  for (let i = 0; i < 500 && r.phase !== 'finished'; i++) {
    now += 1000;
    r.trip.seen[p.id] = now;
    settle(r, now);
    if (r.phase === 'exploring') {
      visited.add(eraOf(r).id);
      if (r.round === 1) r.trip.hands[p.id] = [0, 1];
      applyAction(r, p.id, 'ready', { round: r.round }, now);
    } else if (r.phase === 'board') {
      if ((r.boardTurn ?? 0) >= r.players.length)
        applyAction(
          r,
          p.id,
          r.trip.questPlayed ? 'continue' : 'start',
          {},
          now,
        );
      else if (
        r.players[r.boardTurn ?? 0].id === p.id &&
        (!r.move || r.move.settled)
      )
        applyAction(
          r,
          p.id,
          'roll',
          { round: r.round, turn: r.boardTurn },
          now,
        );
    } else if (r.phase === 'quest') {
      races.add(r.trip.quest.id);
    } else if (r.phase === 'quest-results')
      applyAction(r, p.id, 'resume', {}, now);
    else if (r.phase === 'results') applyAction(r, p.id, 'next', {}, now);
  }
  assert.equal(r.phase, 'finished');
  assert.equal(visited.size, 3);
  assert.equal(races.size, 3);
  assert.deepEqual(r.trip.hands[p.id], [0, 1]);
  assert.ok(r.players.slice(1).every((p) => p.score > 0));
});
test('full hands require an explicit replacement and disconnects transfer hosting', () => {
  const [r, p] = room(),
    g = makePlayer('Guest', 'kopi', 0);
  r.players.push(g);
  applyAction(r, p.id, 'board', {}, 0);
  settle(r, 3000);
  const m = LAYOUTS[eraOf(r).id];
  r.trip.positions[p.id] = { ...m.npcs[0], at: 3000 };
  r.trip.hands[p.id] = [1, 2, 3];
  assert.throws(() =>
    applyAction(r, p.id, 'claim', { round: 1, npc: 0 }, 3001),
  );
  assert.deepEqual(r.trip.hands[p.id], [1, 2, 3]);
  applyAction(r, p.id, 'claim', { round: 1, npc: 0, replace: 1 }, 3002);
  assert.deepEqual(r.trip.hands[p.id], [1, 3, 0]);
  r.trip.seen[g.id] = 40000;
  settle(r, 40000);
  assert.equal(r.host, g.id);
  assert.equal(r.phase, 'exploring');
  applyAction(r, g.id, 'ready', { round: 1 }, 40000);
  assert.equal(r.phase, 'board');
});
