import type { EraId } from './worlds';
export const AMBIENCE = {
  kampong: {
    label: 'Morning under the palms',
    sky: '#d8c59f',
    light: '#ffefc8',
    ground: '#788661',
    sun: '#ffe3aa',
    ambient: 1.8,
    power: 2.8,
    bpm: 78,
    notes: [60, 64, 67, 69, 67, 64, 62, 67],
  },
  estate: {
    label: 'Kopi at golden hour',
    sky: '#aa7580',
    light: '#ffd4a0',
    ground: '#555d75',
    sun: '#ffb36a',
    ambient: 1.25,
    power: 2.1,
    bpm: 94,
    notes: [60, 67, 69, 72, 69, 67, 64, 62],
  },
  town: {
    label: 'The last train home',
    sky: '#34455f',
    light: '#a9c6ff',
    ground: '#283b56',
    sun: '#a3bbf4',
    ambient: 1.1,
    power: 1.2,
    bpm: 86,
    notes: [57, 60, 64, 67, 64, 60, 59, 64],
  },
  garden: {
    label: '2026 · Lights over the heartland',
    sky: '#11182f',
    light: '#7898db',
    ground: '#1a2940',
    sun: '#9bafff',
    ambient: 0.85,
    power: 0.65,
    bpm: 76,
    notes: [60, 67, 74, 76, 74, 71, 67, 64],
  },
} as const;
export function neighbourhoodBoardPoint(index: number) {
  const a = (Math.PI * 2 * index) / 22;
  return { x: 17 * Math.cos(a), y: 0.18, z: 5 * Math.sin(a) + 1 };
}
export function isEra(value: unknown): value is EraId {
  return typeof value === 'string' && Object.hasOwn(AMBIENCE, value);
}
