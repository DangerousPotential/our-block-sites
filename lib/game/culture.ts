import worlds from './culture-worlds.json';
import type { Point, Layout } from './trip-navigation';

export type CultureStation = Point & {
  id: string;
  title: string;
  description: string;
  action: string;
  kind: string;
  entrance: Point;
  focus: Point;
  duration: number;
  scale?: number;
  elevation?: number;
};
export type CultureWorld = {
  stations: CultureStation[];
  solids: Layout['solids'];
  spawn: Point;
  center: Point;
  bounds: Point;
};
export const CULTURE: Record<string, CultureWorld> = Object.fromEntries(
  Object.entries(worlds).filter(([era]) => era !== 'river'),
);
export const CULTURE_TITLES: Record<string, string> = {
  river: 'Along the river',
  fair: 'Night at the Worlds',
  estate: 'After school',
  town: 'One more game',
  garden: 'Together after hours',
};
export const ATMOSPHERE: Record<
  string,
  {
    sky: string;
    ground: string;
    sun: string;
    ambient: string;
    exposure: number;
  }
> = {
  river: {
    sky: '#c9c2ac',
    ground: '#8e7963',
    sun: '#ffe6b7',
    ambient: '#e9dcc6',
    exposure: 1.05,
  },
  fair: {
    sky: '#302c48',
    ground: '#665270',
    sun: '#d3c2ed',
    ambient: '#a99de5',
    exposure: 1.1,
  },
  estate: {
    sky: '#d4b894',
    ground: '#ae8960',
    sun: '#ffdda0',
    ambient: '#f7dfb5',
    exposure: 1.05,
  },
  town: {
    sky: '#687e98',
    ground: '#607481',
    sun: '#cbd9fb',
    ambient: '#87a9df',
    exposure: 0.95,
  },
  garden: {
    sky: '#293d55',
    ground: '#556b76',
    sun: '#ffcf98',
    ambient: '#a7cdd4',
    exposure: 1.25,
  },
};

// Stable, time-based phases are shared by the actual props and their participants.
export function culturePhase(time: number, duration: number, reduced: boolean) {
  return reduced ? 0.18 : ((time / 1000) % duration) / duration;
}
