import type { WorldEra } from './pastimes1950s';
export function residentRole(kind: string) {
  const roles: Record<string, string> = {
    play: 'Courtyard games',
    market: 'Market neighbour',
    fish: 'Quayside fisher',
    trishaw: 'Trishaw ride',
    carousel: 'Carousel rider',
    coaster: 'Coaster rider',
    tv: 'Television corner',
    slide: 'Playground friend',
    commute: 'Commuter',
    arcade: 'Arcade player',
    stage: 'Stage audience',
    garden: 'Community gardener',
    show: 'Light-show visitor',
  };
  return roles[kind] ?? kind;
}
const topics: Record<string, string[]> = {
  play: [
    'We are taking turns. Come and watch the next pass!',
    'A little game feels better when your friends join in.',
  ],
  market: [
    'I am helping with the stall today. These baskets will be empty by supper.',
    'We sort the produce, weigh the order, then carry it home together.',
  ],
  fish: [
    'Wait for the line to move. The river rewards a little patience.',
    'The baskets are for the catch, and the net needs mending before we leave.',
  ],
  trishaw: [
    'We are taking a short trishaw ride through the neighbourhood.',
    'Meet us beside the lane when we come around again.',
  ],
  carousel: [
    'We keep choosing different horses. Mine is the lucky one today!',
    'We will meet our friends by the entrance after this turn.',
  ],
  coaster: [
    'Hold on! We have been looking forward to this ride all evening.',
    'Afterwards we are all going to find something to eat.',
  ],
  tv: [
    'Come over—the neighbours are watching together. There is room at the back.',
    'Some of us follow the programme; the others mainly came for the conversation.',
  ],
  slide: [
    'One at a time! We are taking turns on the dragon slide.',
    'After this, we are going to see who can finish the chalk game.',
  ],
  commute: [
    'I am on my way to meet a friend. We always choose somewhere near the station.',
    'There is time for a quick drink before the journey home.',
  ],
  arcade: [
    'We are comparing scores. I almost beat my friend that time.',
    'The noisy machines are fun, but playing together is the best part.',
  ],
  stage: [
    'The performers are starting. Stand with us and watch.',
    'We will clap loudly enough for our friends backstage to hear.',
  ],
  garden: [
    'I am checking the leaves and watering the plants.',
    'We share tips, spare seedlings, and whatever is ready to harvest.',
  ],
  show: [
    'We found a good spot to watch the lights together.',
    'There is no hurry. Stay for another round before you go.',
  ],
};
const elsewhere: Record<WorldEra, string> = {
  pastimes:
    'A film, a dance, a seaside afternoon — there are many ways to spend a day here.',
  river:
    'There are more neighbours along the quayside, in the attap village and at the roadside stalls.',
  fair: 'Our friends are scattered between the picture palace, dance pavilion, food street and rides.',
  estate:
    'You can find the rest downstairs: at the wet market, school gate, court and supper tables.',
  town: 'Some friends are at the computer café; others are waiting near the interchange and library.',
  garden:
    'We meet around the garden café, workshop, bay walk and waterfront food street.',
};
export function residentLines(
  era: WorldEra,
  kind: string,
  authored?: string[],
) {
  return [
    ...(authored?.length
      ? authored
      : (topics[kind] ?? [
          'Nice to see you out in the neighbourhood.',
          'I am spending a little time with the people who live around here.',
        ])),
    elsewhere[era],
  ];
}
