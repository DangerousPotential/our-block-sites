'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Coffee,
  Sandwich,
  CakeSlice,
  Soup,
  Star,
  Shuffle,
  Timer,
  Check,
  X,
} from 'lucide-react';
import {
  FOODS,
  ROUND_MS,
  TWISTS,
  orderFor,
  type PublicRoom,
} from '@/lib/game/engine';
import type { Room } from '@/lib/game/engine';
import Sprite from './Sprite';
const icons = [Coffee, Sandwich, CakeSlice, Soup];
export default function LunchRush({
  room,
  playerId,
  busy,
  offset,
  onServe,
}: {
  room: PublicRoom;
  playerId: string;
  busy: boolean;
  offset: number;
  onServe: (food: number, step: number) => Promise<boolean>;
}) {
  const [now, setNow] = useState(() => Date.now() + offset),
    [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const p = room.players.find((p) => p.id === playerId)!;
  const waiting = now < room.startedAt;
  const left = Math.max(0, Math.ceil((room.startedAt + ROUND_MS - now) / 1000));
  const target = orderFor(room as Room, p);
  const OrderIcon = icons[target];
  const rotation =
    room.twist === 2
      ? Math.max(0, Math.floor((now - room.startedAt) / 8000)) % 4
      : 0;
  const menu = [0, 1, 2, 3].map((i) => (i + rotation) % 4);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(t);
  }, [offset]);
  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );
  async function serve(food: number) {
    if (waiting || busy || left === 0) return;
    const ok = await onServe(food, p.step);
    if (ok) {
      setFeedback(food === target ? 'yes' : 'no');
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 600);
    }
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (['1', '2', '3', '4'].includes(e.key) && !e.repeat) {
        e.preventDefault();
        void serve(menu[Number(e.key) - 1]);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <section className="lunch-panel">
      <div className="lunch-header">
        <div>
          <h1>Lunch rush</h1>
        </div>
        <div className={`countdown ${left <= 10 && !waiting ? 'urgent' : ''}`}>
          <Timer size={21} />
          <strong>{waiting ? '30' : left}</strong>
          <span>sec</span>
        </div>
      </div>
      <div className="time-track">
        <div
          style={{
            width: `${waiting ? 100 : Math.min(100, (left / 30) * 100)}%`,
          }}
        />
      </div>
      <div className="lunch-content">
        <aside className="kitchen-player">
          <Sprite
            id={p.character}
            age={p.age}
            pose={feedback === 'yes' ? 'cheer' : 'idle'}
          />
          <h3>{p.name}</h3>
          <div className="round-score">
            <Star size={20} />
            <strong>{p.roundScore}</strong>
          </div>
          <p>
            <Shuffle size={14} /> {TWISTS[room.twist].short}
          </p>
        </aside>
        <div className="order-area">
          <div className={`order-ticket ${feedback === 'no' ? 'wrong' : ''}`}>
            <div className="ticket-top">
              <span>ORDER #{String(p.step + 1).padStart(2, '0')}</span>
            </div>
            <OrderIcon size={42} strokeWidth={1.7} />
            <h2>{FOODS[target]}</h2>
            <span className="ticket-perforation" />
          </div>
          <div className="dish-buttons">
            {menu.map((food, index) => {
              const Icon = icons[food];
              return (
                <button
                  key={`${food}-${index}`}
                  className={`dish dish-${food}`}
                  disabled={busy || waiting || left === 0}
                  onClick={() => void serve(food)}
                >
                  <Icon size={31} strokeWidth={1.7} />
                  <strong>{FOODS[food]}</strong>
                  <kbd>{index + 1}</kbd>
                </button>
              );
            })}
          </div>
          <div
            className={`serve-feedback ${feedback ?? ''}`}
            aria-live="polite"
          >
            {feedback === 'yes' ? (
              <>
                <Check size={16} /> Shiok!
              </>
            ) : feedback === 'no' ? (
              <>
                <X size={16} /> Wrong dish −1
              </>
            ) : room.twist === 2 ? (
              'Counter shuffles every 8s'
            ) : (
              ''
            )}
          </div>
        </div>
      </div>
      <div className="live-scores">
        {room.players.map((other, i) => (
          <div key={other.id}>
            <span>P{i + 1}</span>
            <strong>{other.name}</strong>
            <span>{other.bot ? 'CPU' : `${other.roundScore} pts`}</span>
          </div>
        ))}
      </div>
      {waiting && (
        <div className="ready-overlay">
          <span>READY, KAKI?</span>
          <strong>{Math.ceil((room.startedAt - now) / 1000)}</strong>
          <p>Match the dish to the order.</p>
        </div>
      )}
      {!waiting && left === 0 && (
        <div className="ready-overlay">
          <strong>Time!</strong>
        </div>
      )}
    </section>
  );
}
