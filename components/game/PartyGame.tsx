'use client';
import { useEffect, useState } from 'react';
import {
  Dice5,
  Smartphone,
  Trophy,
  ArrowRight,
  Coffee,
  Shield,
  Wind,
  Footprints,
} from 'lucide-react';
import type { PublicRoom } from '@/lib/game/engine';
import { CARDS, eraOf, TRIP_ERAS } from '@/lib/game/trip';
import { CLIMB_ERAS, climbEra } from '@/lib/game/forest-course';
import { dicePlayer } from '@/lib/game/party';
import { MINIGAMES, gameDefinition } from '@/lib/game/party-games';
import TripGame from './TripGame';
import TripWorld from './TripWorld';
import Sprite from './Sprite';
import PartyMinigame from './PartyMinigame';
import './party.css';

type Act = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<boolean>;
const cardDescriptions = [
  'A little extra speed or scoring power for eight seconds.',
  'More forgiving jumps and beats; a steadier tray for ten seconds.',
  'Protect a kaki from bumps, spills and breezes for ten seconds.',
  'Give another kaki a gentle drift or slower taps after a one-second warning.',
];
const cardIcons = [Coffee, Footprints, Shield, Wind];
export default function PartyGame({
  room,
  playerId,
  offset,
  act,
  onLeave,
  display = false,
}: {
  room: PublicRoom;
  playerId?: string;
  offset: number;
  act: Act;
  onLeave: () => void;
  display?: boolean;
}) {
  const party = room.party!,
    t = room.trip!,
    era = eraOf(room),
    host = room.host === playerId,
    me = room.players.find((p) => p.id === playerId);
  const [target, setTarget] = useState(playerId ?? ''),
    [pending, setPending] = useState(false),
    [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 200);
    return () => clearInterval(timer);
  }, [offset]);
  const action = async (
    name: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (pending) return;
    setPending(true);
    try {
      await act(name, { round: room.round, stage: party.stage, ...payload });
    } finally {
      setPending(false);
    }
  };
  if (party.stage === 'explore' && !display && playerId)
    return (
      <TripGame
        room={room}
        playerId={playerId}
        offset={offset}
        act={act}
        onLeave={onLeave}
      />
    );
  const definition = party.game
    ? gameDefinition(party.game.kind)
    : MINIGAMES[(room.round - 1) % MINIGAMES.length];
  const hand = t.hands[playerId ?? ''] ?? [],
    self = party.game?.players[playerId ?? ''];
  const finished = room.phase === 'finished';
  return (
    <section className={`party-shell ${display ? 'party-display' : ''}`}>
      {party.stage === 'game' ? (
        <PartyMinigame
          key={party.game!.id}
          room={room}
          playerId={playerId}
          offset={offset}
          act={act}
          display={display}
        />
      ) : (
        <>
          <div className="party-world">
            <TripWorld
              era={era.id}
              character={me?.character ?? 'merly'}
              room={room}
              playerId={playerId}
              onNpc={() => {}}
            />
          </div>
          <header className="party-heading">
            <span>OUR BLOCK · PARTY NIGHT</span>
            <strong>
              {era.year} · {era.name}
            </strong>
            <span>
              Room {room.code} · {room.round} / {room.totalRounds}
            </span>
          </header>
          <div className="party-stage-card">
            {party.stage === 'dice' && (
              <>
                <Dice5 size={34} />
                <small>A NEW ROUND, ANOTHER MEMORY</small>
                <h1>Where to, kaki?</h1>
                <p>
                  {dicePlayer(room)?.name} rolls the era dice. 1950s or 1987. Six stays here.
                </p>
                <div className="party-era-faces">
                  {TRIP_ERAS.map((e, i) => (
                    <span key={e.id}>
                      <b>{i === 0 ? '1–3' : '4–5'}</b>
                      {e.year}
                    </span>
                  ))}
                  <span>
                    <b>6</b>Stay
                  </span>
                </div>
                {!display && dicePlayer(room)?.id === playerId ? (
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={() => void action('roll')}
                  >
                    <Dice5 /> Roll the era dice
                  </button>
                ) : (
                  <p className="party-wait">
                    <Smartphone size={18} />
                    Waiting for {dicePlayer(room)?.name}’s phone
                  </p>
                )}
              </>
            )}
            {party.stage === 'travel' && (
              <>
                <small>
                  {party.die?.value === 6
                    ? 'A LITTLE LONGER HERE'
                    : 'TIME TO TRAVEL'}
                </small>
                <h1>{era.year}</h1>
                <h2>{era.name}</h2>
                <p>
                  {room.players.find((p) => p.id === party.die?.by)?.name}{' '}
                  rolled {party.die?.value}.{' '}
                  {party.die?.changed
                    ? 'Explore and help three neighbours for surprise cards.'
                    : 'Same era! Keep your hand and head into the next game.'}
                </p>
                <span className="party-travel-status">Arriving…</span>
              </>
            )}
            {party.stage === 'explore' && display && (
              <>
                <small>OUT IN THE NEIGHBOURHOOD</small>
                <h1>Make a neighbour’s day.</h1>
                <p>
                  Explore on your phone. Talk to the neighbours and collect up
                  to three surprise cards.
                </p>
                <strong className="party-timer">
                  {Math.max(0, Math.ceil((t.deadline - now) / 1000))}s
                </strong>
                <div className="party-ready-list">
                  {room.players.map((p) => (
                    <span key={p.id}>
                      {p.name} · {t.counts[p.id] ?? 0} cards ·{' '}
                      {t.ready.includes(p.id) ? 'Ready' : 'Exploring'}
                    </span>
                  ))}
                </div>
                <small>UP NEXT · {definition.name}</small>
              </>
            )}
            {party.stage === 'briefing' && (
              <>
                <small>
                  NEXT UP · GAME {room.round} OF {room.totalRounds}
                </small>
                <h1>{definition.name}</h1>
                <p>{definition.description}</p>
                <div
                  className={`party-art party-art-${definition.panel}`}
                  style={
                    definition.id === 'forest'
                      ? {
                          backgroundImage:
                            "url('/api/media?path=assets/party/singapore-skyways.png')",
                          backgroundSize: '300% 200%',
                          backgroundPosition: `${(CLIMB_ERAS.indexOf(climbEra(room.year)) % 3) * 50}% ${Math.floor(CLIMB_ERAS.indexOf(climbEra(room.year)) / 3) * 100}%`,
                        }
                      : undefined
                  }
                  aria-hidden="true"
                />
                <p className="party-control-hint">
                  <Smartphone size={19} />
                  {definition.controls}
                </p>
                <div className="party-ready-list">
                  {room.players.map((p) => (
                    <span key={p.id}>
                      {p.name} ·{' '}
                      {p.bot || t.ready.includes(p.id)
                        ? 'Ready'
                        : 'Learning controls'}
                    </span>
                  ))}
                </div>
                {!display && (
                  <button
                    className="primary"
                    disabled={pending || t.ready.includes(playerId!)}
                    onClick={() => void action('ready')}
                  >
                    {t.ready.includes(playerId!)
                      ? 'Ready · waiting for kakis'
                      : 'I’m ready'}
                    <ArrowRight />
                  </button>
                )}
              </>
            )}
            {party.stage === 'scores' && (
              <>
                <Trophy size={34} />
                <small>
                  {finished
                    ? 'HOME TOGETHER'
                    : `${definition.name.toUpperCase()} · RESULTS`}
                </small>
                <h1>{finished ? 'Home, together.' : 'Another memory made.'}</h1>
                <div className="party-results">
                  {[...room.players]
                    .sort((a, b) =>
                      finished
                        ? b.score - a.score
                        : b.roundScore - a.roundScore,
                    )
                    .map((p, i) => (
                      <div key={p.id}>
                        <b>{i === 0 ? '1–3' : '4–5'}</b>
                        <Sprite id={p.character} age={p.age} />
                        <strong>
                          {p.name}
                          <small>{p.score} total</small>
                        </strong>
                        <em>+{p.roundScore}</em>
                      </div>
                    ))}
                </div>
                {host && !display ? (
                  <button
                    className="primary"
                    disabled={pending}
                    onClick={() => void action(finished ? 'restart' : 'next')}
                  >
                    {finished
                      ? 'Another party'
                      : room.round === room.totalRounds
                        ? 'See final standings'
                        : 'Next era roll'}
                    <ArrowRight />
                  </button>
                ) : (
                  <p className="party-wait">Waiting for the host’s phone</p>
                )}
              </>
            )}
          </div>
          <div className="party-roster">
            {room.players.map((p) => (
              <div key={p.id}>
                <Sprite id={p.character} age={p.age} />
                <span>
                  {p.name}
                  <b>{p.score} pts</b>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {party.stage === 'game' && !display && (
        <details className="party-cards">
          <summary>Your cards · {hand.length} · one per game</summary>
          <p>Choose a kaki for Umbrella or Breeze.</p>
          <label>
            Card target
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {room.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            {hand.map((c, i) => {
              const Icon = cardIcons[c];
              return (
                <button
                  key={`${i}:${c}`}
                  disabled={
                    pending ||
                    self?.used ||
                    !!self?.finished ||
                    now < party.game!.start
                  }
                  onClick={() =>
                    void action('card', {
                      game: party.game!.id,
                      slot: i,
                      target,
                    })
                  }
                >
                  <Icon />
                  <strong>{CARDS[c].name}</strong>
                  <small>{cardDescriptions[c]}</small>
                </button>
              );
            })}
          </div>
          {!hand.length && <p>No cards this time. Your controls still work.</p>}
        </details>
      )}
      {party.stage === 'game' && (
        <output className="party-notice">{t.notice}</output>
      )}
    </section>
  );
}
