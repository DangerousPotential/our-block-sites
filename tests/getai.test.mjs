import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlayer } from '../lib/game/engine.ts';
import { makeGodModeGame } from '../lib/game/god-mode.ts';
import {
  createMinigame,
  getaiTimeline,
  getaiPlaybackTime,
  inputMinigame,
  noteLane,
  finishMinigame,
  updateGetaiPlayback,
} from '../lib/game/party-games.ts';

function setup() {
  const room = makeGodModeGame('rhythm', 'pastimes', 'merly', 0, 1000);
  room.players.push(makePlayer('Friend', 'kopi', 0));
  room.party.game = createMinigame(room, 4000);
  return room;
}
function media(room, elapsed, now, overrides = {}) {
  updateGetaiPlayback(
    room,
    room.host,
    {
      position: 15 + elapsed / 1000,
      duration: 255,
      playing: true,
      ended: false,
      seq: now,
      ...overrides,
    },
    now,
  );
}

test('three singalong breaks span the full recording and freeze note time', () => {
  for (const [index, fraction] of [0.23, 0.5, 0.77].entries()) {
    const start = 240000 * fraction;
    const before = getaiTimeline(start, 240000);
    assert.equal(before.pitStop, index);
    assert.equal(getaiTimeline(start + 5999, 240000).elapsed, before.elapsed);
    assert.equal(getaiTimeline(start + 6000, 240000).pitStop, -1);
    assert.equal(getaiTimeline(start + 6000, 240000).elapsed, before.elapsed);
  }
});

test('all players stop scoring during a singalong and score on resumed music', () => {
  const room = setup(),
    g = room.party.game;
  media(room, 55200, 60000);
  for (const player of room.players) {
    inputMinigame(
      room,
      player.id,
      { x: 0, y: 0, jump: false, game: g.id, seq: 1, press: noteLane(g, 79) },
      60000,
    );
    assert.equal(g.players[player.id].points, 0);
  }
  media(room, 61300, 66100);
  for (const player of room.players) {
    inputMinigame(
      room,
      player.id,
      { x: 0, y: 0, jump: false, game: g.id, seq: 2, press: noteLane(g, 79) },
      66100,
    );
    assert.equal(g.players[player.id].points, 3);
  }
});

test('round runs beyond 47 seconds and completes only at the recording end', () => {
  const room = setup();
  assert.equal(
    finishMinigame(room, 1000000),
    false,
    'unloaded music must not finish',
  );
  media(room, 60000, 64000);
  assert.equal(
    finishMinigame(room, 1000000),
    false,
    'wall clock cannot finish music',
  );
  media(room, 100000, 104000, { ended: true });
  assert.equal(
    finishMinigame(room, 104000),
    false,
    'early end reports are ignored',
  );
  media(room, 240000, 244000, { playing: false, ended: true });
  assert.equal(finishMinigame(room, 244000), true);
  const scores = room.players.map((p) => p.score);
  assert.equal(finishMinigame(room, 245000), true);
  assert.deepEqual(
    room.players.map((p) => p.score),
    scores,
  );
});

test('buffering freezes notes; only fresh authenticated host samples control playback', () => {
  const room = setup(),
    g = room.party.game;
  media(room, 700, 4700);
  assert.equal(getaiPlaybackTime(g, 4900), 900);
  assert.equal(
    getaiPlaybackTime(g, 9000),
    1200,
    'stale sample extrapolation is capped',
  );
  media(room, 900, 4900, { playing: false });
  assert.equal(getaiPlaybackTime(g, 9000), 900);
  const original = structuredClone(g.music);
  updateGetaiPlayback(
    room,
    room.players[1].id,
    { ...original, position: 255, ended: true, seq: 99999 },
    5000,
  );
  updateGetaiPlayback(
    room,
    room.host,
    { ...original, position: NaN, seq: 99999 },
    5000,
  );
  updateGetaiPlayback(
    room,
    room.host,
    { ...original, position: 100, seq: 1 },
    5000,
  );
  assert.deepEqual(g.music, original);
});

test('accurate hits sometimes produce praise stickers, with a cooldown', () => {
  const room = setup(),
    g = room.party.game,
    p = g.players[room.host];
  g.seed = 12345;
  const shown = [];
  for (let beat = 1; beat <= 60; beat++) {
    const now = 4000 + beat * 700;
    media(room, beat * 700, now);
    inputMinigame(
      room,
      room.host,
      {
        x: 0,
        y: 0,
        jump: false,
        game: g.id,
        seq: beat,
        press: noteLane(g, beat),
      },
      now,
    );
    if (p.reaction?.at === now) shown.push({ ...p.reaction });
  }
  assert.equal(p.points, 639);
  assert.ok(shown.length > 0 && shown.length < 40);
  assert.ok(shown.every((r) => r.sticker >= 0 && r.sticker <= 2));
  assert.ok(shown.every((r, i) => i === 0 || r.at - shown[i - 1].at >= 2200));
});

