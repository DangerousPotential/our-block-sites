import type { Room } from './engine';
import { LAYOUTS } from './trip-layouts';
import { walkable } from './trip-navigation';

const ALL_TRIP_ERAS = [
  {
    id: 'river',
    year: 1950,
    name: 'Singapore at play',
    subtitle: '1950s · Seven places, seven pastimes',
    color: '#a4c9b3',
    npcs: [
      'Cinema neighbour',
      'Joget dancer',
      'Badminton supporter',
      'Radio listener',
    ],
  },
  {
    id: 'fair',
    year: 1975,
    name: 'Night at the Worlds',
    subtitle: 'Bright marquees, food lanes & fairground laughter',
    color: '#342844',
    npcs: [
      'Stage performer',
      'Ticket attendant',
      'Kopi seller',
      'Booth keeper',
    ],
  },
  {
    id: 'estate',
    year: 1987,
    name: 'Life downstairs',
    subtitle: 'Void decks, dragon playgrounds & television evenings',
    color: '#e7b488',
    npcs: [
      'Provision uncle',
      'TV neighbour',
      'Playground kaki',
      'Market auntie',
    ],
  },
  {
    id: 'town',
    year: 2005,
    name: 'Next stop, home',
    subtitle: 'MRT rides, library afternoons & arcade friendships',
    color: '#8ba8bd',
    npcs: ['Commuter', 'Librarian', 'Gaming kaki', 'Food-court worker'],
  },
  {
    id: 'garden',
    year: 2026,
    name: 'Lights & gardens',
    subtitle: 'Waterfront supper, passing trains & a sky full of sparks',
    color: '#101e36',
    npcs: ['Community gardener', 'Cyclist', 'Busker', 'Supper neighbour'],
  },
] as const;
// Retain stored protocol identifiers; river now routes to the 1950s world.
export type TripEra = (typeof ALL_TRIP_ERAS)[number]['id'];
export const TRIP_ERAS = ALL_TRIP_ERAS.filter(era => era.id === 'river' || era.id === 'estate');
export function tripTileLabel(era: TripEra, tile: number) {
  if (tile === 0) return 'Home';
  if ([2, 5, 9, 13, 17, 20].includes(tile)) return 'Jump quest';
  return {
    river: [
      'River quay',
      'Roadside hawker',
      'Attap lane',
      'Provision shop',
      'Footbridge',
      'Kampong clearing',
    ],
    fair: [
      'Theatre',
      'Kopi lane',
      'Fairground',
      'Ticket booth',
      'Food lane',
      'Show courtyard',
    ],
    estate: [
      'Void deck',
      'Wet market',
      'Dragon playground',
      'TV corner',
      'Provision shop',
      'Residents court',
    ],
    town: [
      'MRT station',
      'Library',
      'Bus interchange',
      'Computer café',
      'Food court',
      'Town plaza',
    ],
    garden: [
      'Waterfront',
      'Community garden',
      'Supper terrace',
      'Cycling path',
      'Busker corner',
      'Event plaza',
    ],
  }[era][tile % 6];
}
export const CARDS = [
  { name: 'Kopi Boost', description: '10% faster for 8 seconds', icon: '☕' },
  {
    name: 'Steady Feet',
    description: 'Extra jump forgiveness for 10 seconds',
    icon: '👟',
  },
  {
    name: 'Kaki Umbrella',
    description: 'Protect a kaki from breeze for 10 seconds',
    icon: '☂',
  },
  {
    name: 'Cheeky Breeze',
    description: 'A gentle 2-second drift after a 1-second warning',
    icon: '🍃',
  },
] as const;
export const FAVOURS = [
  [
    'Help me tie this cargo securely before the boat leaves.',
    'Tie the rope',
    'The river carries stories as well as cargo. Thank you, kaki!',
  ],
  [
    'Could you bring these cups over? Our neighbours are waiting.',
    'Carry the cups',
    'A little help makes a busy day brighter. Have some kopi!',
  ],
  [
    'Come join us for a moment. There is always room for another neighbour.',
    'Keep them company',
    'Good company is the best part of living here.',
  ],
  [
    'Help me arrange these things so everyone can reach them.',
    'Lend a hand',
    'Small favours make a neighbourhood. This is for you.',
  ],
];
export const ERA_FAVOURS: Record<TripEra, string[][]> = {
  river: [
    ['The cinema is opening. Help straighten the programme cards?', 'Straighten the cards', 'Ready for the show. Come back with your friends.'],
    ['The joget musicians are here. Help clear a little room for dancing?', 'Make room', 'There is space for everyone to join.'],
    ['Our badminton supporters are arriving. Could you carry these rackets?', 'Carry the rackets', 'All set for another game.'],
    ['The Rediffusion story is starting. Bring a stool beside the speaker?', 'Bring a stool', 'Sit down and listen with us.'],
  ],
  fair: [
    [
      'The next show starts soon. Help straighten the theatre posters?',
      'Straighten the posters',
      'The whole evening comes alive when the curtain rises.',
    ],
    [
      'A family is looking for the ride entrance. Show them the way?',
      'Point out the entrance',
      'One more happy family at the fair tonight!',
    ],
    [
      'Watch me pour the kopi between these pots. Can you pass a clean cup?',
      'Pass a clean cup',
      'A good pour, a warm cup, and plenty of conversation.',
    ],
    [
      'Help return the wooden rings to my game booth?',
      'Gather the rings',
      'Come back after the show. There is always another round.',
    ],
  ],
  estate: [
    [
      'Can you put these bread loaves beside the biscuit tins?',
      'Arrange the bread',
      'The children always come down hungry after school.',
    ],
    [
      'Our neighbours are watching television downstairs. Bring another stool?',
      'Bring a stool',
      'No need to have a television at home to enjoy the show together.',
    ],
    [
      'We are taking turns on the dragon slide. Help me count everyone in?',
      'Count everyone in',
      'Your turn next! The playground belongs to all of us.',
    ],
    [
      'Could you pass these vegetables over to the next stall?',
      'Pass the basket',
      'We look after one another here, especially during the morning rush.',
    ],
  ],
  town: [
    [
      'My neighbour is meeting me at the station. Help spot the arrival board?',
      'Check the board',
      'One train ride, and we are back in the heartland.',
    ],
    [
      'Help return these books to the trolley before the afternoon crowd arrives?',
      'Sort the returns',
      'There is a little world waiting inside every book.',
    ],
    [
      'We are meeting after school at the computer café. Save a seat for our kaki?',
      'Save a seat',
      'The best games are the ones we play together.',
    ],
    [
      'The lunch crowd has just left. Help bring the trays back?',
      'Return the trays',
      'Thank you. A clean table makes room for the next neighbour.',
    ],
  ],
  garden: [
    [
      'These shared herbs need a little water. Would you help?',
      'Water the herbs',
      'Take a leaf for your supper. The garden is for sharing.',
    ],
    [
      'I have stopped for a break. Help keep this path clear for people walking?',
      'Move the loose basket',
      'A little consideration keeps the promenade welcoming.',
    ],
    [
      'I am about to play a tune. Help make space for people to listen?',
      'Make a little space',
      'Stay for a song. The skyline looks lovely from here.',
    ],
    [
      'We ordered extra at the supper table. Bring a chair and join us?',
      'Pull up a chair',
      'The city changes, but there is still room at our table.',
    ],
  ],
};
export type Runner = {
  x: number;
  y: number;
  vy: number;
  checkpoint: number;
  grounded: boolean;
  grace: number;
  direction: number;
  jump: boolean;
  inputAt: number;
  seq: number;
  finished: number;
  boost: number;
  steady: number;
  shield: number;
  breeze: number;
  used: boolean;
  botTarget?: number;
};
export type TripState = {
  seen?: Record<string, number>;
  eras: TripEra[];
  deadline: number;
  ready: string[];
  claims: Record<string, number[]>;
  hands: Record<string, number[]>;
  counts: Record<string, number>;
  positions: Record<string, { x: number; z: number; at: number }>;
  questPlayed: boolean;
  quest?: {
    id: string;
    start: number;
    tick: number;
    runners: Record<string, Runner>;
    results: string[];
  };
  notice: string;
};
export const PLATFORMS = Array.from({ length: 12 }, (_, i) => ({
  x: i === 0 ? 0 : [-3, 0, 3, 0][(i - 1) % 4],
  y: i * 2.25,
  width: i === 0 ? 14 : 4.5,
}));
export function enableTrip(room: Room) {
  room.rulesVersion = 2;
  const ids = TRIP_ERAS.map((e) => e.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  room.trip = {
    eras: ids,
    deadline: 0,
    ready: [],
    claims: {},
    hands: {},
    counts: {},
    positions: {},
    questPlayed: false,
    notice: '',
  };
  room.totalRounds = ids.length;
  return room;
}
export function eraOf(room: Pick<Room, 'trip' | 'round'>) {
  return (
    TRIP_ERAS.find((e) => e.id === room.trip?.eras[room.round - 1]) ??
    TRIP_ERAS.find(era => era.id === 'estate')!
  );
}
function explore(room: Room, now: number) {
  const t = room.trip!;
  room.phase = 'revealing';
  room.year = eraOf(room).year;
  room.boardTurn = 0;
  room.move = null;
  t.deadline = now + 3000;
  t.ready = [];
  t.claims = {};
  t.positions = {};
  t.questPlayed = false;
  delete t.quest;
  for (const p of room.players) {
    t.hands[p.id] ??= [];
    t.counts[p.id] = t.hands[p.id].length;
    p.roundScore = 0;
  }
  t.seen = Object.fromEntries(room.players.map((p) => [p.id, now]));
  t.notice =
    'Meet your neighbours. Earn up to two cards before returning to the board.';
}
function beginQuest(room: Room, now: number) {
  const t = room.trip!;
  room.phase = 'quest';
  t.questPlayed = true;
  t.quest = {
    id: `${room.round}:${now}`,
    start: now + 3000,
    tick: 0,
    runners: {},
    results: [],
  };
  for (const p of room.players)
    t.quest.runners[p.id] = {
      x: 0,
      y: 0,
      vy: 0,
      checkpoint: 0,
      grounded: true,
      grace: 0,
      direction: 0,
      jump: false,
      inputAt: now,
      seq: 0,
      finished: 0,
      boost: 0,
      steady: 0,
      shield: 0,
      breeze: 0,
      used: false,
    };
}
export function stepRunner(r: Runner, now: number, dt = 1 / 30) {
  if (r.finished) return;
  if (r.grounded) r.grace = now + (r.steady > now ? 180 : 100);
  if (r.jump && (r.grounded || r.grace > now)) {
    r.vy = 12;
    r.grounded = false;
    r.grace = 0;
  }
  const drift =
    r.breeze > now && r.breeze - now < 2000 && r.shield < now ? 1.1 : 0;
  r.x = Math.max(
    -9,
    Math.min(9, r.x + (r.direction * (r.boost > now ? 6.6 : 6) + drift) * dt),
  );
  const before = r.y;
  r.vy -= 24 * dt;
  r.y += r.vy * dt;
  r.grounded = false;
  if (r.vy <= 0)
    for (let i = PLATFORMS.length - 1; i >= 0; i--) {
      const p = PLATFORMS[i];
      if (
        before >= p.y &&
        r.y <= p.y &&
        Math.abs(r.x - p.x) < p.width / 2 + 0.25
      ) {
        r.y = p.y;
        r.vy = 0;
        r.grounded = true;
        if (i === 4 || i === 8) r.checkpoint = Math.max(r.checkpoint, i);
        if (i === 11) r.finished = now;
        break;
      }
    }
  if (r.y < PLATFORMS[r.checkpoint].y - 5) {
    const p = PLATFORMS[r.checkpoint];
    r.x = p.x;
    r.y = p.y;
    r.vy = 0;
    r.grounded = true;
  }
}
export function settleTrip(room: Room, now: number) {
  const t = room.trip!;
  const online = (id: string) => !t.seen || now - (t.seen[id] ?? 0) < 30000;
  if (room.phase !== 'lobby' && !online(room.host)) {
    const replacement = room.players.find((p) => !p.bot && online(p.id));
    if (replacement) {
      room.host = replacement.id;
      t.notice = `${replacement.name} is hosting while your other kaki is away.`;
    }
  }
  if (room.phase === 'revealing' && now >= t.deadline) {
    room.phase = 'exploring';
    t.deadline += 120000;
  }
  if (
    room.phase === 'exploring' &&
    (now >= t.deadline ||
      room.players
        .filter((p) => !p.bot && online(p.id))
        .every((p) => t.ready.includes(p.id)))
  ) {
    room.phase = 'board';
    t.notice = 'Everyone is home. Roll to explore the board together.';
  }
  // Party exploration must not start a legacy board quest.
  if (room.rulesVersion === 3) return;
  if (room.phase === 'board') {
    const m = room.move;
    if (m && !m.settled && now >= m.endsAt) {
      const p = room.players.find((p) => p.id === m.playerId)!;
      p.position = (m.from + m.steps) % 22;
      p.score = Math.max(0, p.score + m.reward);
      m.settled = true;
      room.boardTurn = (room.boardTurn ?? 0) + 1;
      if (!t.questPlayed && [2, 5, 9, 13, 17, 20].includes(p.position))
        beginQuest(room, now);
    }
    if (
      room.phase === 'board' &&
      (!room.move || room.move.settled) &&
      (room.players[room.boardTurn ?? 0]?.bot ||
        (room.players[room.boardTurn ?? 0] &&
          !online(room.players[room.boardTurn ?? 0].id)))
    )
      tripRoll(room, now);
  }
  if (room.phase === 'quest' && t.quest) {
    const q = t.quest;
    const target = Math.min(
      2700,
      Math.max(0, Math.floor((now - q.start) / (1000 / 30))),
    );
    while (q.tick < target) {
      q.tick++;
      const time = q.start + q.tick * (1000 / 30);
      for (const p of room.players) {
        const r = q.runners[p.id];
        if (p.bot) {
          if (r.grounded)
            r.botTarget = Math.min(11, Math.round(r.y / 2.25) + 1);
          const next = PLATFORMS[r.botTarget ?? 1];
          r.direction =
            Math.abs(next.x - r.x) < 0.25 ? 0 : Math.sign(next.x - r.x);
          r.jump =
            r.grounded &&
            q.tick % (5 + ((room.seed + room.players.indexOf(p)) % 5)) === 0;
        } else if (time - r.inputAt > 650) {
          r.direction = 0;
          r.jump = false;
        }
        stepRunner(r, time);
        if (r.finished && !q.results.includes(p.id)) q.results.push(p.id);
      }
    }
    if (target === 2700 || q.results.length === room.players.length) {
      q.results.forEach((id, i) => {
        const p = room.players.find((p) => p.id === id)!;
        p.roundScore = [10, 7, 5, 3][i];
        p.score += p.roundScore;
      });
      room.phase = 'quest-results';
    }
  }
}
function tripRoll(room: Room, now: number) {
  const p = room.players[room.boardTurn ?? 0];
  const steps = 1 + Math.floor(Math.random() * 6);
  const rewards = [
    2, 2, -1, 3, 0, 2, -2, 1, 3, -1, 4, -1, 1, 2, -2, 3, 2, -1, 4, 0, 3, -1,
  ];
  room.move = {
    playerId: p.id,
    from: p.position,
    steps,
    startedAt: now,
    endsAt: now + 900 + steps * 360 + 1100,
    turn: room.boardTurn ?? 0,
    round: room.round,
    reward:
      rewards[(p.position + steps) % 22] + (p.position + steps >= 22 ? 2 : 0),
  };
}
export function actTrip(
  room: Room,
  id: string,
  action: string,
  v: Record<string, unknown>,
  now: number,
) {
  const t = room.trip!;
  const p = room.players.find((p) => p.id === id);
  if (!p) throw new Error('Your seat could not be found.');
  (t.seen ??= {})[id] = now;
  // Late realtime packets are harmless after a server-driven phase change.
  if (
    (action === 'input' && room.phase !== 'quest') ||
    (action === 'walk' && room.phase !== 'exploring')
  )
    return room;
  if (action === 'ready' && room.phase === 'board' && v.round === room.round)
    return room;
  if (
    ['walk', 'claim', 'ready', 'roll', 'input', 'card'].includes(action) &&
    v.round !== room.round
  )
    throw new Error('That visit has ended.');
  if (action === 'walk' && room.phase === 'exploring') {
    const m = LAYOUTS[eraOf(room).id],
      old = t.positions[id] ?? { ...m.spawn, at: now - 500 };
    const next = { x: Number(v.x), z: Number(v.z), at: now };
    const distance = Math.hypot(next.x - old.x, next.z - old.z);
    if (distance > Math.min(2, Math.max(0.1, (now - old.at) / 1000)) * 6 + 0.3)
      return room;
    for (let i = 1; i <= Math.ceil(distance / 0.2); i++) {
      const f = i / Math.ceil(distance / 0.2);
      if (
        !walkable(m, {
          x: old.x + (next.x - old.x) * f,
          z: old.z + (next.z - old.z) * f,
        })
      )
        return room;
    }
    if (!walkable(m, next)) return room;
    t.positions[id] = next;
    return room;
  }
  if (action === 'ready' && room.phase === 'exploring') {
    if (!t.ready.includes(id)) t.ready.push(id);
    settleTrip(room, now);
    return room;
  }
  if (action === 'claim' && room.phase === 'exploring') {
    const n = Number(v.npc),
      claims = (t.claims[id] ??= []),
      hand = (t.hands[id] ??= []);
    if (
      !Number.isInteger(n) ||
      n < 0 ||
      n > 3 ||
      claims.includes(n) ||
      claims.length >= (room.party ? 3 : 2)
    )
      throw new Error('You have already collected this favour.');
    const m = LAYOUTS[eraOf(room).id],
      pos = t.positions[id] ?? m.spawn;
    if (Math.hypot(pos.x - m.npcs[n].x, pos.z - m.npcs[n].z) > 2)
      throw new Error('Walk over to your neighbour first.');
    if (hand.length >= 3) {
      const slot = Number(v.replace);
      if (!Number.isInteger(slot) || slot < 0 || slot >= 3)
        throw new Error('Choose a card to replace, or decline.');
      hand.splice(slot, 1);
    }
    hand.push(room.party?.offers[id]?.[n] ?? n);
    claims.push(n);
    t.counts[id] = hand.length;
    return room;
  }
  if (action === 'roll' && room.phase === 'board') {
    if (
      v.turn !== room.boardTurn ||
      room.players[room.boardTurn ?? 0]?.id !== id ||
      (room.move && !room.move.settled)
    )
      throw new Error('Wait for your turn.');
    tripRoll(room, now);
    return room;
  }
  if (action === 'input' && room.phase === 'quest') {
    const q = t.quest!,
      r = q.runners[id];
    if (
      v.quest !== q.id ||
      !Number.isSafeInteger(v.seq) ||
      Number(v.seq) <= r.seq
    )
      return room;
    if (
      ![-1, 0, 1].includes(Number(v.direction)) ||
      typeof v.jump !== 'boolean'
    )
      throw new Error('Invalid input.');
    r.seq = Number(v.seq);
    r.direction = Number(v.direction);
    r.jump = v.jump;
    r.inputAt = now;
    return room;
  }
  if (action === 'card' && room.phase === 'quest') {
    const q = t.quest!,
      r = q.runners[id],
      slot = Number(v.slot),
      hand = t.hands[id] ?? [];
    if (
      v.quest !== q.id ||
      now < q.start ||
      r.used ||
      r.finished ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= hand.length
    )
      throw new Error('One card per race, after the countdown.');
    const card = hand[slot],
      target = q.runners[typeof v.target === 'string' ? v.target : id];
    if (
      !target ||
      target.finished ||
      (card === 3 && (target === r || target.breeze > now))
    )
      throw new Error('Choose an available kaki.');
    if (card === 0) r.boost = now + 8000;
    if (card === 1) r.steady = now + 10000;
    if (card === 2) target.shield = now + 10000;
    if (card === 3) target.breeze = now + 3000;
    hand.splice(slot, 1);
    r.used = true;
    t.counts[id] = hand.length;
    t.notice = `${p.name} played ${CARDS[card].name}.`;
    return room;
  }
  if (id !== room.host) throw new Error('Only the host can advance the trip.');
  if (action === 'board' && room.phase === 'lobby') explore(room, now);
  else if (action === 'resume' && room.phase === 'quest-results')
    room.phase = 'board';
  else if (
    action === 'start' &&
    room.phase === 'board' &&
    (room.boardTurn ?? 0) >= room.players.length &&
    !t.questPlayed
  )
    beginQuest(room, now);
  else if (
    action === 'continue' &&
    room.phase === 'board' &&
    (room.boardTurn ?? 0) >= room.players.length
  )
    room.phase = 'results';
  else if (action === 'next' && room.phase === 'results') {
    if (room.round >= room.totalRounds) room.phase = 'finished';
    else {
      room.previousYear = room.year;
      room.round++;
      explore(room, now);
    }
  } else if (action === 'restart' && room.phase === 'finished') {
    enableTrip(room);
    room.phase = 'lobby';
    room.round = 1;
    for (const p of room.players) {
      p.score = 0;
      p.position = 0;
      p.roundScore = 0;
    }
  } else throw new Error('That action is not available right now.');
  return room;
}
