import type { PublicRoom } from './engine';
import type { WorldEra } from './pastimes1950s';

export type Vector3 = [number | null, number | null, number | null];
export type PhoneMotion = {
  x: number;
  y: number;
  jumpId: number;
  pressId: number;
  press: number | 'portal';
  orientation: Vector3;
  acceleration: Vector3;
  rotation: Vector3;
};
export type RemoteMotion = { sample: PhoneMotion; receivedAt: number };
export const emptyMotion = (): PhoneMotion => ({
  x: 0,
  y: 0,
  jumpId: 0,
  pressId: 0,
  press: 0,
  orientation: [null, null, null],
  acceleration: [null, null, null],
  rotation: [null, null, null],
});
const clamp = (n: number) => Math.max(-1, Math.min(1, n));
export function tiltAxes(
  beta: number,
  gamma: number,
  baseline: { beta: number; gamma: number },
  angle: number,
) {
  const dx = (gamma - baseline.gamma) / 22;
  const dy = (beta - baseline.beta) / 22;
  const a = (angle * Math.PI) / 180;
  return {
    x: clamp(dx * Math.cos(a) + dy * Math.sin(a)),
    y: clamp(dy * Math.cos(a) - dx * Math.sin(a)),
  };
}
export function validMotion(value: unknown): value is PhoneMotion {
  if (!value || typeof value !== 'object') return false;
  const s = value as PhoneMotion;
  const axis = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1;
  const vector = (v: unknown) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (n) =>
        n === null ||
        (typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000),
    );
  return (
    axis(s.x) &&
    axis(s.y) &&
    Number.isSafeInteger(s.jumpId) &&
    s.jumpId >= 0 &&
    Number.isSafeInteger(s.pressId) &&
    s.pressId >= 0 &&
    (s.press === 'portal' || [0, 1, 2, 3].includes(s.press)) &&
    vector(s.orientation) &&
    vector(s.acceleration) &&
    vector(s.rotation)
  );
}
export async function motionRequest<T = { ok: boolean }>(
  body: Record<string, unknown>,
  token = '',
  signal?: AbortSignal,
) {
  const response = await fetch('/api/motion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
      : AbortSignal.timeout(5000),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'Phone connection unavailable.');
  return data;
}

/** A public scene snapshot, never room/seat credentials. */
export type PhoneScreen = {
  now?: number;
  position?: { x: number; z: number };
  id: string;
  destination: string;
  era: WorldEra;
  character: string;
  age: number;
  room?: PublicRoom;
  playerId?: string;
  activity?: PhoneActivity;
  answer?: number | null;
};
export type PhoneCommand = {
  id: number;
  scene: string;
  action: 'input' | 'flick' | 'navigate' | 'restart' | 'interact';
  payload: Record<string, unknown>;
};
export type PhoneBridge = {
  screen: PhoneScreen;
  connected: boolean;
  ack: number;
  handle?: (command: PhoneCommand) => Promise<void> | void;
};
export function validPhoneCommand(value: unknown): value is PhoneCommand {
  if (!value || typeof value !== 'object') return false;
  const c = value as PhoneCommand;
  return (
    Number.isSafeInteger(c.id) &&
    c.id > 0 &&
    typeof c.scene === 'string' &&
    c.scene.length < 200 &&
    ['input', 'flick', 'navigate', 'restart', 'interact'].includes(c.action) &&
    !!c.payload &&
    typeof c.payload === 'object' &&
    !Array.isArray(c.payload)
  );
}
export function freshMotion(packet: RemoteMotion | null, now = Date.now()) {
  return packet && now - packet.receivedAt < 600 ? packet.sample : null;
}

export type PhoneActivity = {
  ready: boolean;
  running: boolean;
  elapsed: number;
  step: number;
  order: number;
  feedback: string;
  points: number;
};
export type PhoneSceneRelay = {
  bridge?: import('react').RefObject<PhoneBridge>;
  gameAction?: import('react').RefObject<
    ((command: PhoneCommand) => Promise<void> | void) | null
  >;
};
