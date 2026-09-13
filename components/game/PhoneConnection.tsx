'use client';
import { useEffect, useState, type RefObject } from 'react';
import {
  motionRequest,
  type RemoteMotion,
  type PhoneBridge,
  type PhoneCommand,
} from '@/lib/game/phone-motion';
import Image from 'next/image';
import { isLoopbackOrigin, joinOrigins } from '@/lib/game/join-link';

type Session = { id: string; host: string; phone: string };
export default function PhoneConnection({
  remote,
  bridge,
}: {
  remote: RefObject<RemoteMotion | null>;
  bridge: RefObject<PhoneBridge>;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [qr, setQr] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Scan with your phone');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!session) return;
    const connection = bridge.current;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    async function poll() {
      const requestedAt = Date.now();
      try {
        const data = await motionRequest<{
          sample: RemoteMotion['sample'] | null;
          age: number | null;
          command?: PhoneCommand;
        }>(
          {
            action: 'read',
            id: session!.id,
            screen: { ...bridge.current.screen, now: Date.now() },
            ack: bridge.current.ack,
          },
          session!.host,
          abort.signal,
        );
        if (stopped) return;
        bridge.current.connected =
          !!data.sample && data.age !== null && data.age < 600;
        if (data.command && data.command.id > bridge.current.ack) {
          if (
            data.command.scene === bridge.current.screen.id &&
            data.age !== null &&
            data.age < 600
          )
            await bridge.current.handle?.(data.command);
          bridge.current.ack = data.command.id;
        }
        if (data.sample && data.age !== null && data.age < 600) {
          remote.current = {
            sample: data.sample,
            receivedAt: requestedAt - data.age,
          };
          setStatus('Phone connected');
        } else {
          remote.current = null;
          setStatus(
            data.sample
              ? 'Phone paused · reopen the controller'
              : 'Scan with your phone',
          );
        }
      } catch (error) {
        if (stopped) return;
        bridge.current.connected = false;
        remote.current = null;
        setStatus(error instanceof Error ? error.message : 'Connection lost');
      }
      if (!stopped) timer = setTimeout(poll, 100);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      abort.abort();
      remote.current = null;
      connection.connected = false;
      void motionRequest(
        { action: 'disconnect', id: session.id },
        session.host,
      ).catch(() => {});
    };
  }, [session, remote, bridge]);
  async function connect() {
    setOpen(true);
    if (session || busy) return;
    setBusy(true);
    try {
      let network: string[] = [];
      if (isLoopbackOrigin(location.origin)) {
        const response = await fetch('/__party/origins');
        if (response.ok) {
          const data = await response.json();
          if (
            data &&
            typeof data === 'object' &&
            'origins' in data &&
            Array.isArray(data.origins)
          )
            network = data.origins.filter(
              (value: unknown) => typeof value === 'string',
            );
        }
      }
      const origin = joinOrigins(
        location.origin,
        process.env.NEXT_PUBLIC_PARTY_ORIGIN || '',
        network,
      )[0];
      if (isLoopbackOrigin(origin))
        throw new Error(
          'Open this game on a phone-accessible address, then connect.',
        );
      const next = await motionRequest<Session>({ action: 'create' });
      setSession(next);
      const link = new URL('/controller', origin);
      link.hash = new URLSearchParams({
        id: next.id,
        token: next.phone,
      }).toString();
      setUrl(link.href);
      const QRCode = await import('qrcode');
      setQr(await QRCode.toDataURL(link.href, { width: 220, margin: 2 }));
      setStatus('Scan with your phone');
    } catch (error) {
      setSession(null);
      setStatus(error instanceof Error ? error.message : 'Could not connect');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="secondary"
        onClick={() => (open ? setOpen(false) : void connect())}
      >
        Phone{status === 'Phone connected' ? ' ●' : ''}
      </button>
      {open && (
        <aside className="phone-pairing" aria-label="Connect phone">
          <div className="phone-pairing-heading">
            <strong>Connect phone</strong>
            <button
              className="secondary"
              onClick={() => setOpen(false)}
              aria-label="Close phone panel"
            >
              ×
            </button>
          </div>
          <output>{busy ? 'Creating connection…' : status}</output>
          {qr && (
            <Image
              unoptimized
              src={qr}
              width={220}
              height={220}
              alt="Scan to connect your phone"
            />
          )}
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              Open controller
            </a>
          )}
          {session ? (
            <button
              className="secondary"
              onClick={() => {
                setSession(null);
                setQr('');
                setUrl('');
                setStatus('Scan with your phone');
              }}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void connect()}
            >
              Connect
            </button>
          )}
        </aside>
      )}
    </>
  );
}
