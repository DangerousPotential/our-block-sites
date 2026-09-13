import type { Room } from './engine';

export const FLAGS = ['Singapore', 'Japan', 'France', 'Germany'] as const;
export const DESK = {
  width: 100,
  height: 64,
  eraserWidth: 12,
  eraserHeight: 8,
  turnMs: 25000,
  flightMs: 1050,
  startingStock: 3,
  showdownMs: 4500,
  captureMs: 1800,
};
export type EraserPiece = { x: number; y: number; flag: number };
export type EraserShot = {
  playerId: string;
  turn: number;
  startedAt: number;
  endsAt: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  offDesk: boolean;
};
export type EraserState = {
  match: number;
  turn: number;
  active: string;
  deadline: number;
  pieces: Record<string, EraserPiece>;
  shot?: EraserShot;
  winner?: string;
  winReason?: 'stack' | 'turn-limit';
  notice: string;
  stock?: Record<string, number>;
  duel?: number;
  readyAt?: number;
  capture?: { winner: string; loser: string; reason: 'stack' | 'turn-limit' };
};
export function enableEraser(room: Room) {
  room.rulesVersion = 4;
  room.totalRounds = 1;
  room.eraser = {
    match: (room.eraser?.match ?? 0) + 1,
    turn: 1,
    active: room.host,
    deadline: 0,
    pieces: {},
    stock: {},
    duel: 1,
    notice: 'Two students. One desk. Land on top to win.',
  };
  room.phase = 'lobby';
  return room;
}
export function eraserTarget(
  from: { x: number; y: number },
  x: number,
  y: number,
  power: number,
) {
  const length = Math.hypot(x, y);
  const distance = 6 + power * 46;
  return {
    x: from.x + (x / length) * distance,
    y: from.y + (y / length) * distance,
  };
}
export function isOnDesk(p: { x: number; y: number }) {
  return (
    p.x >= DESK.eraserWidth / 2 &&
    p.x <= DESK.width - DESK.eraserWidth / 2 &&
    p.y >= DESK.eraserHeight / 2 &&
    p.y <= DESK.height - DESK.eraserHeight / 2
  );
}
export function stacked(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const overlapX = Math.max(0, DESK.eraserWidth - Math.abs(a.x - b.x));
  const overlapY = Math.max(0, DESK.eraserHeight - Math.abs(a.y - b.y));
  // A corner graze is not a stack: at least 30% of the footprint must be supported.
  return overlapX * overlapY >= DESK.eraserWidth * DESK.eraserHeight * 0.3;
}
function captureEraser(
  room: Room,
  winnerId: string,
  loserId: string,
  now: number,
) {
  const game = room.eraser!;
  game.stock ??= Object.fromEntries(
    room.players.map((p) => [p.id, DESK.startingStock]),
  );
  game.stock[loserId] = Math.max(
    0,
    (game.stock[loserId] ?? DESK.startingStock) - 1,
  );
  game.capture = { winner: winnerId, loser: loserId, reason: 'stack' };
  const winner = room.players.find((p) => p.id === winnerId)!;
  const loser = room.players.find((p) => p.id === loserId)!;
  if (game.stock[loserId] === 0) {
    game.winner = winnerId;
    game.winReason = 'stack';
    room.phase = 'finished';
    winner.score++;
    game.notice = `${winner.name} wins the showdown. ${loser.name} has no erasers left.`;
  } else {
    game.readyAt = now + DESK.captureMs;
    game.notice = `${winner.name} captures an eraser! ${loser.name} has ${game.stock[loserId]} left.`;
  }
}
function nextTurn(room: Room, now: number) {
  const game = room.eraser!;
  game.active = room.players.find((p) => p.id !== game.active)!.id;
  game.turn++;
  game.deadline = now + DESK.turnMs;
}
function resetPositions(room: Room) {
  const game = room.eraser!;
  room.players.forEach((p, i) => {
    game.pieces[p.id] = {
      x: i ? 71 : 29,
      y: 32,
      flag: game.pieces[p.id]?.flag ?? i,
    };
  });
}
function launch(
  room: Room,
  id: string,
  x: number,
  y: number,
  power: number,
  now: number,
) {
  const game = room.eraser!;
  const from = { x: game.pieces[id].x, y: game.pieces[id].y };
  const to = eraserTarget(from, x, y, power);
  game.shot = {
    playerId: id,
    turn: game.turn,
    startedAt: now,
    endsAt: now + DESK.flightMs,
    from,
    to,
    offDesk: !isOnDesk(to),
  };
  game.notice = `${room.players.find((p) => p.id === id)!.name} takes a shot!`;
}
export function settleEraser(room: Room, now: number) {
  const game = room.eraser;
  if (!game || room.phase !== 'playing') return;
  if (now < (game.readyAt ?? 0)) return;
  if (game.capture) {
    game.active = game.capture.loser;
    game.capture = undefined;
    game.shot = undefined;
    game.turn++;
    game.duel = (game.duel ?? 1) + 1;
    game.deadline = now + DESK.turnMs;
    resetPositions(room);
    game.notice = 'Fresh erasers. The player who lost one flicks first.';
    return;
  }
  const shot = game.shot;
  if (shot && shot.turn === game.turn) {
    if (now < shot.endsAt) return;
    const opponent = room.players.find((p) => p.id !== shot.playerId)!;
    const piece = game.pieces[shot.playerId];
    if (!shot.offDesk) {
      piece.x = shot.to.x;
      piece.y = shot.to.y;
      if (stacked(piece, game.pieces[opponent.id])) {
        captureEraser(room, shot.playerId, opponent.id, now);
        return;
      }
    }
    game.notice = shot.offDesk
      ? 'Off the desk! Your eraser returns; the turn passes.'
      : 'No stack. The other student takes a turn.';
    nextTurn(room, now);
    return;
  }
  if (now >= game.deadline) {
    game.notice = 'Time is up. The turn passes.';
    nextTurn(room, now);
    return;
  }
  const active = room.players.find((p) => p.id === game.active)!;
  if (active.bot && now >= game.deadline - DESK.turnMs + 1800) {
    const from = game.pieces[active.id];
    const opponent =
      game.pieces[room.players.find((p) => p.id !== active.id)!.id];
    // Deterministic small aim errors give practice a beatable opponent.
    const error = Math.sin(room.seed + game.turn * 2.4) * 9;
    const dx = opponent.x - from.x + error;
    const dy = opponent.y - from.y + Math.cos(room.seed + game.turn) * 7;
    launch(
      room,
      active.id,
      dx || 0.01,
      dy,
      Math.max(0, Math.min(1, (Math.hypot(dx, dy) - 6) / 46)),
      now,
    );
  }
}
export function actEraser(
  room: Room,
  id: string,
  action: string,
  v: Record<string, unknown>,
  now: number,
) {
  const game = room.eraser!;
  if (!room.players.some((p) => p.id === id))
    throw new Error('Rejoin your seat.');
  if (action === 'start') {
    if (id !== room.host || room.phase !== 'lobby')
      throw new Error('Only the host can start from the lobby.');
    if (room.players.length !== 2)
      throw new Error('Wait for the second student to join.');
    resetPositions(room);
    game.stock = Object.fromEntries(
      room.players.map((p) => [p.id, DESK.startingStock]),
    );
    game.duel = 1;
    game.readyAt = now + DESK.showdownMs;
    game.active = room.host;
    game.deadline = game.readyAt + DESK.turnMs;
    room.phase = 'playing';
    game.notice = 'Three erasers each. Capture all three to win.';
  } else if (action === 'flag') {
    if (
      room.phase !== 'lobby' ||
      !Number.isInteger(v.flag) ||
      Number(v.flag) < 0 ||
      Number(v.flag) >= FLAGS.length
    )
      throw new Error('Choose a flag before the match starts.');
    game.pieces[id] = { x: 0, y: 0, flag: Number(v.flag) };
  } else if (action === 'flick') {
    if (
      room.phase !== 'playing' ||
      now < (game.readyAt ?? 0) ||
      !!game.capture ||
      id !== game.active ||
      v.match !== game.match ||
      v.turn !== game.turn
    )
      throw new Error('That turn has passed. Wait for your next turn.');
    if (game.shot?.turn === game.turn)
      throw new Error('Your eraser is still moving.');
    const { x, y, power } = v;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof power !== 'number' ||
      ![x, y, power].every(Number.isFinite) ||
      Math.abs(x) > 1 ||
      Math.abs(y) > 1 ||
      Math.hypot(x, y) < 0.1 ||
      power < 0 ||
      power > 1
    )
      throw new Error('Try a clear directional flick.');
    launch(room, id, x, y, power, now);
  } else if (action === 'restart') {
    if (id !== room.host || room.phase !== 'finished')
      throw new Error('Only the host can start a rematch after the result.');
    const flags = game.pieces;
    enableEraser(room);
    room.eraser!.pieces = flags;
  } else
    throw new Error('That action is not available in Flag Eraser Showdown.');
  return room;
}
