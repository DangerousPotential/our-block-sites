'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { ProjectedPoint } from './WorldScene';
import { ERAS, eraForYear, type EraId } from '@/lib/game/worlds';
import { ArrowRight, Star, BookOpen, Dice5 } from 'lucide-react';
import type { PublicRoom } from '@/lib/game/engine';
import { TWISTS, BOARD_TILES, HOP_MS, ROLL_MS } from '@/lib/game/engine';
import { findCharacter } from '@/lib/game/characters';
import Sprite from './Sprite';
import NeighbourhoodVisit from './NeighbourhoodVisit';
import {
  ACTIVITIES,
  ERA_ACTIVITIES,
  type ActivityId,
} from '@/lib/game/activities';
const WalkNeighbourhood = lazy(() => import('./WalkNeighbourhood'));
const history = [
  {
    year: 1987,
    title: 'A new way around the island',
    body: 'Singapore’s first MRT passenger services began in November 1987. A changing transport network became part of everyday life.',
    source: 'National Heritage Board',
    url: 'https://www.roots.gov.sg/stories-landing/stories/the-mass-rapid-transit/story',
  },
  {
    year: 1989,
    title: 'Sharing a neighbourhood',
    body: 'HDB introduced the Ethnic Integration Policy in 1989 to promote racial integration in public housing estates.',
    source: 'Housing & Development Board',
    url: 'https://www.hdb.gov.sg/about-us/our-story/our-history',
  },
  {
    year: 2002,
    title: 'The train reaches Changi',
    body: 'The Changi Airport MRT extension opened in February 2002, connecting the airport to the rail network.',
    source: 'Land Transport Authority',
    url: 'https://www.lta.gov.sg/content/ltagov/en/getting_around/public_transport/rail_network/east_west_line.html',
  },
];
export default function Board({
  room,
  host,
  busy,
  onStart,
  playerId,
  offset,
  onRoll,
}: {
  room: PublicRoom;
  host: boolean;
  busy: boolean;
  onStart: () => void;
  playerId: string;
  offset: number;
  onRoll: () => void;
}) {
  const [clock, setClock] = useState(0);
  const [exploring, setExploring] = useState(true);
  const [visit, setVisit] = useState<ActivityId | null>(null);
  const [points, setPoints] = useState<ProjectedPoint[]>([]);
  const [chosenEra, setChosenEra] = useState<EraId | 'auto'>('auto');
  const era = chosenEra === 'auto' ? eraForYear(room.year) : chosenEra;
  const world = ERAS.find((e) => e.id === era)!;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('our-block:era', { detail: era }));
    return () => {
      window.dispatchEvent(new CustomEvent('our-block:era', { detail: null }));
    };
  }, [era]);
  const move = room.move;
  const animating = !!move && !move.settled;
  useEffect(() => {
    if (!animating) return;
    const tick = () => setClock(Date.now() + offset);
    const timer = setInterval(tick, 40);
    return () => clearInterval(timer);
  }, [animating, offset]);
  const elapsed = move ? Math.max(0, clock - move.startedAt) : 0;
  const moving = !!move && !move.settled;
  const rolling = moving && elapsed < ROLL_MS;
  const hopping =
    moving && elapsed >= ROLL_MS && elapsed < ROLL_MS + move.steps * HOP_MS;
  const active = room.players[room.boardTurn ?? 0];
  const ready = !active;
  const ownTurn = active?.id === playerId;
  const destination = move ? (move.from + move.steps) % BOARD_TILES.length : 0;
  const snapshot = [...history].reverse().find((x) => x.year <= room.year)!;
  if (exploring) {
    const self = room.players.find((p) => p.id === playerId) ?? room.players[0];
    return (
      <Suspense fallback={<p>Opening your neighbourhood…</p>}>
        <WalkNeighbourhood
          key={era}
          era={era}
          character={self.character}
          age={self.age}
          onEra={setChosenEra}
          onExit={() => setExploring(false)}
        />
      </Suspense>
    );
  }
  return (
    <section className="board-view era-board" data-era={era}>
      {visit && (
        <NeighbourhoodVisit
          key={visit}
          id={visit}
          character={
            room.players.find((p) => p.id === playerId)?.character ?? 'merly'
          }
          age={room.players.find((p) => p.id === playerId)?.age ?? 0}
          onClose={() => setVisit(null)}
        />
      )}
      <div className="era-toolbar">
        <div>
          <strong>{world.title}</strong>
          <span>{world.detail}</span>
        </div>
        <label>
          Neighbourhood era
          <select
            value={chosenEra}
            onChange={(e) => setChosenEra(e.target.value as EraId | 'auto')}
          >
            <option value="auto">Follow game year · {room.year}</option>
            {ERAS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav
        className="neighbourhood-visits"
        aria-label="Things to do in this era"
      >
        <span>Life around the block</span>
        <button onClick={() => setExploring(true)}>
          Walk around the neighbourhood
        </button>
        {ERA_ACTIVITIES[era].map((id) => (
          <button key={id} onClick={() => setVisit(id)}>
            {ACTIVITIES[id].title} ↗
          </button>
        ))}
      </nav>
      <div className="board-surface">
        <div
          className="board-track"
          aria-label={`${BOARD_TILES.length}-space courtyard board`}
        >
          <Suspense fallback={<p>Opening your neighbourhood…</p>}>
            <WalkNeighbourhood
              key={era}
              era={era}
              character="merly"
              age={0}
              onEra={setChosenEra}
              onExit={() => setExploring(true)}
              boardMode
              onProject={setPoints}
            />
          </Suspense>
          {room.players.map((p) => {
            const isMover = moving && move.playerId === p.id;
            const progress = isMover
              ? Math.min(move.steps, Math.max(0, (elapsed - ROLL_MS) / HOP_MS))
              : 0;
            const step = Math.floor(progress),
              fraction = progress - step;
            const position = isMover
              ? (move.from + step) % BOARD_TILES.length
              : p.position;
            const point = points[position % 22],
              next = points[(position + 1) % 22];
            if (!point || !next) return null;
            const peers = room.players.filter((x) => x.position === p.position);
            const spread = !isMover
              ? (peers.findIndex((x) => x.id === p.id) -
                  (peers.length - 1) / 2) *
                40
              : 0;
            return (
              <div
                className={`board-token ${isMover && hopping ? 'token-hopping' : ''} ${active?.id === p.id ? 'token-active' : ''}`}
                key={p.id}
                style={{
                  left: `${point.x + (next.x - point.x) * fraction}%`,
                  top: `${point.y + (next.y - point.y) * fraction}%`,
                  marginLeft: `${(spread / 1672) * 100}%`,
                  zIndex: 10 + Math.round(point.y),
                }}
                aria-label={`${p.name}, tile ${position + 1}`}
              >
                <div className="token-shadow" />
                <div
                  className="token-body"
                  style={{
                    transform: `translateY(${-Math.sin(fraction * Math.PI) * 35}%)`,
                  }}
                >
                  <span
                    className="token-label"
                    style={{ background: findCharacter(p.character).colour }}
                  >
                    {p.name}
                  </span>
                  <Sprite id={p.character} age={p.age} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="board-controls">
        <div className="turn-status" aria-live="polite">
          <span
            className={`board-die ${rolling ? 'die-rolling' : ''}`}
            aria-label={move && !rolling ? `Rolled ${move.steps}` : 'Dice'}
          >
            {move ? (
              rolling ? (
                1 + (Math.floor(elapsed / 100) % 6)
              ) : (
                move.steps
              )
            ) : (
              <Dice5 size={26} />
            )}
          </span>
          <div>
            <strong>
              {rolling
                ? 'Rolling…'
                : hopping
                  ? `${room.players.find((p) => p.id === move?.playerId)?.name} · ${Math.max(1, move!.steps - Math.floor((elapsed - ROLL_MS) / HOP_MS))} to go`
                  : moving
                    ? BOARD_TILES[destination][0]
                    : ready
                      ? 'Lunch rush'
                      : ownTurn
                        ? 'Your turn'
                        : `${active.name}’s turn`}
            </strong>
            {moving && !rolling && !hopping ? (
              <small>
                {move.reward > 0 ? '+' : ''}
                {move.reward} stars
              </small>
            ) : ready ? (
              <small>{TWISTS[room.twist].short} · 30 sec</small>
            ) : null}
          </div>
        </div>
        {ready ? (
          host ? (
            <button className="primary" disabled={busy} onClick={onStart}>
              Play <ArrowRight size={18} />
            </button>
          ) : (
            <span className="waiting-note">Waiting for host…</span>
          )
        ) : (
          <button
            className="primary"
            disabled={busy || moving || !ownTurn}
            onClick={onRoll}
          >
            {moving ? 'Moving…' : ownTurn ? 'Roll' : 'Waiting…'}
            <Dice5 size={18} />
          </button>
        )}
      </aside>
      <div className="board-extras">
        <details className="board-scores">
          <summary>
            <Star size={16} /> Scores
          </summary>
          <div className="score-list">
            {room.players.map((p, i) => (
              <div key={p.id}>
                <span>
                  P{i + 1} · {p.name}
                </span>
                <strong>{p.score} ★</strong>
              </div>
            ))}
          </div>
        </details>
        <details className="history-card">
          <summary>
            <BookOpen size={15} /> In Singapore <span>{snapshot.year}</span>
          </summary>
          <h3>{snapshot.title}</h3>
          <p>{snapshot.body}</p>
          <a href={snapshot.url} target="_blank" rel="noreferrer">
            {snapshot.source} ↗
          </a>
          <small>History is real; game rules are fictional.</small>
        </details>
      </div>
    </section>
  );
}
