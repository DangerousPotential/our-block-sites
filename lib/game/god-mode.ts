import { makePlayer, makeRoom, type Room } from './engine';
import { enableParty } from './party';
import { createMinigame, MINIGAMES, type MinigameId } from './party-games';
import { TRIP_ERAS, type TripEra } from './trip';

/** A separate, in-memory session. Never submitted to the room API. */
export function makeGodModeGame(
  kind: MinigameId,
  era: TripEra | 'pastimes',
  character: string,
  age: number,
  now = Date.now(),
): Room {
  const player = makePlayer('You', character, age);
  const room = enableParty(makeRoom('PRACTICE', player));
  room.round = MINIGAMES.findIndex((game) => game.id === kind) + 1;
  room.phase = 'playing';
  room.year =
    era === 'pastimes'
      ? 1950
      : (TRIP_ERAS.find((entry) => entry.id === era) ?? TRIP_ERAS[1]).year;
  room.trip!.eras = Array.from({ length: MINIGAMES.length }, () =>
    era === 'pastimes' || era === 'river' ? 'river' : 'estate',
  );
  room.trip!.hands[player.id] = [0, 1, 2, 3];
  room.trip!.notice = '';
  room.party!.stage = 'game';
  room.party!.game = createMinigame(room, now + (kind === 'rhythm' ? 3000 : 0));
  return room;
}
