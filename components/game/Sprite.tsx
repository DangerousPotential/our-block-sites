// A background-position atlas needs a span; role and label expose the selected cell.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import type { CSSProperties } from 'react';
import { findCharacter } from '@/lib/game/characters';
export default function Sprite({
  id,
  age = 0,
  className = '',
  pose = 'idle',
}: {
  id: string;
  age?: number;
  className?: string;
  pose?: string;
}) {
  const c = findCharacter(id);
  const rows = c.kind === 'pet' ? 2 : 3;
  const row = c.kind === 'pet' ? c.row : age;
  return (
    <span
      role="img"
      aria-label={`${c.name}${c.kind === 'neighbour' ? `, ${['young', 'middle-aged', 'older'][age]} adult` : ''}`}
      className={`sprite ${className} pose-${pose}`}
      style={
        {
          '--sprite-image': `url(/api/media?path=assets/${c.kind === 'pet' ? 'pets' : 'neighbours'}.png)`,
          '--sprite-x': `${(c.column * 100) / 3}%`,
          '--sprite-y': `${(row * 100) / (rows - 1)}%`,
          '--sprite-rows': rows,
        } as CSSProperties
      }
    />
  );
}
