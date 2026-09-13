'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  DoorOpen,
  Smartphone,
  RotateCcw,
  Maximize,
} from 'lucide-react';
import type { RemoteMotion } from '@/lib/game/phone-motion';
import type { PublicRoom } from '@/lib/game/engine';
import { findCharacter } from '@/lib/game/characters';
import {
  climbPlatforms,
  climbLinks,
  climbEraAtHeight,
  FOREST_TOP,
} from '@/lib/game/forest-course';
import {
  DISHES,
  canEnterForestPortal,
  gameDefinition,
  noteLane,
  getaiTimeline,
  getaiPlaybackTime,
  getaiDuration,
  getaiMultiplier,
  type GetaiVoiceSample,
  type GetaiPlayback as Playback,
  orderForParty,
  stepContender,
  type Contender,
  type MinigameState,
} from '@/lib/game/party-games';
import {
  drawClimbBackground,
  drawClimbPlatform,
  drawClimbLink,
  drawClimbHome,
} from './singapore-climb-art';
import DishArt from './DishArt';
import { drawTehTarik, preparePourerSprite } from './teh-tarik-art';
import { tiltAxes, stepTeaArena } from '@/lib/game/teh-tarik';
import TehTarikMeters, { TEA_PLAYER_COLOURS } from './TehTarikMeters';
import GetaiPlayback from './GetaiPlayback';
import GetaiMicrophone from './GetaiMicrophone';
import { loadMinigameArt, drawDish } from './minigame-art';

type Act = (
  action: string,
  payload?: Record<string, unknown>,
) => Promise<boolean>;
type Controls = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpUntil: number;
  tiltX: number;
  tiltY: number;
};
const emptyControls = (): Controls => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  jumpUntil: 0,
  tiltX: 0,
  tiltY: 0,
});
const COLORS = ['#ffd58c', '#8dddd2', '#f2a7c3', '#bcb5ff'];

