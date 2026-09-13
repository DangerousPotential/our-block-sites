import type * as Three from 'three';
import type { Layout } from '@/lib/game/trip-navigation';

type Ensemble = NonNullable<Layout['activities']>[number] & {
  actors: Three.Sprite[];
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** One shared clock: hold/dribble, release, travel, receive. No frame-rate integration. */
export function passBeat(seconds: number, count: number) {
  const turn = Math.floor(seconds / 3),
    phase = (seconds % 3) / 3;
  return {
    from: turn % count,
    to: (turn + 1) % count,
    phase,
    travel: clamp((phase - 0.4) / 0.45),
  };
}
export function rallyBeat(seconds: number) {
  const order = [0, 2, 1, 3],
    turn = Math.floor(seconds / 1.6);
  return {
    from: order[turn % 4],
    to: order[(turn + 1) % 4],
    phase: (seconds % 1.6) / 1.6,
  };
}
export function performanceKind(a: Pick<Ensemble, 'kind' | 'name'>) {
  const name = a.name ?? '';
  if (a.kind === 'play') return 'basketball';
  if (a.kind === 'housing') return 'chess';
  if (/school/i.test(name)) return 'reading';
  if (/factory|industry|dispatch|clean-tech/i.test(name)) return 'market';
  if (/office|banking|trading/i.test(name)) return 'reading';
  if (a.kind === 'district_serve')
    return /supper|food/i.test(name) && !name.includes('Coffee-shop')
      ? 'noodles'
      : 'kopi';
  if (/court/i.test(name)) return 'badminton';
  if (name === 'Games alley') return 'rings';
  if (name === 'Village games') return 'chapteh';
  if (/tables|plaza/i.test(name)) return 'chess';
  if (/repair|workshop/i.test(name)) return 'repair';
  if (/hamlet/.test(name) || a.kind === 'fish') return 'fishing';
  if (name === 'Attap village') return 'laundry';
  if (name === 'Waterfront art') return 'painting';
  if (a.kind === 'garden' || a.kind === 'district_work') return 'watering';
  if (a.kind === 'market' || a.kind === 'district_browse') return 'market';
  if (name === 'Computer café' || a.kind === 'arcade') return 'arcade';
  if (a.kind === 'district_read') return 'reading';
  if (a.kind === 'commute' || a.kind === 'district_queue') return 'ticket';
  if (a.kind === 'stage' || a.kind === 'district_dance') return 'dance';
  if (a.kind === 'tv') return 'tv';
  if (
    a.kind === 'coaster' ||
    a.kind === 'carousel' ||
    a.kind === 'district_wheel'
  )
    return 'ride';
  return 'social';
}

/** Native Blender props are shared geometry; only transforms change each frame. */
export function createMicroLife(
  world: Three.Group,
  groups: Ensemble[],
  library: Three.Group,
) {
  const entries = groups.map((a, index) => {
    const root = library.clone(false);
    root.name = `performance_${index}`;
    root.visible = true;
    world.add(root);
    const make = (name: string) => {
      const source = library.getObjectByName(
        `micro_${name === 'basket' && /factory|industry|dispatch|clean-tech/i.test(a.name ?? '') ? 'parcel' : name}`,
      );
      if (!source) throw new Error(`Missing Blender micro prop: ${name}`);
      const p = source.clone();
      p.name = `performance_${index}_${name}_${root.children.length}`;
      root.add(p);
      return p;
    };
    const kind = performanceKind(a),
      hands = a.actors.map(() => [make('hand'), make('hand')]);
    const props: Record<string, Three.Object3D> = {};
    const names: Record<string, string[]> = {
      basketball: ['ball'],
      noodles: ['burner', 'wok', 'noodles', 'ladle', 'bowl', 'chopsticks'],
      kopi: ['pot', 'stream', 'bowl'],
      badminton: ['shuttle'],
      chapteh: ['shuttle'],
      rings: ['ring', 'bottle'],
      repair: ['hammer'],
      fishing: ['rod', 'fish', 'stream'],
      laundry: ['cloth'],
      painting: ['brush'],
      watering: ['pot'],
      market: ['basket'],
      chess: ['piece'],
      dance: ['mic'],
      tv: ['ball'],
    };
    for (const name of names[kind] ?? []) props[name] = make(name);
    const held = a.actors.map(() =>
      ['reading', 'tv'].includes(kind)
        ? make(kind === 'reading' ? 'book' : 'bowl')
        : kind === 'badminton'
          ? make('racket')
          : kind === 'ticket'
            ? make('ticket')
            : null,
    );
    const particles = Array.from(
      {
        length: ['noodles', 'kopi'].includes(kind)
          ? 3
          : kind === 'watering'
            ? 5
            : 0,
      },
      () => make(kind === 'watering' ? 'drop' : 'steam'),
    );
    const scales = a.actors.map((s) => s.scale.clone());
    const pages = kind === 'reading' ? a.actors.map(() => make('page')) : [];
    return {
      a,
      root,
      kind,
      hands,
      props,
      held,
      particles,
      scales,
      index,
      pages,
    };
  });
  const position = (p: Three.Object3D, x: number, y: number, z: number) =>
    p.position.set(x, y, z);
  return (milliseconds: number, reduced: boolean, board: boolean) => {
    const clock = reduced ? 0 : milliseconds / 1000;
    for (const e of entries) {
      const t = clock + e.index * 0.731;
      const { a, kind, props, hands, held, particles, root } = e;
      root.visible = !(board && a.kind === 'play');
      const beat = passBeat(t, a.actors.length),
        cycle = (t % 8) / 8;
      const rally = rallyBeat(t);
      a.actors.forEach((s, j) => {
        const sway = Math.sin(t * 2 + j * 0.8),
          action =
            kind === 'basketball'
              ? j === beat.from
                ? Math.sin(beat.phase * Math.PI)
                : 0
              : sway;
        s.scale.copy(e.scales[j]);
        s.scale.y *= 1 - Math.max(0, action) * 0.035;
        for (let side = 0; side < 2; side++) {
          const sign = side ? 1 : -1;
          let lift = 0.64 + Math.sin(t * 2 + j + side) * 0.035,
            reach = sign * 0.34;
          if (['dance', 'ride', 'tv', 'social'].includes(kind))
            lift += Math.max(0, Math.sin(t * 2 + j + side)) * 0.43;
          if (
            [
              'noodles',
              'kopi',
              'repair',
              'painting',
              'watering',
              'arcade',
            ].includes(kind) &&
            j === 0
          )
            lift += Math.sin(t * 4) * 0.15;
          if (kind === 'basketball' && (j === beat.from || j === beat.to)) {
            lift = 0.85 + action * 0.16;
            reach *= 0.65;
          }
          if (kind === 'badminton')
            lift =
              0.85 +
              (j === rally.from
                ? (1 - rally.phase) * 0.3
                : j === rally.to
                  ? rally.phase * 0.3
                  : 0);
          position(
            hands[j][side],
            s.position.x + reach,
            s.position.y + lift,
            s.position.z + 0.2,
          );
        }
        if (held[j]) {
          held[j]!.position.copy(hands[j][1].position);
          held[j]!.rotation.z =
            kind === 'badminton'
              ? j === rally.from
                ? Math.cos(rally.phase * Math.PI) * 0.7
                : j === rally.to
                  ? -Math.cos(rally.phase * Math.PI) * 0.7
                  : 0
              : Math.sin(t + j) * 0.06;
          if (kind === 'reading')
            held[j]!.rotation.x =
              -0.4 + Math.max(0, Math.sin(t * 0.5 + j)) * 0.12;
          if (e.pages[j]) {
            e.pages[j].position.copy(held[j]!.position);
            e.pages[j].position.y += 0.065;
            e.pages[j].rotation.z = -Math.max(0, Math.sin(t * 0.7 + j)) * 2.6;
          }
        }
      });
      const worker = a.actors[0],
        hand = hands[0][1].position;
      if (kind === 'basketball') {
        const old = world.getObjectByName('anim_play_ball');
        if (old) old.visible = false;
        const from = hands[beat.from][1].position,
          to = hands[beat.to][1].position,
          u = beat.travel;
        props.ball.position.copy(from).lerp(to, u);
        props.ball.position.y +=
          u > 0 && u < 1
            ? Math.sin(u * Math.PI) * 0.75
            : beat.phase < 0.4
              ? -Math.abs(Math.sin((beat.phase / 0.4) * Math.PI * 2)) * 0.65
              : 0;
        props.ball.rotation.set(t * 2, 0, t * 3);
      } else if (kind === 'noodles') {
        const x = a.x - 0.45,
          z = a.z + 0.55;
        position(props.burner, x, 0.85, z);
        position(props.wok, x, 1, z);
        const toss =
          cycle > 0.25 && cycle < 0.5
            ? Math.sin((cycle - 0.25) * 4 * Math.PI)
            : 0;
        props.wok.rotation.z = -toss * 0.3;
        position(props.noodles, x, 1.09 + toss * 0.8, z);
        props.noodles.rotation.y = toss * 0.8;
        position(
          props.ladle,
          x + Math.sin(t * 4) * 0.22,
          1.12,
          z + Math.cos(t * 4) * 0.16,
        );
        props.ladle.rotation.z = 0.8 + Math.sin(t * 4) * 0.3;
        hands[0][1].position.copy(props.ladle.position);
        position(hands[0][0], x + 0.65, 1.03, z);
        const receiver = hands[1][0].position,
          serve = clamp((cycle - 0.55) / 0.18);
        position(props.bowl, x + 0.7, 1.04, z);
        if (cycle > 0.55 && cycle < 0.9)
          props.bowl.position.lerp(receiver, serve);
        props.chopsticks.visible = cycle > 0.72 && cycle < 0.9;
        props.chopsticks.position.copy(hands[1][1].position);
        props.chopsticks.position.y += Math.max(0, Math.sin(t * 5)) * 0.22;
        props.chopsticks.rotation.z = -0.55;
        if (props.chopsticks.visible) {
          a.actors[1].material.rotation = -0.08;
          hands[1][1].position.copy(props.chopsticks.position);
        }
        props.noodles.visible = cycle < 0.58 || cycle > 0.9;
        if (cycle >= 0.58 && cycle <= 0.9) {
          props.noodles.visible = true;
          props.noodles.position.copy(props.bowl.position);
          props.noodles.position.y += 0.14;
          props.noodles.scale.setScalar(0.6);
        } else props.noodles.scale.setScalar(1);
        worker.material.rotation = -0.12 + Math.sin(t * 4) * 0.08;
      } else if (kind === 'kopi') {
        const pour = (Math.sin(t * 1.4) + 1) / 2;
        position(props.pot, hand.x, hand.y + pour * 0.55, hand.z);
        props.pot.rotation.z = -0.35 - pour * 0.6;
        position(props.bowl, hand.x + 0.36, 0.88, hand.z);
        const top = props.pot.position.y + 0.15,
          bottom = 0.97;
        position(props.stream, hand.x + 0.35, (top + bottom) / 2, hand.z);
        props.stream.scale.y = Math.max(0.05, top - bottom);
        props.stream.visible = pour > 0.25;
      } else if (
        kind === 'badminton' ||
        kind === 'chapteh' ||
        kind === 'rings'
      ) {
        const target =
          kind === 'badminton'
            ? props.shuttle
            : kind === 'chapteh'
              ? props.shuttle
              : props.ring;
        const p = kind === 'badminton' ? rally.phase : (t * 0.7) % 1;
        const sender =
          kind === 'badminton'
            ? rally.from
            : Math.floor(t * 0.7) % a.actors.length;
        const receiver =
          kind === 'badminton' ? rally.to : (sender + 1) % a.actors.length;
        const from = hands[sender][1].position.clone(),
          to = hands[receiver][1].position.clone();
        if (kind === 'badminton') {
          for (const [point, j] of [
            [from, sender],
            [to, receiver],
          ] as const) {
            point.x -= Math.sin(held[j]!.rotation.z) * 0.57;
            point.y += Math.cos(held[j]!.rotation.z) * 0.57;
          }
        } else if (kind === 'chapteh') {
          from.y = 0.35;
          to.y = 0.35;
        } else {
          const c = a.center ?? a;
          position(props.bottle, c.x, 0.2, c.z);
          to.set(c.x, 0.69, c.z);
        }
        target.position.copy(from).lerp(to, p);
        target.position.y +=
          Math.sin(p * Math.PI) * (kind === 'badminton' ? 1.7 : 0.9);
        target.rotation.z =
          kind === 'rings' ? Math.sin(p * Math.PI) * 2 : t * 3;
      } else if (kind === 'repair' || kind === 'painting') {
        const tool = props.hammer ?? props.brush;
        tool.position.copy(hand);
        tool.rotation.z = Math.sin(t * (kind === 'repair' ? 5 : 2)) * 0.8;
      } else if (kind === 'fishing') {
        props.rod.position.copy(hand);
        props.rod.rotation.z = -0.3 + Math.sin(t * 0.7) * 0.2;
        const lift = Math.max(0, Math.sin(t * 0.7));
        position(props.fish, hand.x + 0.9, 0.32 + lift * 0.7, hand.z);
        props.fish.rotation.z = Math.sin(t * 12) * 0.2;
        position(
          props.stream,
          hand.x + 0.9,
          (hand.y + 1.2 + 0.32 + lift * 0.7) / 2,
          hand.z,
        );
        props.stream.scale.set(0.3, hand.y + 1.2 - (0.32 + lift * 0.7), 0.3);
      } else if (kind === 'laundry') {
        props.cloth.position.copy(hand);
        props.cloth.position.y += Math.max(0, Math.sin(t)) * 0.5;
        props.cloth.rotation.z = Math.sin(t * 3) * 0.16;
      } else if (kind === 'watering') {
        props.pot.position.copy(hand);
        props.pot.rotation.z = -0.5 + Math.sin(t) * 0.3;
      } else if (kind === 'market') {
        props.basket.position
          .copy(hands[0][1].position)
          .lerp(hands[1][0].position, (1 - Math.cos(t * 0.9)) / 2);
      } else if (kind === 'chess') {
        const center = a.center ?? a,
          u = (1 - Math.cos(t * 0.6)) / 2;
        position(
          props.piece,
          center.x - 0.3 + u * 0.6,
          1.2 + Math.sin(u * Math.PI) * 0.18,
          center.z,
        );
      } else if (kind === 'dance') {
        props.mic.position.copy(hand);
        props.mic.rotation.z = -0.4 + Math.sin(t * 3) * 0.15;
      } else if (kind === 'tv') {
        props.ball.scale.setScalar(0.17);
        position(
          props.ball,
          10 + Math.sin(t * 1.4) * 0.45,
          1.2 + Math.abs(Math.sin(t * 2)) * 0.22,
          -4.69,
        );
      }
      particles.forEach((p, j) => {
        const phase = (t * 0.6 + j / particles.length) % 1;
        if (kind === 'watering') {
          position(p, hand.x + 0.35, hand.y - phase * 0.7, hand.z + 0.1);
          p.visible = Math.sin(t) < 0.6;
        } else {
          const origin = props.wok?.position ?? props.bowl.position;
          position(
            p,
            origin.x + Math.sin(t + j) * 0.12,
            origin.y + 0.2 + phase * 0.8,
            origin.z,
          );
          p.scale.setScalar(Math.sin(phase * Math.PI) * 0.8);
        }
      });
    }
  };
}
