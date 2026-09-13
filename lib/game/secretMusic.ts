export const secretTracks = {
  'maple-opening': {
    title: 'Maple Opening Theme',
    src: '/api/media?path=audio/maple-opening.mp3',
  },
  henesys: { title: 'Henesys · Floral Life', src: '/api/media?path=audio/henesys.mp3' },
  ellinia: {
    title: 'When the Morning Comes',
    src: '/api/media?path=audio/ellinia.mp3',
  },
  sleepywood: { title: 'Sleepywood', src: '/api/media?path=audio/sleepywood.mp3' },
  perion: { title: 'Perion · Nightmare', src: '/api/media?path=audio/perion.mp3' },
  singapore: { title: 'Singapore · CBD Town', src: '/api/media?path=audio/singapore.mp3' },
  'lith-harbor': {
    title: 'Lith Harbor · Above the Treetops',
    src: '/api/media?path=audio/lith-harbor.mp3',
  },
  'kerning-city': {
    title: 'Kerning City · Bad Guys',
    src: '/api/media?path=audio/kerning-city.mp3',
  },
};
export type SecretTrack = keyof typeof secretTracks;
export const characterTracks: Readonly<
  Record<string, SecretTrack | undefined>
> = {
  merly: 'maple-opening',
  kopi: 'henesys',
  pandan: 'ellinia',
  kueh: 'sleepywood',
  otto: 'perion',
  duri: 'singapore',
  chope: 'lith-harbor',
  long: 'kerning-city',
};
export type TapSequence = {
  character: string;
  startedAt: number;
  count: number;
};
export function registerSecretTap(
  previous: TapSequence | null,
  character: string,
  now: number,
) {
  const track = Object.hasOwn(characterTracks, character)
    ? characterTracks[character]
    : undefined;
  if (!track) return { sequence: null, track: null };
  const sequence =
    previous?.character === character && now - previous.startedAt <= 1500
      ? { ...previous, count: previous.count + 1 }
      : { character, startedAt: now, count: 1 };
  if (sequence.count === 5)
    return {
      sequence: null,
      track,
    };
  return { sequence, track: null };
}
