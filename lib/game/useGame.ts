'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enableEraser } from './eraser';
import { enableParty } from './party';
import {
  applyAction,
  makePlayer,
  makeRoom,
  publicRoom,
  settle,
  type PublicRoom,
  type Room,
} from './engine';
type ApiResponse = {
  revision?: number;
  room: PublicRoom;
  playerId: string;
  token: string;
  serverNow: number;
  error?: string;
};
type Session = { code: string; playerId: string; token: string };
export function useGame(
  mode: 'party' | 'eraser' = 'party',
  { restoreSession = true }: { restoreSession?: boolean } = {},
) {
  const storageKey =
    mode === 'eraser' ? 'our-block-eraser-seat' : 'our-block-seat';
  const [room, setRoom] = useState<PublicRoom | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [solo, setSolo] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [connectionError, setConnectionError] = useState(''),
    [connected, setConnected] = useState(true),
    [offset, setOffset] = useState(0);
  const local = useRef<Room | null>(null);
  const requestId = useRef(0);
  const revision = useRef(-1);
  const mounted = useRef(true);
  const actionLock = useRef(false);
  const userActionWaiting = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    try {
      const s = restoreSession ? sessionStorage.getItem(storageKey) : null;
      // Hydrate the seat from external browser storage after SSR.
      // oxlint-disable-next-line react/react-compiler
      if (s) setSession(JSON.parse(s));
    } catch {}
    return () => {
      mounted.current = false;
    };
  }, [storageKey, restoreSession]);
  const sync = useCallback(async (s: Session) => {
    const id = ++requestId.current;
    const response = await fetch(`/api/rooms?code=${s.code}`, {
      headers: { Authorization: `Bearer ${s.token}` },
      cache: 'no-store',
    });
    const data = (await response.json()) as ApiResponse;
    if (!response.ok) throw new Error(data.error);
    if (
      mounted.current &&
      id === requestId.current &&
      (data.revision ?? 0) >= revision.current
    ) {
      revision.current = data.revision ?? 0;
      setRoom(data.room);
      setConnected(true);
      setConnectionError('');
      setOffset(data.serverNow - Date.now());
    }
  }, []);
  useEffect(() => {
    if (!session || solo) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        await sync(session!);
      } catch (e) {
        if (!cancelled) {
          setConnected(false);
          setConnectionError(
            e instanceof Error
              ? e.message
              : 'Connection interrupted. Reconnecting…',
          );
        }
      }
      if (!cancelled) timer = setTimeout(poll, 700);
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // Invalidate outstanding network responses rather than retaining a DOM ref.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
    };
  }, [session, solo, sync]);
  useEffect(() => {
    if (!solo) return;
    const t = setInterval(() => {
      if (
        local.current &&
        ['board', 'playing', 'exploring', 'revealing', 'quest'].includes(
          local.current.phase,
        )
      ) {
        const before = JSON.stringify(local.current);
        if (local.current.trip)
          (local.current.trip.seen ??= {})[local.current.host] = Date.now();
        settle(local.current);
        if (before !== JSON.stringify(local.current))
          setRoom(
            publicRoom(structuredClone(local.current), local.current.host),
          );
      }
    }, 200);
    return () => clearInterval(t);
  }, [solo]);
  function practice(character: string, age: number) {
    const p = makePlayer('You', character, age);
    const r = makeRoom('PRACTICE', p);
    r.players.push(
      ...['kopi', 'pandan', 'otto'].map((c, i) => ({
        ...makePlayer(
          ['Kopi', 'Pandan', 'Otto'][i],
          c === character ? 'merly' : c,
          0,
        ),
        bot: true,
      })),
    );
    if (mode === 'eraser') {
      r.players = [p, { ...makePlayer('Classmate', 'arun', 0), bot: true }];
      enableEraser(r);
      applyAction(r, p.id, 'start');
    } else {
      enableParty(r);
      applyAction(r, p.id, 'board');
    }
    local.current = r;
    setSolo(true);
    setSession({ code: r.code, playerId: p.id, token: p.token });
    setRoom(publicRoom(structuredClone(r), p.id));
    setError('');
    setOffset(0);
  }
  async function connect(
    action: 'create' | 'join',
    character: string,
    age: number,
    name: string,
    code = '',
  ) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, character, age, name, code, mode }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data.error);
      const s = {
        code: data.room.code,
        playerId: data.playerId,
        token: data.token,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(s));
      revision.current = data.revision ?? 0;
      setSolo(false);
      setSession(s);
      setRoom(data.room);
      setOffset(data.serverNow - Date.now());
      setConnected(true);
      setConnectionError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect.');
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }
  async function act(
    action: string,
    payload: Record<string, unknown> = {},
    retry = 0,
  ): Promise<boolean> {
    const quiet = action === 'input' || action === 'walk';
    if (!session || (quiet && userActionWaiting.current)) return false;
    if (actionLock.current) {
      if (quiet) return false;
      if (retry >= 40) {
        userActionWaiting.current = false;
        setError('Connection is busy. Please try again.');
        return false;
      }
      userActionWaiting.current = true;
      const waitingGeneration = generation.current;
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (waitingGeneration !== generation.current) return false;
      return act(action, payload, retry + 1);
    }
    userActionWaiting.current = false;
    const currentGeneration = generation.current;
    actionLock.current = true;
    if (!quiet) {
      setBusy(true);
      setError('');
    }
    try {
      if (solo && local.current) {
        applyAction(local.current, session.playerId, action, payload);
        setRoom(publicRoom(structuredClone(local.current), session.playerId));
        return true;
      }
      // Invalidate outstanding network responses rather than retaining a DOM ref.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ action, code: session.code, ...payload }),
      });
      const data = (await res.json()) as ApiResponse;
      if (currentGeneration !== generation.current) return false;
      if (!res.ok) throw new Error(data.error);
      // Invalidate outstanding network responses rather than retaining a DOM ref.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
      if ((data.revision ?? 0) >= revision.current) {
        revision.current = data.revision ?? 0;
        setRoom(data.room);
        setOffset(data.serverNow - Date.now());
      }
      setConnected(true);
      setConnectionError('');
      return true;
    } catch (e) {
      if (quiet) {
        setConnected(false);
        setConnectionError('Connection interrupted. Reconnecting…');
      } else setError(e instanceof Error ? e.message : 'Try again.');
      if (solo && local.current)
        setRoom(publicRoom(structuredClone(local.current), session.playerId));
      return false;
    } finally {
      if (!quiet) setBusy(false);
      actionLock.current = false;
    }
  }
  function leave() {
    generation.current++;
    userActionWaiting.current = false;
    requestId.current++;
    revision.current = -1;
    sessionStorage.removeItem(storageKey);
    setConnectionError('');
    setSession(null);
    setRoom(null);
    setSolo(false);
    local.current = null;
    setError('');
  }
  return {
    room,
    session,
    solo,
    busy,
    error: error || connectionError,
    setError: (message: string) => {
      setError(message);
      setConnectionError('');
    },
    connected,
    offset,
    practice,
    connect,
    act,
    leave,
  };
}
