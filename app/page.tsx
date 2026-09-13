'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import '@/components/game/god-mode.css';
import { useEffect, useState } from 'react';
import { House, ArrowLeft, X } from 'lucide-react';
import AssetDownload from '@/components/game/AssetDownload';
import LobbyBackdrop from '@/components/game/LobbyBackdrop';
import CharacterPicker from '@/components/game/CharacterPicker';
import { useGame } from '@/lib/game/useGame';
const RoomSetup = dynamic(() => import('@/components/game/RoomSetup'));
const RoomLobby = dynamic(() => import('@/components/game/RoomLobby'));
const Board = dynamic(() => import('@/components/game/Board'), { ssr: false });
const LunchRush = dynamic(() => import('@/components/game/LunchRush'), { ssr: false });
const Results = dynamic(() => import('@/components/game/Results'));
const PartyGame = dynamic(() => import('@/components/game/PartyGame'), { ssr: false });
const TripGame = dynamic(() => import('@/components/game/TripGame'), { ssr: false });
const FreeExplore = dynamic(() => import('@/components/game/TripGame').then(module => module.FreeExplore), { ssr: false });
const GodMode = dynamic(() => import('@/components/game/GodMode'), {
  ssr: false,
});
export default function Home() {
  const [selected, setSelected] = useState('merly'),
    [age, setAge] = useState(0),
    [setup, setSetup] = useState(false),
    [initialCode, setInitialCode] = useState('');
  const game = useGame();
  const [godMode, setGodMode] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [freeExplore, setFreeExplore] = useState(false);
  const { room, session, solo, busy, error, connected } = game;
  const host = room?.host === session?.playerId;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [room?.phase, setup]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    // Hydrate the selected game from the browser URL after mount.
    // oxlint-disable-next-line react/react-compiler
    if (params.get('play') === 'getai') setGodMode(true);
    if (code) {
      // URL hydration is an external browser-state read.
      // oxlint-disable-next-line react/react-compiler
      setInitialCode(code.toUpperCase());
    }
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context) return;
    const life = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'select_kaki',
            description:
              'Choose a character and age on the visible character selection screen. Does not join or start a game.',
            inputSchema: {
              type: 'object',
              properties: {
                character: {
                  type: 'string',
                  enum: [
                    'merly',
                    'kopi',
                    'pandan',
                    'kueh',
                    'otto',
                    'duri',
                    'chope',
                    'long',
                    'mei',
                    'aisyah',
                    'arun',
                    'daniel',
                  ],
                },
                age: { type: 'integer', minimum: 0, maximum: 2 },
              },
              required: ['character'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              const v = input as { character: string; age?: number };
              if (room || setup)
                throw new Error('Return to character selection first.');
              if (
                ![
                  'merly',
                  'kopi',
                  'pandan',
                  'kueh',
                  'otto',
                  'duri',
                  'chope',
                  'long',
                  'mei',
                  'aisyah',
                  'arun',
                  'daniel',
                ].includes(v.character) ||
                (v.age !== undefined && ![0, 1, 2].includes(v.age))
              )
                throw new Error('Invalid character or life stage.');
              setSelected(v.character);
              setAge(v.age ?? 0);
              return { selected: v.character, age: v.age ?? 0 };
            },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => life.abort();
  }, [room, setup]);
  const leave = () => {
    setGodMode(false);
    game.leave();
    setFreeExplore(false);
    setSetup(false);
  };
  return (
    <main
      className={`game-shell ${!godMode && !room && !freeExplore ? 'lobby-entry' : ''} ${room?.phase === 'board' ? 'board-shell' : ''} ${godMode || freeExplore || (room?.rulesVersion ?? 0) >= 2 ? 'trip-page' : ''}`}
    >
      <div className="world-background" />
      <header className="topbar">
        {room?.phase !== 'board' && (
          <button className="brand" onClick={leave} aria-label="Our Block home">
            <span>
              <House size={23} />
            </span>
            our block
          </button>
        )}
        {!godMode && room && room.phase !== 'lobby' && (
          <div className="round-pill">
            <strong>{room.year}</strong>
            <span />
            Round {room.round} of {room.totalRounds}
          </div>
        )}
        <div className="header-right">

          {!godMode && room && (
            <>
              {!solo && room.phase !== 'lobby' && (
                <span className="room-code-label">{room.code}</span>
              )}
              {!solo && !connected && <output>Reconnecting…</output>}
              <button
                className="room-button leave-icon"
                onClick={leave}
                aria-label="Leave game"
                title="Leave game"
              >
                <ArrowLeft size={20} />
              </button>
            </>
          )}
        </div>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => game.setError('')}>
            <X size={16} />
          </button>
          {!room && session && (
            <button onClick={leave}>Choose a new room</button>
          )}
        </div>
      )}
      {godMode && !assetsReady ? (
        <section className="asset-download-gate">
          <h1>Prepare God mode</h1>
          <AssetDownload ready={assetsReady} onReady={() => setAssetsReady(true)} />
          <button className="secondary" onClick={() => setGodMode(false)}>Back to lobby</button>
        </section>
      ) : godMode ? (
        <GodMode
          character={selected}
          age={age}
          onExit={() => setGodMode(false)}
        />
      ) : freeExplore && !room ? (
        <FreeExplore
          character={selected}
          onExit={() => setFreeExplore(false)}
        />
      ) : !room ? (
        setup ? (
          <RoomSetup
            character={selected}
            age={age}
            busy={busy}
            initialCode={initialCode}
            onBack={() => setSetup(false)}
            onPractice={() => game.practice(selected, age)}
            onConnect={(action, name, code) =>
              void game.connect(action, selected, age, name, code)
            }
          />
        ) : (
          <CharacterPicker
            selected={selected}
            setSelected={setSelected}
            age={age}
            setAge={setAge}
            onReady={() => setSetup(true)}
          />
        )
      ) : room.phase === 'lobby' ? (
        <RoomLobby
          room={room}
          host={!!host}
          busy={busy}
          onGodMode={() => setGodMode(true)}
          assetDownload={<AssetDownload ready={assetsReady} onReady={() => setAssetsReady(true)} />}
          onStart={() => void game.act('board')}
        />
      ) : room.rulesVersion === 3 ? (
        <PartyGame
          room={room}
          playerId={session!.playerId}
          offset={game.offset}
          act={game.act}
          onLeave={leave}
        />
      ) : room.rulesVersion === 2 ? (
        <TripGame
          room={room}
          playerId={session!.playerId}
          offset={game.offset}
          act={game.act}
          onLeave={leave}
        />
      ) : room.phase === 'board' ? (
        <Board
          room={room}
          host={!!host}
          busy={busy}
          playerId={session!.playerId}
          offset={game.offset}
          onRoll={() =>
            void game.act('roll', {
              round: room.round,
              turn: room.boardTurn ?? 0,
            })
          }
          onStart={() => void game.act('start')}
        />
      ) : room.phase === 'playing' ? (
        <LunchRush
          room={room}
          playerId={session!.playerId}
          busy={busy}
          offset={game.offset}
          onServe={(food, step) => game.act('serve', { food, step })}
        />
      ) : (
        <Results
          room={room}
          host={!!host}
          busy={busy}
          onNext={() => void game.act('next')}
          onRestart={() => void game.act('restart')}
          onLeave={leave}
        />
      )}
      {!godMode && !room && !freeExplore && (
        <div className="lobby-other-ways">
          <AssetDownload ready={assetsReady} onReady={() => setAssetsReady(true)} />
          <Link
            className="party-shared-entry"
            href={`/eraser?character=${selected}&age=${age}`}
          >
            Flag Eraser Showdown · two-player desk battle →
          </Link>
          <Link className="party-shared-entry" href="/display">
            Start on a shared screen · use phones as controllers
          </Link>
          <button
            className="free-explore-entry"
            onClick={() => setFreeExplore(true)}
          >
            Just wander · explore Singapore through time →
          </button>
          <button
            className="secondary god-mode-entry"
            onClick={() => setGodMode(true)}
          >
            God mode
          </button>
        </div>
      )}
      {!godMode && !room && !freeExplore && <LobbyBackdrop />}
    </main>
  );
}
