import type * as Three from 'three';
import { speechAnchor, speakerVisible } from './speech-anchor';
import {
  pathTo,
  meetingPoint,
  type Layout,
  type Point,
} from '../../lib/game/trip-navigation';

/** Reciprocal errands use the same collision map as the player, never decorative orbits. */
export function cityRoutes(layout: Layout) {
  const districts = layout.districts ?? [];
  const stops = districts.map((d) => meetingPoint(layout, layout.spawn, d));
  return districts.flatMap((district, i) => {
    const a = stops[i],
      b = stops[(i + 1) % stops.length];
    if (!a || !b) return [];
    const points = [a, ...pathTo(layout, a, b)];
    if (points.length < 2) return [];
    const distances = [0];
    for (let j = 1; j < points.length; j++)
      distances.push(
        distances[j - 1] +
          Math.hypot(
            points[j].x - points[j - 1].x,
            points[j].z - points[j - 1].z,
          ),
      );
    return [{ district, points, distances, length: distances.at(-1)! }];
  });
}

export function journeyAt(
  route: ReturnType<typeof cityRoutes>[number],
  seconds: number,
) {
  const speed = 1.8,
    travel = route.length / speed,
    pause = 7;
  const cycle = 2 * (travel + pause),
    phase = ((seconds % cycle) + cycle) % cycle;
  const returning = phase >= travel + pause;
  const leg = returning ? phase - travel - pause : phase;
  const walking = leg < travel;
  const distance = returning
    ? route.length - Math.min(leg, travel) * speed
    : Math.min(leg, travel) * speed;
  let index = 1;
  while (
    index < route.distances.length - 1 &&
    route.distances[index] < distance
  )
    index++;
  const a = route.points[index - 1],
    b = route.points[index];
  const amount =
    (distance - route.distances[index - 1]) /
    (route.distances[index] - route.distances[index - 1]);
  return {
    x: a.x + (b.x - a.x) * amount,
    z: a.z + (b.z - a.z) * amount,
    walking,
    returning,
    pause: Math.max(0, leg - travel),
  };
}

export function streetExchange(name: string, era: string): [string, string] {
  const school: Record<string, [string, string]> = {
    river: ['Bring your exercise book!', 'After class, chapteh outside?'],
    fair: ['The bell has gone. Canteen?', 'Wait, I am packing my satchel!'],
    estate: [
      'Meet downstairs after school?',
      'Bring your erasers. We will play!',
    ],
    town: ['Computer lab after recess?', 'Then badminton before the bus.'],
    garden: ['Our seedlings need watering.', 'I will get the can after class!'],
  };
  const work: Record<string, [string, string]> = {
    river: ['These planks are for the boat.', 'I will bring the next bundle.'],
    fair: ['The textile order is ready.', 'Load it, then supper with us?'],
    estate: ['Check the next batch, please.', 'All ready for packing!'],
    town: ['The delivery van is coming.', 'Labels checked. Pass that box.'],
    garden: ['This part can be repaired.', 'Let us test it before dispatch.'],
  };
  if (/school/i.test(name)) return school[era] ?? school.river;
  if (/office|bank|CBD|trading/i.test(name))
    return ['Lunch with the others?', 'Yes! I will find us a table.'];
  if (/factory|industry|dispatch|workshop/i.test(name))
    return work[era] ?? work.river;
  if (/kopi|café/i.test(name))
    return ['Kopi and kaya toast, please!', 'Coming! Sit with your friends.'];
  if (/supper|food/i.test(name))
    return ['Two bowls, one less chilli!', 'Got it. Pass me the bowls?'];
  if (/market|trader|shop/i.test(name))
    return ['Fresh delivery this morning?', 'Yes, let me pack some for you.'];
  if (/court|games|play/i.test(name))
    return ['Your turn! Over here!', 'One more game before home!'];
  if (/bus|station|commut/i.test(name))
    return ['Is this our stop?', 'Come, we will go together.'];
  if (/fishing|hamlet/i.test(name))
    return ['Help me with this net?', 'Coming. Keep the basket ready.'];
  if (/cinema|stage|dance|wheel/i.test(name))
    return ['Our friends are over there!', 'Save us a place for the show!'];
  if (/attap/i.test(name))
    return ['The washing is nearly dry.', 'I will bring the basket over.'];
  if (/tv/i.test(name))
    return ['Quick, the programme is on!', 'Move over, there is room!'];
  return era === 'garden'
    ? ['Walk by the bay after dinner?', 'Yes, before the lights come on.']
    : ['Have you eaten yet?', 'Come and sit with us a while.'];
}

