// Run against the local dev server: node --import ./tests/register.mjs tests/phone-motion-api.test.mjs
import assert from 'node:assert/strict';
import { emptyMotion } from '../lib/game/phone-motion.ts';
import { makeGodModeGame } from '../lib/game/god-mode.ts';
import { publicRoom } from '../lib/game/engine.ts';
import { MINIGAMES } from '../lib/game/party-games.ts';
const origin = process.env.OUR_BLOCK_TEST_URL || 'http://localhost:3000';
async function request(body, token = '') {
  const response = await fetch(`${origin}/api/motion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
}
const session = await request({ action: 'create' });
assert.equal(session.status, 200);
const { id, host, phone } = session;
try {
  assert.equal((await request({ action: 'read', id }, phone)).status, 401);
  assert.equal(
    (await request({ action: 'sample', id, sample: emptyMotion() }, host))
      .status,
    401,
  );
  assert.equal(
    (
      await request(
        {
          action: 'sample',
          id,
          sample: emptyMotion(),
          command: { action: 'delete' },
        },
        phone,
      )
    ).status,
    400,
  );
  for (let i = 0; i < MINIGAMES.length; i++) {
    const room = makeGodModeGame(MINIGAMES[i].id, 'estate', 'merly', 0);
    const screen = {
      id: `scene:${i}`,
      destination: `game:${MINIGAMES[i].id}`,
      era: 'estate',
      character: 'merly',
      age: 0,
      room: publicRoom(room, room.host),
      playerId: room.host,
    };
    const sample = { ...emptyMotion(), x: i % 2 ? -1 : 1 };
    const command = {
      id: i + 1,
      scene: screen.id,
      action: 'input',
      payload: { x: sample.x },
    };
    // Concurrent writes must preserve both the scene and the phone's action.
    await Promise.all([
      request({ action: 'read', id, screen, ack: i }, host),
      request({ action: 'sample', id, sample, command }, phone),
    ]);
    const read = await request({ action: 'read', id }, host);
    assert.deepEqual(read.sample, sample);
    assert.deepEqual(read.command, command);
    const reply = await request(
      { action: 'sample', id, sample, command },
      phone,
    );
    assert.equal(reply.screen.room.party.game.kind, MINIGAMES[i].id);
    assert.equal(reply.ack, i);
    assert.ok(reply.age < 3000);
    assert.ok(!JSON.stringify(reply).includes(host));
    assert.ok(!JSON.stringify(reply).includes(phone));
    assert.ok(!JSON.stringify(reply).includes(room.players[0].token));
    await request({ action: 'read', id, screen, ack: i + 1 }, host);
    assert.equal(
      (await request({ action: 'sample', id, sample }, phone)).ack,
      i + 1,
    );
  }
} finally {
  assert.equal((await request({ action: 'disconnect', id }, host)).status, 200);
}
assert.equal(
  (await request({ action: 'sample', id, sample: emptyMotion() }, phone))
    .status,
  404,
);
console.log(
  'PASS: all party scene snapshots, concurrent bidirectional writes, action acknowledgements, credential isolation and disconnect.',
);
