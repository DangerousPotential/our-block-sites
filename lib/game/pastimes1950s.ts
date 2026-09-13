import { TRIP_ERAS, type TripEra } from './trip';
/** Curated decade-wide encounters. Geometry and routing are exported by Blender. */
export const PASTIMES_1950S = [
  {
    id: 'cathay',
    name: 'Cathay · Pontianak',
    date: '1957',
    action: 'Enter the cinema',
    story:
      'Pontianak, made by Cathay-Keris in 1957, became a major hit at Cathay Cinema. Local Malay filmmaking made a cinema outing part of Singapore’s own cultural life.',
    question: 'What makes this screening a 1950s memory?',
    choices: ['A locally made 1957 film', 'A television premiere'],
    answer: 0,
    response:
      'The film and the venue belong together: Pontianak was a 1957 Cathay-Keris hit at Cathay. The poster is an original illustration, not an archival reproduction.',
    source:
      'https://www.roots.gov.sg/places/places-landing/Places/national-monuments/former-cathay-building-now-the-cathay',
  },
  {
    id: 'wall-of-death',
    name: 'Great World · Wall of Death',
    date: '1950s',
    action: 'Watch the stunt',
    story:
      'Great World was known for its Wall of Death motorcycle attraction. Spectators watched the performance from above as a rider circled the enclosure.',
    question: 'Where does the motorcyclist perform?',
    choices: ['On an ordinary road', 'Around the inside wall'],
    answer: 1,
    response:
      'The vertical wall was the spectacle. The attraction is documented, while this timber structure is a stylised interpretation rather than a measured reconstruction.',
    source: 'https://corporate.nas.gov.sg/discover-archives/media/greatworld/',
  },
  {
    id: 'bunga-tanjong',
    name: 'Bunga Tanjong · Joget',
    date: '1950s',
    action: 'Join the dance floor',
    story:
      'Bunga Tanjong at New World was a well-known place for joget and ronggeng. Live musicians and social dancing made the hall a meeting place in the 1950s.',
    question: 'What brought this dance floor to life?',
    choices: ['A live ensemble', 'A disco DJ'],
    answer: 0,
    response:
      'Musicians played for dancers. This scene evokes Malay social dancing; its hall and choreography are interpretive, not a recording of a particular performance.',
    source:
      'https://biblioasia.nlb.gov.sg/chapters-of-asia/chapters-on-asia-2014-2017-lancing-girls-cabarets-charity-cheongsams/',
  },
  {
    id: 'badminton',
    name: 'Badminton Hall · Thomas Cup',
    date: '1955',
    action: 'Take a grandstand seat',
    story:
      'Singapore Badminton Hall at Guillemard Road hosted the Thomas Cup in 1955 and 1958. Crowds gathered in its tiered grandstands to watch the competition.',
    question: 'Which tournament belongs in this hall?',
    choices: ['The 1952 Thomas Cup', 'The 1955 Thomas Cup'],
    answer: 1,
    response:
      '1955. The 1952 tournament was at Happy World. Players from Singapore competed in the Malayan team, before Singapore became an independent nation.',
    source:
      'https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/sinbdtha-01/',
  },
  {
    id: 'katong',
    name: 'Katong Park · Sea bathing',
    date: '1950s',
    action: 'Visit the bathing pagar',
    story:
      'Families spent weekends at Katong Park’s public bathing pagar: a fenced swimming enclosure extending into the sea, with changing rooms beside it.',
    question: 'What is inside the enclosure?',
    choices: ['Seawater', 'A modern tiled pool'],
    answer: 0,
    response:
      'The sea itself. A dated 1950s archival photograph documents the enclosure. The surrounding coast looked very different before reclamation.',
    source:
      'https://www.nas.gov.sg/archivesonline/photographs/record-details/d52431a8-1161-11e3-83d5-0050568939ad',
  },
  {
    id: 'tiger-balm',
    name: 'Tiger Balm Gardens · Tableaux',
    date: '1950s',
    action: 'Explore the tableaux',
    story:
      'Families visited Tiger Balm Gardens to examine its painted sculptural scenes. A 1950s museum postcard shows a farmer handing ointment to his injured wife.',
    question: 'What are the figures in this exhibit?',
    choices: ['Actors on a stage', 'Painted sculptural figures'],
    answer: 1,
    response:
      'The figures form a tableau. The new artwork interprets a documented 1950s exhibit; later giant-dragon attractions do not belong in this decade.',
    source:
      'https://www.roots.gov.sg/Collection-Landing/listing/1133682?taigerlist=collections',
  },
  {
    id: 'rediffusion',
    name: 'Coffee shop · Rediffusion',
    date: '1950s',
    action: 'Gather by the speaker',
    story:
      'Rediffusion arrived in Singapore in 1949. Storytellers such as Lee Dai Soh became familiar voices, bringing entertainment to listeners through a wired speaker box.',
    question: 'How did the stories reach this box?',
    choices: ['Through a cable', 'Through a television aerial'],
    answer: 0,
    response:
      'Rediffusion used a cable-fed loudspeaker. This coffee-shop interior represents the shared listening described in museum records. No later archival recording is presented as a 1950s broadcast.',
    source:
      'https://biblioasia.nlb.gov.sg/all-sections/vol-15-issue-4-jan-mar-2020-rediffusion-golden-years/',
  },
] as const;
export const PASTIMES_ERA = {
  id: 'pastimes',
  year: 1950,
  name: 'Singapore at play',
  subtitle: '1950s · Seven places, seven pastimes',
  color: '#67596b',
  npcs: [
    'Cinema neighbour',
    'Joget dancer',
    'Badminton supporter',
    'Radio listener',
  ],
} as const;

export type WorldEra = TripEra | 'pastimes';
export const EXPLORATION_ERAS = [PASTIMES_ERA, ...TRIP_ERAS.filter(era => era.id === 'estate')];
