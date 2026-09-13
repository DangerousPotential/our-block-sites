'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import '@/components/game/party.css';
import PartyMinigame from '@/components/game/PartyMinigame';
import { makeRoom, makePlayer, publicRoom, type Room } from '@/lib/game/engine';
import { enableParty } from '@/lib/game/party';
import {
  createMinigame,
  inputMinigame,
  settleMinigame,
} from '@/lib/game/party-games';
import { usePhoneTilt } from '@/hooks/usePhoneTilt';
export default function TehTarikPractice() {
  const room = useRef<Room | null>(null),
    running = useRef(false);
  const [snapshot, setSnapshot] = useState<ReturnType<
      typeof publicRoom
    > | null>(null),
    [done, setDone] = useState(false);
  const [stage, setStage] = useState<'welcome' | 'calibrate' | 'game'>(
      'welcome',
    ),
    [mode, setMode] = useState<'tilt' | 'arrows'>('tilt');
  const tilt = usePhoneTilt();
  useEffect(() => {
    running.current = mode === 'arrows' || tilt.status === 'ready';
  }, [mode, tilt.status]);
  function start(control: 'tilt' | 'arrows') {
    if (control === 'tilt' && tilt.status !== 'ready') return;
    if (control === 'arrows') tilt.disable();
    setMode(control);
    running.current = true;
    const p = makePlayer('You', 'merly', 0),
      r = enableParty(makeRoom('TEAA', p));
    ['Mei', 'Ravi', 'Amir'].forEach((name, index) => {
      const bot = makePlayer(name, 'merly', index + 1);
      bot.bot = true;
      r.players.push(bot);
    });
    r.round = 3;
    r.party!.game = createMinigame(r, Date.now() + 3000);
    r.party!.stage = 'game';
    room.current = r;
    setSnapshot(publicRoom(r, p.id));
    setDone(false);
    setStage('game');
  }
  useEffect(() => {
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        delta = now - last;
      last = now;
      const r = room.current;
      if (!r) return;
      if (!running.current || document.hidden) r.party!.game!.start += delta;
      else settleMinigame(r, now);
      setSnapshot(publicRoom(r, r.players[0].id));
      if (r.party!.game!.tick >= 1050) setDone(true);
    }, 100);
    return () => clearInterval(timer);
  }, []);
  return (
    <main
      className={`teh-practice teh-fullscreen teh-stage-${stage} teh-mode-${mode}`}
    >
      <Link href="/">← Our Block</Link>
      {stage === 'welcome' && (
        <section
          className="teh-welcome"
          aria-label="Welcome to uncle’s tea stall"
        >
          <div className="teh-welcome-art">
            <Image
              width={1536}
              height={1024}
              unoptimized
              src="/api/media?path=assets/party/teh-tarik-stallholder-sprite.png"
              alt="A pixel-art stall uncle welcomes you to his Singapore kopitiam drinks counter"
            />
            <span className="teh-stall-tag">FRESHLY PULLED · JUST FOR YOU</span>
          </div>
          <div className="teh-dialogue">
            <span className="teh-speaker">STALL UNCLE</span>
            <h1>
              Want to drink
              <br />
              teh tarik?
            </h1>
            <p>
              Come, catch a cup. The longer the pull, the fluffier the foam!
            </p>
            <button
              className="primary"
              onClick={() => {
                setStage('calibrate');
                void tilt.enable();
              }}
            >
              Yes, uncle! <span aria-hidden="true">→</span>
            </button>
            <small>Tilt your phone to follow the pour.</small>
          </div>
        </section>
      )}
      {stage === 'calibrate' && (
        <section className="teh-calibration">
          <span className="teh-speaker">FIRST, HOLD YOUR CUP</span>
          <h1>Give your phone a gentle tilt.</h1>
          <p>Compete with 3 computer players for the pour.</p>
          <div className="teh-tilt-test" aria-label="Live phone tilt preview">
            <div
              className="teh-test-cup"
              style={{
                transform: `translate(${tilt.axes.x * 90}px,${tilt.axes.y * 50}px)`,
              }}
            >
              ☕
            </div>
            <span>Move left, right, forward and back</span>
          </div>
          <output>{tilt.message}</output>
          <div className="teh-setup-actions">
            <button
              className="primary"
              disabled={tilt.status !== 'ready'}
              onClick={() => start('tilt')}
            >
              Start pouring
            </button>
            <button
              onClick={() => {
                if (tilt.status === 'ready') tilt.calibrate();
                else void tilt.enable();
              }}
            >
              {tilt.status === 'ready'
                ? 'Set this as centre'
                : 'Retry phone tilt'}
            </button>
          </div>
          <button className="teh-text-button" onClick={() => start('arrows')}>
            Use arrows instead
          </button>
        </section>
      )}
      {stage === 'game' && snapshot && (
        <div className="party-shell">
          <PartyMinigame
            key={snapshot.party!.game!.id}
            room={snapshot}
            playerId={snapshot.players[0].id}
            offset={0}
            externalTilt={mode === 'tilt' ? tilt.axes : { x: 0, y: 0 }}
            act={async (action, payload) => {
              const r = room.current;
              if (
                !r ||
                action !== 'input' ||
                !payload ||
                r.party!.game!.tick >= 1050
              )
                return false;
              inputMinigame(r, r.players[0].id, payload, Date.now());
              return true;
            }}
          />
          {mode === 'tilt' && !done && (
            <div className="teh-sensor-bar">
              <output>
                {tilt.status === 'ready'
                  ? 'Phone tilt on · Hold level to stop'
                  : tilt.message}
              </output>
              <button onClick={tilt.calibrate}>Recalibrate</button>
              <button
                onClick={() => {
                  tilt.disable();
                  setMode('arrows');
                }}
              >
                Use arrows
              </button>
            </div>
          )}
          {done && (
            <section className="teh-result" aria-live="polite">
              <h2>Shiok! Tea is served.</h2>
              <p>
                {Math.floor(
                  snapshot.party!.game!.players[snapshot.players[0].id].teaMl ??
                    0,
                )}{' '}
                ml ·{' '}
                {Math.floor(
                  snapshot.party!.game!.players[snapshot.players[0].id].points,
                )}{' '}
                foam score
              </p>
              <button
                className="primary"
                onClick={() => {
                  room.current = null;
                  setSnapshot(null);
                  setStage('welcome');
                  tilt.disable();
                }}
              >
                Another cup?
              </button>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
