export type Character = {
  id: string;
  name: string;
  kind: 'pet' | 'neighbour';
  column: number;
  row: number;
  tagline: string;
  story: string;
  colour: string;
  background?: string;
};
export const characters: Character[] = [
  {
    id: 'merly',
    name: 'Merly',
    kind: 'pet',
    column: 0,
    row: 0,
    tagline: 'The splashy one',
    story:
      'Small fins. Big main-character energy. Celebrates every win with a little splash.',
    colour: '#49aaa7',
  },
  {
    id: 'kopi',
    name: 'Kopi',
    kind: 'pet',
    column: 1,
    row: 0,
    tagline: 'Powered by kopi',
    story:
      'First at the coffee stall, last to leave the party. A tiny cup with plenty of can-do.',
    colour: '#6aa0bb',
  },
  {
    id: 'pandan',
    name: 'Pandan',
    kind: 'pet',
    column: 2,
    row: 0,
    tagline: 'Quietly growing on you',
    story:
      'The calm one in a very chaotic group chat. Always has a little room to grow.',
    colour: '#82a264',
  },
  {
    id: 'kueh',
    name: 'Kueh',
    kind: 'pet',
    column: 3,
    row: 0,
    tagline: 'Three layers of trouble',
    story: 'Three opinions, two tiny feet, one beautifully questionable plan.',
    colour: '#c489a5',
  },
  {
    id: 'otto',
    name: 'Otto',
    kind: 'pet',
    column: 0,
    row: 1,
    tagline: 'Your river-side ride-or-die',
    story:
      'Always brings the whole family. Very good at making a splash, less good at queuing.',
    colour: '#bb936b',
  },
  {
    id: 'duri',
    name: 'Duri',
    kind: 'pet',
    column: 1,
    row: 1,
    tagline: 'Soft heart. Spiky entrance.',
    story:
      'An acquired taste and an excellent friend. A little prickly before breakfast.',
    colour: '#96a051',
  },
  {
    id: 'chope',
    name: 'Chope',
    kind: 'pet',
    column: 2,
    row: 1,
    tagline: 'This seat is taken',
    story:
      'A pocket-sized planner who arrives early and saves a spot for everyone.',
    colour: '#67a8c2',
  },
  {
    id: 'long',
    name: 'Long',
    kind: 'pet',
    column: 3,
    row: 1,
    tagline: 'Old-school playground legend',
    story:
      'A neighbourhood favourite, finally off the playground and out for an adventure.',
    colour: '#d77b5a',
  },
  {
    id: 'mei',
    name: 'Mei',
    kind: 'neighbour',
    column: 0,
    row: 0,
    background: 'Chinese Singaporean',
    tagline: 'Always trying something new',
    story:
      'A curious neighbour who collects family recipes and takes the scenic route home.',
    colour: '#d58d7d',
  },
  {
    id: 'aisyah',
    name: 'Aisyah',
    kind: 'neighbour',
    column: 1,
    row: 0,
    background: 'Malay Singaporean',
    tagline: 'The group-chat organiser',
    story:
      'Loves photography, bad puns and getting the whole block together for a game.',
    colour: '#58a5a0',
  },
  {
    id: 'arun',
    name: 'Arun',
    kind: 'neighbour',
    column: 2,
    row: 0,
    background: 'Indian Singaporean',
    tagline: 'A wonderfully elaborate plan',
    story:
      'A music lover and enthusiastic tinkerer. His shortcuts usually become adventures.',
    colour: '#b79054',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    kind: 'neighbour',
    column: 3,
    row: 0,
    background: 'Eurasian Singaporean',
    tagline: 'One more round?',
    story:
      'A keen gardener with a competitive streak and an excellent snack collection.',
    colour: '#9189b5',
  },
];
export const findCharacter = (id: string) =>
  characters.find((c) => c.id === id) ?? characters[0];
export const ageLabels = [
  'Young adult · 20s',
  'Middle age · 40s',
  'Older adult · 60s',
];
