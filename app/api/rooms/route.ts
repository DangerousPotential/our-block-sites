import { enableEraser } from '@/lib/game/eraser';
import { database } from '@/db/raw';
import {
  applyAction,
  makeRoom,
  makePlayer,
  publicRoom,
  settle,
  type Room,
} from '@/lib/game/engine';
import { characters } from '@/lib/game/characters';
import { enableTrip } from '@/lib/game/trip';
import { enableParty } from '@/lib/game/party';
export const dynamic = 'force-dynamic';
const stringValue = (v: unknown, fallback = '') =>
  typeof v === 'string' ? v : fallback;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function token(req: Request) {
  return req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
}
async function read(code: string) {
  const row = await database()
    .prepare(
      'SELECT state, version FROM rooms WHERE code = ? AND expires_at > ?',
    )
    .bind(code, Date.now())
    .first<{ state: string; version: number }>();
  if (!row) throw new Error('Room not found or expired. Check your room code.');
  return { room: JSON.parse(row.state) as Room, version: row.version };
}
async function save(code: string, room: Room, version: number) {
  const r = await database()
    .prepare(
      'UPDATE rooms SET state = ?, version = version + 1 WHERE code = ? AND version = ?',
    )
    .bind(JSON.stringify(room), code, version)
    .run();
  return r.meta.changes === 1;
}
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code')?.toUpperCase() ?? '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const { room, version } = await read(code);
      const viewer = room.players.find((p) => p.token === token(req));
      const display = !!room.displayToken && room.displayToken === token(req);
      if (!viewer && !display)
        return json({ error: 'Rejoin this room to continue.' }, 401);
      const before = JSON.stringify(room);
      if (room.trip && viewer)
        (room.trip.seen ??= {})[
          room.players.find((p) => p.token === token(req))!.id
        ] = Date.now();
      settle(room);
      const changed = before !== JSON.stringify(room);
      if (changed && !(await save(code, room, version))) continue;
      return json({
        room: publicRoom(
          room,
          room.players.find((p) => p.token === token(req))?.id,
        ),
        serverNow: Date.now(),
        revision: version + (changed ? 1 : 0),
      });
    }
    return json({ error: 'The room is busy. Try again.' }, 409);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Could not load room.' },
      400,
    );
  }
}
export async function POST(req: Request) {
  try {
    if (
      req.headers.get('origin') &&
      req.headers.get('origin') !== new URL(req.url).origin
    )
      return json({ error: 'Invalid request origin.' }, 403);
    const body = (await req.json()) as Record<string, unknown>;
    const action = stringValue(body.action);
    if (action === 'create-display' && body.mode === 'eraser')
      return json({ error: 'Open /eraser to create a two-player desk.' }, 400);
    if (
      action === 'create' ||
      action === 'create-display' ||
      action === 'join'
    ) {
      const character = stringValue(body.character, 'merly');
      const age = Number(body.age ?? 0);
      if (
        !characters.some((c) => c.id === character) ||
        ![0, 1, 2].includes(age)
      )
        return json({ error: 'Choose a character and life stage.' }, 400);
      const name =
        stringValue(body.name).trim().slice(0, 20) ||
        characters.find((c) => c.id === character)!.name;
      const p = makePlayer(name, character, age);
      if (action === 'create' || action === 'create-display') {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (const n of crypto.getRandomValues(new Uint8Array(5)))
          code += alphabet[n % alphabet.length];
        const room =
          body.mode === 'eraser'
            ? enableEraser(makeRoom(code, p))
            : body.mode === 'classic'
              ? makeRoom(code, p)
              : body.mode === 'trip'
                ? enableTrip(makeRoom(code, p))
                : enableParty(makeRoom(code, p));
        if (action === 'create-display') {
          room.players = [];
          room.host = '';
          room.displayToken = crypto.randomUUID() + crypto.randomUUID();
        }
        await database()
          .prepare(
            'INSERT INTO rooms(code,state,version,expires_at) VALUES(?,?,0,?)',
          )
          .bind(code, JSON.stringify(room), Date.now() + 86400000)
          .run();
        return json({
          room: publicRoom(room, p.id),
          playerId: action === 'create-display' ? '' : p.id,
          token: action === 'create-display' ? room.displayToken : p.token,
          revision: 0,
          serverNow: Date.now(),
        });
      }
      const code = stringValue(body.code).trim().toUpperCase();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { room, version } = await read(code);
        if (room.phase !== 'lobby')
          throw new Error(
            'This game has started. Ask the host to start a new game.',
          );
        if ((body.mode === 'eraser') !== (room.rulesVersion === 4))
          throw new Error('Open the matching game to join this room.');
        const capacity = room.rulesVersion === 4 ? 2 : 4;
        if (room.players.length >= capacity)
          throw new Error(`This room is full (${capacity} players).`);
        room.players.push(p);
        if (!room.host) room.host = p.id;
        if (await save(code, room, version))
          return json({
            room: publicRoom(room, p.id),
            playerId: p.id,
            token: p.token,
            revision: version + 1,
            serverNow: Date.now(),
          });
      }
      return json({ error: 'The room is busy. Please join again.' }, 409);
    }
    const code = stringValue(body.code).toUpperCase();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { room, version } = await read(code);
      const p = room.players.find((p) => p.token === token(req));
      if (!p) return json({ error: 'Rejoin this room to continue.' }, 401);
      if (room.trip) (room.trip.seen ??= {})[p.id] = Date.now();
      applyAction(room, p.id, action, body);
      if (await save(code, room, version))
        return json({
          room: publicRoom(room, p.id),
          serverNow: Date.now(),
          revision: version + 1,
        });
    }
    return json({ error: 'The room is busy. Try again.' }, 409);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Could not update room.' },
      400,
    );
  }
}