export default function PartyMinigame({
  room,
  playerId,
  offset,
  act,
  display = false,
  solo = false,
  externalTilt,
  getaiMusic = true,
  remoteMotion,
}: {
  room: PublicRoom;
  playerId?: string;
  offset: number;
  act: Act;
  display?: boolean;
  solo?: boolean;
  externalTilt?: { x: number; y: number };
  getaiMusic?: boolean;
  remoteMotion?: RefObject<RemoteMotion | null>;
}) {
  const g = room.party!.game!,
    definition = gameDefinition(g.kind);
  const controls = useRef(emptyControls());
  const jumpRequests = useRef(0);
  useEffect(() => {
    if (externalTilt) {
      controls.current.tiltX = externalTilt.x;
      controls.current.tiltY = externalTilt.y;
    }
  }, [externalTilt]);
  const musicSample = useRef<Playback | undefined>(undefined);
  const voiceSample = useRef<GetaiVoiceSample | undefined>(undefined);
  const [hit, setHit] = useState({ lane: -1, until: 0 });
  const live = useRef({ room, offset, act });
  const presses = useRef<
    { id: number; value: number | 'portal'; at?: number; time?: number }[]
  >([]);
  const [initialSeq] = useState(() => Date.now());
  const seq = useRef(initialSeq);
  const [now, setNow] = useState(() => Date.now() + offset);
  const [motion, setMotion] = useState(false),
    [motionMessage, setMotionMessage] = useState('');
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);
  useEffect(() => {
    live.current = { room, offset, act };
  }, [room, offset, act]);
  useEffect(() => {
    const timer = setInterval(
      () => setNow(Date.now() + live.current.offset),
      80,
    );
    return () => clearInterval(timer);
  }, []);
  function press(value: number | 'portal') {
    if (typeof value === 'number')
      setHit({ lane: value, until: Date.now() + 180 });
    if (presses.current.length < 4)
      presses.current.push({
        id: ++seq.current,
        value,
        at: Date.now() + live.current.offset,
        time: getaiPlaybackTime(
          live.current.room.party!.game!,
          Date.now() + live.current.offset,
        ),
      });
    navigator.vibrate?.(12);
  }
  useEffect(() => {
    if (display || !playerId) return;
    let sending = false;
    let acknowledgedJump = jumpRequests.current;
    // Snapshot counters so changing games never replays a previous phone action.
    let remoteJump = remoteMotion?.current?.sample.jumpId ?? 0;
    let remotePress = remoteMotion?.current?.sample.pressId ?? 0;
    const release = () => {
      controls.current = emptyControls();
      presses.current = [];
      acknowledgedJump = jumpRequests.current;
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea')) return;
      const mapping: Record<string, keyof Controls> = {
        ArrowLeft: 'left',
        a: 'left',
        ArrowRight: 'right',
        d: 'right',
        ArrowUp: 'up',
        w: 'up',
        ArrowDown: 'down',
        s: 'down',
        ' ': 'jump',
      };
      if (mapping[e.key]) {
        e.preventDefault();
        Object.assign(controls.current, {
          [mapping[e.key]]: e.type === 'keydown',
        });
      }
      if (e.type === 'keydown' && mapping[e.key] === 'jump') {
        controls.current.jumpUntil = Date.now() + 260;
        if (!e.repeat) jumpRequests.current++;
      }
      if (e.type === 'keydown' && !e.repeat) {
        if (['1', '2', '3', '4'].includes(e.key)) press(Number(e.key) - 1);
        if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest('button'))
          presses.current.push({ id: ++seq.current, value: 'portal' });
      }
    };
    const send = async () => {
      if (sending || document.hidden) return;
      sending = true;
      const packet = remoteMotion?.current;
      const phone =
        packet && Date.now() - packet.receivedAt < 600 ? packet.sample : null;
      if (phone && phone.jumpId > remoteJump) {
        controls.current.jumpUntil = Date.now() + 260;
        jumpRequests.current++;
        remoteJump = phone.jumpId;
      }
      if (phone && phone.pressId > remotePress) {
        presses.current.push({ id: ++seq.current, value: phone.press });
        remotePress = phone.pressId;
      }
      const c = controls.current,
        pending = presses.current[0],
        requestedJump = jumpRequests.current;
      const r = live.current.room;
      try {
        const accepted = await live.current.act('input', {
          round: r.round,
          game: r.party!.game!.id,
          seq: (seq.current = Math.max(Date.now(), seq.current + 1)),
          x: Math.max(
            -1,
            Math.min(
              1,
              Number(c.right) - Number(c.left) + (phone?.x ?? c.tiltX),
            ),
          ),
          y: Math.max(
            -1,
            Math.min(1, Number(c.down) - Number(c.up) + (phone?.y ?? c.tiltY)),
          ),
          jump:
            c.jump ||
            requestedJump > acknowledgedJump ||
            c.jumpUntil > Date.now(),
          press: pending?.value,
          pressId: pending?.id,
          pressAt: pending?.at,
          pressTime: pending?.time,
          music: playerId === r.host ? musicSample.current : undefined,
          voice: voiceSample.current,
        });
        if (accepted) acknowledgedJump = requestedJump;
        if (accepted && pending && presses.current[0]?.id === pending.id)
          presses.current.shift();
      } finally {
        sending = false;
      }
    };
    const timer = setInterval(() => void send(), 100);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      clearInterval(timer);
      release();
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', key);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, [g.id, g.kind, playerId, display, remoteMotion]);
  useEffect(() => {
    if (!motion) return;
    let received = false;
    const orient = (e: DeviceOrientationEvent) => {
      if (
        e.beta === null ||
        e.gamma === null ||
        !Number.isFinite(e.beta) ||
        !Number.isFinite(e.gamma) ||
        document.hidden
      )
        return;
      const first = !received;
      received = true;
      baseline.current ??= { beta: e.beta, gamma: e.gamma };
      const axes = tiltAxes(
        e.beta,
        e.gamma,
        baseline.current,
        screen.orientation?.angle ?? 0,
      );
      controls.current.tiltX = axes.x;
      controls.current.tiltY = axes.y;
      if (first) setMotionMessage('Tilt gently to follow the tea trail.');
    };
    const timer = setTimeout(() => {
      if (!received)
        setMotionMessage(
          'No sensor readings yet. Direction buttons still work.',
        );
    }, 3500);
    const reset = () => {
      baseline.current = null;
      controls.current.tiltX = controls.current.tiltY = 0;
    };
    window.addEventListener('orientationchange', reset);
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('deviceorientation', orient);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('orientationchange', reset);
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('deviceorientation', orient);
      controls.current.tiltX = controls.current.tiltY = 0;
    };
  }, [motion]);
  async function enableMotion() {
    if (motion) {
      setMotion(false);
      setMotionMessage('Direction buttons are active. Tilt is off.');
      return;
    }
    if (!window.isSecureContext || !('DeviceOrientationEvent' in window)) {
      setMotionMessage(
        'Tilt needs a supported phone on HTTPS. Use the direction buttons here.',
      );
      return;
    }
    try {
      const sensor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
      };
      if (
        sensor.requestPermission &&
        (await sensor.requestPermission()) !== 'granted'
      ) {
        setMotionMessage(
          'Motion permission was declined. Direction buttons still work.',
        );
        return;
      }
      baseline.current = null;
      setMotion(true);
      setMotionMessage('Hold comfortably, then tilt gently.');
    } catch {
      setMotionMessage('Motion is unavailable. Direction buttons still work.');
    }
  }
  function hold(
    name: string,
    key: 'left' | 'right' | 'up' | 'down' | 'jump',
    content: React.ReactNode,
  ) {
    return (
      <button
        aria-label={name}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          controls.current[key] = true;
          if (key === 'jump') {
            controls.current.jumpUntil = Date.now() + 260;
            jumpRequests.current++;
          }
        }}
        onPointerUp={() => {
          controls.current[key] = false;
        }}
        onPointerCancel={() => {
          controls.current[key] = false;
        }}
        onLostPointerCapture={() => {
          controls.current[key] = false;
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            controls.current[key] = true;
            if (key === 'jump') {
              controls.current.jumpUntil = Date.now() + 260;
              jumpRequests.current++;
            }
          }
        }}
        onKeyUp={() => {
          controls.current[key] = false;
        }}
      >
        {content}
      </button>
    );
  }
  const PLATFORMS = climbPlatforms(g.year);
  const self = playerId ? g.players[playerId] : undefined;
  const scenery = climbEraAtHeight(
    self?.runner.y ??
      Math.max(0, ...Object.values(g.players).map((p) => p.runner.y)),
  );
  const seconds = Math.max(
    0,
    Math.ceil(
      (g.kind === 'rhythm'
        ? getaiDuration(g) - getaiPlaybackTime(g, now)
        : g.start + definition.duration * 1000 - now) / 1000,
    ),
  );
  const countdown = Math.ceil((g.start - now) / 1000);
  const singalong =
    g.kind === 'rhythm' && g.music
      ? getaiTimeline(getaiPlaybackTime(g, now), getaiDuration(g))
      : null;
  return (
    <section
      className={`party-minigame ${g.kind === 'balance' ? 'is-teh' : ''} ${display ? 'is-display' : ''} ${g.kind === 'forest' ? 'is-forest' : g.kind === 'rhythm' ? `is-getai ${getaiMusic ? '' : 'getai-no-songbook'}` : ''}`}
    >
      <header className="party-game-title">
        <div>
          <small>
            {g.kind === 'forest'
              ? `SINGAPORE · ${scenery.year}`
              : g.kind === 'rhythm'
                ? 'SINGAPORE · 歌台之夜'
                : externalTilt
                  ? 'YOU + 3 COMPUTERS'
                  : `GAME ${room.round} / ${room.totalRounds}`}
          </small>
          <h1>{g.kind === 'forest' ? scenery.name : definition.name}</h1>
        </div>
        <div className="party-game-tools">
          <strong>{g.kind === 'rhythm' ? 'Home' : `${seconds}s`}</strong>
          {g.kind === 'forest' && (
            <button
              className="forest-fullscreen"
              aria-label="Toggle fullscreen"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else
                  void document.documentElement
                    .requestFullscreen()
                    .catch(() => {});
              }}
            >
              <Maximize size={16} />
            </button>
          )}
        </div>
      </header>
      {g.kind === 'rhythm' && getaiMusic && (
        <GetaiPlayback
          key={g.id}
          game={g}
          now={now}
          conductor={playerId === room.host && !display}
          sample={musicSample}
        />
      )}
      {g.kind === 'rhythm' && (
        <ol className="getai-standings" aria-label="Live player standings">
          {[...room.players]
            .sort((a, b) => g.players[b.id].points - g.players[a.id].points)
            .map((player, rank) => {
              const contender = g.players[player.id];
              return (
                <li key={player.id} data-self={player.id === playerId}>
                  <span className="getai-rank">{rank + 1}</span>
                  <div>
                    <strong title={player.name}>{player.name}</strong>
                    <small>{contender.streak ?? 0} streak</small>
                  </div>
                  <b className="getai-multiplier">
                    ×{getaiMultiplier(contender.streak)}
                  </b>
                  <span className="getai-score">
                    {Math.floor(contender.points)}
                    <small>pts</small>
                  </span>
                </li>
              );
            })}
        </ol>
      )}
      <GameCanvas
        room={room}
        playerId={playerId}
        offset={offset}
        controls={controls}
        display={display}
      />
      {singalong && singalong.pitStop >= 0 && (
        <aside className="getai-singalong" aria-live="polite">
          <small>MIC CHECK · {singalong.pitStop + 1} / 3</small>
          <h2>
            {
              [
                'Everybody, sing lah!',
                'Louder, back row!',
                'One more, all together!',
              ][singalong.pitStop]
            }
          </h2>
          <p>Everyone on vocals. Don’t be shy.</p>
          {!display && playerId && (
            <GetaiMicrophone
              key={singalong.pitStop}
              pitStop={singalong.pitStop}
              onSample={(value) => {
                voiceSample.current = value;
              }}
            />
          )}
          <div className="getai-singers">
            {room.players.map((player) => {
              const voice = g.players[player.id].voice;
              const current = voice?.pitStop === singalong.pitStop;
              const heard = current && voice.heardMs >= 400;
              const live = current && voice.active && now - voice.at < 700;
              return (
                <span key={player.id} data-heard={heard}>
                  <b>{player.name}</b>
                  <small>
                    {player.bot
                      ? '♪'
                      : heard
                        ? 'Sound detected ✓'
                        : live
                          ? 'Listening…'
                          : 'Mic off'}
                  </small>
                </span>
              );
            })}
          </div>
          <strong>Back to the beat in {singalong.remaining}</strong>
        </aside>
      )}
      {g.kind === 'forest' && (
        <aside className="forest-minimap" aria-label="Course map">
          <span>{scenery.name}</span>
          <svg viewBox="0 0 120 170" aria-hidden="true">
            {PLATFORMS.map((p, i) => (
              <path
                key={i}
                d={`M${60 + (p.x - p.width / 2) * 5},${160 - p.y * 3.7}h${p.width * 5}`}
                stroke="#cba870"
                strokeWidth="2"
              />
            ))}
            {room.players.map((p, i) => (
              <circle
                key={p.id}
                cx={60 + g.players[p.id].runner.x * 5}
                cy={158 - g.players[p.id].runner.y * 3.7}
                r="3"
                fill={COLORS[i]}
                stroke="#fff"
                strokeWidth="0.8"
              />
            ))}
          </svg>
        </aside>
      )}
      {countdown > 0 && (
        <output className="party-countdown">
          {countdown}
          {g.kind !== 'rhythm' && <small>Get ready, kaki</small>}
        </output>
      )}
      {g.kind === 'balance' ? (
        <TehTarikMeters room={room} playerId={playerId} />
      ) : (
        <div className="party-live-scores">
          {room.players.map((p, i) => (
            <span key={p.id} style={{ borderColor: COLORS[i] }}>
              <b>{p.name}</b>{' '}
              {g.players[p.id].finished
                ? 'Home!'
                : g.kind === 'forest'
                  ? `${Math.min(100, Math.floor((g.players[p.id].progress / FOREST_TOP.y) * 100))}%`
                  : `${Math.floor(g.players[p.id].points)} pts`}
            </span>
          ))}
        </div>
      )}
      {!display && self && (
        <div className="party-controller">
          {g.kind === 'balance' && (
            <p className="teh-rules">
              {solo
                ? 'Follow the moving pour. Lower your cup for more foam.'
                : 'Tilt or hold arrows to steer. Bump rivals. Catch lower for up to ×2 foam.'}
            </p>
          )}
          {g.kind === 'forest' && !self.finished && (
            <output className="party-forest-status">
              {canEnterForestPortal(self.runner, g.year)
                ? 'Enter · Home'
                : self.runner.y >= FOREST_TOP.y - 0.1
                  ? 'Land beside the door'
                  : (self.runner.hurtUntil ?? 0) > now
                    ? 'Hard landing · −2 climb points'
                    : self.drops
                      ? `Hard landings ${self.drops} · −${self.drops * 2}`
                      : self.runner.climbing !== undefined
                        ? '↑ ↓ Climb · Space Release'
                        : '← → Move · Space Jump · ↑ ↓ Grab'}
            </output>
          )}
          {self.finished ? (
            <output>Home! Your result is saved. Cheer your kakis on.</output>
          ) : (
            <>
              {g.kind === 'hawker' && (
                <p className="party-order">
                  Order {self.step + 1}:{' '}
                  <strong>
                    {
                      DISHES[
                        orderForParty(
                          g,
                          room.players.findIndex((p) => p.id === playerId),
                          self.step,
                        )
                      ]
                    }
                  </strong>
                </p>
              )}
              {g.kind === 'rhythm' && (
                <p>Hit the gold line · tap or press 1–4</p>
              )}
              {['hawker', 'rhythm'].includes(g.kind) ? (
                <div
                  className={`party-pads ${g.kind === 'hawker' ? 'party-food-pads' : ''}`}
                  aria-disabled={singalong ? singalong.pitStop >= 0 : undefined}
                >
                  {DISHES.map((dish, i) => (
                    <button
                      key={dish}
                      aria-label={g.kind === 'rhythm' ? `Lane ${i + 1}` : dish}
                      disabled={
                        g.kind === 'rhythm' &&
                        (countdown > 0 ||
                          !!g.music?.ended ||
                          !g.music?.playing ||
                          (singalong?.pitStop ?? -1) >= 0)
                      }
                      data-active={
                        g.kind === 'rhythm' &&
                        hit.lane === i &&
                        hit.until > now - offset
                      }
                      style={{ borderColor: COLORS[i] }}
                      onClick={() => press(i)}
                    >
                      {g.kind === 'hawker' ? (
                        <>
                          <DishArt dish={i} />
                          <span>{dish}</span>
                        </>
                      ) : (
                        `${i + 1}`
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="party-directions">
                  {hold('Move left', 'left', <ArrowLeft />)}
                  {hold('Move right', 'right', <ArrowRight />)}
                  {g.kind === 'balance' ? (
                    <>
                      {hold('Move up', 'up', <ArrowUp />)}
                      {hold('Move down', 'down', <ArrowDown />)}
                    </>
                  ) : (
                    hold(
                      'Jump',
                      'jump',
                      <>
                        <ArrowUp /> Jump
                      </>,
                    )
                  )}
                  {g.kind === 'forest' && (
                    <>
                      {hold('Climb up', 'up', <ArrowUp />)}
                      {hold('Climb down', 'down', <ArrowDown />)}
                    </>
                  )}
                  {g.kind === 'forest' && (
                    <button
                      onClick={() => press('portal')}
                      disabled={!canEnterForestPortal(self.runner, g.year)}
                    >
                      <DoorOpen /> Home
                    </button>
                  )}
                </div>
              )}
              {g.kind === 'balance' && !solo && !externalTilt && (
                <>
                  <div className="party-motion">
                    <button onClick={() => void enableMotion()}>
                      <Smartphone size={18} />
                      {motion ? 'Use buttons' : 'Enable phone tilt'}
                    </button>
                    {motion && (
                      <button
                        onClick={() => {
                          baseline.current = null;
                          controls.current.tiltX = controls.current.tiltY = 0;
                          setMotionMessage(
                            'Hold comfortably. This is your new centre.',
                          );
                        }}
                      >
                        <RotateCcw size={18} /> Recalibrate
                      </button>
                    )}
                  </div>
                  <output className="party-motion-status" aria-live="polite">
                    {motionMessage ||
                      'Enable phone tilt to steer your cup. Hold level to stop. Arrows also work.'}
                  </output>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function GameCanvas({
  room,
  playerId,
  offset,
  controls,
  display,
}: {
  room: PublicRoom;
  playerId?: string;
  offset: number;
  controls: RefObject<Controls>;
  display: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    live = useRef({ room, offset });
  useEffect(() => {
    live.current = { room, offset };
  }, [room, offset]);
  const gameId = room.party!.game!.id;
  useEffect(() => {
    const el = canvas.current!,
      ctx = el.getContext('2d')!;
    const atlas = new Image();
    atlas.src = '/api/art?file=party/game-worlds.png';
    const forestBackground = new Image();
    if (live.current.room.party!.game!.kind === 'forest')
      forestBackground.src =
        '/api/media?path=assets/party/singapore-skyways.png';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let propsArt: HTMLCanvasElement | undefined,
      active = true;
    const kind = live.current.room.party!.game!.kind;
    const reactionArt = new Image();
    if (kind === 'rhythm')
      reactionArt.src = '/api/media?path=assets/party/getai-reactions.png';
    const propsFile = kind === 'hawker' ? 'hawker-dishes.png' : undefined;
    if (propsFile)
      void loadMinigameArt(propsFile)
        .then((art) => {
          if (active) propsArt = art;
        })
        .catch(() => {
          /* Existing labels and controls remain playable if art fails. */
        });
    const outcomes = new Map<
      string,
      {
        points: number;
        drops: number;
        step: number;
        until: number;
        text: string;
      }
    >();
    const teaArt = new Image();
    const teaPourer = new Image();
    let teaPourerArt: HTMLCanvasElement | undefined;
    teaPourer.onload = () => {
      teaPourerArt = preparePourerSprite(teaPourer);
    };
    if (kind === 'balance') {
      teaArt.src = '/api/media?path=assets/party/teh-tarik-empty-stall.png';
      teaPourer.src = '/api/media?path=assets/party/teh-tarik-close-pourer.png';
    }
    const pets = new Image();
    pets.src = '/api/media?path=assets/pets.png';
    const people = new Image();
    people.src = '/api/media?path=assets/neighbours.png';
    let frame = 0,
      last = performance.now(),
      tick = -1,
      prediction: Contender | undefined,
      teaPrediction: MinigameState | undefined,
      forestFollow: number | undefined;
    const panel = (n: number, x: number, y: number, w: number, h: number) => {
      if (!atlas.complete || !atlas.naturalWidth) return;
      const cellW = atlas.width / 2,
        cellH = atlas.height / 3;
      const fit = Math.max(w / cellW, h / cellH),
        cropW = w / fit,
        cropH = h / fit;
      ctx.drawImage(
        atlas,
        (n % 2) * cellW + (cellW - cropW) / 2,
        Math.floor(n / 2) * cellH + (cellH - cropH) / 2,
        cropW,
        cropH,
        x,
        y,
        w,
        h,
      );
    };
    const label = (
      text: string,
      x: number,
      y: number,
      size = 14,
      color = '#fff7df',
    ) => {
      ctx.font = `700 ${size}px system-ui`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
    };
    const draw = (time: number) => {
      const r = live.current.room,
        g = r.party!.game!,
        now = Date.now() + live.current.offset;
      const dt = Math.min(0.04, (time - last) / 1000);
      last = time;
      if (playerId && (tick !== g.tick || !prediction)) {
        if (g.kind === 'balance') {
          teaPrediction = structuredClone(g);
          prediction = teaPrediction.players[playerId];
        } else prediction = structuredClone(g.players[playerId]);
        tick = g.tick;
      }
      if (
        prediction &&
        now >= g.start &&
        now < g.start + gameDefinition(g.kind).duration * 1000
      ) {
        const c = controls.current;

        prediction.axisX = Math.max(
          -1,
          Math.min(1, Number(c.right) - Number(c.left) + c.tiltX),
        );
        prediction.axisY = Math.max(
          -1,
          Math.min(1, Number(c.down) - Number(c.up) + c.tiltY),
        );
        prediction.jump = c.jump || c.jumpUntil > Date.now();
        if (g.kind === 'balance' && teaPrediction) {
          for (const cup of Object.values(teaPrediction.players))
            stepContender(teaPrediction, cup, now, dt);
          stepTeaArena(teaPrediction, now, dt);
        } else stepContender(g, prediction, now, dt);
      }
      const rect = el.getBoundingClientRect(),
        w = rect.width,
        h = rect.height,
        dpr = Math.min(devicePixelRatio, 1.5);
      if (
        el.width !== Math.round(w * dpr) ||
        el.height !== Math.round(h * dpr)
      ) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (g.kind !== 'rhythm') {
        ctx.fillStyle = '#193332';
        ctx.fillRect(0, 0, w, h);
      }
      if (g.kind !== 'forest' && g.kind !== 'rhythm')
        panel(gameDefinition(g.kind).panel, 0, 0, w, h);
      const sprite = (i: number, x: number, y: number, size: number) => {
        const p = r.players[i],
          c = findCharacter(p.character),
          img = c.kind === 'pet' ? pets : people,
          rows = c.kind === 'pet' ? 2 : 3,
          row = c.kind === 'pet' ? c.row : p.age;
        if (img.complete && img.naturalWidth)
          ctx.drawImage(
            img,
            (c.column * img.width) / 4,
            (row * img.height) / rows,
            img.width / 4,
            img.height / rows,
            x - size / 2,
            y - size * 1.2,
            size,
            size * 1.2,
          );
        if (g.kind !== 'rhythm') {
          ctx.fillStyle = '#152c2edd';
          ctx.fillRect(x - 42, y - size * 1.2 - 23, 84, 20);
          label(p.name, x, y - size * 1.2 - 9, 11, COLORS[i]);
        }
      };
      const state = (id: string) =>
        id === playerId && prediction ? prediction : g.players[id];
      const outcome = (id: string) => {
        const current = g.players[id],
          previous = outcomes.get(id);
        let text = previous?.text ?? '',
          until = previous?.until ?? 0;
        if (previous && current.drops > previous.drops) {
          text =
            g.kind === 'balance'
              ? 'Missed tea! Follow the stream'
              : 'Bumped! Keep going';
          until = now + 900;
        } else if (
          previous &&
          (g.kind === 'hawker' || g.kind === 'rhythm') &&
          (current.points !== previous.points || current.step !== previous.step)
        ) {
          const delta = current.points - previous.points;
          text =
            delta > 0
              ? `${g.kind === 'hawker' ? 'Served' : 'Nice'}! +${delta}`
              : 'Try again';
          until = now + 650;
        }
        outcomes.set(id, {
          points: current.points,
          drops: current.drops,
          step: current.step,
          text,
          until,
        });
        return until > now ? text : '';
      };
      const feedback = (
        text: string,
        x: number,
        y: number,
        colour = '#fff2c8',
      ) => {
        if (!text) return;
        ctx.fillStyle = '#173034ed';
        const width = text.length * 7 + 20;
        ctx.fillRect(x - width / 2, y - 17, width, 25);
        label(text, x, y, 12, colour);
      };
      if (g.kind === 'forest') {
        const PLATFORMS = climbPlatforms(g.year);
        const top = PLATFORMS.at(-1)!;
        const scale = display
            ? Math.min(w / 20, h / (FOREST_TOP.y + 7))
            : Math.min(w / 22, h / 19),
          target = display
            ? FOREST_TOP.y / 2
            : Math.max(
                4,
                Math.min(FOREST_TOP.y - 2, prediction?.runner.y ?? 4),
              );
        forestFollow ??= target;
        forestFollow = reducedMotion.matches
          ? target
          : forestFollow + (target - forestFollow) * (1 - Math.exp(-dt * 8));
        const follow = forestFollow;
        const sceneryHeight = display
          ? Math.max(0, ...Object.values(g.players).map((p) => p.runner.y))
          : follow;
        drawClimbBackground(ctx, forestBackground, w, h, sceneryHeight);
        const sx = (x: number) => w / 2 + x * scale,
          sy = (y: number) =>
            h * (display ? 0.53 : 0.62) - (y - follow) * scale;
        for (const link of climbLinks(g.year))
          drawClimbLink(
            ctx,
            sx(link.x),
            sy(link.top),
            sy(link.bottom),
            scale,
            link.kind,
          );
        for (const [i, p] of PLATFORMS.entries()) {
          const x = sx(p.x - p.width / 2),
            y = sy(p.y),
            width = p.width * scale;
          if (y < -60 || y > h + 60) continue;
          drawClimbPlatform(
            ctx,
            x,
            y,
            width,
            scale,
            climbEraAtHeight(p.y).year,
            i,
          );
          if (i === PLATFORMS.length - 1) {
            drawClimbHome(ctx, sx(p.x), y, scale);
            label('HOME', sx(p.x), y - scale * 2.5, 11);
          }
        }
        r.players.forEach((p, i) => {
          const s = state(p.id);
          if (s.finished) {
            if (display)
              label(
                `${p.name} · Home!`,
                sx(top.x) + scale * 4,
                sy(FOREST_TOP.y) - scale * (2.6 - i * 0.65),
                11,
                COLORS[i],
              );
          } else
            sprite(
              i,
              sx(s.runner.x),
              sy(s.runner.y),
              Math.max(24, scale * 1.05),
            );
        });
      } else if (g.kind === 'balance') {
        drawTehTarik(ctx, {
          width: w,
          height: h,
          game: teaPrediction ?? g,
          now,
          players: r.players.map((p, i) => ({
            id: p.id,
            name: p.name,
            colour: TEA_PLAYER_COLOURS[i % 4],
          })),
          self: playerId,
          image: teaArt,
          pourer: teaPourerArt,
          reducedMotion: reducedMotion.matches,
        });
      } else if (g.kind === 'hawker') {
        const shown = display
          ? r.players
          : r.players.filter((p) => p.id === playerId);
        shown.forEach((p, column) => {
          const i = r.players.findIndex((player) => player.id === p.id);
          const s = state(p.id),
            x = (w * (column + 1)) / (shown.length + 1);
          sprite(i, x, h * 0.6, Math.min(80, w / 7));
          ctx.fillStyle = '#fff7e9';
          ctx.fillRect(x - 70, h * 0.16, 140, 76);
          label(`ORDER ${s.step + 1}`, x, h * 0.16 + 20, 11, '#706855');
          label(
            DISHES[orderForParty(g, i, s.step)],
            x,
            h * 0.16 + 46,
            16,
            '#2b3540',
          );
          if (propsArt)
            drawDish(
              ctx,
              propsArt,
              orderForParty(g, i, s.step),
              x,
              h * 0.96,
              Math.min(200, (w / shown.length) * 0.72, h * 0.46),
            );
          feedback(outcome(p.id), x, h * 0.96);
        });
      } else {
        const laneWidth = Math.min(w * 0.76, 560),
          left = (w - laneWidth) / 2,
          pad = laneWidth / 4,
          line = h - 56,
          timeline = getaiTimeline(getaiPlaybackTime(g, now), getaiDuration(g)),
          elapsed = timeline.elapsed,
          ended = !!g.music?.ended;
        const shade = ctx.createLinearGradient(0, 0, 0, h);
        shade.addColorStop(0, '#08162200');
        shade.addColorStop(1, '#081622b8');
        ctx.fillStyle = shade;
        ctx.fillRect(left - 12, 0, laneWidth + 24, h);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#ffffff06' : '#ffffff0d';
          ctx.fillRect(left + i * pad + 2, 0, pad - 4, h);
          if (display) {
            ctx.strokeStyle = COLORS[i];
            ctx.lineWidth = 2;
            ctx.strokeRect(left + i * pad + 4, line - 30, pad - 8, 60);
            label(
              `${i + 1}`,
              left + i * pad + pad / 2,
              line + 7,
              20,
              COLORS[i],
            );
          }
        }
        r.players.forEach((p, i) => {
          const t = reducedMotion.matches
            ? i
            : Math.max(0, now - g.start) / 1000;
          const x = w * (0.5 + Math.sin(t * 0.19 + i * 2.4) * 0.39);
          const y = h * (0.44 + Math.sin(t * 0.27 + i * 1.7) * 0.22);
          const size = Math.min(100, Math.max(58, w / 12));
          sprite(i, x, y, size);
          const reaction = g.players[p.id].reaction;
          const age = reaction ? now - reaction.at : Infinity;
          if (
            reaction &&
            age >= 0 &&
            age < 1500 &&
            !ended &&
            timeline.pitStop < 0
          ) {
            const bubbleSize = Math.min(174, Math.max(122, w * 0.14));
            const bx = Math.max(
              bubbleSize / 2 + 8,
              Math.min(w - bubbleSize / 2 - 8, x),
            );
            const by = Math.max(
              bubbleSize / 2 + 8,
              y - size * 1.2 - bubbleSize * 0.42,
            );
            ctx.save();
            ctx.globalAlpha = Math.min(1, (1500 - age) / 300);
            ctx.translate(bx, by - (reducedMotion.matches ? 0 : age / 120));
            const pop = reducedMotion.matches
              ? 1
              : Math.min(1, 0.75 + age / 480);
            ctx.scale(pop, pop);
            if (reactionArt.complete && reactionArt.naturalWidth) {
              const cellW = reactionArt.width / 2,
                cellH = reactionArt.height / 2;
              ctx.drawImage(
                reactionArt,
                (reaction.sticker % 2) * cellW,
                Math.floor(reaction.sticker / 2) * cellH,
                cellW,
                cellH,
                -bubbleSize / 2,
                -bubbleSize / 2,
                bubbleSize,
                bubbleSize,
              );
            } else {
              feedback(
                ['Shiok lah', 'Onz', 'Can or not?', 'Alamak'][reaction.sticker],
                0,
                0,
              );
            }
            ctx.restore();
          }
        });
        if (!ended && timeline.pitStop < 0)
          for (
            let beat = Math.max(1, Math.floor(elapsed / 700) - 1);
            beat < Math.floor(elapsed / 700) + 5;
            beat++
          ) {
            if (
              beat * 700 >=
              getaiTimeline(getaiDuration(g), getaiDuration(g)).elapsed
            )
              continue;
            const lane = noteLane(g, beat),
              y = line - ((beat * 700 - elapsed) * h) / 2400;
            if (y < -40 || y > h) continue;
            if (playerId && g.players[playerId]?.lastBeat === beat) continue;
            ctx.fillStyle = COLORS[lane];
            ctx.shadowColor = COLORS[lane];
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.roundRect(
              left + lane * pad + pad * 0.16,
              y - 10,
              pad * 0.68,
              20,
              7,
            );
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff88';
            ctx.fillRect(left + lane * pad + pad * 0.23, y - 6, pad * 0.54, 2);
          }
        if (ended) {
          ctx.fillStyle = '#081622b8';
          ctx.fillRect(left - 12, h * 0.3, laneWidth + 24, 116);
          label('Shiok, encore?', w / 2, h * 0.3 + 47, Math.min(30, w / 15));
          label('Your score is in.', w / 2, h * 0.3 + 80, 14, '#d7bd97');
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      active = false;
      propsArt = undefined;
    };
  }, [gameId, playerId, display, controls]);
  return (
    <canvas
      ref={canvas}
      className="party-canvas"
      aria-label={`${gameDefinition(room.party!.game!.kind).name} live game view`}
    />
  );
}
