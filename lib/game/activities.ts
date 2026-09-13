import type { EraId } from './worlds';
export type ActivityId =
  | 'kopi'
  | 'market'
  | 'stage'
  | 'coaster'
  | 'playground'
  | 'garden';
export const ACTIVITIES: Record<
  ActivityId,
  {
    title: string;
    place: string;
    instruction: string;
    scene: string;
    history: string;
  }
> = {
  kopi: {
    title: 'One kopi, coming up!',
    place: 'Neighbourhood kopitiam',
    instruction:
      'Read your neighbour’s order, brew the coffee, then choose the right additions.',
    scene: 'kopi',
    history:
      'A fictional coffee shop inspired by Singapore’s everyday kopitiam culture.',
  },
  market: {
    title: 'The morning market run',
    place: 'Neighbourhood market',
    instruction:
      'Help your neighbour pick up the ingredients on their shopping list.',
    scene: 'market',
    history:
      'A fictional market visit: shopping, familiar stallholders and sharing a meal.',
  },
  stage: {
    title: 'An evening at Gay World',
    place: 'Geylang · late 1960s–1980s',
    instruction:
      'Your sprite takes the stage. Clap when the moving light reaches the gold band.',
    scene: 'stage',
    history:
      'Gay World hosted food stalls, game booths, cinemas and Chinese, Malay and Tamil shows. This rhythm game is an original interpretation, not a reconstruction of a performance.',
  },
  coaster: {
    title: 'Last ride before going home',
    place: 'Wonderland, Kallang · 1970s–1980s',
    instruction: 'Board with your kaki. Cheer at the hilltops during two laps!',
    scene: 'coaster',
    history:
      'NHB documents roller coasters at Wonderland, which operated from 1969 to 1988. The track here is fictional; it is not attributed to Gay World.',
  },
  playground: {
    title: 'Downstairs after school',
    place: 'HDB playground · 1980s onward',
    instruction:
      'Hop along the chalk squares. Tap when the light reaches the gold band.',
    scene: 'playground',
    history:
      'A fictional after-school game beside a mosaic-inspired dragon playground.',
  },
  garden: {
    title: 'Our little community garden',
    place: 'Neighbourhood garden · 2020s',
    instruction:
      'Water each bed, then harvest something to share with your neighbours.',
    scene: 'garden',
    history:
      'A fictional community garden with pandan, chilli and leafy greens.',
  },
};
export const ERA_ACTIVITIES: Record<EraId, ActivityId[]> = {
  kampong: ['kopi', 'market', 'stage'],
  estate: ['kopi', 'market', 'stage', 'coaster', 'playground'],
  town: ['kopi', 'market', 'playground'],
  garden: ['kopi', 'market', 'garden'],
};
export const KOPI_ORDERS = [
  {
    name: 'Kopi',
    customer: 'One kopi, please. Sweet and milky.',
    recipe: ['Brew coffee', 'Condensed milk', 'Serve'],
  },
  {
    name: 'Kopi-O',
    customer: 'Kopi-O for me — sugar, no milk.',
    recipe: ['Brew coffee', 'Sugar', 'Serve'],
  },
  {
    name: 'Kopi-O kosong',
    customer: 'Mine without sugar or milk, thanks!',
    recipe: ['Brew coffee', 'Serve'],
  },
];
export const MARKET_LIST = ['Pandan', 'Eggs', 'Coconut'];
export function ridePoint(t: number) {
  return {
    x: 5 * Math.cos(t),
    y: 1.3 + 0.85 * (1 + Math.sin(2 * t)),
    z: -3 * Math.sin(t),
  };
}
export function inTimingWindow(phase: number) {
  return phase >= 0.38 && phase <= 0.62;
}
