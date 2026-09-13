// Original seamless instrumental sketches. No sampled songs or recordings.
import { writeFileSync, mkdirSync } from 'node:fs';
const rate = 22050;
const scores = {
  fair: {
    bpm: 112,
    notes: [67, 72, 76, 79, 76, 74, 72, 69],
    bass: [48, 57, 53, 55],
    style: 4,
  },
  kampong: {
    bpm: 78,
    notes: [60, 64, 67, 69, 67, 64, 62, 67],
    bass: [48, 53, 55, 48],
    style: 0,
  },
  estate: {
    bpm: 94,
    notes: [60, 67, 69, 72, 69, 67, 64, 62],
    bass: [48, 45, 53, 55],
    style: 1,
  },
  town: {
    bpm: 86,
    notes: [57, 60, 64, 67, 64, 60, 59, 64],
    bass: [45, 48, 53, 52],
    style: 2,
  },
  garden: {
    bpm: 76,
    notes: [60, 67, 74, 76, 74, 71, 67, 64],
    bass: [48, 45, 53, 55],
    style: 3,
  },
};
mkdirSync('public/audio/eras', { recursive: true });
for (const [era, s] of Object.entries(scores)) {
  const beat = 60 / s.bpm,
    duration = beat * 64,
    n = Math.round(duration * rate),
    data = new Float32Array(n);
  let seed = 731;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  const tone = (at, midi, length, amp, kind = 0) => {
    const frequency = 440 * 2 ** ((midi - 69) / 12),
      count = Math.floor(length * rate),
      start = Math.round(at * rate);
    for (let i = 0; i < count; i++) {
      const t = i / rate,
        p = 2 * Math.PI * frequency * t;
      const env =
        Math.min(1, t / 0.016) *
        Math.exp(-t / (kind === 2 ? 0.8 : 0.22)) *
        Math.min(1, (length - t) / 0.04);
      const voice =
        Math.sin(p) +
        0.22 * Math.sin(p * 2) +
        (kind === 1 ? 0.14 * Math.sin(p * 3.01) : 0);
      data[(start + i) % n] += voice * env * amp;
      data[(start + i + Math.round(beat * 0.75 * rate)) % n] +=
        voice * env * amp * 0.16;
    }
  };
  for (let b = 0; b < 64; b++) {
    const root = s.bass[Math.floor(b / 4) % 4];
    if (b % 2 === 0) tone(b * beat, root, beat * 1.7, 0.12, 2);
    if (b % 4 === 0)
      for (const interval of [12, 16, 19, 23])
        tone(b * beat, root + interval, beat * 3.5, 0.028, 2);
    tone(
      (b + 0.12 * (b % 2)) * beat,
      s.notes[(b + Math.floor(b / 16) * 2) % 8],
      beat * 1.5,
      0.1,
      s.style % 2,
    );
    // Soft shaker / rim pulse, with distinct rhythm density across eras.
    for (let hit = 0; hit < (s.style === 0 ? 1 : 2); hit++) {
      const start = Math.round((b + hit * 0.5) * beat * rate);
      for (let i = 0; i < 1800; i++)
        data[(start + i) % n] += noise() * Math.exp(-i / 220) * 0.022;
    }
    if (s.style > 0 && b % 2 === 0) {
      const start = Math.round(b * beat * rate);
      for (let i = 0; i < 4000; i++) {
        const t = i / rate;
        data[(start + i) % n] +=
          Math.sin(2 * Math.PI * (65 * t + 2 * (1 - Math.exp(-t * 30)))) *
          Math.exp(-t * 24) *
          0.08;
      }
    }
    // Bird-like calls for morning, bell accents for the night garden.
    if (s.style === 0 && b % 8 === 6) tone(b * beat, 91, 0.3, 0.025);
    if (s.style === 3 && b % 8 === 7) tone(b * beat, 84, beat * 3, 0.035, 2);
  }
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF');
  out.writeUInt32LE(36 + n * 2, 4);
  out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    out.writeInt16LE(Math.round(Math.tanh(data[i]) * 24000), 44 + i * 2);
  writeFileSync(`public/audio/eras/${era}.wav`, out);
  console.log(`${era}: ${duration.toFixed(1)}s, ${out.length} bytes`);
}
