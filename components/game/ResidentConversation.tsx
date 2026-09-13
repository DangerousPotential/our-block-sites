'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Focus-managed overlay inside the immersive game. */
import { useEffect, useRef, useState } from 'react';
import Sprite from './Sprite';

export type ResidentStory = {
  name: string;
  character: string;
  lines: string[];
};
export default function ResidentConversation({
  resident,
  onClose,
}: {
  resident: ResidentStory;
  onClose: () => void;
}) {
  const [line, setLine] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key === 'Tab') {
        const buttons = Array.from(
          panel.current?.querySelectorAll('button') ?? [],
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (e.shiftKey && index <= 0) {
          e.preventDefault();
          buttons.at(-1)?.focus();
        } else if (!e.shiftKey && index === buttons.length - 1) {
          e.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      ref={panel}
      className="trip-dialog resident-conversation"
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation with ${resident.name}`}
    >
      <button
        className="trip-close"
        onClick={onClose}
        aria-label="Close conversation"
      >
        ×
      </button>
      <Sprite id={resident.character} />
      <h2>{resident.name}</h2>
      <p aria-live="polite">{resident.lines[line]}</p>
      <div className="resident-actions">
        {line < resident.lines.length - 1 && (
          <button onClick={() => setLine((n) => n + 1)}>Tell me more</button>
        )}
        <button onClick={onClose}>See you around!</button>
      </div>
    </div>
  );
}
