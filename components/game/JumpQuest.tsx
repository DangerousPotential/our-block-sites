'use client';
import { useEffect, useRef, useState } from 'react';
import { PLATFORMS, stepRunner, eraOf, type Runner } from '@/lib/game/trip';
import { findCharacter } from '@/lib/game/characters';
import type { PublicRoom } from '@/lib/game/engine';
export default function JumpQuest({
  room,
  playerId,
  offset,
  act,
}: {
  room: PublicRoom;
  playerId: string;
  offset: number;
  act: (action: string, payload?: Record<string, unknown>) => Promise<boolean>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    controls = useRef({ left: false, right: false, jump: false }),
    impulses = useRef({ left: 0, right: 0, jump: 0 }),
    live = useRef({ room, act, offset });
  useEffect(() => {
    live.current = { room, act, offset };
  }, [room, act, offset]);
  const [clock, setClock] = useState(() => Date.now() + offset);
  const q = room.trip!.quest!,
    self = q.runners[playerId];
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!,
      el = canvas.current!;
    let frame = 0,
      last = performance.now(),
      prediction: Runner | undefined,
      lastTick = -1;
    const pets = new Image();
    pets.src = '/api/media?path=assets/pets.png';
    const people = new Image();
    people.src = '/api/media?path=assets/neighbours.png';
    function key(e: KeyboardEvent) {
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'a', 'd', 'w', ' '].includes(
          e.key,
        )
      ) {
        e.preventDefault();
        const value = e.type === 'keydown';
        if (value) {
          const control = ['ArrowLeft', 'a'].includes(e.key)
            ? 'left'
            : ['ArrowRight', 'd'].includes(e.key)
              ? 'right'
              : 'jump';
          impulses.current[control] = Date.now() + 300;
        }
        if (['ArrowLeft', 'a'].includes(e.key)) controls.current.left = value;
        if (['ArrowRight', 'd'].includes(e.key)) controls.current.right = value;
        if (['ArrowUp', 'w', ' '].includes(e.key))
          controls.current.jump = value;
      }
    }
    const release = () => {
      controls.current = { left: false, right: false, jump: false };
      impulses.current = { left: 0, right: 0, jump: 0 };
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', release);
    const draw = (time: number) => {
      const dt = Math.min(0.04, (time - last) / 1000);
      last = time;
      const { room: r, offset: o } = live.current,
        quest = r.trip!.quest!,
        now = Date.now() + o;
      if (quest.tick !== lastTick || !prediction) {
        prediction = { ...quest.runners[playerId] };
        lastTick = quest.tick;
      }
      prediction.direction =
        Number(controls.current.right || impulses.current.right > Date.now()) -
        Number(controls.current.left || impulses.current.left > Date.now());
      prediction.jump =
        controls.current.jump || impulses.current.jump > Date.now();
      if (now >= quest.start && !prediction.finished)
        stepRunner(prediction, now, dt);
      const rect = el.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 1.5),
        w = rect.width,
        h = rect.height;
      if (
        el.width !== Math.round(w * dpr) ||
        el.height !== Math.round(h * dpr)
      ) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale =
          w < 600 ? Math.min(w / 13, h / 18) : Math.min(w / 21, h / 15),
        follow = Math.max(4, prediction.y),
        sx = (x: number) =>
          w / 2 +
          (x - (w < 600 ? Math.max(-2, Math.min(2, prediction!.x)) : 0)) *
            scale,
        sy = (y: number) => h * 0.62 - (y - follow) * scale;
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      const era = eraOf(r).id;
      const colors = {
        river: ['#5c877f', '#b4bd96'],
        fair: ['#29233f', '#78506c'],
        estate: ['#755b70', '#d7a782'],
        town: ['#23364f', '#709aab'],
        garden: ['#101d35', '#426d78'],
      }[era];
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = i % 2 ? '#eed4a3' : '#799da1';
        ctx.globalAlpha = 0.5;
        ctx.fillRect((i * 137) % w, (i * 73) % Math.max(1, h * 0.6), 2, 2);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 10; i++) {
        const x = (i * w) / 9 - 20,
          top = h * 0.5 + (i % 3) * 30 - follow * 2;
        ctx.fillStyle = i % 2 ? '#2d4b59' : '#345864';
        ctx.fillRect(x, top, w / 8, h);
        for (let y = top + 20; y < h; y += 30) {
          ctx.fillStyle = '#b39d77';
          ctx.fillRect(x + 10, y, 7, 10);
          ctx.fillRect(x + 27, y, 7, 10);
        }
      }
      for (const [i, p] of PLATFORMS.entries()) {
        const x = sx(p.x - p.width / 2),
          y = sy(p.y),
          width = p.width * scale;
        if (y > h + 100 || y < -100) continue;
        ctx.fillStyle = '#8c6252';
        ctx.fillRect(x, y, width, scale * 0.6);
        ctx.fillStyle = i === 4 || i === 8 ? '#85b9a3' : '#dc9872';
        ctx.fillRect(x - 3, y - 4, width + 6, 8);
        ctx.strokeStyle = '#b57c60';
        for (let b = 0; b < width; b += 16) {
          ctx.beginPath();
          ctx.moveTo(x + b, y + 8);
          ctx.lineTo(x + b + 6, y + scale * 0.6);
          ctx.stroke();
        }
        ctx.fillStyle = '#f4dfb4';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(
          i === 4 || i === 8
            ? '⚑ CHECKPOINT'
            : i === 11
              ? 'HOME PORTAL'
              : `${i + 1}`,
          x,
          y - 12,
        );
        if (i === 11) {
          ctx.strokeStyle = '#e9c77e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(sx(p.x), y - 35, 20, 30, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (const p of r.players) {
        const runner = p.id === playerId ? prediction : quest.runners[p.id],
          c = findCharacter(p.character),
          img = c.kind === 'pet' ? pets : people,
          rows = c.kind === 'pet' ? 2 : 3,
          row = c.kind === 'pet' ? c.row : p.age;
        const x = sx(runner.x),
          y = sy(runner.y),
          size = scale * 1.45;
        if (img.complete && img.naturalWidth)
          ctx.drawImage(
            img,
            (c.column * img.width) / 4,
            (row * img.height) / rows,
            img.width / 4,
            img.height / rows,
            x - size / 2,
            y - size * 1.2,
            size,
            size * 1.2,
          );
        ctx.fillStyle = p.id === playerId ? '#fff2c8' : '#cfdfdd';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, x, y - size * 1.25);
        ctx.textAlign = 'left';
        if (runner.shield > now) {
          ctx.strokeStyle = '#b4e8da';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y - size * 0.6, size * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const timer = setInterval(() => {
      const { room: r, act: a, offset: o } = live.current;
      setClock(Date.now() + o);
      void a('input', {
        round: r.round,
        quest: r.trip!.quest!.id,
        seq: Date.now(),
        direction:
          Number(
            controls.current.right || impulses.current.right > Date.now(),
          ) -
          Number(controls.current.left || impulses.current.left > Date.now()),
        jump: controls.current.jump || impulses.current.jump > Date.now(),
      });
    }, 200);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', release);
    };
  }, [q.id, playerId]);
  const countdown = Math.ceil((q.start - clock) / 1000),
    seconds = Math.max(0, Math.ceil((q.start + 90000 - clock) / 1000));
  function button(label: string, key: 'left' | 'right' | 'jump') {
    return (
      <button
        aria-label={label}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          controls.current[key] = true;
          impulses.current[key] = Date.now() + 300;
        }}
        onPointerUp={() => {
          controls.current[key] = false;
        }}
        onPointerCancel={() => {
          controls.current[key] = false;
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <section className="quest-stage">
      <canvas
        ref={canvas}
        aria-label="Rooftop Relay: jump between twelve rooftops to reach the portal"
      />
      <div className="quest-title">
        <small>THE NEIGHBOURHOOD CHALLENGE</small>
        <h2>Rooftop Relay</h2>
        <p>← → move · Space to jump · Two checkpoints</p>
      </div>
      <div className="quest-clock">{seconds}s</div>
      {countdown > 0 && (
        <div className="quest-countdown">
          {countdown}
          <small>Get ready, kaki!</small>
        </div>
      )}
      {self.finished > 0 && (
        <div className="quest-countdown">
          Home!<small>Watching the other kakis finish…</small>
        </div>
      )}
      <div className="quest-progress">
        {room.players.map((p) => (
          <span key={p.id}>
            {p.name} ·{' '}
            {q.runners[p.id].finished
              ? '✓'
              : `${Math.round((Math.max(0, q.runners[p.id].y) / 24.75) * 100)}%`}
          </span>
        ))}
      </div>
      <div className="quest-controls">
        {button('←', 'left')}
        {button('→', 'right')}
        {button('Jump ↑', 'jump')}
      </div>
    </section>
  );
}
