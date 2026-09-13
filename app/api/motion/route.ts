import { database } from '@/db/raw';
import {
  validMotion,
  validPhoneCommand,
  type PhoneMotion,
  type PhoneScreen,
  type PhoneCommand,
} from '@/lib/game/phone-motion';
export const dynamic = 'force-dynamic';
type Session = {
  host: string;
  phone: string;
  sample: PhoneMotion | null;
  seen: number;
  screen?: PhoneScreen;
  screenAt?: number;
  ack?: number;
  command?: PhoneCommand;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(req: Request) {
  try {
    if (
      req.headers.get('origin') &&
      req.headers.get('origin') !== new URL(req.url).origin
    )
      return json({ error: 'Invalid request origin.' }, 403);
    const raw = await req.text();
    if (raw.length > 65536) return json({ error: 'Request too large.' }, 413);
    const body = JSON.parse(raw);
    const now = Date.now();
    if (body.action === 'create') {
      const id = `motion-${crypto.randomUUID()}`;
      const session: Session = {
        host: crypto.randomUUID(),
        phone: crypto.randomUUID(),
        sample: null,
        seen: 0,
      };
      await database()
        .prepare(
          'INSERT INTO rooms(code,state,version,expires_at) VALUES(?,?,0,?)',
        )
        .bind(id, JSON.stringify(session), now + 3600000)
        .run();
      return json({ id, host: session.host, phone: session.phone });
    }
    if (typeof body.id !== 'string' || !/^motion-[a-f0-9-]{36}$/.test(body.id))
      return json({ error: 'Invalid phone link.' }, 400);
    const row = await database()
      .prepare('SELECT state FROM rooms WHERE code = ? AND expires_at > ?')
      .bind(body.id, now)
      .first<{ state: string }>();
    if (!row)
      return json({ error: 'Connection expired. Scan a new QR code.' }, 404);
    const session = JSON.parse(row.state) as Session;
    const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
    if (body.action === 'read' && token === session.host) {
      if (body.screen) {
        if (
          typeof body.screen.id !== 'string' ||
          !Number.isSafeInteger(body.ack) ||
          body.ack < 0
        )
          return json({ error: 'Invalid scene.' }, 400);
        // Update independent JSON paths so simultaneous phone writes cannot be lost.
        await database()
          .prepare(
            "UPDATE rooms SET state = json_set(state, '$.screen', json(?), '$.screenAt', ?, '$.ack', ?) WHERE code = ? AND expires_at > ?",
          )
          .bind(JSON.stringify(body.screen), now, body.ack, body.id, now)
          .run();
      }
      return json({
        sample: session.sample,
        age: session.seen ? now - session.seen : null,
        command: session.command,
      });
    }
    if (body.action === 'disconnect' && token === session.host) {
      await database()
        .prepare('DELETE FROM rooms WHERE code = ?')
        .bind(body.id)
        .run();
      return json({ ok: true });
    }
    if (body.action === 'sample' && token === session.phone) {
      if (!validMotion(body.sample))
        return json({ error: 'Invalid sensor readings.' }, 400);
      if (body.command !== undefined && !validPhoneCommand(body.command))
        return json({ error: 'Invalid phone action.' }, 400);
      const result = await database()
        .prepare(
          "UPDATE rooms SET state = json_set(state, '$.sample', json(?), '$.seen', ?, '$.command', json(?)) WHERE code = ? AND expires_at > ?",
        )
        .bind(
          JSON.stringify(body.sample),
          now,
          JSON.stringify(body.command ?? null),
          body.id,
          now,
        )
        .run();
      if (!result.meta.changes)
        return json({ error: 'Connection ended. Scan a new QR code.' }, 404);
      return json({
        ok: true,
        screen: session.screen,
        ack: session.ack ?? 0,
        age: session.screenAt ? now - session.screenAt : null,
        serverNow: now,
      });
    }
    return json({ error: 'Invalid phone connection.' }, 401);
  } catch {
    return json({ error: 'Phone connection unavailable. Try again.' }, 503);
  }
}
