import type { PublicRoom } from '@/lib/game/engine';
import {
  TEA_CAPACITY_ML,
  teaFoamMultiplier,
  teaPourHeight,
  teaSource,
} from '@/lib/game/teh-tarik';
export const TEA_PLAYER_COLOURS = ['#f6c86a', '#7fd6db', '#ef9fb4', '#bfb1ed'];
export default function TehTarikMeters({
  room,
  playerId,
}: {
  room: PublicRoom;
  playerId?: string;
}) {
  const game = room.party!.game!;
  const sourceY = teaSource(game.seed, game.tick / 30).y;
  const most = Math.max(
    ...room.players.map((p) => game.players[p.id].teaMl ?? 0),
  );
  return (
    <div
      className={`teh-meters ${room.players.length === 1 ? 'teh-meters-solo' : ''}`}
      aria-label="Tea volume and foam scores"
    >
      {room.players.map((p, i) => {
        const state = game.players[p.id],
          volume = state.teaMl ?? 0;
        return (
          <div
            className={`teh-meter ${p.id === playerId ? 'is-you' : ''}`}
            key={p.id}
            style={
              {
                '--tea-player': TEA_PLAYER_COLOURS[i % 4],
              } as React.CSSProperties
            }
          >
            <div className="teh-meter-heading">
              <b>{p.id === playerId ? 'You' : p.name}</b>
              <span>
                {Math.floor(volume)} <small>ml</small>
              </span>
            </div>
            <meter
              min={0}
              max={TEA_CAPACITY_ML}
              value={volume}
              aria-label={`${p.name} tea volume`}
            >
              {Math.floor(volume)} ml
            </meter>
            <div className="teh-meter-detail">
              <span>{Math.floor(state.points)} score</span>
              <span>
                ×{teaFoamMultiplier(state.y, sourceY).toFixed(2)} foam
              </span>
            </div>
            <div className="teh-meter-note">
              {state.catchingTea
                ? 'Catching'
                : volume > 0 && Math.abs(volume - most) < 0.1
                  ? 'Most tea'
                  : `${teaPourHeight(state.y, sourceY).toFixed(2)} m drop`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
