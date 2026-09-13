import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUTS } from '../lib/game/trip-layouts.ts';
import { walkable } from '../lib/game/trip-navigation.ts';
import {
  cityRoutes,
  journeyAt,
  streetExchange,
} from '../components/game/city-life.ts';
import { performanceKind } from '../components/game/micro-life.ts';
import { pathTo } from '../lib/game/trip-navigation.ts';

test('residents travel between all eight districts without walking through buildings or rivers', () => {
  for (const layout of Object.values(LAYOUTS)) {
    const routes = cityRoutes(layout);
    assert.equal(routes.length, 8, layout.id);
    for (const route of routes) {
      for (const point of route.points)
        assert.ok(
          walkable(layout, point),
          `${layout.id}: ${route.district.name}`,
        );
      for (let t = 0; t < 180; t += 0.71) {
        const point = journeyAt(route, t);
        assert.ok(walkable(layout, point), `${layout.id}: errand at ${t}`);
      }
    }
  }
});
test('errands have travel, arrival pauses and continuous return journeys', () => {
  const route = {
    points: [
      { x: 0, z: 0 },
      { x: 9, z: 0 },
    ],
    distances: [0, 9],
    length: 9,
  };
  assert.equal(journeyAt(route, 2).walking, true);
  assert.equal(journeyAt(route, 7).walking, false);
  assert.equal(journeyAt(route, 7).x, 9);
  assert.equal(journeyAt(route, 14).returning, true);
  assert.ok(Math.abs(journeyAt(route, 24).x) < 0.001);
});
test('every era has work, learning and office districts with reachable classroom aisles', () => {
  for (const m of Object.values(LAYOUTS)) {
    for (const role of ['school', 'industry', 'office'])
      assert.ok(
        m.districts.some((d) => d.role === role),
        `${m.id}: ${role}`,
      );
    const school = m.districts.find((d) => d.role === 'school');
    const center = m.activities.find((a) => a.name === school.name).center;
    assert.ok(
      pathTo(m, m.spawn, { x: center.x + 0.5, z: center.z }).length,
      `${m.id}: enter classroom aisle`,
    );
    assert.equal(
      m.animated.includes('anim_train'),
      ['estate', 'town', 'garden'].includes(m.id),
    );
  }
});
test('school, industry, offices and meals have different exchanges and specialised props', () => {
  const names = [
    'Village school',
    'Jurong factory shift',
    'CBD lunch hour',
    'Roadside supper',
  ];
  assert.equal(
    new Set(names.map((n) => streetExchange(n, 'river').join('|'))).size,
    4,
  );
  assert.equal(
    performanceKind({ kind: 'district_read', name: 'School courtyard' }),
    'reading',
  );
  assert.equal(
    performanceKind({
      kind: 'district_work',
      name: 'Industrial dispatch yard',
    }),
    'market',
  );
});
