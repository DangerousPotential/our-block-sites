'use client';
import { useEffect, useRef, useState } from 'react';
import type { WorldEra } from '@/lib/game/pastimes1950s';
// Original synthesized environmental beds; no recordings or copyrighted songs.
export default function TripAmbience({ era }: { era: WorldEra }) {
  const [volume, setVolume] = useState(0),
    context = useRef<AudioContext | null>(null),
    gain = useRef<GainNode | null>(null);
  useEffect(() => {
    const c = context.current;
    if (!c) return;
    const g = c.createGain();
    g.gain.value = 0;
    g.connect(c.destination);
    gain.current = g;
    const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate),
      data = buffer.getChannelData(0);
    let seed = 1234;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = ((seed / 4294967296) * 2 - 1) * 0.25;
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = era === 'river' || era === 'garden' ? 'lowpass' : 'bandpass';
    filter.frequency.value = {
      pastimes: 600,
      river: 450,
      fair: 800,
      estate: 1400,
      town: 220,
      garden: 350,
    }[era];
    source.connect(filter);
    filter.connect(g);
    source.start();
    const lfo = c.createOscillator(),
      pulse = c.createGain();
    lfo.frequency.value = era === 'town' ? 0.12 : 0.3;
    pulse.gain.value = 0.02;
    lfo.connect(pulse);
    pulse.connect(g.gain);
    lfo.start();
    const timer = setInterval(
      () => {
        if (c.state !== 'running' || !gain.current) return;
        const tone = c.createOscillator(),
          envelope = c.createGain(),
          t = c.currentTime;
        tone.frequency.setValueAtTime(
          era === 'town' ? 660 : era === 'fair' ? 880 : 1600,
          t,
        );
        tone.frequency.exponentialRampToValueAtTime(
          era === 'town' ? 440 : 1200,
          t + 0.2,
        );
        envelope.gain.setValueAtTime(0, t);
        envelope.gain.linearRampToValueAtTime(volume * 0.025, t + 0.03);
        envelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        tone.connect(envelope);
        envelope.connect(c.destination);
        tone.start(t);
        tone.stop(t + 0.45);
      },
      era === 'town' ? 9000 : 7000,
    );
    g.gain.setTargetAtTime(volume * 0.16, c.currentTime, 0.3);
    return () => {
      clearInterval(timer);
      source.stop();
      lfo.stop();
      source.disconnect();
      filter.disconnect();
      g.disconnect();
      pulse.disconnect();
    };
  }, [era, volume]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  return (
    <label className="trip-ambience">
      Ambient sound{' '}
      <input
        aria-label="Ambient sound volume"
        type="range"
        min="0"
        max="1"
        step=".1"
        value={volume}
        onChange={(e) => {
          if (!context.current) context.current = new AudioContext();
          void context.current.resume();
          setVolume(Number(e.target.value));
        }}
      />
      <span>{volume ? 'On' : 'Off'}</span>
    </label>
  );
}
