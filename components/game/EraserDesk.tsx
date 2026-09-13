'use client';
// SVG owns the interactive table projection; the canonical Sprite renders each selected avatar.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useId, useRef, useState } from 'react';
import {
  DESK,
  FLAGS,
  type EraserPiece,
  type EraserShot,
} from '@/lib/game/eraser';
import Sprite from './Sprite';
import type { Flick } from '@/lib/game/eraser-motion';
import { projectDesk } from '@/lib/game/eraser-perspective';

function star(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${cx + Math.cos(a) * r * (i % 2 ? 0.4 : 1)},${cy + Math.sin(a) * r * (i % 2 ? 0.4 : 1)}`;
  }).join(' ');
}
export function FlagMark({ flag }: { flag: number }) {
  return (
    <svg viewBox="0 0 90 50" aria-hidden="true">
      <path fill="#fffdf6" d="M0 0h90v50H0z" />
      {flag === 0 ? (
        <>
          <path fill="#d93540" d="M0 0h90v25H0z" />
          <circle cx="18" cy="12" r="9" fill="#fff" />
          <circle cx="22" cy="10" r="8" fill="#d93540" />
          {[
            [33, 5],
            [40, 10],
            [37, 19],
            [28, 19],
            [26, 10],
          ].map(([x, y]) => (
            <polygon key={`${x}-${y}`} points={star(x, y, 2.6)} fill="#fff" />
          ))}
        </>
      ) : flag === 1 ? (
        <circle cx="45" cy="25" r="14" fill="#c7273c" />
      ) : flag === 2 ? (
        <>
          <path fill="#203e85" d="M0 0h30v50H0z" />
          <path fill="#dc3741" d="M60 0h30v50H60z" />
        </>
      ) : (
        <>
          <path fill="#24252a" d="M0 0h90v17H0z" />
          <path fill="#d62e35" d="M0 17h90v16H0z" />
          <path fill="#f4c748" d="M0 33h90v17H0z" />
        </>
      )}
    </svg>
  );
}
function Piece({
  piece,
  name,
  raised,
}: {
  piece: EraserPiece;
  name: string;
  raised: boolean;
}) {
  return (
    <g>
      <title>
        {`${name} · ${FLAGS[piece.flag]} flag eraser${raised ? ' on top' : ''}`}
      </title>
      <rect
        x="-60"
        y="-35"
        width="120"
        height="80"
        rx="5"
        fill="#98a88f"
        stroke="#364b3f"
        strokeWidth="2"
      />
      <rect
        x="-60"
        y="-40"
        width="120"
        height="76"
        rx="4"
        fill="#fffdf3"
        stroke="#d8d7c7"
        strokeWidth="2"
      />
      <svg x="-53" y="-34" width="106" height="51">
        <FlagMark flag={piece.flag} />
      </svg>
      <path d="M-53 20h106" stroke="#dedbcc" strokeWidth="1" />
      <text
        y="30"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="9"
        fontWeight="700"
        fill="#203630"
      >
        {FLAGS[piece.flag].toUpperCase()}
      </text>
    </g>
  );
}
export default function EraserDesk({
  pieces,
  names,
  shot,
  winner,
  winReason,
  capture,
  avatars,
  active,
  viewerId,
  offset = 0,
  onFlick,
  onAspectChange,
}: {
  pieces: Record<string, EraserPiece>;
  avatars?: Record<string, { character: string; age: number }>;
  names: Record<string, string>;
  shot?: EraserShot;
  winner?: string;
  winReason?: 'stack' | 'turn-limit';
  capture?: { winner: string; loser: string; reason: 'stack' | 'turn-limit' };
  active: boolean;
  viewerId?: string;
  offset?: number;
  onFlick?: (flick: Flick) => void;
  onAspectChange?: (ratio: number) => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const [sceneRatio, setSceneRatio] = useState(1);
  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      const ratio = height / width;
      setSceneRatio(ratio);
      onAspectChange?.(ratio);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onAspectChange]);
  const sceneHeight = 1000 * sceneRatio;
  const backgroundSize = Math.max(1000, sceneHeight * 1.03);
  const backgroundX = (1000 - backgroundSize) / 2;
  const backgroundY = sceneHeight * 0.44 - backgroundSize * 0.432;
  const studentSize = Math.min(680, sceneHeight * 0.49);
  const studentY = sceneHeight * 0.44 - studentSize * 0.94;
  const foregroundClip = useId();
  const [clock, setClock] = useState(0);
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    endX: number;
    endY: number;
  } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!shot) return;
    let frame = 0;
    const tick = () => {
      const now = Date.now() + offset;
      setClock(Math.min(now, shot.endsAt));
      if (now < shot.endsAt) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shot, offset]);
  const progress = shot
    ? Math.max(0, Math.min(1, (clock - shot.startedAt) / DESK.flightMs))
    : 1;
  const flight = Math.max(0, (progress - 0.22) / 0.78);
  const opponentId = Object.keys(pieces).find(
    (id) => id !== (viewerId ?? Object.keys(pieces)[0]),
  );
  const opponentShot = shot?.playerId === opponentId && progress < 1;
  const direction = shot ? Math.sign(shot.to.x - shot.from.x) || 1 : 1;
  const swing = opponentShot
    ? Math.sin(Math.PI * Math.max(0, (progress - 0.16) / 0.84))
    : 0;
  const order = Object.keys(pieces).sort(
    (a, b) =>
      Number(a === (winner || capture?.winner || shot?.playerId)) -
      Number(b === (winner || capture?.winner || shot?.playerId)),
  );
  function point(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * sceneHeight,
    };
  }
  return (
    <div className="eraser-desk-wrap" ref={scene}>
      <svg
        className="eraser-desk"
        viewBox={`0 0 1000 ${sceneHeight}`}
        role="img"
        aria-label={`Across the table: ${opponentId ? names[opponentId] : 'your classmate'}. Swipe to flick your eraser. Land on the other eraser to win.`}
        onPointerDown={(e) => {
          if (!active || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = point(e);
          start.current = p;
          setDrag({ ...p, endX: p.x, endY: p.y });
        }}
        onPointerMove={(e) => {
          if (start.current) {
            const p = point(e);
            setDrag({ ...start.current, endX: p.x, endY: p.y });
          }
        }}
        onPointerUp={(e) => {
          const origin = start.current;
          start.current = null;
          setDrag(null);
          if (!active || !origin) return;
          const p = point(e),
            dx = p.x - origin.x,
            dy = p.y - origin.y,
            length = Math.hypot(dx, dy);
          if (length >= 18)
            onFlick?.({
              x: dx / length,
              y: dy / length,
              power: Math.min(1, length / 450),
            });
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onLostPointerCapture={() => {
          start.current = null;
          setDrag(null);
        }}
      >
        <defs>
          <clipPath id={foregroundClip}>
            <path d={`M0 ${sceneHeight * 0.44}H1000V${sceneHeight}H0z`} />
          </clipPath>
        </defs>
        <image
          href="/api/media?path=assets/eraser/classroom-blue-desk.png"
          x={backgroundX}
          y={backgroundY}
          width={backgroundSize}
          height={backgroundSize}
        />
        <g
          className="eraser-opponent-motion"
          transform={`translate(${direction * swing * 85} ${swing * 55}) rotate(${direction * swing * 13} 500 ${sceneHeight * 0.435})`}
        >
          <g
            transform={
              opponentShot && direction > 0
                ? 'translate(1000 0) scale(-1 1)'
                : undefined
            }
          >
            <foreignObject
              x={(1000 - studentSize) / 2}
              y={studentY}
              width={studentSize}
              height={studentSize}
            >
              <Sprite
                id={
                  opponentId
                    ? (avatars?.[opponentId]?.character ?? 'arun')
                    : 'arun'
                }
                age={opponentId ? (avatars?.[opponentId]?.age ?? 0) : 0}
                className="eraser-live-avatar"
                pose={
                  winner === opponentId
                    ? 'cheer'
                    : opponentShot
                      ? 'hop'
                      : 'idle'
                }
              />
            </foreignObject>
          </g>
        </g>
        <image
          href="/api/media?path=assets/eraser/classroom-blue-desk.png"
          x={backgroundX}
          y={backgroundY}
          width={backgroundSize}
          height={backgroundSize}
          clipPath={`url(#${foregroundClip})`}
        />
        {opponentShot && swing > 0.3 && (
          <g
            transform={`translate(0 ${sceneHeight * 0.44 - 440})`}
            fill="none"
            stroke="#fff6d4"
            strokeWidth="12"
            strokeLinecap="round"
            opacity={swing * 0.85}
          >
            <path
              d={
                direction > 0
                  ? 'M310 415Q600 350 826 502'
                  : 'M690 415Q400 350 174 502'
              }
            />
            <path
              d={
                direction > 0
                  ? 'M405 432Q660 400 808 529'
                  : 'M595 432Q340 400 192 529'
              }
              strokeWidth="5"
            />
          </g>
        )}
        {order.map((id) => {
          const piece = pieces[id],
            moving = shot?.playerId === id;
          const returned = moving && shot.offDesk && progress === 1;
          const x = moving
            ? returned
              ? shot.from.x
              : shot.from.x + (shot.to.x - shot.from.x) * flight
            : piece.x;
          const y = moving
            ? returned
              ? shot.from.y
              : shot.from.y + (shot.to.y - shot.from.y) * flight
            : piece.y;
          const projected = projectDesk(x, y),
            p = { ...projected, y: projected.y * sceneRatio },
            lift = moving ? Math.sin(Math.PI * flight) * 115 : 0,
            raised =
              (winner === id && winReason !== 'turn-limit') ||
              (capture?.winner === id && capture.reason === 'stack');
          return (
            <g key={id}>
              <ellipse
                cx={p.x}
                cy={p.y + 14}
                rx={65 * p.scale}
                ry={22 * p.scale}
                fill="#654527"
                opacity={lift ? 0.16 : 0.3}
              />
              <g
                transform={`translate(${p.x} ${p.y - lift - (raised ? 16 : 0)}) scale(${p.scale} ${p.scale * 0.72}) rotate(${moving ? 360 * flight : -5})`}
              >
                <Piece piece={piece} name={names[id]} raised={raised} />
              </g>
              <text
                x={p.x}
                y={p.y + 53 * p.scale}
                textAnchor="middle"
                fill="#173555"
                fontSize="18"
                fontWeight="800"
              >
                {id === viewerId ? 'YOU' : names[id]}
              </text>
            </g>
          );
        })}
        {drag && (
          <g
            pointerEvents="none"
            stroke="#fffbe4"
            strokeWidth="6"
            fill="#fffbe4"
          >
            <path d={`M${drag.x} ${drag.y}L${drag.endX} ${drag.endY}`} />
            <circle cx={drag.endX} cy={drag.endY} r="9" />
          </g>
        )}
        <text
          x="500"
          y={sceneHeight - 14}
          textAnchor="middle"
          fill="#fff6dc"
          fontSize="21"
          fontWeight="700"
        >
          {winner
            ? winReason === 'turn-limit'
              ? 'SHOWDOWN OVER.'
              : 'ON TOP. GAME OVER.'
            : active
              ? 'SWIPE THE TABLE TO FLICK'
              : 'WATCH YOUR OPPONENT'}
        </text>
      </svg>
    </div>
  );
}
