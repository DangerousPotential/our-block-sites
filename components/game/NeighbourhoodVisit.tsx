'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { PhoneActivity, PhoneSceneRelay } from '@/lib/game/phone-motion';
import ActivityStage from './ActivityStage';
import {
  ACTIVITIES,
  KOPI_ORDERS,
  MARKET_LIST,
  inTimingWindow,
  type ActivityId,
} from '@/lib/game/activities';
export default function NeighbourhoodVisit({
  id,
  character,
  age,
  onClose,
  bridge,
  gameAction,
  controller,
}: PhoneSceneRelay & {
  controller?: {
    state: PhoneActivity;
    act: (
      action: string,
      payload?: Record<string, unknown>,
    ) => Promise<boolean>;
  };
  id: ActivityId;
  character: string;
  age: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [localReady, setReady] = useState(false),
    [localRunning, setRunning] = useState(false),
    [localElapsed, setElapsed] = useState(0);
  const [localStep, setStep] = useState(0),
    [localOrder, setOrder] = useState(0),
    [localFeedback, setFeedback] = useState(''),
    [localPoints, setPoints] = useState(0);
  const { ready, running, elapsed, step, order, feedback, points } =
    controller?.state ?? {
      ready: localReady,
      running: localRunning,
      elapsed: localElapsed,
      step: localStep,
      order: localOrder,
      feedback: localFeedback,
      points: localPoints,
    };
  const controlled = !!controller;
  const lastCheer = useRef(-1);
  const activity = ACTIVITIES[id];
  const timed = id === 'coaster' || id === 'stage' || id === 'playground';
  const total = id === 'coaster' ? 20000 : 15000;
  const progress = Math.min(1, elapsed / total);
  const phase = (elapsed % 1500) / 1500;
  const done = timed
    ? elapsed >= total
    : id === 'kopi'
      ? order >= KOPI_ORDERS.length
      : id === 'market'
        ? step >= 3
        : step >= 6;
  useEffect(() => {
    dialog.current?.showModal();
    const el = dialog.current;
    return () => el?.close();
  }, []);
  useEffect(() => {
    if (controlled || !running || done) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      if (!document.hidden) setElapsed((e) => Math.min(total, e + now - last));
      last = now;
    }, 50);
    return () => clearInterval(timer);
  }, [running, done, total, controlled]);
  function act(value: string) {
    if (controller) {
      void controller.act('interact', { value });
      return;
    }
    if (!ready || done) return;
    if (id === 'kopi') {
      const recipe = KOPI_ORDERS[order].recipe;
      if (value !== recipe[step]) {
        setFeedback('Not quite — check the order. Try that step again.');
        return;
      }
      if (step === recipe.length - 1) {
        setOrder((o) => o + 1);
        setStep(0);
        setPoints((p) => p + 1);
        setFeedback('“Shiok, thank you!” Your neighbour takes their kopi.');
      } else {
        setStep((s) => s + 1);
        setFeedback(
          value === 'Brew coffee'
            ? 'Fresh coffee is in the cup.'
            : `${value} added. Ready to serve!`,
        );
      }
    } else if (id === 'market') {
      if (value !== MARKET_LIST[step]) {
        setFeedback('That is not next on the shopping list.');
        return;
      }
      setStep((s) => s + 1);
      setPoints((p) => p + 1);
      setFeedback(`${value} in the basket. “Thank you, see you next time!”`);
    } else if (id === 'garden') {
      setStep((s) => s + 1);
      setPoints((p) => p + 1);
      setFeedback(
        step < 3
          ? 'Watered! On to the next bed.'
          : 'A fresh harvest to share with the block.',
      );
    } else if (running) {
      const beat = Math.floor(elapsed / 1500);
      const peak = Math.sin(progress * Math.PI * 8) > 0.6;
      if (lastCheer.current === beat) {
        setFeedback('Wait for the next moment!');
        return;
      }
      if (id === 'coaster' ? peak : inTimingWindow(phase)) {
        lastCheer.current = beat;
        setPoints((p) => p + 1);
        setStep((s) => s + 1);
        setFeedback(
          id === 'coaster'
            ? 'Wah! What a view!'
            : id === 'stage'
              ? 'The neighbours clap along!'
              : 'Nice hop!',
        );
      } else
        setFeedback(
          id === 'coaster'
            ? 'Save your cheer for the hilltop!'
            : 'Watch the gold band, then tap.',
        );
    }
  }
  function toggle() {
    if (controller) {
      void controller.act('interact', { value: 'toggle' });
      return;
    }
    setRunning((v) => !v);
  }
  const remoteAct = useEffectEvent((value: string) => {
    if (value === 'toggle') toggle();
    else act(value);
  });
  // Shared imperative mailbox keeps the computer's activity authoritative.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    if (!bridge || !gameAction) return;
    bridge.current.screen = {
      ...bridge.current.screen,
      activity: { ready, running, elapsed, step, order, feedback, points },
    };
    gameAction.current = (command) => {
      if (
        command.action === 'interact' &&
        typeof command.payload.value === 'string'
      )
        remoteAct(command.payload.value);
    };
    return () => {
      gameAction.current = null;
    };
  }, [
    bridge,
    gameAction,
    ready,
    running,
    elapsed,
    step,
    order,
    feedback,
    points,
  ]);
  /* oxlint-enable react/react-compiler */
  return (
    <dialog className="neighbourhood-visit" ref={dialog} onCancel={onClose}>
      <header>
        <div>
          <small>{activity.place}</small>
          <h2>{activity.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Return to board"
        >
          Back to the block ×
        </button>
      </header>
      <ActivityStage
        id={id}
        character={character}
        age={age}
        progress={progress}
        step={step}
        running={running && !done}
        onReady={setReady}
      />
      <section className="activity-play" aria-label="Activity controls">
        {!ready ? (
          <output>Opening the neighbourhood…</output>
        ) : done ? (
          <>
            <h3>
              {id === 'kopi'
                ? 'Three happy neighbours!'
                : id === 'market'
                  ? 'Everything for tonight’s meal.'
                  : id === 'garden'
                    ? 'A harvest for the block.'
                    : 'That was a good afternoon.'}
            </h3>
            <p>
              {points} {timed ? 'happy moments' : 'helpful moments'} ·{' '}
              <strong>Visit complete</strong>
            </p>
            <button onClick={onClose}>Back to your friends</button>
          </>
        ) : (
          <>
            <p>{activity.instruction}</p>
            {id === 'kopi' && (
              <>
                <h3>
                  Order {order + 1}/3 · {KOPI_ORDERS[order].name}
                </h3>
                <p>“{KOPI_ORDERS[order].customer}”</p>
                <ol className="recipe-steps">
                  {KOPI_ORDERS[order].recipe.map((s, i) => (
                    <li
                      key={s}
                      aria-current={i === step ? 'step' : undefined}
                      className={i < step ? 'complete' : ''}
                    >
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="activity-actions">
                  {['Brew coffee', 'Condensed milk', 'Sugar', 'Serve'].map(
                    (v) => (
                      <button key={v} onClick={() => act(v)}>
                        {v}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
            {id === 'market' && (
              <>
                <h3>Shopping list · {step}/3</h3>
                <p>
                  {MARKET_LIST.map((v, i) => (i < step ? `✓ ${v}` : v)).join(
                    ' · ',
                  )}
                </p>
                <div className="activity-actions">
                  {['Eggs', 'Coconut', 'Pandan', 'Bananas'].map((v) => (
                    <button key={v} onClick={() => act(v)}>
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}
            {id === 'garden' && (
              <>
                <h3>
                  {['Pandan', 'Chilli', 'Greens'][step % 3]} · Bed{' '}
                  {(step % 3) + 1}/3
                </h3>
                <button onClick={() => act('garden')}>
                  {step < 3 ? 'Water this bed' : 'Harvest and share'}
                </button>
              </>
            )}
            {timed && (
              <>
                <div
                  className="visit-timing"
                  aria-label={id === 'coaster' ? 'Ride progress' : 'Timing cue'}
                >
                  <span className="timing-target" />
                  <i
                    style={{
                      left: `${(id === 'coaster' ? progress : phase) * 100}%`,
                    }}
                  />
                </div>
                <div className="activity-actions">
                  <button onClick={toggle}>
                    {running
                      ? 'Pause'
                      : elapsed
                        ? 'Resume'
                        : id === 'coaster'
                          ? 'Board the coaster'
                          : 'Start playing'}
                  </button>
                  <button disabled={!running} onClick={() => act('tap')}>
                    {id === 'coaster'
                      ? 'Cheer at the hilltop'
                      : id === 'stage'
                        ? 'Clap!'
                        : 'Hop!'}
                  </button>
                  <span>
                    {Math.max(0, Math.ceil((total - elapsed) / 1000))}s ·{' '}
                    {points} moments
                  </span>
                </div>
              </>
            )}
          </>
        )}
        <p className="visit-feedback" aria-live="polite">
          {feedback}
        </p>
        <details>
          <summary>About this place</summary>
          <p>{activity.history}</p>
          {(id === 'stage' || id === 'coaster') && (
            <a
              href="https://www.roots.gov.sg/stories-landing/stories/themeparks-in-singapore/story"
              target="_blank"
              rel="noreferrer"
            >
              Read the National Heritage Board story ↗
            </a>
          )}
          <p>
            Neighbourhood visits are local side activities. Your room’s board
            score is separate; the shared match continues.
          </p>
        </details>
      </section>
    </dialog>
  );
}
