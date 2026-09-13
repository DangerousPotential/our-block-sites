'use client';
import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useState,
  type RefObject,
} from 'react';
import { Music2, Play, X, ExternalLink } from 'lucide-react';
import {
  GETAI_SONGS,
  type GetaiSongId,
} from '@/lib/game/getai-songs';

export type GetaiMusicHandle = { play: () => void };

export default function GetaiSongbook({
  initialSong = 'home',
  musicRef,
  autoStart = false,
  compact = false,
}: {
  initialSong?: GetaiSongId;
  musicRef?: RefObject<GetaiMusicHandle | null>;
  autoStart?: boolean;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<GetaiSongId>(initialSong);
  const [opened, setOpened] = useState(false);
  const play = () => setOpened(true);
  useImperativeHandle(musicRef, () => ({ play }));
  const startAutomatically = useEffectEvent(() => play());
  useEffect(() => {
    if (!autoStart) {
      const stop = window.setTimeout(() => setOpened(false), 0);
      return () => window.clearTimeout(stop);
    }
    // Playback is also retried by the visible play control if autoplay is blocked.
    const start = () => startAutomatically();
    const timer = window.setTimeout(start, 0);
    return () => window.clearTimeout(timer);
  }, [autoStart]);
  const song = GETAI_SONGS.find((entry) => entry.id === selected)!;
  const startSeconds = 'startSeconds' in song ? song.startSeconds : 0;
  return (
    <aside
      className={`getai-songbook ${compact ? 'is-compact' : ''}`}
      aria-label="Singapore songbook"
    >
      {!compact && (
        <>
          <div className="getai-songbook-heading">
            <Music2 size={19} />
            <span>Our Singapore songbook</span>
          </div>
          <h2>Songs we grew up with.</h2>
          <div className="getai-songs">
            {GETAI_SONGS.map((entry, index) => (
              <button
                key={entry.id}
                className="getai-song"
                aria-pressed={selected === entry.id}
                onClick={() => { setSelected(entry.id); setOpened(true); }}
              >
                <span className="getai-song-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <strong>{entry.title}</strong>
                  <small>{entry.artist}</small>
                </span>
                <span className="getai-song-category">{entry.category}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {compact && <h2>{song.title}</h2>}
      <div className="getai-recording">
        <div className="getai-recording-title">
          <span>{song.edition}</span>
          {opened && (
            <button aria-label="Stop music" onClick={() => setOpened(false)}>
              <X size={16} />
            </button>
          )}
        </div>
        {opened ? (
          <iframe
            key={song.video}
            title={`${song.title} music player`}
            src={`https://www.youtube-nocookie.com/embed/${song.video}?autoplay=1&playsinline=1&rel=0&cc_load_policy=1&start=${startSeconds}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button className="getai-listen" onClick={() => setOpened(true)}>
            <Play size={17} fill="currentColor" /> Play {song.title}
          </button>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${song.video}&t=${startSeconds}s`}
          target="_blank"
          rel="noreferrer"
        >
          Open recording <ExternalLink size={12} />
        </a>
      </div>
      {!compact && (
        <p className="getai-music-note">
          Background listening · follow the falling notes to score.
        </p>
      )}
    </aside>
  );
}
