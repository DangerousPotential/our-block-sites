'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyMotion,
  motionRequest,
  type PhoneCommand,
  type PhoneScreen,
} from '@/lib/game/phone-motion';
import { MINIGAMES } from '@/lib/game/party-games';
import { ACTIVITIES, type ActivityId } from '@/lib/game/activities';
import { EXPLORATION_ERAS, PASTIMES_1950S } from '@/lib/game/pastimes1950s';
import '@/components/game/party.css';
import '@/components/game/trip.css';
import '@/components/game/god-mode.css';

const PartyMinigame = dynamic(() => import('@/components/game/PartyMinigame'), {
  ssr: false,
});
const NeighbourhoodVisit = dynamic(
  () => import('@/components/game/NeighbourhoodVisit'),
  { ssr: false },
);
const PastimeEncounter = dynamic(
  () => import('@/components/game/PastimeEncounter'),
  { ssr: false },
);
const EraserGame = dynamic(() => import('@/components/game/EraserGame'), {
  ssr: false,
});
type Pending = { command: PhoneCommand; resolve: (ok: boolean) => void };
export default function PhoneController() {
  const sample = useRef(emptyMotion());
  const pending = useRef<Pending | null>(null);
  const [initialSequence] = useState(() => Date.now());
  const sequence = useRef(initialSequence);
  const scene = useRef('');
  const online = useRef(false);
  const [screen, setScreen] = useState<PhoneScreen>();
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Connecting…');
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    const id = params.get('id'),
      token = params.get('token');
    if (!id || !token) {
      queueMicrotask(() =>
        setMessage('Scan the phone QR code on your computer.'),
      );
      return;
    }
    let stopped = false;
    let lastReply = 0;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    const release = () => {
      sample.current = emptyMotion();
      pending.current?.resolve(false);
      pending.current = null;
    };
    const status = (value: boolean) => {
      online.current = value;
      setConnected(value);
    };
    const watchdog = setInterval(() => {
      if (Date.now() - lastReply > 1200) {
        status(false);
        release();
      }
    }, 300);
    async function poll() {
      if (stopped) return;
      if (!document.hidden) {
        try {
          const sentAt = Date.now();
          const data = await motionRequest<{
            screen?: PhoneScreen;
            ack: number;
            age: number | null;
            serverNow: number;
          }>(
            {
              action: 'sample',
              id,
              sample: sample.current,
              command: pending.current?.command,
            },
            token!,
            abort.signal,
          );
          if (stopped) return;
          lastReply = Date.now();
          const fresh = data.age !== null && data.age < 1200;
          status(fresh);
          setMessage(fresh ? 'Connected' : 'Waiting for your computer…');
          setOffset(
            (data.screen?.now !== undefined
              ? data.screen.now + (data.age ?? 0)
              : data.serverNow) -
              (sentAt + Date.now()) / 2,
          );
          if (pending.current && data.ack >= pending.current.command.id) {
            pending.current.resolve(true);
            pending.current = null;
          }
          if (data.screen) {
            if (scene.current !== data.screen.id) {
              release();
              scene.current = data.screen.id;
            }
            setScreen(data.screen);
          }
        } catch (error) {
          if (stopped) return;
          status(false);
          release();
          setMessage(error instanceof Error ? error.message : 'Reconnecting…');
        }
      }
      if (!stopped) timer = setTimeout(poll, 80);
    }
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    void poll();
    return () => {
      stopped = true;
      abort.abort();
      clearTimeout(timer);
      clearInterval(watchdog);
      release();
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, []);
  const act = useCallback(
    (
      action: string,
      payload: Record<string, unknown> = {},
    ): Promise<boolean> => {
      if (!online.current || !scene.current) return Promise.resolve(false);
      // Continuous input waits for acknowledgement; navigation may replace it.
      if (pending.current) {
        if (action === 'input') return Promise.resolve(false);
        pending.current.resolve(false);
      }
      return new Promise((resolve) => {
        pending.current = {
          command: {
            id: ++sequence.current,
            scene: scene.current,
            action: action as PhoneCommand['action'],
            payload,
          },
          resolve,
        };
      });
    },
    [],
  );
  const hold = (label: string, x: number, y: number) => (
    <button
      aria-label={
        x < 0
          ? 'Walk left'
          : x > 0
            ? 'Walk right'
            : y < 0
              ? 'Walk forward'
              : 'Walk back'
      }
      disabled={!connected}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        sample.current.x = x;
        sample.current.y = y;
      }}
      onPointerUp={() => {
        sample.current.x = sample.current.y = 0;
      }}
      onPointerCancel={() => {
        sample.current.x = sample.current.y = 0;
      }}
      onLostPointerCapture={() => {
        sample.current.x = sample.current.y = 0;
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          sample.current.x = x;
          sample.current.y = y;
        }
      }}
      onKeyUp={() => {
        sample.current.x = sample.current.y = 0;
      }}
    >
      {label}
    </button>
  );
  return (
    <main className="phone-play">
      <nav className="phone-play-nav" aria-label="Phone controls">
        <output>{message}</output>
        {screen && (
          <>
            <button
              disabled={!connected}
              onClick={() => void act('navigate', { destination: 'explore' })}
            >
              World
            </button>
            <button disabled={!connected} onClick={() => void act('restart')}>
              Restart
            </button>
          </>
        )}
      </nav>
      {screen && (
        <div key={screen.id} className="phone-play-scene" inert={!connected}>
          {screen.room?.party?.game ? (
            <PartyMinigame
              room={screen.room}
              playerId={screen.playerId}
              offset={offset}
              act={act}
            />
          ) : screen.room?.eraser ? (
            <EraserGame
              embedded
              controller={{ screen, offset, connected, act }}
            />
          ) : screen.destination.startsWith('activity:') && screen.activity ? (
            <NeighbourhoodVisit
              id={screen.destination.split(':')[1] as ActivityId}
              character={screen.character}
              age={screen.age}
              controller={{ state: screen.activity, act }}
              onClose={() => void act('navigate', { destination: 'explore' })}
            />
          ) : screen.destination.startsWith('pastime:') ? (
            <PastimeEncounter
              attraction={
                PASTIMES_1950S[Number(screen.destination.split(':')[1])]
              }
              controller={{ answer: screen.answer ?? null, act }}
              onClose={() => void act('navigate', { destination: 'explore' })}
            />
          ) : (
            <section className="phone-controller">
              <h1>
                {EXPLORATION_ERAS.find((e) => e.id === screen.era)?.name ??
                  'Our Block'}
              </h1>
              <p>Walk around on the big screen.</p>
              <div className="phone-walk" aria-label="Walk around">
                {hold('↑', 0, -1)}
                {hold('←', -1, 0)}
                {hold('↓', 0, 1)}
                {hold('→', 1, 0)}
              </div>
              <label>
                Era
                <select
                  aria-label="World era"
                  value={screen.era}
                  onChange={(e) =>
                    void act('navigate', {
                      era: e.target.value,
                      destination: 'explore',
                    })
                  }
                >
                  {EXPLORATION_ERAS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.year} · {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="phone-game-list">
                {MINIGAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() =>
                      void act('navigate', { destination: `game:${g.id}` })
                    }
                  >
                    {g.name}
                  </button>
                ))}
                <button
                  onClick={() =>
                    void act('navigate', { destination: 'game:eraser' })
                  }
                >
                  Flag Eraser Showdown
                </button>
              </div>
              <details>
                <summary>Around the block</summary>
                <div className="phone-game-list">
                  {Object.entries(ACTIVITIES).map(([id, activity]) => (
                    <button
                      key={id}
                      onClick={() =>
                        void act('navigate', { destination: `activity:${id}` })
                      }
                    >
                      {activity.title}
                    </button>
                  ))}
                  {PASTIMES_1950S.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        void act('navigate', { destination: `pastime:${i}` })
                      }
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </details>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
