/** Streams stay with their publishers; no recordings are bundled with the game. */
export const GETAI_SONGS = [
  {
    id: 'home',
    title: 'Home',
    artist: 'Kit Chan · 陈洁仪',
    category: 'National Day',
    edition: 'National Day Parade · 1998',
    video: 'eqHzAwi1NCs',
    startSeconds: 15,
  },
  {
    id: 'road-ahead',
    title: 'The Road Ahead',
    artist: 'Linying, Sezairi, Shye & Shabir',
    category: 'National Day',
    edition: 'NDP 2021',
    video: 'II_5jBaYmGQ',
  },
  {
    id: 'xi-shui',
    title: '细水长流',
    artist: '梁文福 · Liang Wern Fook',
    category: '新谣',
    edition: 'Friendship Runs Deep',
    video: 'Hwoft2Hlafk',
  },
  {
    id: 'voices',
    title: '小人物的心声',
    artist: '吴佳明 · Wu Jiaming',
    category: '新谣',
    edition: 'Voices from the Heart',
    video: '2MbQucZX-Lw',
  },
] as const;
export type GetaiSongId = (typeof GETAI_SONGS)[number]['id'];

