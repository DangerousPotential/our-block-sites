'use client';
import { ArrowRight, RotateCcw, Trophy, Star } from 'lucide-react';
import type { PublicRoom } from '@/lib/game/engine';
import Sprite from './Sprite';
export default function Results({
  room,
  host,
  busy,
  onNext,
  onRestart,
  onLeave,
}: {
  room: PublicRoom;
  host: boolean;
  busy: boolean;
  onNext: () => void;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);
  const final = room.phase === 'finished';
  const tied = ranked.filter((p) => p.score === ranked[0].score);
  return (
    <section className="results-panel">
      <Trophy className="trophy" size={38} />
      <h1>
        {final
          ? tied.length > 1
            ? 'A shared victory!'
            : `${ranked[0].name} takes the crown!`
          : 'Wah, what a rush.'}
      </h1>
      <div className="results-roster">
        {ranked.map((p, i) => (
          <div
            className={`result-person ${i === 0 ? 'winner' : ''}`}
            key={p.id}
          >
            <span className="rank">{i === 0 ? '★' : `0${i + 1}`}</span>
            <Sprite
              id={p.character}
              age={p.age}
              pose={i === 0 ? 'cheer' : 'idle'}
            />
            <h3>
              {p.name}
              {p.bot && <small>CPU</small>}
            </h3>
            <strong>
              {p.score}
              <Star size={14} />
            </strong>
            <span>+{p.roundScore} this round</span>
          </div>
        ))}
      </div>
      <div className="results-actions">
        {host &&
          (final ? (
            <button className="primary" disabled={busy} onClick={onRestart}>
              <RotateCcw size={17} /> Play again
            </button>
          ) : (
            <button className="primary" disabled={busy} onClick={onNext}>
              {room.round >= room.totalRounds
                ? 'Crown the champion'
                : 'Draw a time jump'}{' '}
              <ArrowRight size={18} />
            </button>
          ))}
        {!host && <p>Waiting for host…</p>}
        <button className="text-button" onClick={onLeave}>
          Change kaki
        </button>
      </div>
    </section>
  );
}
