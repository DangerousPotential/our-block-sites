import type * as Three from 'three';
import type { Layout, Point } from '@/lib/game/trip-navigation';
import { createMicroLife, performanceKind } from './micro-life';

type Actor = (id: string, point: Point, size?: number) => Three.Sprite;
/** Cosmetic ensemble choreography. No game rewards or network state live here. */
export function createWorldLife(
  world: Three.Group,
  actor: Actor,
  layout: Layout,
  library?: Three.Group,
  neighbours: Three.Sprite[] = [],
) {
  const ids = [
    'kopi',
    'kueh',
    'pandan',
    'merly',
    'otto',
    'mei',
    'arun',
    'aisyah',
  ];
  const groups = (layout.activities ?? []).map((activity, i) => {
    // Keep each activity recognisable without filling it with duplicate extras.
    const a = { ...activity, count: Math.min(performanceKind(activity) === 'badminton' ? 4 : 2, activity.count) };
    return ({
    ...a,
    prop: world.getObjectByName(`anim_basket_${i}`),
    actors: Array.from({ length: a.count }, (_, j) => {
      const s = actor(ids[(i * 3 + j) % ids.length], { x: a.x, z: a.z }, 1.15);
      s.userData.resident = {
        stationId: `${layout.id}:${i}`,
        name: a.name ?? a.kind.replaceAll('_', ' '),
        lines: a.dialogue ?? [],
        meet: { x: a.x, z: a.z },
        index: j,
      };
      return s;
    }),
    });
  });
  const ball = world.getObjectByName('anim_play_ball');
  const trishaw = world.getObjectByName('anim_trishaw');
  const can = world.getObjectByName('anim_watering_can');
  const horses = Array.from({ length: 6 }, (_, i) =>
    world.getObjectByName(`anim_horse_${i}`),
  );
  const leadCart = world.getObjectByName('anim_coaster');
  const gondolas = Array.from({ length: 8 }, (_, i) =>
    world.getObjectByName(`anim_gondola_${i}`),
  );
  const carts = leadCart
    ? Array.from({ length: 3 }, () => {
        const cart = leadCart.clone();
        world.add(cart);
        return cart;
      })
    : [];
  const poses = (
    s: Three.Sprite,
    x: number,
    y: number,
    z: number,
    lean = 0,
  ) => {
    s.position.set(x, y, z);
    s.material.rotation = lean;
  };
  const micro = library
    ? createMicroLife(
        world,
        [
          ...groups,
          ...neighbours.map((s) => ({
            kind: 'social',
            x: s.position.x,
            z: s.position.z,
            count: 1,
            actors: [s],
          })),
        ],
        library,
      )
    : null;
  return (milliseconds: number, reduced: boolean, boardMode: boolean) => {
    const t = reduced ? 0 : milliseconds / 1000;
    for (const a of groups) {
      const { x, z } = a;
      a.actors.forEach((s, j) => {
        s.visible = !(boardMode && a.kind === 'play');
        const beat = t * 2 + j;
        if (a.kind.startsWith('district_')) {
          const phase = t + j * 1.8;
          const center = a.center ?? { x, z };
          // Distributed residents keep a working apron clear, rather than overlapping.
          let px = x + (j % 2 ? 0.8 : -0.8),
            pz = z + Math.floor(j / 2) * 0.9,
            y = 0.2,
            lean = 0;
          switch (a.kind) {
            case 'district_stroll':
              px += Math.sin(phase * 0.28) * 1.5;
              pz += Math.cos(phase * 0.28) * 0.5;
              y += Math.abs(Math.sin(phase * 6)) * 0.08;
              break;
            case 'district_serve':
              px += Math.sin(phase * 0.5) * 0.5;
              lean = Math.sin(phase * 2) * 0.12;
              break;
            case 'district_work':
              lean = Math.max(0, Math.sin(phase)) * 0.3;
              y += Math.sin(phase) * 0.035;
              break;
            case 'district_browse':
              pz += (1 - Math.cos(phase * 0.45)) * 0.6;
              lean = Math.sin(phase) * 0.06;
              break;
            case 'district_exercise':
              px = center.x + (j % 2 ? 1.3 : -1.3) + Math.sin(phase) * 0.35;
              pz = center.z + (j < 2 ? -1.5 : 1.5);
              y += Math.max(0, Math.sin(phase * 2)) * 0.35;
              lean = Math.cos(phase * 2) * 0.12;
              break;
            case 'district_dance':
              px = center.x + (j % 2 ? 1.1 : -1.1) + Math.sin(phase * 2) * 0.4;
              pz = center.z + (j < 2 ? -0.6 : 0.8);
              y = 0.75 + Math.abs(Math.sin(phase * 3)) * 0.15;
              lean = Math.sin(phase * 2) * 0.18;
              break;
            case 'district_queue':
              px = x + (j - 1.5) * 0.65;
              pz += Math.sin(phase * 0.3) * 0.2;
              break;
            case 'district_chat':
              if (a.name?.includes('tables') || a.name?.includes('plaza')) {
                px = center.x + Math.cos((j * Math.PI) / 2) * 1.15;
                pz = center.z + Math.sin((j * Math.PI) / 2) * 1.15;
              }
              lean = Math.sin(phase) * 0.07;
              break;
            case 'district_read':
              if (a.name === 'Computer café') {
                px = center.x - 1.3 + Math.min(j, 2) * 1.3;
                pz = center.z + (j === 3 ? 3.8 : 3.1);
              }
              lean = Math.sin(phase * 0.4) * 0.025;
              break;
            case 'district_wheel': {
              const center = a.center ?? { x, z };
              const angle = t * 0.2 + (j * Math.PI) / 2;
              px = center.x + Math.cos(angle) * 3.5;
              pz = center.z;
              y = 4.75 + Math.sin(angle) * 3.5;
              gondolas.forEach((g, k) => {
                if (g)
                  g.position.set(
                    center.x + Math.cos(t * 0.2 + (k * Math.PI) / 4) * 3.5,
                    4.5 + Math.sin(t * 0.2 + (k * Math.PI) / 4) * 3.5,
                    center.z,
                  );
              });
              break;
            }
          }
          if (/school/i.test(a.name ?? '')) {
            // Two classmates at the front desks; two friends chat on the verandah.
            px = center.x + (j % 2 ? 1.5 : -1.5);
            pz = center.z + (j < 2 ? 1.15 : 2.6);
            y = j < 2 ? 0.32 : 0.2;
          }
          if (/factory|industry|dispatch|workshop/i.test(a.name ?? '')) {
            // Packers work at either end of the roller belt, dispatch waits outside.
            px = center.x + (j % 2 ? 2 : -2);
            pz = center.z + (j < 2 ? 0.75 : 2.6);
          }
          poses(s, px, y, pz, lean);
          return;
        }
        switch (a.kind) {
          case 'housing':
            poses(
              s,
              x + Math.cos((j * Math.PI) / 2) * 1.1,
              0.2,
              z + Math.sin((j * Math.PI) / 2) * 1.1,
              Math.sin(t + j) * 0.045,
            );
            break;
          case 'play': {
            const angle = (j / a.count) * Math.PI * 2;
            const kick = Math.max(0, Math.cos(t * 2 - angle)) ** 10;
            poses(
              s,
              x + Math.cos(angle) * 2.2,
              0.2 + kick * 0.35,
              z + Math.sin(angle) * 1.8,
              Math.sin(angle) * kick * 0.18,
            );
            break;
          }
          case 'market': {
            const stall = Math.floor(j / 2) - 1;
            // Each pair approaches, exchanges a basket, then steps away together.
            const approach = (1 - Math.cos(t * 0.7 + stall)) / 2;
            poses(
              s,
              x + stall * 2.5 + (j % 2 ? 0.55 : -0.55),
              0.2,
              z + (j % 2 ? 1.5 * (1 - approach) : -0.25),
              Math.sin(beat) * 0.035,
            );
            break;
          }
          case 'fish':
            poses(
              s,
              x + Math.sin(t * 0.8 + j) * 0.12,
              0.45,
              z + j * 0.65,
              Math.sin(t * 1.2 + j) * 0.13,
            );
            break;
          case 'trishaw': {
            const px = x + Math.sin(t * 0.18) * 5;
            if (trishaw) {
              trishaw.position.set(px, 0, z);
              trishaw.rotation.y = Math.cos(t * 0.18) < 0 ? Math.PI : 0;
            }
            const dir = Math.cos(t * 0.18) < 0 ? -1 : 1;
            poses(
              s,
              px,
              j ? 0.85 : 0.35 + Math.abs(Math.sin(t * 7)) * 0.06,
              z + (j ? 0 : 1.4 * dir),
              j ? 0 : Math.sin(t * 7) * 0.09,
            );
            break;
          }
          case 'carousel': {
            const angle = t * 0.5 + (j * Math.PI) / 3;
            const y = 1.2 + Math.sin(t * 2 + j) * 0.2;
            const px = x + Math.cos(angle) * 1.5,
              pz = z + Math.sin(angle) * 1.5;
            const horse = horses[j];
            if (horse) {
              horse.position.set(px, y, pz);
              horse.rotation.y = -angle;
            }
            poses(s, px, y + 0.25, pz, Math.sin(beat) * 0.05);
            break;
          }
          case 'coaster': {
            const angle = t * 0.55 - j * 0.15;
            if (j > 0 && carts[j - 1]) {
              carts[j - 1].position.set(
                x + 4 * Math.cos(angle),
                2.3 + 1.2 * Math.sin(angle * 2),
                z + 6 * Math.sin(angle),
              );
              carts[j - 1].rotation.y = -angle;
            }
            poses(
              s,
              x + 4 * Math.cos(angle),
              2.65 + 1.2 * Math.sin(angle * 2),
              z + 6 * Math.sin(angle),
              Math.sin(angle) * 0.16,
            );
            break;
          }
          case 'tv':
            poses(
              s,
              x - 2 + j,
              0.35 + Math.max(0, Math.sin(t * 0.6)) ** 12 * 0.22,
              z + (j % 2) * 0.8,
              Math.sin(t * 0.6) * 0.06,
            );
            break;
          case 'slide': {
            const p = (t * 0.17 + j / a.count) % 1;
            // Queue, climb up the dragon, slide down, then rejoin the queue.
            if (p < 0.35)
              poses(s, x + 0.1, 0.2 + (p / 0.35) * 1.25, z - 1.6 + p * 2);
            else if (p < 0.6)
              poses(
                s,
                x + (p - 0.35) * 7,
                1.45 - (p - 0.35) * 5,
                z - 0.9,
                -0.25,
              );
            else
              poses(
                s,
                x + 1.75 - (p - 0.6) * 4.1,
                0.2,
                z - 0.9 - (p - 0.6) * 1.75,
              );
            break;
          }
          case 'commute': {
            const p = (t * 0.055 + j / a.count) % 1;
            poses(
              s,
              x - 4 + p * 8,
              0.2 + Math.abs(Math.sin(t * 7 + j)) * 0.06,
              z + Math.sin(j) * 0.35,
            );
            break;
          }
          case 'arcade':
            poses(s, 1 + j * 1.2, 0.2, 7.6, Math.sin(t * 6 + j) * 0.06);
            break;
          case 'stage':
            poses(
              s,
              x + (j === 0 ? -1.5 : [-2.7, -1.35, 1.35, 2.7][(j - 1) % 4]),
              j === 0 ? 1.05 : 0.2,
              j === 0 ? z - 2 : z + (j === 1 || j === 4 ? 0.6 : 1.2),
              Math.sin(t * 3 + j) * 0.14,
            );
            break;
          case 'garden':
            poses(
              s,
              x - 1.7 + j * 0.9,
              0.2,
              z + 0.7 + Math.sin(t * 0.6 + j) * 0.3,
              Math.max(0, Math.sin(t + j)) * 0.25,
            );
            break;
          case 'show':
            poses(
              s,
              x - 2.5 + j,
              0.2 + Math.max(0, Math.sin(t * 1.4 + j * 0.15)) ** 8 * 0.2,
              z + (j % 2) * 0.45,
              Math.sin(t * 1.4) * 0.08,
            );
            break;
        }
      });
      if (a.kind === 'play' && ball) {
        ball.visible = !boardMode;
        ball.position.set(
          x + Math.cos(t * 2) * 1.8,
          0.35 + Math.abs(Math.sin(t * 5)) * 1.3,
          z + Math.sin(t * 2) * 1.5,
        );
      }
      if (a.prop)
        a.prop.position.set(
          x + Math.sin(t * 0.7) * 0.55,
          0.95 + Math.sin(t * 1.4) * 0.12,
          z,
        );
      if (a.kind === 'garden' && can) {
        can.position.set(x - 1.4, 0.85, z + 0.4);
        can.rotation.z = Math.max(0, Math.sin(t)) * 0.8;
      }
    }
    micro?.(milliseconds, reduced, boardMode);
  };
}
