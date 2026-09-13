'use client';
import Link from 'next/link';
import Image from 'next/image';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { ArrowLeft, ArrowUpRight, RotateCcw } from 'lucide-react';
import { useGame } from '@/lib/game/useGame';
import { DESK, FLAGS } from '@/lib/game/eraser';
import type {
  PhoneBridge,
  PhoneCommand,
  PhoneScreen,
} from '@/lib/game/phone-motion';
import type { Flick } from '@/lib/game/eraser-motion';
import { screenFlickToDesk } from '@/lib/game/eraser-perspective';
import EraserDesk, { FlagMark } from '@/components/game/EraserDesk';
import Sprite from '@/components/game/Sprite';
import { characters, findCharacter, ageLabels } from '@/lib/game/characters';
import EraserMotionControl from '@/components/game/EraserMotionControl';
import RoomLobby from '@/components/game/RoomLobby';
import '@/components/game/party.css';
import '@/app/eraser/eraser.css';

const PREVIEW = {
  first: { x: 35, y: 34, flag: 0 },
  second: { x: 67, y: 29, flag: 1 },
};
export default function EraserGame({
  embedded = false,
  initialCharacter = 'merly',
  initialAge = 0,
  bridge,
  gameAction,
  controller,
}: {
  bridge?: RefObject<PhoneBridge>;
  gameAction?: RefObject<
    ((command: PhoneCommand) => Promise<void> | void) | null
  >;
  controller?: {
    screen: PhoneScreen;
    offset: number;
    connected: boolean;
    act: (
      action: string,
      payload?: Record<string, unknown>,
    ) => Promise<boolean>;
  };
  embedded?: boolean;
  initialCharacter?: string;
  initialAge?: number;
}) {
  const localGame = useGame('eraser', {
    restoreSession: !embedded && !controller,
  });
  const game = controller
    ? {
        ...localGame,
        room: controller.screen.room!,
        session: { code: '', token: '', playerId: controller.screen.playerId! },
        offset: controller.offset,
        connected: controller.connected,
        solo: true,
        act: controller.act,
        practice: () => {
          void controller.act('restart');
        },
        leave: () => {
          void controller.act('navigate', { destination: 'explore' });
        },
      }
    : localGame;
  const { room, session, busy, connected, error } = game;
  const [character, setCharacter] = useState(initialCharacter);
  const [age, setAge] = useState(initialAge);
  const [code, setCode] = useState('');
  const [angle, setAngle] = useState(0);
  const [power, setPower] = useState(70);
  const [clock, setClock] = useState(0);
  const [sceneRatio, setSceneRatio] = useState(1);
  const sending = useRef(false);
  const startEmbedded = useEffectEvent(() =>
    game.practice(initialCharacter, initialAge),
  );
  const isController = !!controller;
  useEffect(() => {
    if (!embedded || isController) return;
    const timer = setTimeout(() => startEmbedded(), 0);
    return () => clearTimeout(timer);
  }, [embedded, isController]);
  useEffect(() => {
    const backdrop = new window.Image();
    backdrop.src = '/api/media?path=assets/eraser/showdown-scene.png';
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('character');
    if (!embedded && selected && characters.some((c) => c.id === selected)) {
      // Hydrate the selection carried from the main character picker.
      // oxlint-disable-next-line react/react-compiler
      setCharacter(selected);
      // oxlint-disable-next-line react/react-compiler
      setAge(
        [0, 1, 2].includes(Number(params.get('age')))
          ? Number(params.get('age'))
          : 0,
      );
    }
    const join = params.get('join');
    // Read the room invitation from external browser state after hydration.
    if (!embedded && join) {
      // oxlint-disable-next-line react/react-compiler
      setCode(
        join
          .replace(/[^a-z]/gi, '')
          .slice(0, 5)
          .toUpperCase(),
      );
    }
    const timer = setInterval(() => setClock(Date.now()), 200);
    return () => clearInterval(timer);
  }, [embedded]);
  const relayAct = game.act;
  // Publish public state to the imperative transport mailbox; no React state is mutated.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    if (!bridge || !gameAction || !room || !session) return;
    bridge.current.screen = {
      ...bridge.current.screen,
      room,
      playerId: session.playerId,
    };
    gameAction.current = async (command) => {
      if (command.action === 'flick') await relayAct('flick', command.payload);
    };
    return () => {
      gameAction.current = null;
    };
  }, [bridge, gameAction, room, session, relayAct]);
  /* oxlint-enable react/react-compiler */
  const state = room?.eraser;
  const flying =
    !!state?.shot &&
    state.shot.turn === state.turn &&
    room?.phase === 'playing';
  const waiting = !!state && clock + game.offset < (state.readyAt ?? 0);
  const standoff = waiting && !state?.capture && (state?.duel ?? 1) === 1;
  const mine =
    room?.phase === 'playing' &&
    state?.active === session?.playerId &&
    !flying &&
    !waiting &&
    !state?.capture;
  const canFlick = !!mine && connected && !busy && !bridge?.current.connected;
  const student = room?.players.find((p) => p.id === state?.active);
  const winner = room?.players.find((p) => p.id === state?.winner);
  async function flick(value: Flick) {
    if (!canFlick || !state || sending.current) return;
    sending.current = true;
    try {
      await game.act('flick', {
        ...screenFlickToDesk(
          value,
          state.pieces[session!.playerId],
          sceneRatio,
        ),
        match: state.match,
        turn: state.turn,
      });
    } finally {
      sending.current = false;
    }
  }
  const status = winner
    ? winner.id === session?.playerId
      ? 'You win!'
      : `${winner.name} wins!`
    : standoff
      ? 'Classroom showdown'
      : state?.capture
        ? 'Eraser captured!'
        : flying
          ? 'Eraser in the air…'
          : mine
            ? 'Your turn'
            : `${student?.name ?? 'Classmate'}’s turn`;
  const Root = embedded ? 'section' : 'main';
  return (
    <Root
      className={`eraser-page ${embedded ? 'is-embedded' : ''} ${room && room.phase !== 'lobby' ? 'is-playing' : ''}`}
    >
      <header className="eraser-topbar">
        <Link href="/">
          <ArrowLeft size={17} /> Our Block
        </Link>
        <span>
          FLAG ERASERS <b>1 VS 1</b>
        </span>
        {room && (
          <button type="button" onClick={game.leave}>
            Leave desk
          </button>
        )}
      </header>
      {error && (
        <div className="eraser-error" role="alert">
          {error}
          {session && !room && (
            <button type="button" onClick={game.leave}>
              Choose another room
            </button>
          )}
        </div>
      )}
      {!room ? (
        embedded ? null : (
          <>
            <div className="eraser-intro">
              <p className="eraser-eyebrow">THE CLASSROOM CLASSIC</p>
              <h1>
                Flag Eraser
                <br />
                <em>Showdown.</em>
              </h1>
              <p>
                Two students. Three erasers each.
                <br />
                Land yours on top to win.
              </p>
            </div>
            <div className="eraser-start-layout">
              <div className="eraser-preview">
                <EraserDesk
                  pieces={PREVIEW}
                  names={{ first: 'Student one', second: 'Student two' }}
                  active={false}
                />
              </div>
              <section
                className="eraser-setup"
                aria-label="Set up a desk battle"
              >
                <div className="eraser-setup-students">
                  <Sprite id={character} age={age} />
                  <span>VS</span>
                  <Sprite id="arun" />
                </div>
                <label>
                  Your character
                  <select
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                  >
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {findCharacter(character).kind === 'neighbour' && (
                  <label>
                    Life stage
                    <select
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                    >
                      {ageLabels.map((label, i) => (
                        <option key={label} value={i}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className="eraser-primary"
                  disabled={busy || !!session}
                  onClick={() => game.practice(character, age)}
                >
                  Start showdown <ArrowUpRight size={18} />
                </button>
                <div className="eraser-join">
                  <label>
                    Room code
                    <input
                      value={code}
                      maxLength={5}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="ABCDE"
                      onChange={(e) =>
                        setCode(
                          e.target.value.replace(/[^a-z]/gi, '').toUpperCase(),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="eraser-secondary"
                    disabled={busy || !!session || code.length !== 5}
                    onClick={() =>
                      void game.connect(
                        'join',
                        character,
                        age,
                        findCharacter(character).name,
                        code,
                      )
                    }
                  >
                    Join desk
                  </button>
                </div>
                <p className="eraser-small">
                  Three erasers each. Capture all three to win.
                </p>
              </section>
            </div>
          </>
        )
      ) : room.phase === 'lobby' ? (
        <section className="eraser-lobby">
          <p className="eraser-eyebrow">FLAG ERASER SHOWDOWN</p>
          <h1>Your desk is ready.</h1>
          <RoomLobby
            room={room}
            host={room.host === session?.playerId}
            busy={busy || !connected}
            onStart={() => void game.act('start')}
            capacity={2}
            joinPath="/eraser"
          />
          <label className="eraser-flag-picker">
            Your flag
            <select
              value={
                state?.pieces[session!.playerId]?.flag ??
                Math.max(
                  0,
                  room.players.findIndex((p) => p.id === session?.playerId),
                )
              }
              disabled={busy || !connected}
              onChange={(e) =>
                void game.act('flag', { flag: Number(e.target.value) })
              }
            >
              {FLAGS.map((flag, i) => (
                <option key={flag} value={i}>
                  {flag}
                </option>
              ))}
            </select>
          </label>
          <p className="eraser-small">
            Take turns. Land on an eraser to capture it. Off the desk returns
            your eraser and passes the turn.
          </p>
        </section>
      ) : state ? (
        <section className="eraser-match">
          <div className="eraser-match-heading">
            <div>
              <p className="eraser-eyebrow">
                FLAG ERASER SHOWDOWN · {game.solo ? 'PRACTICE' : room.code}
              </p>
              <h1>{status}</h1>
            </div>
            {room.phase === 'playing' && (
              <span className="eraser-turn-clock">
                {waiting
                  ? '…'
                  : flying
                    ? '↗'
                    : `${Math.min(DESK.turnMs / 1000, Math.max(0, Math.ceil((state.deadline - clock - game.offset) / 1000)))}s`}
                <small>{`DUEL ${state.duel ?? 1}`}</small>
              </span>
            )}
          </div>
          <div className="eraser-stock-hud" aria-label="Erasers remaining">
            {room.players.map((p) => (
              <div key={p.id} className="eraser-stock-seat">
                <strong>{p.id === session?.playerId ? 'You' : p.name}</strong>
                <span
                  aria-label={`${state.stock?.[p.id] ?? 3} erasers remaining`}
                >
                  {Array.from({ length: 3 }, (_, i) => (
                    <i
                      key={i}
                      className={
                        i >= (state.stock?.[p.id] ?? 3) ? 'is-captured' : ''
                      }
                    >
                      <FlagMark flag={state.pieces[p.id].flag} />
                    </i>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <EraserDesk
            avatars={Object.fromEntries(
              room.players.map((p) => [
                p.id,
                { character: p.character, age: p.age },
              ]),
            )}
            capture={state.capture}
            onAspectChange={setSceneRatio}
            viewerId={session?.playerId}
            pieces={state.pieces}
            names={Object.fromEntries(room.players.map((p) => [p.id, p.name]))}
            shot={state.shot}
            winner={state.winner}
            winReason={state.winReason}
            offset={game.offset}
            active={canFlick}
            onFlick={(value) => void flick(value)}
          />
          {standoff && (
            <section
              className="eraser-standoff"
              aria-label="Classroom showdown introduction"
            >
              <Image
                fill
                unoptimized
                priority
                sizes="100vw"
                className="eraser-showdown-art"
                src="/api/media?path=assets/eraser/showdown-scene.png"
                alt="A blue classroom desk in dramatic afternoon light, ready for a flag eraser showdown."
              />
              <div className="eraser-showdown-rival">
                <Sprite
                  id={
                    room.players.find((p) => p.id !== session?.playerId)!
                      .character
                  }
                  age={
                    room.players.find((p) => p.id !== session?.playerId)!.age
                  }
                  className="eraser-showdown-sprite"
                />
              </div>
              <div className="eraser-showdown-player">
                <Sprite
                  id={
                    room.players.find((p) => p.id === session?.playerId)!
                      .character
                  }
                  age={
                    room.players.find((p) => p.id === session?.playerId)!.age
                  }
                  className="eraser-showdown-sprite"
                />
              </div>
              <div className="eraser-showdown-loadout loadout-player">
                {[0, 1, 2].map((n) => (
                  <span key={n}>
                    <FlagMark flag={state.pieces[session!.playerId].flag} />
                  </span>
                ))}
              </div>
              <div className="eraser-showdown-loadout loadout-rival">
                {[0, 1, 2].map((n) => (
                  <span key={n}>
                    <FlagMark
                      flag={
                        state.pieces[
                          room.players.find((p) => p.id !== session?.playerId)!
                            .id
                        ].flag
                      }
                    />
                  </span>
                ))}
              </div>
              <div className="eraser-showdown-versus" aria-hidden="true">
                VS
              </div>
              <div className="eraser-showdown-names">
                <span>{room.players[0].name}</span>
                <span>{room.players[1].name}</span>
              </div>
              <div className="eraser-showdown-caption">
                <p>THREE ERASERS EACH</p>
                <h2>CLASSROOM SHOWDOWN</h2>
                <output className="eraser-draw">
                  {(state.readyAt ?? 0) - clock - game.offset < 900
                    ? 'DRAW!'
                    : `GET READY · ${Math.min(3, Math.max(1, Math.ceil(((state.readyAt ?? 0) - clock - game.offset - 900) / 1200)))}`}
                </output>
              </div>
            </section>
          )}
          <div className="eraser-controls">
            <output className="eraser-result">{state.notice}</output>
            {room.phase === 'finished' ? (
              <div className="eraser-finish">
                <strong>LAST ERASER STANDING</strong>
                {room.host === session?.playerId ? (
                  <button
                    type="button"
                    className="eraser-primary"
                    disabled={busy}
                    onClick={() =>
                      game.solo
                        ? game.practice(character, age)
                        : void game.act('restart')
                    }
                  >
                    <RotateCcw size={18} /> Rematch
                  </button>
                ) : (
                  <p>Waiting for the host to start a rematch.</p>
                )}
              </div>
            ) : (
              <>
                <EraserMotionControl
                  active={canFlick}
                  onFlick={(value) => void flick(value)}
                />
                <details className="eraser-manual">
                  <summary>
                    Aim & flick <span>keyboard / touch</span>
                  </summary>
                  <div className="eraser-aim-controls">
                    <label>
                      Direction{' '}
                      <output>
                        {angle}° ·{' '}
                        {angle === 0
                          ? 'right'
                          : angle === 90
                            ? 'down'
                            : angle === 180
                              ? 'left'
                              : angle === 270
                                ? 'up'
                                : 'diagonal'}
                      </output>
                      <input
                        type="range"
                        min="0"
                        max="359"
                        step="1"
                        value={angle}
                        onChange={(e) => setAngle(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Power <output>{power}%</output>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={power}
                        onChange={(e) => setPower(Number(e.target.value))}
                      />
                    </label>
                    <button
                      type="button"
                      className="eraser-primary"
                      disabled={!canFlick}
                      onClick={() =>
                        void flick({
                          x: Math.cos((angle * Math.PI) / 180),
                          y: Math.sin((angle * Math.PI) / 180),
                          power: power / 100,
                        })
                      }
                    >
                      <span style={{ transform: `rotate(${angle}deg)` }}>
                        →
                      </span>{' '}
                      Flick eraser
                    </button>
                  </div>
                </details>
              </>
            )}
          </div>
        </section>
      ) : null}
    </Root>
  );
}
