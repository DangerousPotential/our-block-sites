'use client';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Play } from 'lucide-react';
import { GETAI_SONGS } from '@/lib/game/getai-songs';
import {
  getaiPlaybackTime,
  type GetaiPlayback as Playback,
  type MinigameState,
} from '@/lib/game/party-games';

type Player = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  destroy(): void;
};
type YouTube = {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => Player;
};
let api: Promise<YouTube> | undefined;
function loadPlayer() {
  const scope = window as typeof window & {
    YT?: YouTube;
    onYouTubeIframeAPIReady?: () => void;
  };
  if (scope.YT?.Player) return Promise.resolve(scope.YT);
  api ??= new Promise<YouTube>((resolve, reject) => {
    const previous = scope.onYouTubeIframeAPIReady;
    scope.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(scope.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      api = undefined;
      script.remove();
      reject(new Error('Music unavailable'));
    };
    document.head.appendChild(script);
  });
  return api;
}

export default function GetaiPlayback({
  game,
  now,
  conductor,
  sample,
}: {
  game: MinigameState;
  now: number;
  conductor: boolean;
  sample: RefObject<Playback | undefined>;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(false);
  const current = useEffectEvent(() => ({ game, now, conductor }));
  useEffect(() => {
    let disposed = false;
    let ready = false;
    let started = false;
    let sequence = Date.now();
    const report = (ended = false) => {
      const p = player.current;
      if (!p || !ready || !current().conductor) return;
      const duration = p.getDuration();
      if (!duration) return;
      sample.current = {
        position: ended ? duration : p.getCurrentTime(),
        duration,
        playing: p.getPlayerState() === 1,
        ended,
        seq: ++sequence,
        at: Date.now(),
      };
    };
    const update = () => {
      const p = player.current;
      if (!p || !ready) return;
      const state = current();
      if (state.now < state.game.start) return;
      if (!started) {
        started = true;
        p.playVideo();
      }
      if (state.conductor) report(p.getPlayerState() === 0);
      else if (state.game.music) {
        const music = state.game.music;
        const target =
          GETAI_SONGS[0].startSeconds +
          getaiPlaybackTime(state.game, state.now) / 1000;
        if (Math.abs(p.getCurrentTime() - target) > 1.5) p.seekTo(target, true);
        if (music.playing && !music.ended && p.getPlayerState() !== 1)
          p.playVideo();
        if ((!music.playing || music.ended) && p.getPlayerState() === 1)
          p.pauseVideo();
      }
    };
    void loadPlayer()
      .then((YT) => {
        if (disposed || !mount.current) return;
        const element = document.createElement('div');
        mount.current.replaceChildren(element);
        player.current = new YT.Player(element, {
          width: '100%',
          height: '100%',
          videoId: GETAI_SONGS[0].video,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            start: GETAI_SONGS[0].startSeconds,
            rel: 0,
            cc_load_policy: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              ready = true;
              if (!current().conductor) player.current?.mute();
              update();
            },
            onStateChange: (event: { data: number }) => {
              if (disposed) return;
              if (event.data === 1) setBlocked(false);
              report(event.data === 0);
            },
            onAutoplayBlocked: () => {
              if (!disposed) setBlocked(true);
            },
            onError: () => {
              if (!disposed) {
                report();
                setError(true);
              }
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    const timer = window.setInterval(update, 250);
    return () => {
      disposed = true;
      clearInterval(timer);
      player.current?.destroy();
      player.current = null;
      sample.current = undefined;
    };
  }, [game.id, sample]);
  return (
    <>
      <div className="getai-video" ref={mount} aria-hidden="true" inert />
      {error ? (
        <div className="getai-playback-notice">
          Music couldn’t load.{' '}
          <button onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : blocked ? (
        <button
          className="getai-playback-notice"
          onClick={() => {
            player.current?.playVideo();
          }}
        >
          <Play size={20} /> Play Home
        </button>
      ) : null}
    </>
  );
}
