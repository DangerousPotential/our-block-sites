'use client';
// These custom overlaid dialogs preserve the live 3D world behind them.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { RemoteMotion } from '@/lib/game/phone-motion';
import type { PublicRoom } from '@/lib/game/engine';
import { CARDS, ERA_FAVOURS, eraOf, tripTileLabel } from '@/lib/game/trip';
import TripWorld from './TripWorld';
import {
  EXPLORATION_ERAS,
  PASTIMES_1950S,
  type WorldEra,
} from '@/lib/game/pastimes1950s';
import { CULTURE_TITLES } from '@/lib/game/culture';
import JumpQuest from './JumpQuest';
import Sprite from './Sprite';
import TripAmbience from './TripAmbience';
import './trip.css';
type Act = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<boolean>;
function useDialogFocus(active: boolean, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = document.querySelector<HTMLElement>('.trip-dialog');
    const buttons = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select, a[href], input',
        ) ?? [],
      );
    buttons()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const list = buttons();
        if (!list.length) {
          event.preventDefault();
          return;
        }
        const current = list.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && current <= 0) {
          event.preventDefault();
          list.at(-1)?.focus();
        } else if (!event.shiftKey && current === list.length - 1) {
          event.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [active]);
}
export function FreeExplore({
  character,
  onExit,
  initialEra = 'pastimes',
  onEraChange,
  remoteMotion,
  onWalk,
}: {
  remoteMotion?: RefObject<RemoteMotion | null>;
  onWalk?: (point: { x: number; z: number }) => void;
  initialEra?: WorldEra;
  onEraChange?: (era: WorldEra) => void;
  character: string;
  onExit: () => void;
}) {
  const [era, setEra] = useState<WorldEra>(initialEra),
    [npc, setNpc] = useState<number | null>(null);
  const e = EXPLORATION_ERAS.find((e) => e.id === era)!;
  const FAVOURS =
    era === 'pastimes'
      ? [0, 2, 3, 6].map((i) => [PASTIMES_1950S[i].story, '', ''])
      : ERA_FAVOURS[era];
  useDialogFocus(npc !== null, () => setNpc(null));
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('our-block:era', {
        detail: era === 'river' ? 'kampong' : era,
      }),
    );
  }, [era]);
  return (
    <section className="trip-shell">
      <div className="trip-heading">
        <div>
          <small>FREE EXPLORATION · NO TIMER OR REWARDS</small>
          <h1>{e.name}</h1>
        </div>
        <select
          aria-label="Explore an era"
          value={era}
          onChange={(e) => {
            setEra(e.target.value as WorldEra);
            onEraChange?.(e.target.value as WorldEra);
            setNpc(null);
          }}
        >
          {EXPLORATION_ERAS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.id === 'pastimes' ? '1950s' : e.year} ·{' '}
              {e.id === 'pastimes' ? e.name : CULTURE_TITLES[e.id]}
            </option>
          ))}
        </select>
        <button onClick={onExit}>Back</button>
      </div>
      <TripWorld
        era={era}
        character={character}
        onNpc={setNpc}
        remoteMotion={remoteMotion}
        onWalk={onWalk}
      />
      <details className="trip-pocket trip-audio-pocket">
        <summary>Sound</summary>
        <TripAmbience era={era} />
      </details>
      {npc !== null && (
        <div
          className="trip-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={e.npcs[npc]}
        >
          <small>HELLO, NEIGHBOUR</small>
          <h2>{e.npcs[npc]}</h2>
          <p>{FAVOURS[npc][0]}</p>
          <p>{FAVOURS[npc][2]}</p>
          <button onClick={() => setNpc(null)}>See you around!</button>
        </div>
      )}
      <p className="trip-disclaimer">
        An original, stylised composite inspired by Singapore life—not an exact
        historical map.
      </p>
    </section>
  );
}
export default function TripGame({
  room,
  playerId,
  offset,
  act,
  onLeave,
}: {
  room: PublicRoom;
  playerId: string;
  offset: number;
  act: Act;
  onLeave: () => void;
}) {
  const t = room.trip!,
    era = eraOf(room),
    host = room.host === playerId,
    me = room.players.find((p) => p.id === playerId)!;
  const FAVOURS = ERA_FAVOURS[era.id];
  const nextEra = t.eras[room.round];
  useEffect(() => {
    if (nextEra)
      void fetch(`/api/media?path=assets/trip/${nextEra}.glb`, {
        cache: 'force-cache',
      }).catch(() => {});
  }, [nextEra]);
  const [now, setNow] = useState(() => Date.now() + offset),
    [npc, setNpc] = useState<number | null>(null),
    [target, setTarget] = useState(playerId),
    [pending, setPending] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(timer);
  }, [offset]);
  useEffect(() => {
    // A server phase transition invalidates the open encounter.
    // oxlint-disable-next-line react/react-compiler
    setNpc(null);
  }, [room.phase, room.round]);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('our-block:era', {
        detail: era.id === 'river' ? 'kampong' : era.id,
      }),
    );
  }, [era.id]);
  const hand = t.hands[playerId] ?? [],
    seconds = Math.max(0, Math.ceil((t.deadline - now) / 1000));
  async function claim(replace?: number) {
    if (npc === null || pending) return;
    setPending(true);
    const ok = await act('claim', { round: room.round, npc, replace });
    setPending(false);
    if (ok) setNpc(null);
  }
  const action = (name: string, payload: Record<string, unknown> = {}) =>
    void act(name, { round: room.round, stage: room.party?.stage, ...payload });
  const summary = ['results', 'finished', 'quest-results'].includes(room.phase);
  useDialogFocus(
    summary || (npc !== null && room.phase === 'exploring'),
    () => {
      if (!summary) setNpc(null);
    },
  );
  return (
    <section className="trip-shell">
      {room.phase === 'revealing' && (
        <div className="trip-dialog trip-reveal">
          <small>THE NEXT CHAPTER</small>
          <h2>{era.year}</h2>
          <h3>{era.name}</h3>
          <p>{era.subtitle}</p>
          <p>
            Meet four neighbours. Collect up to three favours. Make a memory.
          </p>
        </div>
      )}
      <div className="trip-heading">
        <div>
          <small>
            {room.phase === 'exploring'
              ? 'A LITTLE TIME TO BE A NEIGHBOUR'
              : room.phase === 'quest'
                ? 'ONE WORLD · EVERY KAKI'
                : 'YOUR JOURNEY THROUGH SINGAPORE'}
          </small>
          <h1>{era.name}</h1>
          <p>{era.subtitle}</p>
        </div>
        <div className="trip-phase">
          {era.year} ·{' '}
          {room.phase === 'exploring'
            ? `${seconds}s to wander`
            : room.phase === 'quest'
              ? 'Jump quest'
              : room.phase === 'board'
                ? 'Around the board'
                : 'The journey so far'}
        </div>
        <button onClick={onLeave} aria-label="Leave game">
          Back
        </button>
      </div>
      {room.phase === 'quest' ? (
        <JumpQuest room={room} playerId={playerId} offset={offset} act={act} />
      ) : (
        <TripWorld
          era={era.id}
          character={me.character}
          room={room}
          playerId={playerId}
          onNpc={setNpc}
          onWalk={(p) => {
            if (room.phase === 'exploring') action('walk', p);
          }}
        />
      )}
      <details className="trip-pocket trip-audio-pocket">
        <summary>Sound</summary>
        <TripAmbience era={era.id} />
      </details>
      <div className="trip-toolbar">
        <details className="trip-pocket trip-score-pocket">
          <summary>Kakis</summary>
          <div className="trip-scores">
            {room.players.map((p) => (
              <div key={p.id}>
                <Sprite id={p.character} />
                <span>
                  {p.name}
                  <strong>
                    {p.score} pts · {t.counts[p.id] ?? 0} cards
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </details>
        {room.phase === 'exploring' && (
          <>
            <p>
              {seconds <= 10
                ? 'Time to head home! Your cards are saved.'
                : `${(t.claims[playerId] ?? []).length}/${room.party ? 3 : 2} favours collected · Walk to a neighbour to earn a card.`}
            </p>
            <button
              disabled={t.ready.includes(playerId)}
              onClick={() => action('ready')}
            >
              {t.ready.includes(playerId)
                ? 'Ready · waiting for kakis'
                : room.party
                  ? 'Ready for the minigame →'
                  : 'Ready for the board →'}
            </button>
          </>
        )}
        {room.phase === 'board' && (
          <>
            {(room.boardTurn ?? 0) < room.players.length ? (
              <>
                <p>
                  {room.move && !room.move.settled
                    ? `${room.players.find((p) => p.id === room.move!.playerId)?.name} rolled ${room.move.steps}`
                    : `${room.players[room.boardTurn ?? 0]?.name}’s turn`}{' '}
                  · Gold tiles start the jump quest.
                </p>
                <button
                  disabled={
                    room.players[room.boardTurn ?? 0]?.id !== playerId ||
                    !!(room.move && !room.move.settled)
                  }
                  onClick={() => action('roll', { turn: room.boardTurn ?? 0 })}
                >
                  Roll the dice 🎲
                </button>
              </>
            ) : host ? (
              <>
                {!t.questPlayed && (
                  <button onClick={() => action('start')}>
                    Play jump quest ↗
                  </button>
                )}
                <button onClick={() => action('continue')}>
                  Round summary →
                </button>
              </>
            ) : (
              <p>Waiting for the host to continue…</p>
            )}
          </>
        )}
      </div>
      <details className="trip-pocket trip-hand-pocket">
        <summary>Cards · {hand.length}</summary>
        <div className="trip-hand">
          {room.phase === 'board' && room.move?.settled && (
            <p className="trip-landing">
              Last landing:{' '}
              {tripTileLabel(era.id, (room.move.from + room.move.steps) % 22)} ·{' '}
              {room.move.reward >= 0 ? '+' : ''}
              {room.move.reward} points
            </p>
          )}
          <div>
            <small>YOUR PRIVATE HAND</small>
            <p>
              {room.phase === 'quest'
                ? 'One card this race. Choose a kaki for umbrella or breeze.'
                : 'Keep up to three cards across your trip.'}
            </p>
          </div>
          {room.phase === 'quest' && (
            <select
              aria-label="Card target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {room.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {hand.map((c, i) => (
            <button
              className="trip-card"
              key={`${i}:${c}`}
              disabled={
                room.phase !== 'quest' || t.quest?.runners[playerId].used
              }
              onClick={() =>
                action('card', { quest: t.quest?.id, slot: i, target })
              }
            >
              <span>{CARDS[c].icon}</span>
              <strong>{CARDS[c].name}</strong>
              <small>{CARDS[c].description}</small>
            </button>
          ))}
          {!hand.length && <p>No cards yet. Make a neighbour’s day.</p>}
        </div>
      </details>
      {room.phase === 'quest' && (
        <p className="trip-notice" role="status">
          {t.notice}
        </p>
      )}
      {npc !== null && room.phase === 'exploring' && (
        <div
          className="trip-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={era.npcs[npc]}
        >
          <button
            className="trip-close"
            aria-label="Close conversation"
            onClick={() => setNpc(null)}
          >
            ×
          </button>
          <small>A SMALL FAVOUR, A NEW FRIEND</small>
          <h2>{era.npcs[npc]}</h2>
          <Sprite id={['otto', 'kopi', 'pandan', 'merly'][npc]} />
          <p>{FAVOURS[npc][0]}</p>
          <p className="trip-reward">
            {room.party
              ? 'A surprise card from your neighbour'
              : `${CARDS[npc].name} · ${CARDS[npc].description}`}
          </p>
          {(t.claims[playerId] ?? []).includes(npc) ||
          (t.claims[playerId] ?? []).length >= (room.party ? 3 : 2) ? (
            <p>{FAVOURS[npc][2]} You have collected your available favours.</p>
          ) : hand.length >= 3 ? (
            <>
              <p>Your hand is full. Replace one card, or keep your hand.</p>
              {hand.map((c, i) => (
                <button
                  key={i}
                  disabled={pending}
                  onClick={() => void claim(i)}
                >
                  Replace {CARDS[c].name}
                </button>
              ))}
            </>
          ) : (
            <button disabled={pending} onClick={() => void claim()}>
              {FAVOURS[npc][1]} →
            </button>
          )}
          <button className="trip-secondary" onClick={() => setNpc(null)}>
            See you around
          </button>
        </div>
      )}
      {summary && (
        <div
          className="trip-dialog trip-summary"
          role="dialog"
          aria-modal="true"
          aria-label="Round results"
        >
          <small>
            {room.phase === 'quest-results'
              ? 'ROOFTOP RELAY RESULTS'
              : room.phase === 'finished'
                ? 'THREE ERAS, ONE NEIGHBOURHOOD'
                : 'ANOTHER MEMORY MADE'}
          </small>
          <h2>
            {room.phase === 'finished'
              ? 'Home, together.'
              : room.phase === 'quest-results'
                ? 'Nice jumping, kaki!'
                : 'A day well spent.'}
          </h2>
          {[...room.players]
            .sort((a, b) =>
              room.phase === 'quest-results'
                ? b.roundScore - a.roundScore
                : b.score - a.score,
            )
            .map((p) => (
              <p key={p.id}>
                {p.name}
                <strong>
                  {room.phase === 'quest-results'
                    ? `${p.roundScore} race pts${t.quest?.runners[p.id].finished ? '' : ' · Did not finish'}`
                    : `${p.score} points`}
                </strong>
              </p>
            ))}
          {host ? (
            <button
              onClick={() =>
                action(
                  room.phase === 'quest-results'
                    ? 'resume'
                    : room.phase === 'finished'
                      ? 'restart'
                      : 'next',
                )
              }
            >
              {room.phase === 'quest-results'
                ? 'Back to the board →'
                : room.phase === 'finished'
                  ? 'Another trip →'
                  : 'Continue trip →'}
            </button>
          ) : (
            <p>Waiting for the host…</p>
          )}
          <button className="trip-secondary" onClick={onLeave}>
            Leave game
          </button>
        </div>
      )}
      <p className="trip-disclaimer">Original, stylised Singapore memories.</p>
    </section>
  );
}
