// Refresh collider metadata after opening the civic kit interiors; no mesh rebuild required.
import { readFileSync, writeFileSync } from 'node:fs';
for (const era of ['river', 'fair', 'estate', 'town', 'garden']) {
  const file = `public/assets/trip/${era}.json`,
    m = JSON.parse(readFileSync(file, 'utf8'));
  for (const d of m.districts) {
    if (!['school', 'industry'].includes(d.role)) continue;
    const a = m.activities.find((a) => a.name === d.name),
      { x, z } = a.center;
    const width = d.role === 'school' ? 5.5 : 6,
      depth = d.role === 'school' ? 3 : 3.5;
    const prior = m.solids.findIndex(
      (s) => s.x === x && s.z === z && s.w === width && s.d === depth,
    );
    if (prior < 0) continue;
    m.solids.splice(prior, 1);
    const add = (x, z, w, d, padding = 0.28) =>
      m.solids.push({ x, z, w, d, padding });
    if (d.role === 'school') {
      for (const dx of [-2.65, 2.65]) add(x + dx, z, 0.18, 2.8);
      add(x, z - 1.4, 5.4, 0.18);
      for (const dx of [-1.5, 0, 1.5])
        for (const dz of [-0.5, 0.7]) add(x + dx, z + dz, 0.9, 0.55, 0.04);
    } else {
      add(x, z - 1.5, 5.8, 0.2);
      for (const dx of [-2.8, 2.8]) add(x + dx, z, 0.16, 3);
      add(x, z + 0.65, 3.7, 0.65);
    }
  }
  writeFileSync(file, JSON.stringify(m, null, 2));
}
