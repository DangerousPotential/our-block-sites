export const ERAS = [
  {
    id: 'kampong',
    label: '1960s · Kampong lanes',
    title: 'Meet me under the palms',
    detail:
      'Timber homes, provision shops, shared water jars and shady gathering places.',
    year: 1965,
  },
  {
    id: 'estate',
    label: '1980s · Our new estate',
    title: 'Downstairs, everyone belongs',
    detail:
      'Open void decks, a mosaic dragon playground, kopi tables and a neighbourhood hawker centre.',
    year: 1987,
  },
  {
    id: 'town',
    label: '2000s · Connected town',
    title: 'Next stop, home',
    detail:
      'MRT trains pass a familiar neighbourhood of shophouses, food stalls and taller HDB blocks.',
    year: 2000,
  },
  {
    id: 'garden',
    label: '2026 · Lights & gardens',
    title: 'A little more room to grow',
    detail:
      'Community gardens, rooftop solar panels and a cycling path join the shared spaces we know.',
    year: 2026,
  },
] as const;
export type EraId = (typeof ERAS)[number]['id'];
export function eraForYear(year: number): EraId {
  // Archived board rooms stay on the retained estate.
  void year;
  return 'estate';
}
// Blender uses Z-up; GLTF converts (x,y,z) to (x,z,-y).
export function routePoint(index: number) {
  const angle = (Math.PI * 2 * index) / 22 + Math.PI / 2;
  return { x: 6.15 * Math.cos(angle), y: 0.46, z: -4.15 * Math.sin(angle) };
}
