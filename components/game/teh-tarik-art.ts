import {
  TEA_CAPACITY_ML,
  TEA_CUP_RADIUS,
  teaSource,
  teaStreamX,
  teaPourHeight,
  teaFoamMultiplier,
  teaCatcher,
} from '@/lib/game/teh-tarik';
import type { MinigameState } from '@/lib/game/party-games';

type Player = { id: string; name: string; colour: string };
type Scene = {
  width: number;
  height: number;
  game: MinigameState;
  now: number;
  players: Player[];
  self?: string;
  image?: HTMLImageElement;
  pourer?: HTMLCanvasElement;
  reducedMotion: boolean;
};
/** One shared stage on every controller and the public display. */
export function drawTehTarik(ctx: CanvasRenderingContext2D, s: Scene) {
  const w = s.width,
    h = s.height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = '#142923';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const photoH = Math.max(h, (w * 2) / 3);
  const photoW = photoH * 1.5;
  if (s.image?.complete && s.image.naturalWidth)
    ctx.drawImage(s.image, (w - photoW) / 2, 0, photoW, photoH);
  const bottom = ctx.createLinearGradient(
    0,
    Math.min(photoH * 0.68, h * 0.6),
    0,
    h,
  );
  bottom.addColorStop(0, '#10221f00');
  bottom.addColorStop(0.5, '#10221f66');
  bottom.addColorStop(1, '#10221ff2');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    colour = '#fff4d6',
  ) => {
    ctx.font = `800 ${size}px Nunito,system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = colour;
    ctx.fillText(value, x, y);
  };
  const t = Math.max(0, Math.min(35, (s.now - s.game.start) / 1000));
  const source = teaSource(s.game.seed, t);
  const scaleX = Math.min(w * 0.064, 44),
    scaleY = h * 0.026;
  const sx = (x: number) => w * 0.5 + x * scaleX;
  const sy = (y: number) => h * 0.24 + (y + 10) * scaleY;
  const sourceX = sx(source.x),
    sourceY = sy(source.y);
  // Separate foreground sprite: translate the actual pot lip to the simulated origin.
  if (s.pourer?.width) {
    const pw = Math.min(Math.max(w * 0.92, h * 0.56), 850),
      ph = (pw * s.pourer.height) / s.pourer.width;
    ctx.save();
    ctx.translate(sourceX, sourceY);
    ctx.rotate(Math.sin(t * 0.63) * 0.035);
    ctx.drawImage(s.pourer, -pw * 0.51, -ph * 0.322, pw, ph);
    ctx.restore();
    const foreground = ctx.createLinearGradient(0, h * 0.5, 0, h);
    foreground.addColorStop(0, '#10221f00');
    foreground.addColorStop(1, '#10221fbf');
    ctx.fillStyle = foreground;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
  }
  const catching =
    s.now >= s.game.start
      ? teaCatcher(s.game, Math.min(s.now, s.game.start + 35000))
      : undefined;
  const catcher = catching ? s.game.players[catching] : undefined;
  const stopY = catcher?.y ?? 7.7;
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // Height guide uses the exact same world distance as the scoring calculation.
  const me = s.self ? s.game.players[s.self] : undefined;
  if (me) {
    const guideX = Math.min(w - 14, sx(me.x) + Math.min(scaleX * 0.95, 47));
    ctx.strokeStyle = '#fff1cb88';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(guideX, sourceY + 8);
    ctx.lineTo(guideX, sy(me.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#10221fcc';
    ctx.fillRect(w - 118, 12, 106, 42);
    text(`${teaPourHeight(me.y, source.y).toFixed(2)} m drop`, w - 65, 29, 11);
    text(
      `×${teaFoamMultiplier(me.y, source.y).toFixed(2)} foam`,
      w - 65,
      45,
      12,
      '#f4c978',
    );
  }
  // Trail below the current interceptor remains a ghost to show the blocked route.
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f6d6a444';
  ctx.setLineDash([3, 7]);
  ctx.beginPath();
  for (let y = source.y; y <= 7.8; y += 0.2) {
    const x = sx(teaStreamX(s.game.seed, t, y));
    if (y === source.y) ctx.moveTo(x, sy(y));
    else ctx.lineTo(x, sy(y));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const ribbon = (colour: string, width: number) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    for (let y = source.y + 0.13; y < stopY; y += 0.13)
      ctx.lineTo(sx(teaStreamX(s.game.seed, t, y)), sy(y));
    ctx.lineTo(sx(teaStreamX(s.game.seed, t, stopY)), sy(stopY));
    ctx.stroke();
  };
  ribbon('#a86429', Math.max(5, w * 0.008));
  ribbon('#eebd77', Math.max(2, w * 0.003));
  // Draw higher cups first, so lower cups occupy the foreground when they overlap.
  [...s.players]
    .sort((a, b) => s.game.players[a.id].y - s.game.players[b.id].y)
    .forEach((player) => {
      const p = s.game.players[player.id],
        x = sx(p.x),
        y = sy(p.y),
        radius = TEA_CUP_RADIUS * scaleX;
      const cw = radius * 2,
        ch = Math.min(scaleY * 3, h * 0.15),
        isMe = player.id === s.self;
      const fill = Math.min(1, (p.teaMl ?? 0) / TEA_CAPACITY_ML);
      ellipse(x, y + ch + 8, radius * 1.15, 5, '#00000055');
      if ((p.impactUntil ?? 0) > s.now) {
        ctx.strokeStyle = '#fff2da';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.ellipse(x, y + ch * 0.4, radius + 8, ch * 0.75, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        text('BAM!', x, y - 22, 14, '#ffd397');
        if (!s.reducedMotion) {
          const age = 1 - ((p.impactUntil ?? s.now) - s.now) / 500;
          ctx.strokeStyle = player.colour;
          ctx.lineWidth = 3;
          for (let ray = 0; ray < 8; ray++) {
            const angle = (ray * Math.PI) / 4;
            const reach = radius + 10 + age * 32;
            ctx.beginPath();
            ctx.moveTo(
              x + Math.cos(angle) * reach,
              y + ch * 0.4 + Math.sin(angle) * reach,
            );
            ctx.lineTo(
              x + Math.cos(angle) * (reach + 12),
              y + ch * 0.4 + Math.sin(angle) * (reach + 12),
            );
            ctx.stroke();
          }
        }
      }
      ctx.save();
      ctx.translate(x, y);
      if (!s.reducedMotion)
        ctx.rotate(Math.max(-0.6, Math.min(0.6, p.vx * 0.035)));
      // Stainless steel with a coloured collar and a readable liquid window.
      const metal = ctx.createLinearGradient(-radius, 0, radius, 0);
      metal.addColorStop(0, '#3e5555');
      metal.addColorStop(0.17, '#e4eeea');
      metal.addColorStop(0.36, '#8fa4a1');
      metal.addColorStop(0.58, '#f4f4e7');
      metal.addColorStop(0.8, '#9bb3af');
      metal.addColorStop(1, '#385653');
      ctx.fillStyle = metal;
      ctx.strokeStyle = '#eef5e6';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-radius, 0);
      ctx.lineTo(-radius * 0.82, ch);
      ctx.quadraticCurveTo(0, ch + 8, radius * 0.82, ch);
      ctx.lineTo(radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = player.colour;
      ctx.fillRect(-radius * 0.84, ch * 0.64, cw * 0.84, Math.max(5, ch * 0.1));
      // The translucent front gauge makes volume visible in the cup as well as the HUD.
      ctx.fillStyle = '#16302dcc';
      ctx.fillRect(-radius * 0.48, ch * 0.18, radius * 0.96, ch * 0.4);
      ctx.fillStyle = '#dba05d';
      ctx.fillRect(
        -radius * 0.48,
        ch * (0.58 - fill * 0.4),
        radius * 0.96,
        ch * 0.4 * fill,
      );
      ellipse(0, 0, radius, Math.max(4, radius * 0.26), '#e2eee6');
      ellipse(
        0,
        0,
        radius * 0.89,
        Math.max(3, radius * 0.18),
        fill > 0 ? '#c48b4b' : '#243a35',
      );
      if (fill > 0) {
        const foam = Math.min(1, p.points / Math.max(1, p.teaMl ?? 0) - 1);
        ellipse(
          0,
          -1,
          radius * 0.8,
          Math.max(2, radius * 0.16 * foam),
          '#fff0ca',
        );
      }
      text(
        isMe ? 'YOU' : player.name.slice(0, 9),
        0,
        ch * 0.87,
        Math.max(9, Math.min(13, cw * 0.2)),
        '#133332',
      );
      ctx.restore();
      if (isMe) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          radius + 5,
          Math.max(7, radius * 0.34),
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      if (player.id === catching) {
        text(
          `+${(28 * teaFoamMultiplier(p.y, source.y)).toFixed(0)}/s`,
          x,
          y - 12,
          12,
          '#ffdc8a',
        );
        if (!s.reducedMotion)
          for (let i = 0; i < 5; i++) {
            const f = (t * 2 + i * 0.2) % 1;
            ellipse(x + (i - 2) * radius * 0.27, y - f * 19, 2, 2, '#fff0c9');
          }
      }
    });
  const who = s.players.find((p) => p.id === catching);
  ctx.fillStyle = '#0e2522de';
  ctx.fillRect(0, h - 31, w, 31);
  text(
    who
      ? `${who.id === s.self ? 'You are' : who.name + ' is'} catching · ${s.players.length === 1 ? 'Follow the moving pour' : 'Bump in to steal the stream'}`
      : 'Catch the stream · Lower cup = more foam',
    w / 2,
    h - 11,
    Math.min(13, w / 31),
    '#fff1cc',
  );
  ctx.restore();
}

/** Decode the generated sprite's neutral checker matte once, not in the render loop. */
export function preparePourerSprite(img: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height),
    pixels = data.data,
    w = canvas.width,
    h = canvas.height;
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let head = 0,
    tail = 0;
  const add = (n: number) => {
    if (n < 0 || n >= seen.length || seen[n]) return;
    seen[n] = 1;
    const i = n * 4,
      r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2];
    if (Math.min(r, g, b) > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 32) {
      queue[tail++] = n;
      pixels[i + 3] = 0;
    }
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  while (head < tail) {
    const n = queue[head++];
    if (n % w > 0) add(n - 1);
    if (n % w < w - 1) add(n + 1);
    add(n - w);
    add(n + w);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
