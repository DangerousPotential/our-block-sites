import { teaStreamX, moveTeaCup, stepTeaArena } from './teh-tarik';
import type { Room } from './engine';
import { CARDS } from './trip';
import { GETAI_SONGS } from './getai-songs';
import {
  climbPlatforms,
  FOREST_FALL_PENALTY,
  nextForestPlatform,
  stepForestRunner,
  type ForestRunner,
} from './forest-course';

export const MINIGAMES = [
  {
    id: 'forest',
    name: 'Singapore Skyways',
    short: 'Take the high way home',
    description:
      'Climb Singapore’s rooftops and walkways. Catch ropes with Up or Down; jump to let go. Falls lose height. Hard landings cost two points. Reach Home at the top.',
    controls: '← → Move · Space Jump · ↑ ↓ Climb · Enter Home',
    duration: 90,
    panel: 0,
  },
  {
    id: 'balance',
    name: 'Teh Tarik!',
    short: 'Follow the pour. Perfect the pull.',
    description:
      'Compete for one stream of sweet tea. Tilt to steer your metal cup and bump rivals aside. Catch lower for a bigger foam multiplier, or intercept higher. Volume × foam earns your serve score; hard bumps spill tea.',
    controls:
      'Tilt or arrows to steer · Level to stop · Bump rivals · Lower catches earn more foam',
    duration: 35,
    panel: 2,
  },
  {
    id: 'hawker',
    name: 'Last Order, Lah!',
    short: 'Four dishes. A very hungry queue.',
    description:
      'Read your order and tap the matching dish. Correct orders earn three points; a wrong dish costs one. Everyone gets their own queue.',
    controls: 'Tap one of four dishes',
    duration: 35,
    panel: 3,
  },
  {
    id: 'rhythm',
    name: 'Getai Groove',
    short: 'Bring the neighbourhood to its feet',
    description:
      'Watch the four lanes. Tap the matching pad when a note reaches the gold line. A close hit earns three points, a near hit earns one.',
    controls: '1–4 · Tap to the beat · Sing together at the pit stops',
    duration: 0,
    panel: 4,
  },
] as const;
export type MinigameId = (typeof MINIGAMES)[number]['id'];
export type Contender = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  progress: number;
  points: number;
  drops: number;
  seq: number;
  inputAt: number;
  axisX: number;
  axisY: number;
  jump: boolean;
  lastAction: number;
  lastPress?: number;
  lastBeat: number;
  streak?: number;
  bestStreak?: number;
  voice?: {
    pitStop: number;
    level: number;
    active: boolean;
    heardMs: number;
    at: number;
  };
  reaction?: { sticker: number; at: number };
  reactionCount?: number;
  step: number;
  obstacle: number;
  finished: number;
  boost: number;
  steady: number;
  shield: number;
  breeze: number;
  used: boolean;
  teaMl?: number;
  foamMultiplier?: number;
  spilledMl?: number;
  bumpUntil?: number;
  impactUntil?: number;
  impactPower?: number;
  catchingTea?: boolean;
  runner: ForestRunner;
};
export type MinigameState = {
  id: string;
  kind: MinigameId;
  start: number;
  tick: number;
  seed: number;
  year?: number;
  players: Record<string, Contender>;
  results: string[];
  scored: boolean;
  music?: GetaiPlayback;
};
export const DISHES = ['Kopi', 'Kaya toast', 'Kueh', 'Laksa'];
export function gameDefinition(kind: MinigameId) {
  return MINIGAMES.find((g) => g.id === kind)!;
}
export function canEnterForestPortal(
  runner: Pick<ForestRunner, 'x' | 'y' | 'grounded'>,
  year = 1965,
) {
  const portal = climbPlatforms(year).at(-1)!;
  return (
    runner.grounded &&
    runner.y === portal.y &&
    Math.abs(runner.x - portal.x) < 1.5
  );
}
export function pattern(seed: number, step: number) {
  let n = (seed ^ Math.imul(step + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
export function orderForParty(g: MinigameState, index: number, step: number) {
  return pattern(g.seed + index * 71, step) % 4;
}
export type GetaiPlayback = {
  position: number;
  duration: number;
  playing: boolean;
  ended: boolean;
  seq: number;
  at: number;
};
export const GETAI_BREAK_LENGTH = 6000;
export function getaiTimeline(elapsed: number, duration = 240000) {
  const breaks = [0.23, 0.5, 0.77].map((fraction) => duration * fraction);
  const pitStop = breaks.findIndex(
    (start) => elapsed >= start && elapsed < start + GETAI_BREAK_LENGTH,
  );
  const paused = breaks.reduce(
    (total, start) =>
      total + Math.max(0, Math.min(GETAI_BREAK_LENGTH, elapsed - start)),
    0,
  );
  return {
    elapsed: elapsed - paused,
    pitStop,
    remaining:
      pitStop < 0
        ? 0
        : Math.ceil((breaks[pitStop] + GETAI_BREAK_LENGTH - elapsed) / 1000),
  };
}
/** Interpolate only a fresh playing sample; lost connections never run on forever. */
export function getaiPlaybackTime(g: MinigameState, now: number) {
  const music = g.music;
  if (!music) return 0;
  const advance =
    music.playing && !music.ended
      ? Math.max(0, Math.min(500, now - music.at))
      : 0;
  return Math.round(
    Math.max(
      0,
      Math.min(music.duration, music.position + advance / 1000) -
        GETAI_SONGS[0].startSeconds,
    ) * 1000,
  );
}
export function getaiDuration(g: MinigameState) {
  return (
    Math.max(
      0,
      (g.music?.duration ?? GETAI_SONGS[0].startSeconds) -
        GETAI_SONGS[0].startSeconds,
    ) * 1000
  );
}
export function updateGetaiPlayback(
  room: Room,
  id: string,
  value: unknown,
  now: number,
) {
  const g = room.party?.game;
  if (
    !g ||
    g.kind !== 'rhythm' ||
    id !== room.host ||
    now < g.start ||
    g.music?.ended ||
    !value ||
    typeof value !== 'object'
  )
    return;
  const m = value as GetaiPlayback;
  if (
    !Number.isSafeInteger(m.seq) ||
    m.seq <= (g.music?.seq ?? -1) ||
    !Number.isFinite(m.position) ||
    !Number.isFinite(m.duration) ||
    m.duration <= GETAI_SONGS[0].startSeconds ||
    m.duration > 3600 ||
    m.position < 0 ||
    m.position > m.duration + 1 ||
    typeof m.playing !== 'boolean' ||
    typeof m.ended !== 'boolean'
  )
    return;
  g.music = {
    position: m.position,
    duration: m.duration,
    playing: m.playing,
    ended: m.ended && m.position >= m.duration - 1,
    seq: m.seq,
    at: now,
  };
}
export type GetaiVoiceSample = {
  pitStop: number;
  level: number;
  active: boolean;
};
export function getaiMultiplier(streak = 0) {
  return Math.min(4, 1 + Math.floor(Math.max(0, streak) / 5));
}
function updateGetaiVoice(
  g: MinigameState,
  p: Contender,
  value: unknown,
  now: number,
) {
  if (
    g.kind !== 'rhythm' ||
    !g.music ||
    g.music.ended ||
    !value ||
    typeof value !== 'object'
  )
    return;
  const voice = value as GetaiVoiceSample;
  const stop = getaiTimeline(
    getaiPlaybackTime(g, now),
    getaiDuration(g),
  ).pitStop;
  if (
    stop < 0 ||
    voice.pitStop !== stop ||
    typeof voice.active !== 'boolean' ||
    !Number.isFinite(voice.level) ||
    voice.level < 0 ||
    voice.level > 1
  )
    return;
  const prior = p.voice?.pitStop === stop ? p.voice : undefined;
  const sustained =
    voice.active && voice.level > 0.12 && prior?.active && prior.level > 0.12
      ? Math.max(0, Math.min(150, now - prior.at))
      : 0;
  p.voice = {
    pitStop: stop,
    level: voice.active ? voice.level : 0,
    active: voice.active,
    heardMs: Math.min(6000, (prior?.heardMs ?? 0) + sustained),
    at: now,
  };
}
function getaiHit(p: Contender, beat: number, points: number) {
  p.streak = p.lastBeat === beat - 1 ? (p.streak ?? 0) + 1 : 1;
  p.bestStreak = Math.max(p.bestStreak ?? 0, p.streak);
  p.points += points * getaiMultiplier(p.streak);
  p.lastBeat = beat;
}
export function noteLane(g: MinigameState, beat: number) {
  return pattern(g.seed, beat) % 4;
}
export function obstacleFor(g: MinigameState, index: number) {
  return {
    lane: ((pattern(g.seed, index) % 3) - 1) * 3,
    low: index % 3 !== 0,
    at: (index + 1) * 18,
  };
}
export function createMinigame(room: Room, start: number): MinigameState {
  return {
    year: room.year,
    id: `${room.round}:${start}`,
    kind: MINIGAMES[(room.round - 1) % MINIGAMES.length].id,
    start,
    tick: 0,
    seed: room.seed + room.round * 173,
    results: [],
    scored: false,
    players: Object.fromEntries(
      room.players.map((p, index) => [
        p.id,
        {
          x:
            MINIGAMES[(room.round - 1) % MINIGAMES.length].id === 'balance'
              ? [-4.5, -1.5, 1.5, 4.5][index % 4]
              : 0,
          y:
            MINIGAMES[(room.round - 1) % MINIGAMES.length].id === 'balance'
              ? 4
              : 0,
          teaMl: 0,
          foamMultiplier: 1,
          spilledMl: 0,
          vx: 0,
          vy: 0,
          progress: 0,
          points: 0,
          drops: 0,
          seq: 0,
          inputAt: start,
          axisX: 0,
          axisY: 0,
          jump: false,
          lastAction: 0,
          lastBeat: -1,
          step: 0,
          obstacle: -1,
          finished: 0,
          boost: 0,
          steady: 0,
          shield: 0,
          breeze: 0,
          used: false,
          runner: {
            x: 0,
            y: 0,
            vy: 0,
            checkpoint: 0,
            grounded: true,
            grace: 0,
            direction: 0,
            jump: false,
            inputAt: start,
            seq: 0,
            finished: 0,
            boost: 0,
            steady: 0,
            shield: 0,
            breeze: 0,
            used: false,
          },
        } satisfies Contender,
      ]),
    ),
  };
}
export function stepContender(
  g: MinigameState,
  p: Contender,
  now: number,
  dt = 1 / 30,
) {
  if (p.finished) return;
  if (g.kind === 'forest') {
    Object.assign(p.runner, {
      direction: p.axisX,
      climb: p.axisY,
      jump: p.jump,
      boost: p.boost,
      steady: p.steady,
      shield: p.shield,
      breeze: p.breeze,
    });
    stepForestRunner(p.runner, now, dt, g.year);
    // Landing is not completion: the player must deliberately enter the portal.
    p.runner.finished = 0;
    p.progress = Math.max(0, p.runner.y);
    p.drops = p.runner.falls ?? 0;
  } else if (g.kind === 'balance') {
    // Scoring and contact resolution run once for the whole shared arena.
    moveTeaCup(p, now, dt);
  }
}
export function inputMinigame(
  room: Room,
  id: string,
  v: Record<string, unknown>,
  now: number,
) {
  const g = room.party!.game!,
    p = g.players[id];
  if (v.game !== g.id || !Number.isSafeInteger(v.seq) || Number(v.seq) <= p.seq)
    return;
  if (
    typeof v.x !== 'number' ||
    !Number.isFinite(v.x) ||
    Math.abs(v.x) > 1 ||
    typeof v.y !== 'number' ||
    !Number.isFinite(v.y) ||
    Math.abs(v.y) > 1 ||
    typeof v.jump !== 'boolean'
  )
    throw new Error('Invalid controller input.');
  updateGetaiPlayback(room, id, v.music, now);
  updateGetaiVoice(g, p, v.voice, now);
  p.seq = Number(v.seq);
  p.axisX = v.x;
  p.axisY = v.y;
  p.jump = v.jump;
  p.inputAt = now;
  if (now < g.start || p.finished) return;
  if (
    v.press === 'portal' &&
    g.kind === 'forest' &&
    canEnterForestPortal(p.runner, g.year)
  )
    p.finished = now;
  if (
    !Number.isInteger(v.press) ||
    Number(v.press) < 0 ||
    Number(v.press) > 3 ||
    now - p.lastAction < 180
  )
    return;
  const pressId = v.pressId ?? v.seq;
  if (!Number.isSafeInteger(pressId) || Number(pressId) <= (p.lastPress ?? 0))
    return;
  p.lastPress = Number(pressId);
  const press = Number(v.press);
  const slowed = p.breeze > now && p.breeze - now < 2000 && p.shield <= now;
  if (slowed && now - p.lastAction < 450) return;
  p.lastAction = now;
  const bonus = p.boost > now ? 1 : 0;
  if (g.kind === 'hawker') {
    const correct =
      press ===
      orderForParty(
        g,
        room.players.findIndex((x) => x.id === id),
        p.step,
      );
    p.points = Math.max(
      0,
      p.points +
        (correct ? 3 + bonus : p.shield > now || p.steady > now ? 0 : -1),
    );
    p.step++;
  } else if (g.kind === 'rhythm') {
    const playback = getaiPlaybackTime(g, now);
    // Judge a recent tap against the note the player actually saw. Keep a tight
    // bound so stale/replayed packets cannot choose an arbitrary earlier beat.
    const recentTap =
      typeof v.pressAt === 'number' &&
      Number.isFinite(v.pressAt) &&
      now - v.pressAt >= -100 &&
      now - v.pressAt <= 650 &&
      typeof v.pressTime === 'number' &&
      Number.isFinite(v.pressTime) &&
      v.pressTime >= 0 &&
      playback - v.pressTime >= -100 &&
      playback - v.pressTime <= 650;
    const timeline = getaiTimeline(
      recentTap ? (v.pressTime as number) : playback,
      getaiDuration(g),
    );
    if (
      getaiTimeline(playback, getaiDuration(g)).pitStop >= 0 ||
      timeline.pitStop >= 0 ||
      !g.music?.playing ||
      g.music.ended ||
      now - g.music.at > 1000
    )
      return;
    const beat = Math.round(timeline.elapsed / 700);
    const error = Math.abs(timeline.elapsed - beat * 700);
    const window = p.steady > now ? 240 : 180;
    if (
      beat >= 1 &&
      beat > p.lastBeat &&
      press === noteLane(g, beat) &&
      error <= window
    ) {
      getaiHit(p, beat, (error < 95 ? 3 : 1) + bonus);
      if (error < 95) getaiReaction(g, p, true, now);
    } else if (beat >= 1 && beat > p.lastBeat) {
      p.streak = 0;
      getaiReaction(g, p, false, now);
    }
  }
}
function getaiReaction(
  g: MinigameState,
  p: Contender,
  hit: boolean,
  now: number,
) {
  const count = (p.reactionCount ?? 0) + 1;
  p.reactionCount = count;
  const roll = pattern(g.seed + p.seq, count);
  if (
    now - (p.reaction?.at ?? -Infinity) < 2200 ||
    roll % 100 >= (hit ? 35 : 25)
  )
    return;
  p.reaction = { sticker: hit ? pattern(roll, count) % 3 : 3, at: now };
}

export function settleMinigame(room: Room, now: number) {
  const g = room.party!.game!;
  if (g.kind === 'rhythm') {
    const timeline = getaiTimeline(getaiPlaybackTime(g, now), getaiDuration(g));
    const beat = Math.floor(timeline.elapsed / 700);
    if (
      g.music?.playing &&
      !g.music.ended &&
      timeline.pitStop < 0 &&
      now - g.music.at <= 1000
    ) {
      for (const player of room.players) {
        const p = g.players[player.id];
        if (player.bot && beat > p.lastBeat && beat > 0) {
          getaiHit(p, beat, 2);
        }
        // Judge a passed note only once, after the widest valid hit window.
        const passed = Math.floor((timeline.elapsed - 240) / 700);
        if (passed > p.step) {
          p.step = passed;
          if (!player.bot && passed > p.lastBeat) {
            p.streak = 0;
            getaiReaction(g, p, false, now);
          }
        }
      }
    }
    g.tick++;
    return;
  }
  const total = gameDefinition(g.kind).duration * 30;
  const target = Math.min(
    total,
    Math.max(0, Math.floor(((now - g.start) * 30) / 1000)),
  );
  while (g.tick < target) {
    const time = g.start + ++g.tick * (1000 / 30);
    room.players.forEach((player, i) => {
      const p = g.players[player.id];
      if (p.finished) return;
      if (player.bot) {
        if (g.kind === 'forest') {
          if (p.runner.grounded)
            p.runner.botTarget = nextForestPlatform(p.runner, g.year);
          const next = climbPlatforms(g.year)[
            Math.max(0, p.runner.botTarget ?? 1)
          ];
          p.axisX =
            Math.abs(next.x - p.runner.x) < 0.12
              ? 0
              : Math.sign(next.x - p.runner.x);
          p.jump = p.runner.grounded && g.tick % (5 + i) === 0;
          if (p.runner.grounded && !p.jump) p.axisX = 0;
          if (canEnterForestPortal(p.runner, g.year)) p.finished = time;
        } else if (g.kind === 'balance') {
          // CPUs choose different heights; high interceptions trade foam for access.
          const y = -1 + Math.sin((time - g.start) / 1400 + i * 2.1) * 4.6;
          const x = teaStreamX(g.seed, (time - g.start) / 1000, y);
          p.axisX = Math.max(-1, Math.min(1, (x - p.x) * 0.9));
          p.axisY = Math.max(-1, Math.min(1, (y - p.y) * 0.8));
        } else if (g.tick % (g.kind === 'hawker' ? 24 + i * 7 : 21) === 0) {
          p.points += 2;
          p.step++;
        }
      } else if (time - p.inputAt > 650) {
        p.axisX = p.axisY = 0;
        p.jump = false;
      }
      stepContender(g, p, time);
    });
    if (g.kind === 'balance') stepTeaArena(g, time);
  }
}
export function finishMinigame(room: Room, now: number) {
  const g = room.party!.game!;
  if (g.scored) return true;
  if (
    g.kind === 'rhythm'
      ? !g.music?.ended
      : now < g.start + gameDefinition(g.kind).duration * 1000 &&
        !Object.values(g.players).every((p) => p.finished)
  )
    return false;
  const performance = (p: Contender) =>
    g.kind === 'forest'
      ? Math.max(0, p.progress - p.drops * FOREST_FALL_PENALTY)
      : p.points;
  const ranked = [...room.players].sort((a, b) => {
    const pa = g.players[a.id],
      pb = g.players[b.id];
    if (pa.finished || pb.finished)
      return (pa.finished || Infinity) - (pb.finished || Infinity);
    return performance(pb) - performance(pa);
  });
  ranked.forEach((p, i) => {
    const previous = ranked[i - 1];
    const self = g.players[p.id],
      prior = previous && g.players[previous.id];
    const tied =
      prior &&
      self.finished === prior.finished &&
      Math.abs(performance(self) - performance(prior)) < 0.01;
    p.roundScore =
      !self.finished && performance(self) <= 0
        ? 0
        : tied
          ? previous.roundScore
          : [10, 7, 5, 3][i];
    p.score += p.roundScore;
  });
  g.results = ranked.map((p) => p.id);
  g.scored = true;
  return true;
}
export function playMinigameCard(
  room: Room,
  id: string,
  v: Record<string, unknown>,
  now: number,
) {
  const g = room.party!.game!,
    p = g.players[id],
    hand = room.trip!.hands[id] ?? [];
  const slot = Number(v.slot),
    target = g.players[typeof v.target === 'string' ? v.target : id];
  if (
    v.game !== g.id ||
    now < g.start ||
    p.used ||
    p.finished ||
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= hand.length
  )
    throw new Error('Play one card per game, after the countdown.');
  const card = hand[slot];
  if (
    !target ||
    target.finished ||
    (card === 3 && (target === p || target.breeze > now))
  )
    throw new Error('Choose another available kaki.');
  if (card === 0) p.boost = now + 8000;
  if (card === 1) p.steady = now + 10000;
  if (card === 2) target.shield = now + 10000;
  if (card === 3) target.breeze = now + 3000;
  hand.splice(slot, 1);
  p.used = true;
  room.trip!.counts[id] = hand.length;
  room.trip!.notice = `${room.players.find((p) => p.id === id)!.name} played ${CARDS[card].name}.`;
}
