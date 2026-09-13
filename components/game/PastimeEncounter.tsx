'use client';
import { useEffect, useRef, useState } from 'react';
import type { PhoneSceneRelay } from '@/lib/game/phone-motion';
import type { PASTIMES_1950S } from '@/lib/game/pastimes1950s';

export default function PastimeEncounter({
  attraction: a,
  onClose,
  bridge,
  gameAction,
  controller,
}: PhoneSceneRelay & {
  controller?: {
    answer: number | null;
    act: (
      action: string,
      payload?: Record<string, unknown>,
    ) => Promise<boolean>;
  };
  attraction: (typeof PASTIMES_1950S)[number];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [localAnswer, setAnswer] = useState<number | null>(null);
  const answer = controller ? controller.answer : localAnswer;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    el?.showModal();
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  /* oxlint-disable react/react-compiler -- Public snapshot and action handler are an imperative mailbox. */
  useEffect(() => {
    if (!bridge || !gameAction) return;
    bridge.current.screen = { ...bridge.current.screen, answer };
    gameAction.current = (command) => {
      const value = command.payload.answer;
      if (
        command.action === 'interact' &&
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value < a.choices.length
      )
        setAnswer(value);
    };
    return () => {
      gameAction.current = null;
    };
  }, [bridge, gameAction, answer, a.choices.length]);
  /* oxlint-enable react/react-compiler */
  return (
    <dialog
      ref={dialog}
      className="trip-dialog pastime-encounter"
      onCancel={onClose}
      aria-labelledby="pastime-title"
    >
      <button
        className="trip-close"
        aria-label="Close attraction"
        onClick={onClose}
      >
        ×
      </button>
      <small>SINGAPORE AT PLAY · {a.date}</small>
      <h2 id="pastime-title">{a.name}</h2>
      <p>{a.story}</p>
      <strong>{a.question}</strong>
      <div className="pastime-choices">
        {a.choices.map((choice, i) => (
          <button
            key={choice}
            aria-pressed={answer === i}
            onClick={() =>
              controller
                ? void controller.act('interact', { answer: i })
                : setAnswer(i)
            }
          >
            {choice}
          </button>
        ))}
      </div>
      {answer !== null && (
        <output className="pastime-feedback">
          <strong>{answer === a.answer ? 'Yes. ' : 'Look closer. '}</strong>
          {a.response}
        </output>
      )}
      <p>
        <a href={a.source} target="_blank" rel="noreferrer">
          Explore the historical source ↗
        </a>
      </p>
      <button onClick={onClose}>Back to the neighbourhood</button>
    </dialog>
  );
}
