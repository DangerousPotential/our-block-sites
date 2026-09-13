import { actEraser, settleEraser, type EraserState } from './eraser';
import { actParty, settleParty, type PartyState } from './party';
import { actTrip, settleTrip, type TripState } from './trip';
export const HOP_MS = 360;
export const ROLL_MS = 900;
export const BOARD_TILES = [
  ['Home', 2],
  ['Kopitiam', 2],
  ['Bus fare', -1],
  ['Community', 3],
  ['Void deck', 0],
  ['Hawker', 2],
  ['Rainy day', -2],
  ['Playground', 1],
  ['Kaki favour', 3],
  ['Market', -1],
  ['Payday', 4],
  ['MRT', -1],
  ['Library', 1],
  ['Pasar malam', 2],
  ['Repairs', -2],
  ['Community', 3],
  ['Kopitiam', 2],
  ['Bus fare', -1],
  ['Lucky day', 4],
  ['Void deck', 0],
  ['Kaki favour', 3],
  ['Market', -1],
] as const;
// Tile centres traced from the original 1672 × 941 courtyard artwork.
// Image and tokens must share one aspect-ratio container; never independently crop them.
export const BOARD_POINTS = [
  [969, 843],
  [810, 833],
  [675, 778],
  [560, 723],
  [473, 673],
  [389, 629],
  [355, 582],
  [374, 536],
  [427, 484],
  [518, 440],
  [622, 395],
  [724, 374],
  [809, 383],
  [902, 410],
  [995, 444],
  [1076, 477],
  [1109, 528],
  [1183, 577],
  [1275, 627],
  [1295, 698],
  [1194, 755],
  [1093, 804],
] as const;
export function tilePoint(position: number) {
  const n =
    ((position % BOARD_POINTS.length) + BOARD_POINTS.length) %
    BOARD_POINTS.length;
  return {
    x: (BOARD_POINTS[n][0] / 1672) * 100,
    y: (BOARD_POINTS[n][1] / 941) * 100,
  };
}
export type BoardMove = {
  playerId: string;
  from: number;
  steps: number;
  startedAt: number;
  endsAt: number;
  turn: number;
  round: number;
  reward: number;
  settled?: boolean;
};
export const ROUND_MS = 30000;
export const FOODS = ['Kopi', 'Kaya toast', 'Kueh', 'Laksa'] as const;
export const FOOD_SYMBOLS = ['☕', '🍞', '🍰', '🍜'];
export type Player = {
  id: string;
  token: string;
  name: string;
  character: string;
  age: number;
  score: number;
  roundScore: number;
  step: number;
  lastTap: number;
  bot?: boolean;
  position: number;
};
export type Room = {
  code: string;
  host: string;
  phase:
    | 'lobby'
    | 'board'
    | 'playing'
    | 'results'
    | 'finished'
    | 'exploring'
    | 'revealing'
    | 'quest'
    | 'quest-results';
  rulesVersion?: 2 | 3 | 4;
  eraser?: EraserState;
  party?: PartyState;
  displayToken?: string;
  trip?: TripState;
  round: number;
  year: number;
  previousYear: number;
  twist: number;
  startedAt: number;
  players: Player[];
  seed: number;
  totalRounds: number;
  boardTurn?: number;
  move?: BoardMove | null;
};
export const TWISTS = [
  {
    name: 'The usual, please',
    description: 'Match the dish to the order.',
    short: 'Classic orders',
  },
  {
    name: 'Double portions',
    description: 'Match the dish to the order.',
    short: 'Double points',
  },
  {
    name: 'Counter shuffle',
    description: 'Dishes swap places every 8 seconds.',
    short: 'Shuffled counter',
  },
  {
    name: 'Last call!',
    description: 'Triple points in the last 10 seconds.',
    short: 'Last-call bonus',
  },
];
export function makeRoom(code: string, host: Player, rounds = 3): Room {
  return {
    code,
    host: host.id,
    phase: 'lobby',
    round: 1,
    year: 1987,
    previousYear: 1987,
    twist: 0,
    startedAt: 0,
    players: [host],
    seed: Math.floor(Math.random() * 100000),
    totalRounds: rounds,
    boardTurn: 0,
    move: null,
  };
}
export function makePlayer(
  name: string,
  character: string,
  age: number,
): Player {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    name: name.slice(0, 20),
    character,
    age,
    score: 0,
    roundScore: 0,
    step: 0,
    lastTap: 0,
    position: 0,
  };
}
function hash(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++)
    n = (Math.imul(n, 31) + s.charCodeAt(i)) | 0;
  return n >>> 0;
}
export function orderFor(room: Room, player: Pick<Player, 'id' | 'step'>) {
  return hash(`${room.seed}:${room.round}:${player.id}:${player.step}`) % 4;
}
function roll(room: Room, now: number) {
  const turn = room.boardTurn ?? 0;
  const p = room.players[turn];
  const steps = 1 + Math.floor(Math.random() * 6);
  const destination = (p.position + steps) % BOARD_TILES.length;
  room.move = {
    playerId: p.id,
    from: p.position,
    steps,
    startedAt: now,
    endsAt: now + ROLL_MS + steps * HOP_MS + 1100,
    turn,
    round: room.round,
    reward:
      BOARD_TILES[destination][1] +
      (p.position + steps >= BOARD_TILES.length ? 2 : 0),
  };
}
export function settle(room: Room, now = Date.now()): Room {
  if (room.rulesVersion === 4) {
    settleEraser(room, now);
    return room;
  }
  if (room.rulesVersion === 3) {
    settleParty(room, now);
    return room;
  }
  if (room.rulesVersion === 2) {
    settleTrip(room, now);
    return room;
  }
  if (room.phase === 'board') {
    room.boardTurn ??= 0;
    const move = room.move;
    if (move && !move.settled && now >= move.endsAt) {
      const player = room.players.find((p) => p.id === move.playerId)!;
      player.position = (move.from + move.steps) % BOARD_TILES.length;
      player.score = Math.max(0, player.score + move.reward);
      move.settled = true;
      room.boardTurn++;
    }
    if ((!room.move || room.move.settled) && room.players[room.boardTurn]?.bot)
      roll(room, now);
  }
  if (room.phase === 'playing' && now >= room.startedAt + ROUND_MS) {
    room.players = room.players.map((p, i) => {
      const points = p.bot
        ? 12 + (hash(`${room.seed}:${i}:${room.round}`) % 15)
        : p.roundScore;
      return {
        ...p,
        roundScore: points,
        score: p.score + points,
      };
    });
    room.phase = 'results';
  }
  return room;
}
export function applyAction(
  room: Room,
  playerId: string,
  action: string,
  payload: Record<string, unknown> = {},
  now = Date.now(),
): Room {
  settle(room, now);
  if (room.rulesVersion === 4)
    return actEraser(room, playerId, action, payload, now);
  if (room.rulesVersion === 3)
    return actParty(room, playerId, action, payload, now);
  if (room.rulesVersion === 2)
    return actTrip(room, playerId, action, payload, now);
  const p = room.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Your seat could not be found. Rejoin the room.');
  if (action === 'roll') {
    if (room.phase !== 'board') throw new Error('Wait for the board.');
    const turn = room.boardTurn ?? 0;
    if (payload.round !== room.round || payload.turn !== turn)
      throw new Error('That turn has already passed.');
    if (room.players[turn]?.id !== playerId)
      throw new Error('Wait for your turn.');
    if (room.move && !room.move.settled) throw new Error('Still moving!');
    roll(room, now);
    return room;
  }
  if (action === 'serve') {
    if (room.phase !== 'playing' || now < room.startedAt)
      throw new Error('The kitchen is not open yet.');
    if (Number(payload.step) !== p.step) return room;
    if (now - p.lastTap < 150) throw new Error('One order at a time!');
    const correct = Number(payload.food) === orderFor(room, p);
    const amount =
      room.twist === 1
        ? 2
        : room.twist === 3 && now - room.startedAt >= 20000
          ? 3
          : 1;
    p.roundScore = Math.max(0, p.roundScore + (correct ? amount : -1));
    p.step++;
    p.lastTap = now;
    return room;
  }
  if (playerId !== room.host)
    throw new Error('Only the host can advance the game.');
  if (action === 'board') {
    if (room.phase !== 'lobby')
      throw new Error('The game has already started.');
    room.phase = 'board';
    room.boardTurn = 0;
    room.move = null;
  } else if (action === 'start') {
    if (room.phase !== 'board')
      throw new Error('Return to the board before starting.');
    if ((room.boardTurn ?? 0) < room.players.length)
      throw new Error('Everyone rolls first.');
    room.phase = 'playing';
    room.startedAt = now + 3000;
    for (const p of room.players) {
      p.roundScore = 0;
      p.step = 0;
      p.lastTap = 0;
    }
  } else if (action === 'next') {
    if (room.phase !== 'results') throw new Error('Finish this round first.');
    if (room.round >= room.totalRounds) {
      room.phase = 'finished';
    } else {
      room.previousYear = room.year;
      room.year += 8 + Math.floor(Math.random() * 3);
      room.round++;
      room.twist = 1 + Math.floor(Math.random() * 3);
      room.phase = 'board';
      room.boardTurn = 0;
      room.move = null;
    }
  } else if (action === 'restart') {
    if (!['results', 'finished'].includes(room.phase))
      throw new Error('Finish this round first.');
    room.phase = 'lobby';
    room.round = 1;
    room.year = 1987;
    room.previousYear = 1987;
    room.twist = 0;
    room.boardTurn = 0;
    room.move = null;
    for (const p of room.players) {
      p.score = 0;
      p.position = 0;
      p.roundScore = 0;
    }
  } else throw new Error('Unknown game action.');
  return room;
}
export type PublicRoom = Omit<Room, 'players' | 'displayToken'> & {
  players: Omit<Player, 'token'>[];
};
export function publicRoom(room: Room, viewer?: string): PublicRoom {
  const { displayToken: _displayToken, ...safe } = room;
  return {
    ...safe,
    party: room.party
      ? {
          ...room.party,
          offers: viewer ? { [viewer]: room.party.offers[viewer] ?? [] } : {},
        }
      : undefined,
    trip: room.trip
      ? {
          ...room.trip,
          hands: viewer
            ? { [viewer]: [...(room.trip.hands[viewer] ?? [])] }
            : {},
        }
      : undefined,
    players: room.players.map(({ token: _token, ...p }) => p),
  };
}