/** Traffic + overheard two-way exchanges. Bounded DOM bubble pool, no React frame updates. */
export function createCityLife(
  T: typeof Three,
  scene: Three.Scene,
  host: HTMLElement,
  layout: Layout,
  neighbours: Three.Sprite[],
  library: Three.Group,
  blockers: Three.Object3D[],
) {
  for (const district of layout.districts ?? []) {
    if (district.role !== 'school') continue;
    const center = layout.activities?.find(
      (a) => a.name === district.name,
    )?.center;
    const emblem = library.getObjectByName('micro_flag_emblem')?.clone();
    if (center && emblem) {
      emblem.position.set(center.x - 2.94, 3.7, center.z + 1.617);
      scene.add(emblem);
    }
  }
  const groups = new Map<string, Three.Sprite[]>();
  for (const s of neighbours) {
    const name = s.userData.resident?.name;
    const station = s.userData.resident?.stationId ?? name;
    if (name) groups.set(station, [...(groups.get(station) ?? []), s]);
  }
  const exchanges = [...groups]
    .filter(([, actors]) => actors.length > 1)
    .map(([, actors], i) => ({
      name: actors[0].userData.resident.name as string,
      actors,
      offset: i * 3.73,
    }));
  const bubbles = Array.from({ length: 1 }, () => {
    const node = document.createElement('div');
    node.className = 'city-speech';
    node.hidden = true;
    host.appendChild(node);
    return node;
  });
  const deliveries = (layout.activities ?? [])
    .filter(
      (a) =>
        /factory|industry|dispatch|workshop/i.test(a.name ?? '') && a.center,
    )
    .flatMap((a) =>
      [0].map((index) => {
        const parcel = library.getObjectByName('micro_parcel')!.clone();
        parcel.name = `conveyor_parcel_${index}`;
        scene.add(parcel);
        return { parcel, center: a.center!, index };
      }),
    );
  const ray = new T.Raycaster();
  const visibility = new Map<
    Three.Sprite,
    { time: number; visible: boolean; eye: Three.Vector3; head: Three.Vector3 }
  >();
  return {
    update(
      time: number,
      reduced: boolean,
      board: boolean,
      camera: Three.Camera,
      player: Three.Sprite,
    ) {
      const seconds = reduced ? 0 : time / 1000;
      for (const { parcel, center, index } of deliveries) {
        const phase = (seconds * 0.18 + index / 3) % 1;
        parcel.position.set(center.x - 1.5 + phase * 3, 1.06, center.z + 0.65);
        parcel.visible = !board;
      }
      // Project with this frame's transforms, not the previous render's matrices.
      camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      bubbles.forEach((b) => {
        b.hidden = true;
      });
      if (board || reduced) return;
      const candidates = exchanges
        .flatMap((e) => {
          const phase = (seconds + e.offset) % 19;
          if (phase >= 9) return [];
          const speaker = phase < 4.5 ? 0 : 1,
            s = e.actors[speaker];
          if (e.actors[0].position.distanceTo(e.actors[1].position) > 7)
            return [];
          const distance = s.position.distanceTo(player.position);
          return distance < 13 && s.visible
            ? [
                {
                  s,
                  text:
                    e.actors[0].userData.resident?.calls?.[speaker] ??
                    streetExchange(e.name, layout.id)[speaker],
                  distance,
                },
              ]
            : [];
        })
        .sort((a, b) => a.distance - b.distance);
      const occupied: { x: number; y: number }[] = [];
      for (const candidate of candidates.slice(0, 5)) {
        const anchor = speechAnchor(
          candidate.s,
          camera,
          host.clientWidth,
          host.clientHeight,
        );
        const { x, y } = anchor;
        if (
          x < 80 ||
          x > host.clientWidth - 80 ||
          y < 100 ||
          y > host.clientHeight - 70 ||
          !anchor.inView
        )
          continue;
        let cached = visibility.get(candidate.s);
        if (
          !cached ||
          time - cached.time > 120 ||
          cached.eye.distanceTo(camera.position) > 0.2 ||
          cached.head.distanceTo(anchor.head) > 0.1
        ) {
          cached = {
            time,
            visible: speakerVisible(anchor, camera, blockers, ray),
            eye: camera.position.clone(),
            head: anchor.head.clone(),
          };
          visibility.set(candidate.s, cached);
        }
        if (!cached.visible) continue;
        if (
          occupied.some(
            (p) => Math.abs(p.x - x) < 180 && Math.abs(p.y - y) < 75,
          )
        )
          continue;
        const node = bubbles[occupied.length];
        if (!node) break;
        if (node.textContent !== candidate.text)
          node.textContent = candidate.text;
        node.dataset.speaker = candidate.s.userData.character;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.hidden = false;
        occupied.push({ x, y });
        if (occupied.length >= (host.clientWidth < 600 ? 2 : 3)) break;
      }
    },
    dispose() {
      bubbles.forEach((b) => b.remove());
    },
  };
}
