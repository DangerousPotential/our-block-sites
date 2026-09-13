import { prepareForestArt } from './forest-art';

type ArtFile =
  | 'lantern-props-key.png'
  | 'kopi-props-key.png'
  | 'hawker-dishes.png';
const loaded = new Map<ArtFile, Promise<HTMLCanvasElement>>();

// A single decoded sheet is shared by the game and all four phone buttons.
export function loadMinigameArt(file: ArtFile) {
  let pending = loaded.get(file);
  if (!pending) {
    pending = new Promise<HTMLCanvasElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (file.endsWith('-key.png')) resolve(prepareForestArt(image));
        else {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext('2d')!.drawImage(image, 0, 0);
          resolve(canvas);
        }
      };
      image.onerror = () => {
        loaded.delete(file);
        reject(new Error(`Cannot load ${file}`));
      };
      image.src = `/api/art?file=party/${file}`;
    });
    loaded.set(file, pending);
  }
  return pending;
}

// Render complete source silhouettes at their own aspect ratio, anchored at the foot.
export function drawProp(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  source: readonly [number, number, number, number],
  x: number,
  bottom: number,
  maxWidth: number,
  maxHeight: number,
) {
  const [sx, sy, sw, sh] = source;
  const scale = Math.min(maxWidth / sw, maxHeight / sh);
  ctx.drawImage(
    art,
    sx,
    sy,
    sw,
    sh,
    x - (sw * scale) / 2,
    bottom - sh * scale,
    sw * scale,
    sh * scale,
  );
}

export function drawDish(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  dish: number,
  x: number,
  bottom: number,
  size: number,
) {
  const cell = art.width / 2;
  drawProp(
    ctx,
    art,
    [(dish % 2) * cell, Math.floor(dish / 2) * cell, cell, cell],
    x,
    bottom,
    size,
    size,
  );
}

export const LANTERN_PROPS = {
  hurdle: [117, 160, 716, 241],
  lantern: [1023, 12, 237, 504],
  finish: [59, 516, 1412, 483],
} as const;
