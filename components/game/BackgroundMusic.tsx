'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { secretTracks, type SecretTrack } from '@/lib/game/secretMusic';
import { AMBIENCE, isEra } from '@/lib/game/ambience';
import type { EraId } from '@/lib/game/worlds';

const tracks = [
  { title: 'Sneaky Snitch', file: 'sneaky-snitch.mp3', isrc: 'USUAN1100772' },
  {
    title: 'Fluffing a Duck',
    file: 'fluffing-a-duck.mp3',
    isrc: 'USUAN1100768',
  },
];
const preferenceKey = 'our-block.music';
type Preference = 'auto' | 'on' | 'off';

export default function BackgroundMusic({
  racing,
  guest,
  secret,
  onResetSecret,
  historicalEra,
  featuredTrack,
}: {
  historicalEra?: boolean;
  featuredTrack?: SecretTrack;
  racing: boolean;
  guest: boolean;
  secret: { track: SecretTrack; sequence: number } | null;
  onResetSecret: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const unlocked = useRef(false);
  const [preference, setPreference] = useState<Preference>('auto');
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [era, setEra] = useState<EraId | 'fair' | null>(null);
  const [volume, setVolume] = useState(0.2);
  useEffect(() => {
    const change = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail;
      setEra(value === 'fair' ? 'fair' : isEra(value) ? value : null);
    };
    window.addEventListener('our-block:era', change);
    return () => window.removeEventListener('our-block:era', change);
  }, []);
  const track = tracks[racing ? 1 : 0];
  const requested = featuredTrack
    ? secretTracks[featuredTrack]
    : secret
      ? secretTracks[secret.track]
      : null;
  const eraTrack = !racing && era ? era : null;
  const source =
    requested?.src ??
    (historicalEra
      ? '/api/media?path=audio/pastimes/rasa-sayang.ogg'
      : eraTrack
        ? `/api/media?path=audio/eras/${eraTrack}.wav`
        : `/api/media?path=audio/${track.file}`);
  const title = requested?.src
    ? featuredTrack === 'ellinia'
      ? 'When the Morning Comes'
      : requested.title
    : historicalEra
      ? 'Rasa Sayang'
      : eraTrack
        ? eraTrack === 'fair'
          ? 'Lanterns at the fair'
          : AMBIENCE[eraTrack].label
        : track.title;
  const wanted = preference === 'on' || (preference === 'auto' && !guest);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      // Hydrate the external browser preference after mount.
      // oxlint-disable-next-line react/react-compiler
      if (saved === 'on' || saved === 'off') setPreference(saved);
    } catch {
      /* Playback still works when storage is unavailable. */
    }
  }, []);

  useEffect(() => {
    if (secret) audio.current!.currentTime = 0;
  }, [secret]);

  useEffect(() => {
    const element = audio.current!;
    element.volume = volume;
    let disposed = false;
    const start = () => {
      if (!wanted || document.hidden) return;
      void element.play().catch((error: unknown) => {
        if (
          !disposed &&
          error instanceof DOMException &&
          error.name !== 'NotAllowedError' &&
          error.name !== 'AbortError'
        )
          setFailed(true);
      });
    };
    const gesture = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-music-controls]')
      )
        return;
      unlocked.current = true;
      start();
    };
    const visibility = () => {
      if (document.hidden) element.pause();
      else if (unlocked.current) start();
    };
    if (!wanted) element.pause();
    else if (unlocked.current) start();
    document.addEventListener('pointerdown', gesture);
    document.addEventListener('keydown', gesture);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      element.pause();
      document.removeEventListener('pointerdown', gesture);
      document.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [wanted, source, secret, volume]);

  function toggle() {
    const element = audio.current!;
    const next = playing ? 'off' : 'on';
    setPreference(next);
    try {
      localStorage.setItem(preferenceKey, next);
    } catch {
      /* Optional persistence. */
    }
    if (next === 'off') element.pause();
    else {
      unlocked.current = true;
      setFailed(false);
      if (element.error) element.load();
      // Call play directly in the gesture for mobile autoplay policies.
      void element.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          setFailed(true);
      });
    }
  }

  return (
    <div className="music-controls" data-music-controls>
      {/* Optional background song; no game instructions are conveyed through audio. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audio}
        src={source}
        loop
        preload="none"
        onPlay={() => {
          setPlaying(true);
          setFailed(false);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
      <button
        className="music-toggle"
        onClick={toggle}
        aria-label={playing ? 'Mute music' : 'Play music'}
        title={playing ? 'Mute music' : 'Play music'}
        aria-pressed={playing}
      >
        {playing ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </button>
      <details className="music-credits">
        <summary aria-label="Music credits">Music</summary>
        <div className="music-popover">
          <label>
            Music volume{' '}
            <input
              aria-label="Music volume"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <strong>
            {failed ? 'Music unavailable' : playing ? title : 'Music paused'}
          </strong>
          {requested && featuredTrack && (
            <a href="/api/media?path=audio/MAPLE-CREDITS.txt" target="_blank" rel="noreferrer">
              Music credits ↗
            </a>
          )}
          {requested && !featuredTrack && (
            <>
              <span>MapleStory · NEXON / Wizet</span>
              <a
                href="https://maplestory.nexon.com/Media/Music"
                target="_blank"
                rel="noreferrer"
              >
                MapleStory music ↗
              </a>
              <a
                href="/api/media?path=audio/MAPLE-CREDITS.txt"
                target="_blank"
                rel="noreferrer"
              >
                MapleStory credits
              </a>
              {!featuredTrack && (
                <button className="text-button" onClick={onResetSecret}>
                  Return to game music
                </button>
              )}
            </>
          )}
          {historicalEra && !requested && (
            <>
              <span>Rasa Sayang · traditional folk song</span>
              <span>Syntax Media · CC0 · 2016 rendition</span>
              <span>A song heard in the 1959 film Rasa Sayang Eh.</span>
              <a
                href="/api/media?path=audio/pastimes/CREDITS.txt"
                target="_blank"
                rel="noreferrer"
              >
                Song source &amp; credits ↗
              </a>
            </>
          )}
          {eraTrack && !historicalEra && !requested && (
            <>
              <span>
                Original Our Block instrumental ·{' '}
                {eraTrack === 'fair'
                  ? 'Lanterns at the fair'
                  : AMBIENCE[eraTrack].label}
              </span>
              <span>Stylised era mood, not a historical recording.</span>
              <a
                href="/api/media?path=audio/eras/CREDITS.txt"
                target="_blank"
                rel="noreferrer"
              >
                Era soundtrack credits ↗
              </a>
              <a
                href="https://en.mapletree.com.sg/newsroom/the-teng-company-with-support-from-mapletree-releases-first-ever-ndp-medley-music-video-featuring-32-theme-songs/"
                target="_blank"
                rel="noreferrer"
              >
                Listen separately: TENG’s Singapore song medley ↗
              </a>
            </>
          )}
          {!historicalEra && !requested && (
            <>
              <span>Lobby / race music · Kevin MacLeod</span>
              <a href="/api/media?path=audio/CREDITS.txt" target="_blank" rel="noreferrer">
                Credits &amp; audio changes
              </a>
              {tracks.map((item) => (
                <a
                  key={item.isrc}
                  target="_blank"
                  rel="noreferrer"
                  href={`https://incompetech.com/music/royalty-free/index.html?isrc=${item.isrc}`}
                >
                  {item.title} ↗
                </a>
              ))}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
