import type { Room, PublicRoom } from './engine';
import { actTrip, enableTrip, eraOf, settleTrip, TRIP_ERAS } from './trip';
import {
  MINIGAMES,
  createMinigame,
  finishMinigame,
  inputMinigame,
  playMinigameCard,
  settleMinigame,
  type MinigameState,
} from './party-games';

export type PartyState = {
  stage: 'dice' | 'travel' | 'explore' | 'briefing' | 'game' | 'scores';
  die?: { value: number; at: number; by: string; changed: boolean };
  visited: boolean;
  game?: MinigameState;
  offers: Record<string, number[]>;
};

export function enableParty(room: Room) {
  enableTrip(room);
  room.rulesVersion = 3;
  room.totalRounds = MINIGAMES.length;
  room.trip!.eras = ['estate'];
  room.party = { stage: 'dice', visited: false, offers: {} };
  return room;
}

export function dicePlayer(room: Pick<PublicRoom, 'players' | 'round'>) {
  return room.players[(room.round - 1) % room.players.length];
}

function briefing(room: Room, now: number) {
  room.party!.stage = 'briefing';
  room.party!.game = createMinigame(room, now);
  room.phase = 'board';
  room.trip!.ready = [];
  room.trip!.notice = 'Read the controls, then ready up on your phone.';
}

function rollEra(room: Room, id: string, now: number) {
  const party = room.party!,
    t = room.trip!;
  const value = 1 + Math.floor(Math.random() * 6);
  const old = eraOf(room).id;
  const next = value === 6 ? old : TRIP_ERAS[value <= 3 ? 0 : 1].id;
  party.die = {
    value,
    at: now,
    by: id,
    changed: !party.visited || next !== old,
  };
  t.eras[room.round - 1] = next;
  room.previousYear = room.year;
  room.year = eraOf(room).year;
  party.stage = 'travel';
  t.deadline = now + 3500;
  room.phase = 'revealing';
  t.ready = [];
}

export function settleParty(room: Room, now: number) {
  const party = room.party!,
    t = room.trip!;
  const online = (id: string) => !t.seen || now - (t.seen[id] ?? 0) < 30000;
  if (room.phase !== 'lobby' && !online(room.host)) {
    const replacement = room.players.find((p) => !p.bot && online(p.id));
    if (replacement) room.host = replacement.id;
  }
  if (room.phase === 'lobby' || room.phase === 'finished') return;
  if (party.stage === 'dice') {
    const roller = dicePlayer(room);
    if (roller && (roller.bot || !online(roller.id)))
      rollEra(room, roller.id, now);
  }
  if (party.stage === 'travel' && now >= t.deadline) {
    if (party.die!.changed) {
      party.visited = true;
      party.stage = 'explore';
      room.phase = 'exploring';
      t.deadline = now + 120000;
      t.claims = {};
      t.positions = {};
      party.offers = {};
      for (const p of room.players) {
        t.hands[p.id] ??= [];
        t.counts[p.id] = t.hands[p.id].length;
        party.offers[p.id] = Array.from({ length: 4 }, () =>
          Math.floor(Math.random() * 4),
        );
      }
      t.notice =
        'Explore together. Help up to three neighbours for surprise cards.';
    } else briefing(room, now);
  }
  if (party.stage === 'explore') {
    settleTrip(room, now);
    if (room.phase === 'board') briefing(room, now);
  }
  if (
    party.stage === 'briefing' &&
    room.players
      .filter((p) => !p.bot && online(p.id))
      .every((p) => t.ready.includes(p.id))
  ) {
    party.stage = 'game';
    room.phase = 'playing';
    party.game = createMinigame(room, now + 3000);
    t.notice = 'One card each game. Good luck, kakis!';
  }
  if (party.stage === 'game') {
    settleMinigame(room, now);
    if (finishMinigame(room, now)) {
      party.stage = 'scores';
      room.phase = 'results';
    }
  }
}

export function actParty(
  room: Room,
  id: string,
  action: string,
  v: Record<string, unknown>,
  now: number,
) {
  const party = room.party!,
    t = room.trip!;
  if (!room.players.some((p) => p.id === id))
    throw new Error('Rejoin your seat.');
  (t.seen ??= {})[id] = now;
  if (['input', 'walk'].includes(action) && v.round !== room.round) return room;
  if (
    ['ready', 'claim', 'roll', 'card'].includes(action) &&
    v.round !== room.round
  )
    throw new Error('That round has ended.');
  if (action === 'ready' && v.stage && v.stage !== party.stage) return room;
  if (action === 'input') {
    if (party.stage === 'game') inputMinigame(room, id, v, now);
    return room;
  }
  if (
    action === 'walk' ||
    action === 'claim' ||
    (action === 'ready' && party.stage === 'explore')
  ) {
    if (party.stage !== 'explore') return room;
    actTrip(room, id, action, v, now);
    if (room.phase === 'board') briefing(room, now);
    return room;
  }
  if (action === 'roll' && party.stage === 'dice' && room.phase === 'board') {
    if (dicePlayer(room)?.id !== id)
      throw new Error('It is another kaki’s roll.');
    rollEra(room, id, now);
    return room;
  }
  if (action === 'ready' && party.stage === 'briefing') {
    if (!t.ready.includes(id)) t.ready.push(id);
    settleParty(room, now);
    return room;
  }
  if (action === 'card' && party.stage === 'game') {
    playMinigameCard(room, id, v, now);
    return room;
  }
  if (id !== room.host) throw new Error('Only the host can advance the party.');
  if (action === 'board' && room.phase === 'lobby') {
    room.phase = 'board';
    t.seen = Object.fromEntries(room.players.map((p) => [p.id, now]));
  } else if (
    action === 'next' &&
    party.stage === 'scores' &&
    room.phase === 'results'
  ) {
    if (room.round >= room.totalRounds) room.phase = 'finished';
    else {
      const previous = eraOf(room).id;
      room.round++;
      t.eras[room.round - 1] = previous;
      room.phase = 'board';
      party.stage = 'dice';
      delete party.die;
      delete party.game;
      for (const p of room.players) p.roundScore = 0;
    }
  } else if (action === 'restart' && room.phase === 'finished') {
    enableParty(room);
    room.round = 1;
    room.phase = 'lobby';
    for (const p of room.players) {
      p.score = 0;
      p.roundScore = 0;
      p.position = 0;
    }
  } else throw new Error('That action is not available now.');
  return room;
}
