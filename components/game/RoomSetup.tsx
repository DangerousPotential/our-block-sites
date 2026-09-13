'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import Sprite from './Sprite';
import { findCharacter } from '@/lib/game/characters';
export default function RoomSetup({
  character,
  age,
  busy,
  initialCode,
  onBack,
  onPractice,
  onConnect,
}: {
  character: string;
  age: number;
  busy: boolean;
  initialCode: string;
  onBack: () => void;
  onPractice: () => void;
  onConnect: (action: 'create' | 'join', name: string, code: string) => void;
}) {
  const [name, setName] = useState(''),
    [code, setCode] = useState(initialCode);
  return (
    <section className="setup-panel">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Change kaki
      </button>
      <div className="setup-title">
        <Sprite id={character} age={age} />
        <h1>Let’s play</h1>
      </div>
      <label className="setup-field">
        Your name
        <input
          maxLength={20}
          value={name}
          placeholder={findCharacter(character).name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        className="primary"
        disabled={busy}
        onClick={() => onConnect('create', name, code)}
      >
        {busy ? 'Connecting…' : 'Create room'} <ArrowRight size={18} />
      </button>
      <div className="setup-join">
        <label className="setup-field">
          Room code
          <input
            value={code}
            maxLength={5}
            placeholder="ABCDE"
            className="code-input"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) =>
              setCode(e.target.value.replace(/[^a-z]/gi, '').toUpperCase())
            }
          />
        </label>
        <button
          className="secondary"
          disabled={busy || code.length !== 5}
          onClick={() => onConnect('join', name, code)}
        >
          Join
        </button>
      </div>
      <button
        className="solo-link text-button"
        disabled={busy}
        onClick={onPractice}
      >
        Play solo <span>· 3 CPU</span>
      </button>
    </section>
  );
}