test('near hits do not trigger accurate-hit praise; wrong lanes can trigger Alamak', () => {
  const room = setup(),
    g = room.party.game,
    p = g.players[room.host];
  media(room, 820, 4820);
  inputMinigame(
    room,
    room.host,
    { x: 0, y: 0, jump: false, game: g.id, seq: 1, press: noteLane(g, 1) },
    4820,
  );
  assert.equal(p.points, 1);
  assert.equal(p.reaction, undefined);
  for (let beat = 2; beat < 60; beat++) {
    const now = 4000 + beat * 700;
    media(room, beat * 700, now);
    inputMinigame(
      room,
      room.host,
      {
        x: 0,
        y: 0,
        jump: false,
        game: g.id,
        seq: beat,
        press: (noteLane(g, beat) + 1) % 4,
      },
      now,
    );
  }
  assert.equal(p.points, 1);
  assert.equal(p.reaction?.sticker, 3);
});

test('unplayed notes are judged once, and buffering or singalong cannot create misses', async () => {
  const { settleMinigame } = await import('../lib/game/party-games.ts');
  const room = setup(),
    g = room.party.game,
    p = g.players[room.host];
  media(room, 1000, 5000);
  settleMinigame(room, 5000);
  assert.equal(p.reactionCount, 1);
  settleMinigame(room, 5000);
  assert.equal(p.reactionCount, 1);
  media(room, 2000, 6000, { playing: false });
  settleMinigame(room, 6000);
  assert.equal(p.reactionCount, 1);
  media(room, 55200, 59200);
  settleMinigame(room, 59200);
  assert.equal(p.reactionCount, 1);
});

test('streak multipliers award points, cap at four, and reset on wrong or skipped notes', async () => {
  const { getaiMultiplier, settleMinigame } =
    await import('../lib/game/party-games.ts');
  const room = setup(),
    g = room.party.game,
    p = g.players[room.host];
  for (let beat = 1; beat <= 15; beat++) {
    const now = 4000 + beat * 700;
    media(room, beat * 700, now);
    inputMinigame(
      room,
      room.host,
      {
        x: 0,
        y: 0,
        jump: false,
        game: g.id,
        seq: beat,
        press: noteLane(g, beat),
      },
      now,
    );
  }
  assert.equal(p.streak, 15);
  assert.equal(getaiMultiplier(p.streak), 4);
  assert.equal(p.points, 99);
  assert.equal(g.players[room.players[1].id].points, 0);
  media(room, 11200, 15200);
  inputMinigame(
    room,
    room.host,
    {
      x: 0,
      y: 0,
      jump: false,
      game: g.id,
      seq: 16,
      press: (noteLane(g, 16) + 1) % 4,
    },
    15200,
  );
  assert.equal(p.streak, 0);
  assert.equal(getaiMultiplier(p.streak), 1);
  assert.equal(p.bestStreak, 15);
  media(room, 11900, 15900);
  inputMinigame(
    room,
    room.host,
    { x: 0, y: 0, jump: false, game: g.id, seq: 17, press: noteLane(g, 17) },
    15900,
  );
  assert.equal(p.streak, 1);
  media(room, 12900, 16900);
  settleMinigame(room, 16900);
  assert.equal(p.streak, 0);
});

test('mic levels are shared only during the matching singalong, without awarding points', () => {
  const room = setup(),
    g = room.party.game,
    id = room.players[1].id;
  const packet = {
    x: 0,
    y: 0,
    jump: false,
    game: g.id,
    seq: 1,
    voice: { pitStop: 0, active: true, level: 0.5 },
  };
  media(room, 700, 4700);
  inputMinigame(room, id, packet, 4700);
  assert.equal(g.players[id].voice, undefined);
  media(room, 55200, 59200);
  for (let i = 0; i < 6; i++)
    inputMinigame(room, id, { ...packet, seq: i + 2 }, 59200 + i * 100);
  assert.equal(g.players[id].voice.heardMs, 500);
  assert.equal(g.players[id].voice.active, true);
  assert.equal(g.players[id].points, 0);
  assert.equal(g.players[room.host].voice, undefined);
  const original = structuredClone(g.players[id].voice);
  inputMinigame(
    room,
    id,
    { ...packet, seq: 8, voice: { ...packet.voice, pitStop: 2 } },
    59800,
  );
  assert.deepEqual(g.players[id].voice, original);
  inputMinigame(
    room,
    id,
    { ...packet, seq: 9, voice: { ...packet.voice, level: Infinity } },
    59900,
  );
  assert.deepEqual(g.players[id].voice, original);
  inputMinigame(
    room,
    id,
    { ...packet, seq: 10, voice: { ...packet.voice, active: false } },
    60000,
  );
  assert.equal(g.players[id].voice.active, false);
  assert.equal(g.players[id].voice.level, 0);
});

test('recent phone taps score at their visible beat despite relay latency; stale or future taps cannot rewind', () => {
  for (const [pressAt, expected] of [
    [4700, 3],
    [3000, 0],
    [9000, 0],
  ]) {
    const room = setup(),
      g = room.party.game;
    media(room, 700, 4700);
    const input = {
      x: 0,
      y: 0,
      jump: false,
      game: g.id,
      seq: 1,
      pressId: 1,
      press: noteLane(g, 1),
      pressAt,
      pressTime: 700,
    };
    inputMinigame(room, room.host, input, 4950);
    assert.equal(g.players[room.host].points, expected);
    inputMinigame(room, room.host, { ...input, seq: 2 }, 5150);
    assert.equal(
      g.players[room.host].points,
      expected,
      'retry cannot score the same tap twice',
    );
  }
});
