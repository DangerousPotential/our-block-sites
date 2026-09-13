import { climbEra, CLIMB_ERAS, FOREST_TOP } from '@/lib/game/forest-course';

/** Blend the six original Singapore panels as the camera crosses era boundaries. */
export function drawClimbBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  w: number,
  h: number,
  height: number,
) {
  const position = Math.max(0, Math.min(5, (height - 0.825) / 6.6));
  const era = Math.floor(position);
  // Hold each scene, then dissolve across the gap before its first landing.
  const blend = Math.max(0, Math.min(1, (position - era - 0.8) / 0.2));
  const smooth = blend * blend * (3 - 2 * blend);
  ctx.fillStyle = [
    '#bdcba6',
    '#e7c39b',
    '#493959',
    '#c4d6cf',
    '#adcbd4',
    '#bad8b7',
  ][era];
  ctx.fillRect(0, 0, w, h);
  if (!image.complete || !image.naturalWidth) return;
  const cw = image.naturalWidth / 3,
    ch = image.naturalHeight / 2;
  const fit = Math.max(w / cw, (h * 1.2) / ch);
  const bw = cw * fit,
    bh = ch * fit;
  const ascent = Math.max(0, Math.min(1, height / FOREST_TOP.y));
  const paint = (panel: number) =>
    ctx.drawImage(
      image,
      (panel % 3) * cw,
      Math.floor(panel / 3) * ch,
      cw,
      ch,
      (w - bw) / 2,
      -(bh - h) * (0.75 - ascent * 0.5),
      bw,
      bh,
    );
  ctx.save();
  paint(era);
  if (smooth && era < CLIMB_ERAS.length - 1) {
    ctx.globalAlpha = smooth;
    paint(era + 1);
  }
  ctx.restore();
}

