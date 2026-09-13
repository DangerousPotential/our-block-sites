import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMotion,
  tiltAxes,
  validMotion,
} from '../lib/game/phone-motion.ts';
import { makeGodModeGame } from '../lib/game/god-mode.ts';
import { inputMinigame, settleMinigame } from '../lib/game/party-games.ts';

test('calibrated tilt is neutral, bounded and rotates with the screen', () => {
  const base = { beta: 35, gamma: 5 };
  assert.deepEqual(tiltAxes(35, 5, base, 0), { x: 0, y: 0 });
  assert.deepEqual(tiltAxes(35, 27, base, 0), { x: 1, y: 0 });
  const landscape = tiltAxes(35, 27, base, 90);
  assert.ok(Math.abs(landscape.x) < 1e-10);
  assert.equal(landscape.y, -1);
  assert.deepEqual(tiltAxes(100, -100, base, 0), { x: -1, y: 1 });
});

test('sensor validation preserves unavailable sensors and rejects malformed input', () => {
  assert.ok(validMotion(emptyMotion()));
  assert.ok(
    validMotion({
      ...emptyMotion(),
      acceleration: [0, -3, 12],
      rotation: [5, 0, 2],
    }),
  );
  for (const changes of [
    { x: 2 },
    { y: NaN },
    { jumpId: -1 },
    { pressId: 1.5 },
    { press: 4 },
    { acceleration: [0, 0] },
    { rotation: [Infinity, 0, 0] },
    { orientation: ['0', 0, 0] },
  ]) {
    assert.equal(validMotion({ ...emptyMotion(), ...changes }), false);
  }
  assert.equal(validMotion(null), false);
});

test('phone tilt drives real minigame movement', () => {
  const room = makeGodModeGame('balance', 'estate', 'merly', 0, 1000);
  const axes = tiltAxes(0, 22, { beta: 0, gamma: 0 }, 0);
  inputMinigame(
    room,
    room.host,
    { game: room.party.game.id, seq: 1, ...axes, jump: false },
    1100,
  );
  settleMinigame(room, 1400);
  assert.ok(room.party.game.players[room.host].x > -4.5);
});

test('phone actions are bounded and stale movement expires', async () => {
  const { validPhoneCommand, freshMotion } =
    await import('../lib/game/phone-motion.ts');
  const command = {
    id: 1,
    scene: 'game:forest:estate:0',
    action: 'input',
    payload: { x: 1 },
  };
  assert.equal(validPhoneCommand(command), true);
  for (const changes of [
    { id: -1 },
    { id: 1.1 },
    { scene: 'x'.repeat(200) },
    { action: 'delete' },
    { payload: [] },
    { payload: null },
  ])
    assert.equal(validPhoneCommand({ ...command, ...changes }), false);
  const packet = { sample: { ...emptyMotion(), x: 1 }, receivedAt: 1000 };
  assert.equal(freshMotion(packet, 1599)?.x, 1);
  assert.equal(freshMotion(packet, 1600), null);
  assert.equal(freshMotion(null, 1000), null);
});
