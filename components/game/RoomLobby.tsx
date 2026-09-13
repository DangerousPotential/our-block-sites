'use client';
import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, ArrowRight, Smartphone, Users } from 'lucide-react';
import type { PublicRoom } from '@/lib/game/engine';
import Sprite from './Sprite';
import {
  isLoopbackOrigin,
  joinOrigins,
  roomJoinUrl,
} from '@/lib/game/join-link';
export default function RoomLobby({
  room,
  host,
  busy,
  onStart,
  onGodMode,
  assetDownload,
  joinPath = '/',
  capacity = 4,
}: {
  room: PublicRoom;
  host: boolean;
  busy: boolean;
  onStart: () => void;
  onGodMode?: () => void;
  assetDownload?: ReactNode;
  joinPath?: string;
  capacity?: number;
}) {
  const [qrResult, setQrResult] = useState({ url: '', image: '' }),
    [origins, setOrigins] = useState<string[]>([]),
    [origin, setOrigin] = useState(''),
    [copied, setCopied] = useState(false);
  const url = origin ? roomJoinUrl(origin, room.code, joinPath) : '';
  const qr = qrResult.url === url ? qrResult.image : '';
  useEffect(() => {
    const controller = new AbortController();
    const current = window.location.origin;
    const configured = process.env.NEXT_PUBLIC_PARTY_ORIGIN || '';
    async function resolve() {
      let network: string[] = [];
      if (!configured && isLoopbackOrigin(current)) {
        try {
          const response = await fetch('/__party/origins', {
            signal: controller.signal,
          });
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
        } catch {
          /* The ordinary page URL remains usable without dev discovery. */
        }
      }
      if (controller.signal.aborted) return;
      const available = joinOrigins(current, configured, network);
      setOrigins(available);
      setOrigin(available[0]);
    }
    void resolve();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    let active = true;
    if (!origin) return;
    const u = roomJoinUrl(origin, room.code, joinPath);
    if (isLoopbackOrigin(origin)) return;
    void QRCode.toDataURL(u, {
      width: 192,
      margin: 2,
      color: { dark: '#18254b', light: '#fffaf0' },
    })
      .then((image) => {
        if (active) setQrResult({ url: u, image });
      })
      .catch(() => {
        /* The copyable link remains available if QR generation fails. */
      });
    return () => {
      active = false;
    };
  }, [room.code, origin, joinPath]);
  return (
    <section className="lobby-panel">
      <div className="lobby-heading">
        <h1>{capacity === 2 ? 'Meet at the desk' : 'Gather your kakis'}</h1>
      </div>
      <div className="lobby-layout">
        <div className="join-card">
          {origins.length > 1 && (
            <select
              aria-label="Phone connection address"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
            >
              {origins.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
          )}
          {qr && (
            // Generated QR data URL is already at the exact display size.
            // oxlint-disable-next-line nextjs/no-img-element
            <img
              src={qr}
              alt={`QR code to join room ${room.code}`}
              width={176}
              height={176}
            />
          )}
          <span className="detail-label">ROOM CODE</span>
          <strong className="room-code">{room.code}</strong>
          <button
            className="secondary"
            disabled={!url}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <small>
            {origin && isLoopbackOrigin(origin)
              ? 'Open this page using your Wi-Fi address to connect phones.'
              : room.party
                ? 'Scan with each phone · first player hosts'
                : 'Private room · site access required'}
          </small>
          <small className="party-join-url">{url}</small>
        </div>
        <div className="lobby-seats">
          {Array.from({ length: capacity }, (_, i) => {
            const p = room.players[i];
            return (
              <div className={`seat ${p ? 'occupied' : ''}`} key={i}>
                {p ? (
                  <>
                    <>
                      <Sprite id={p.character} age={p.age} />
                    </>
                    <strong>{p.name}</strong>
                    <span>
                      {p.id === room.host ? 'Host' : 'Ready'}{' '}
                      <Check size={12} />
                    </span>
                  </>
                ) : (
                  <>
                    <div className="empty-seat">
                      <Smartphone size={30} />
                    </div>
                    <span>Waiting…</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="lobby-bottom">
        <span>
          <Users size={17} /> {room.players.length} / {capacity}
        </span>
        {assetDownload}
        {onGodMode && (
          <button className="secondary" onClick={onGodMode}>
            God mode
          </button>
        )}
        {host ? (
          <button
            className="primary"
            disabled={busy || (capacity === 2 && room.players.length !== 2)}
            onClick={onStart}
          >
            Let’s play <ArrowRight size={18} />
          </button>
        ) : (
          <p>Waiting for host…</p>
        )}
      </div>
    </section>
  );
}