/** Texture stays below the exact collision plane, with a bright landing edge. */
export function drawClimbPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  scale: number,
  year: number,
  index: number,
) {
  const era = climbEra(year);
  const depth = Math.max(10, scale * (index === 0 ? 0.65 : 0.42));
  ctx.save();
  ctx.fillStyle = '#203738';
  ctx.fillRect(x - 1, y, width + 2, depth + 2);
  ctx.fillStyle = era.color;
  ctx.fillRect(x, y, width, depth);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y + 2, width, depth - 2);
  ctx.clip();
  if (year === 1950) {
    // Weathered planks, irregular grain and dark iron nail heads.
    for (let a = 0; a < width; a += 15) {
      ctx.fillStyle = a % 30 ? '#a78251' : '#795431';
      ctx.fillRect(x + a, y + 2, 14, depth);
      ctx.fillStyle = '#c39b63';
      ctx.fillRect(x + a + 2, y + depth * 0.55, 9, 1);
      ctx.fillStyle = '#493c2b';
      ctx.fillRect(x + a + 3, y + 4, 2, 2);
      ctx.fillRect(x + a + 7, y + depth - 4, 5, 1);
    }
  } else if (year === 1965) {
    // Overlapping curved terracotta roof tiles.
    for (let row = 0; row < depth; row += 7) {
      for (let a = -6; a < width; a += 12) {
        const tx = x + a + (row % 14 ? 6 : 0);
        ctx.fillStyle = '#743e32';
        ctx.fillRect(tx, y + row + 2, 11, 7);
        ctx.fillStyle = '#ce8059';
        ctx.fillRect(tx + 1, y + row + 2, 8, 5);
        ctx.fillStyle = '#ebb283';
        ctx.fillRect(tx + 2, y + row + 2, 2, 4);
      }
    }
  } else if (year === 1975) {
    // Painted fairground stage boards with a scalloped canvas valance.
    for (let a = 0; a < width; a += 12) {
      ctx.fillStyle = a % 24 ? '#eac47b' : '#a84258';
      ctx.fillRect(x + a, y + 2, 11, depth);
      ctx.fillStyle = '#734943';
      ctx.fillRect(x + a + 3, y + 5, 6, 1);
    }
  } else if (year === 1987) {
    // Small cream and jade mosaic squares set in pale grout.
    ctx.fillStyle = '#ece4cc';
    ctx.fillRect(x, y + 2, width, depth);
    for (let row = 0; row < depth; row += 6) {
      for (let a = 0; a < width; a += 6) {
        ctx.fillStyle = (a / 6 + row / 6 + index) % 3 ? '#91b2a3' : '#397b73';
        ctx.fillRect(x + a + 1, y + row + 3, 4, 4);
      }
    }
  } else if (year === 2005) {
    // Brushed steel panels, diamond tread and riveted joints.
    ctx.fillStyle = '#8fa9b1';
    ctx.fillRect(x, y + 2, width, depth);
    ctx.strokeStyle = '#4b6a77';
    ctx.lineWidth = 1.5;
    for (let a = 4; a < width; a += 10) {
      ctx.beginPath();
      ctx.moveTo(x + a, y + 5);
      ctx.lineTo(x + a + 3, y + 8);
      ctx.moveTo(x + a, y + 12);
      ctx.lineTo(x + a - 3, y + 15);
      ctx.stroke();
    }
    ctx.fillStyle = '#dce7df';
    for (let a = 2; a < width; a += 24) ctx.fillRect(x + a, y + 3, 2, 2);
  } else {
    // Sandstone pavers beneath the planted edge.
    ctx.fillStyle = '#acb3a0';
    ctx.fillRect(x, y + 2, width, depth);
    ctx.fillStyle = '#6d8578';
    for (let a = 14; a < width; a += 19) ctx.fillRect(x + a, y + 3, 1, depth);
    ctx.fillStyle = '#d1d2b4';
    for (let a = 3; a < width; a += 9)
      ctx.fillRect(x + a, y + 7 + (a % 5), 3, 1);
  }
  ctx.restore();
  ctx.fillStyle = year === 2026 ? '#b8da83' : '#ffe6ac';
  ctx.fillRect(x, y, width, 2);
  if (year <= 1965) {
    ctx.fillStyle = '#574637';
    ctx.fillRect(x + 3, y + depth, 3, scale * 0.32);
    ctx.fillRect(x + width - 6, y + depth, 3, scale * 0.32);
  } else if (year === 1975) {
    for (let a = 0; a < width - 4; a += 10) {
      ctx.fillStyle = '#e6b761';
      ctx.beginPath();
      ctx.moveTo(x + a, y + depth);
      ctx.lineTo(x + a + 8, y + depth);
      ctx.lineTo(x + a + 4, y + depth + 5);
      ctx.fill();
    }
  } else if (year === 2026) {
    ctx.fillStyle = '#4e8b53';
    ctx.fillRect(x, y + 2, width, 3);
    for (let a = 4; a < width - 3; a += 13) {
      ctx.fillStyle = '#46764d';
      ctx.fillRect(x + a, y + depth, 2, 6 + (a % 7));
      ctx.fillStyle = '#87b76d';
      ctx.fillRect(x + a - 2, y + depth + 3, 5, 3);
    }
  }
  ctx.restore();
}
export function drawClimbLink(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  scale: number,
  kind: string,
) {
  ctx.save();
  const half = kind === 'ladder' ? scale * 0.3 : scale * 0.06;
  ctx.strokeStyle = '#473a2b';
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * half, top);
    ctx.lineTo(x + side * half, bottom);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ddc38b';
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * half, top);
    ctx.lineTo(x + side * half, bottom);
    ctx.stroke();
  }
  ctx.strokeStyle = kind === 'ladder' ? '#e4cea0' : '#9c7e50';
  ctx.lineWidth = 3;
  for (let y = top + 5; y < bottom; y += Math.max(6, scale * 0.25)) {
    ctx.beginPath();
    ctx.moveTo(x - half - 1, y);
    ctx.lineTo(x + half + 1, y);
    ctx.stroke();
  }
  ctx.restore();
}
export function drawClimbHome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.fillStyle = '#eee1b8';
  ctx.fillRect(x - scale * 0.65, y - scale * 1.7, scale * 1.3, scale * 1.7);
  ctx.fillStyle = '#2d736c';
  ctx.fillRect(x - scale * 0.44, y - scale * 1.4, scale * 0.88, scale * 1.4);
  ctx.fillStyle = '#edb957';
  ctx.fillRect(x + scale * 0.22, y - scale * 0.72, 3, 3);
  ctx.fillStyle = '#974d3b';
  ctx.beginPath();
  ctx.moveTo(x - scale * 0.83, y - scale * 1.7);
  ctx.lineTo(x, y - scale * 2.2);
  ctx.lineTo(x + scale * 0.83, y - scale * 1.7);
  ctx.fill();
}
