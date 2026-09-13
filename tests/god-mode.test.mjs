import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGodModeGame } from '../lib/game/god-mode.ts';
import {
  MINIGAMES,
  inputMinigame,
  settleMinigame,
} from '../lib/game/party-games.ts';
import { TRIP_ERAS, eraOf } from '../lib/game/trip.ts';

test('every minigame launches immediately in every party era', () => {
  for (const game of MINIGAMES)
    for (const era of TRIP_ERAS) {
      const room = makeGodModeGame(game.id, era.id, 'pandan', 2, 1000);
      assert.equal(room.phase, 'playing');
      assert.equal(room.party.stage, 'game');
      assert.equal(room.party.game.kind, game.id);
      assert.equal(room.party.game.start, game.id === 'rhythm' ? 4000 : 1000);
      assert.equal(eraOf(room).id, era.id);
      assert.equal(room.players[0].character, 'pandan');
      assert.equal(room.players[0].age, 2);
      assert.ok(room.party.game.players[room.host]);
    }
});

test('direct games accept controls and replay creates an independent session', () => {
  const room = makeGodModeGame('balance', 'estate', 'merly', 0, 1000);
  inputMinigame(
    room,
    room.host,
    { game: room.party.game.id, seq: 1, x: 1, y: 0, jump: false },
    1100,
  );
  settleMinigame(room, 1400);
  assert.ok(room.party.game.players[room.host].x > -4.5);

  const replay = makeGodModeGame('balance', 'estate', 'merly', 0, 1500);
  assert.notEqual(room.host, replay.host);
  assert.equal(replay.party.game.players[replay.host].progress, 0);
  assert.equal(room.party.game.start, 1000);
});

test('1950s climb keeps its own scenery year', () => {
  const room = makeGodModeGame('forest', 'pastimes', 'merly', 0, 1000);
  assert.equal(room.year, 1950);
  assert.equal(room.party.game.year, 1950);
});
test('CPU runners complete all six Singapore climb routes', () => {
  for (const era of ['pastimes', ...TRIP_ERAS.map((e) => e.id)]) {
    const room = makeGodModeGame('forest', era, 'merly', 0, 1000);
    room.players[0].bot = true;
    for (
      let t = 1100;
      t <= 90000 && !room.party.game.players[room.host].finished;
      t += 100
    )
      settleMinigame(room, t);
    assert.ok(room.party.game.players[room.host].finished, era);
  }
});
