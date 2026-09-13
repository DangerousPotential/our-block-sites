import compressed from './compression.json';

const aliases = new Map(
  compressed.map((entry) => [entry.source, entry.output]),
);
/** Old logical URLs remain valid for game data, bookmarks and colour-key sprites. */
export const runtimeAssetPath = (path: string) => aliases.get(path) ?? path;
