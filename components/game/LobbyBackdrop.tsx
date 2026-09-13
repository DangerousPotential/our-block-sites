'use client';
// Backgrounds are already encoded as WebP and crossfade as fixed raster layers.
/* oxlint-disable next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { EXPLORATION_ERAS } from '@/lib/game/pastimes1950s';

export default function LobbyBackdrop() {
  const pictures = useRef<(HTMLImageElement | null)[]>([]);
  const [presented, setPresented] = useState(false);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState<number[]>([]);
  const [requested, setRequested] = useState<number[]>([0]);
  const [failed, setFailed] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    // Cached/streamed images may finish before React attaches onLoad.
    const ready = pictures.current.flatMap((img, i) =>
      img?.complete && img.naturalWidth > 0 ? [i] : [],
    );
    setLoaded((values) => [...new Set([...values, ...ready])]);
  }, []);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (paused || reduced || !loaded.includes(active)) return;
    const next = (active + 1) % EXPLORATION_ERAS.length;
    const timer = window.setTimeout(() => {
      setRequested(values => values.includes(next) ? values : [...values, next]);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [active, loaded, paused, reduced]);
  useEffect(() => {
    if (paused || reduced || loaded.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setActive((current) => {
        for (let step = 1; step < EXPLORATION_ERAS.length; step++) {
          const next = (current + step) % EXPLORATION_ERAS.length;
          if (loaded.includes(next)) return next;
        }
        return current;
      });
    }, 14000);
    return () => clearInterval(timer);
  }, [paused, reduced, loaded]);
  useEffect(() => {
    if (presented || !loaded.includes(0)) return;
    const timer = window.setTimeout(() => setPresented(true), 100);
    return () => clearTimeout(timer);
  }, [loaded, presented]);
  const era = EXPLORATION_ERAS[active];
  return (
    <>
      <div
        className={`lobby-scenery ${presented ? 'has-presented' : ''}`}
        aria-hidden="true"
      >
        {EXPLORATION_ERAS.map((period, i) => requested.includes(i) && (
          <img
            key={period.id}
            ref={(node) => {
              pictures.current[i] = node;
            }}
            src={`/api/media?path=assets/lobby/${period.year}.webp`}
            alt=""
            width={1672}
            height={941}
            className={active === i && loaded.includes(i) ? 'is-visible' : ''}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            onLoad={() =>
              setLoaded((values) =>
                values.includes(i) ? values : [...values, i],
              )
            }
            onError={() =>
              setFailed((values) =>
                values.includes(i) ? values : [...values, i],
              )
            }
          />
        ))}
      </div>
      <footer className="lobby-timeline">
        <div className="lobby-era-caption">
          <span>Singapore through time</span>
          <strong>
            {era.year === 1950 ? '1950s' : era.year} · {era.name}
          </strong>
        </div>
        <button
          className="lobby-background-toggle"
          aria-label={
            reduced
              ? 'Background motion reduced'
              : paused
                ? 'Resume automatic backgrounds'
                : 'Pause automatic backgrounds'
          }
          aria-pressed={paused || reduced}
          disabled={reduced}
          onClick={() => setPaused((value) => !value)}
        >
          {paused || reduced ? <Play size={16} /> : <Pause size={16} />}
          <span>
            {reduced
              ? 'Reduced motion'
              : paused
                ? 'Resume scenery'
                : 'Pause scenery'}
          </span>
        </button>
        {!loaded.includes(active) && (
          <output className="backdrop-status">
            {failed.includes(active)
              ? 'Scenery unavailable. You can still choose your kaki.'
              : 'Opening the neighbourhood…'}
          </output>
        )}
      </footer>
    </>
  );
}
