'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Monitor, ArrowRight } from 'lucide-react';
import type { PublicRoom } from '@/lib/game/engine';
import RoomLobby from '@/components/game/RoomLobby';
import { eraOf } from '@/lib/game/trip';
import '@/components/game/party.css';
const PartyGame = dynamic(() => import('@/components/game/PartyGame'), { ssr: false });

export default function SharedDisplay() {
  const [seat, setSeat] = useState<{ code: string; token: string } | null>(
      null,
    ),
    [room, setRoom] = useState<PublicRoom | null>(null),
    [offset, setOffset] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('our-block-display');
      if (saved) {
        // Hydrate the display credential from external browser storage after SSR.
        // oxlint-disable-next-line react/react-compiler
        setSeat(JSON.parse(saved));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!seat) return;
    let stopped = false,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/rooms?code=${seat!.code}`, {
          headers: { Authorization: `Bearer ${seat!.token}` },
          cache: 'no-store',
        });
        const data = (await response.json()) as {
          room: PublicRoom;
          token: string;
          serverNow: number;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        if (!stopped) {
          setRoom(data.room);
          setOffset(data.serverNow - Date.now());
          setError('');
        }
      } catch (e) {
        if (!stopped)
          setError(e instanceof Error ? e.message : 'Reconnecting…');
      }
      if (!stopped) timer = setTimeout(poll, 180);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [seat]);
  async function create() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-display' }),
      });
      const data = (await response.json()) as {
        room: PublicRoom;
        token: string;
        serverNow: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      const s = { code: data.room.code, token: data.token };
      sessionStorage.setItem('our-block-display', JSON.stringify(s));
      setSeat(s);
      setRoom(data.room);
      setOffset(data.serverNow - Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a room.');
    } finally {
      setBusy(false);
    }
  }
  function close() {
    sessionStorage.removeItem('our-block-display');
    setSeat(null);
    setRoom(null);
    setError('');
  }
  return (
    <main className="party-screen-page">
      <header className="party-screen-top">
        <span>our block · shared screen</span>
        <div>
          {room?.phase === 'finished' && (
            <button className="party-new-room" onClick={close}>
              New room
            </button>
          )}
          <Link href="/">Play on this device</Link>
        </div>
      </header>
      {error && (
        <div className="party-screen-status" role="alert">
          {error} <button onClick={close}>New room</button>
        </div>
      )}
      {room ? (
        room.phase === 'lobby' ? (
          <section className="party-screen-lobby">
            <div className="party-lobby-world" aria-hidden="true" inert>
              {/* The lobby is decorative; mount the 3D world when play starts. */}
              {/* oxlint-disable-next-line next/no-img-element */}
              <img src={`/api/media?path=assets/lobby/${eraOf(room).year}.webp`} alt="" className="party-lobby-still" />
            </div>
            <p className="party-lobby-era">
              {eraOf(room).year} · {eraOf(room).name}
            </p>
            <RoomLobby
              room={room}
              host={false}
              busy={busy}
              onStart={() => {}}
            />
          </section>
        ) : (
          <PartyGame
            room={room}
            offset={offset}
            act={async () => false}
            onLeave={close}
            display
          />
        )
      ) : (
        <section className="party-screen-start">
          <Monitor size={48} />
          <h1>
            One big screen.
            <br />
            Four little controllers.
          </h1>
          <p>
            Gather your kakis, scan the room code, and travel between 1950s Singapore and 1987. Your phones carry your cards and controls. This
            screen follows the whole party.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void create()}
          >
            {busy ? 'Opening room…' : 'Open a party room'}
            <ArrowRight />
          </button>
          <small>The first phone to join becomes the host.</small>
        </section>
      )}
    </main>
  );
}
