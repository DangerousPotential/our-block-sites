// The generated sprites use a magenta matte. Resolve it once at image load;
// animation frames only draw the cached transparent sheet.
export function prepareForestArt(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const spill = Math.min(data[i], data[i + 2]) - data[i + 1];
    if (spill > 45) {
      const alpha = 1 - Math.min(1, (spill - 45) / 110);
      data[i + 3] = Math.round(data[i + 3] * alpha);
      // Keep the antialiased outline free of the chroma-key colour.
      data[i] = Math.min(data[i], data[i + 1] + 35);
      data[i + 2] = Math.min(data[i + 2], data[i + 1] + 35);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export function drawForestBranch(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  scale: number,
) {
  // Preserve the fern caps and bark depth when stretching the starting branch.
  // The measured moss surface is source y=150, the physical collision plane.
  const factor = scale / 260;
  const cap = Math.min(width * 0.2, 224 * factor);
  const top = y - 118 * factor;
  const height = 374 * factor;
  ctx.drawImage(art, 32, 32, 224, 374, x, top, cap, height);
  ctx.drawImage(art, 256, 32, 1024, 374, x + cap, top, width - 2 * cap, height);
  ctx.drawImage(art, 1280, 32, 224, 374, x + width - cap, top, cap, height);
}

export function drawForestPortal(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  ctx.save();
  ctx.shadowColor = '#88eede';
  ctx.shadowBlur = 8 + Math.sin(time * 0.002) * 3;
  ctx.drawImage(
    art,
    55,
    390,
    750,
    590,
    x - scale * 1.9,
    y - scale * 2.9,
    scale * 3.8,
    scale * 2.99,
  );
  ctx.restore();
}

export function drawForestBeacon(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
  scale: number,
) {
  ctx.drawImage(
    art,
    1020,
    530,
    260,
    410,
    x - scale * 0.48,
    y - scale * 1.5,
    scale * 0.96,
    scale * 1.51,
  );
}

// Rope-bound cut-log footholds: the top plank is exactly the collision plane.
export function drawForestFoothold(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  scale: number,
) {
  const cx = x + width / 2;
  ctx.save();
  ctx.shadowColor = '#10282099';
  ctx.shadowBlur = scale * 0.16;
  ctx.fillStyle = '#65492f';
  ctx.beginPath();
  ctx.ellipse(
    cx,
    y + scale * 0.3,
    width * 0.43,
    scale * 0.36,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c29157';
  ctx.beginPath();
  ctx.ellipse(
    cx,
    y + scale * 0.29,
    width * 0.34,
    scale * 0.27,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.strokeStyle = '#815b35';
  ctx.lineWidth = Math.max(1, scale * 0.035);
  for (const radius of [0.12, 0.23]) {
    ctx.beginPath();
    ctx.ellipse(
      cx,
      y + scale * 0.29,
      width * radius,
      scale * radius,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.fillStyle = '#7f603b';
  ctx.fillRect(x, y, width, scale * 0.13);
  ctx.fillStyle = '#9eae63';
  ctx.fillRect(x, y - scale * 0.05, width, scale * 0.07);
  for (const offset of [0.16, 0.84]) {
    const peg = x + width * offset;
    ctx.strokeStyle = '#d7bd85';
    ctx.lineWidth = Math.max(1.2, scale * 0.055);
    ctx.beginPath();
    ctx.moveTo(peg, y + scale * 0.16);
    ctx.lineTo(peg, y - scale * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#aa9261';
    ctx.beginPath();
    ctx.arc(peg, y - scale * 0.2, scale * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
