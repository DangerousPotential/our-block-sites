'use client';
// Pre-encoded WebP assets are served directly without a Next image optimizer.
/* oxlint-disable next/no-img-element */
// The focusable ring groups real buttons and adds optional drag/arrow navigation.
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sprite from './Sprite';
import { characters, findCharacter, ageLabels } from '@/lib/game/characters';
import { nearestTurn, orbitSeat, wrapSeat } from '@/lib/game/lobby-carousel';

export default function CharacterPicker({
  selected,
  setSelected,
  age,
  setAge,
  onReady,
}: {
  selected: string;
  setSelected: (v: string) => void;
  age: number;
  setAge: (v: number) => void;
  onReady: () => void;
}) {
  const c = findCharacter(selected);
  const roster = characters.filter((p) => p.kind === c.kind);
  const selectedIndex = roster.findIndex((p) => p.id === c.id);
  const [turn, setTurn] = useState(selectedIndex);
  const turnRef = useRef(turn);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; turn: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [settle, setSettle] = useState(0);
  const moveTurn = (value: number) => {
    turnRef.current = value;
    setTurn(value);
  };
  useEffect(() => {
    if (dragging) return;
    const from = turnRef.current;
    const to = nearestTurn(from, selectedIndex, roster.length);
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const start = performance.now();
    let frame: number;
    const animate = (now: number) => {
      const progress = reduced ? 1 : Math.min((now - start) / 480, 1);
      const value = from + (to - from) * (1 - Math.pow(1 - progress, 3));
      turnRef.current = value;
      setTurn(value);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [selectedIndex, roster.length, dragging, settle]);
  const choose = (id: string) => setSelected(id);
  const step = (direction: number) =>
    choose(roster[wrapSeat(selectedIndex + direction, roster.length)].id);
  const finishDrag = (cancelled = false) => {
    const gesture = drag.current;
    drag.current = null;
    setDragging(false);
    if (!gesture?.moved) return;
    suppressClick.current = true;
    if (!cancelled)
      setSelected(roster[wrapSeat(turnRef.current, roster.length)].id);
    setSettle((value) => value + 1);
  };
  return (
    <section className="kaki-lobby" aria-labelledby="kaki-title">
      <div className="kaki-heading">
        <div>
          <p className="lobby-eyebrow">Same island. A whole lot of stories.</p>
          <h1 id="kaki-title">Pick your kaki.</h1>
        </div>
        <Tabs
          value={c.kind}
          onValueChange={(v) => {
            setSelected(v === 'pet' ? 'merly' : 'mei');
          }}
        >
          <TabsList className="lobby-tabs">
            <TabsTrigger value="pet">Local legends</TabsTrigger>
            <TabsTrigger value="neighbour">Neighbours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div
        className={`character-orbit ${dragging ? 'is-dragging' : ''}`}
        role="group"
        aria-label="Rotating character ring"
        aria-describedby="orbit-hint"
        tabIndex={0}
        onKeyDown={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'Home') choose(roster[0].id);
            else if (e.key === 'End') choose(roster[roster.length - 1].id);
            else step(e.key === 'ArrowRight' ? 1 : -1);
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          suppressClick.current = false;
          drag.current = { x: e.clientX, turn: turnRef.current, moved: false };
        }}
        onPointerMove={(e) => {
          const gesture = drag.current;
          if (!gesture) return;
          const distance = e.clientX - gesture.x;
          if (!gesture.moved && Math.abs(distance) < 8) return;
          gesture.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          moveTurn(
            gesture.turn -
              distance /
                Math.max(60, e.currentTarget.clientWidth / roster.length),
          );
        }}
        onPointerUp={() => finishDrag()}
        onPointerCancel={() => finishDrag(true)}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        {roster.map((p, index) => {
          const seat = orbitSeat(index, turn, roster.length);
          return (
            <button
              key={p.id}
              className={`orbit-character ${p.id === selected ? 'is-selected' : ''}`}
              data-rear={seat.depth < 0.3}
              aria-label={`Choose ${p.name}`}
              aria-pressed={p.id === selected}
              style={
                {
                  '--orbit-x': `${seat.x}%`,
                  '--orbit-y': `${seat.y}px`,
                  '--orbit-scale': seat.scale,
                  zIndex: Math.round(seat.depth * 100),
                } as CSSProperties
              }
              onClick={() => {
                choose(p.id);
              }}
            >
              <Sprite id={p.id} age={age} />
              <img
                className="orbit-podium"
                src="/api/media?path=assets/lobby/podium.webp"
                alt=""
                draggable={false}
                width={720}
                height={360}
              />
              <span className="orbit-name">
                {p.id === selected && <Check size={14} />} {p.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="lobby-selection-bar">
        <div className="selected-kaki" aria-live="polite" aria-atomic="true">
          <span>Your kaki</span>
          <h2>{c.name}</h2>
          <p>{c.tagline}</p>
          {c.background && <small>{c.background}</small>}
        </div>
        <div className="orbit-navigation">
          <div>
            <button onClick={() => step(-1)} aria-label="Previous character">
              <ChevronLeft />
            </button>
            <span>
              {selectedIndex + 1} / {roster.length}
            </span>
            <button onClick={() => step(1)} aria-label="Next character">
              <ChevronRight />
            </button>
          </div>
          <p id="orbit-hint">Drag to spin · or use arrow keys</p>
        </div>
        <div className="lobby-ready">
          {c.kind === 'neighbour' && (
            <div className="lobby-age" role="group" aria-label="Character age">
              {ageLabels.map((label, i) => (
                <button
                  key={label}
                  aria-label={label}
                  aria-pressed={age === i}
                  onClick={() => setAge(i)}
                >
                  {label.split(' · ')[1]}
                </button>
              ))}
            </div>
          )}
          <button className="lobby-play" onClick={onReady}>
            Ready lah <ArrowRight size={25} />
          </button>
        </div>
      </div>
    </section>
  );
}
