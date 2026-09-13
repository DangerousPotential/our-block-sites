'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import PhoneConnection from './PhoneConnection';
import type {
  PhoneBridge,
  PhoneCommand,
  RemoteMotion,
} from '@/lib/game/phone-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { publicRoom, type PublicRoom } from '@/lib/game/engine';
import { makeGodModeGame } from '@/lib/game/god-mode';
import {
  MINIGAMES,
  inputMinigame,
  settleMinigame,
  type MinigameId,
} from '@/lib/game/party-games';
import {
  EXPLORATION_ERAS,
  PASTIMES_1950S,
  type WorldEra,
} from '@/lib/game/pastimes1950s';
import { ACTIVITIES, type ActivityId } from '@/lib/game/activities';
import { FreeExplore } from './TripGame';
import PartyMinigame from './PartyMinigame';
import EraserGame from './EraserGame';
import NeighbourhoodVisit from './NeighbourhoodVisit';
import PastimeEncounter from './PastimeEncounter';
import './party.css';
import './god-mode.css';

function InstantMinigame({
  kind,
  era,
  character,
  age,
  getaiMusic = true,
  remote,
  bridge,
  gameAction,
}: {
  remote: RefObject<RemoteMotion | null>;
  bridge: RefObject<PhoneBridge>;
  gameAction: RefObject<
    ((command: PhoneCommand) => Promise<void> | void) | null
  >;
  kind: MinigameId;
  era: WorldEra;
  character: string;
  age: number;
  getaiMusic?: boolean;
}) {
  const [initial] = useState(() => makeGodModeGame(kind, era, character, age));
  const local = useRef(initial);
  const [room, setRoom] = useState<PublicRoom>(() =>
    publicRoom(initial, initial.host),
  );
  useEffect(() => {
    const timer = setInterval(() => {
      settleMinigame(local.current, Date.now());
      setRoom(publicRoom(structuredClone(local.current), local.current.host));
    }, 50);
    return () => clearInterval(timer);
  }, []);
  // The bridge is an imperative transport mailbox shared by the paired screens.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    bridge.current.screen = {
      ...bridge.current.screen,
      room,
      playerId: room.host,
    };
    gameAction.current = (command) => {
      if (command.action === 'input')
        inputMinigame(
          local.current,
          local.current.host,
          command.payload,
          Date.now(),
        );
    };
    return () => {
      gameAction.current = null;
    };
  }, [room, bridge, gameAction]);
  /* oxlint-enable react/react-compiler */
  return (
    <PartyMinigame
      display={bridge.current.connected}
      remoteMotion={remote}
      room={room}
      playerId={room.host}
      offset={0}
      getaiMusic={getaiMusic}
      act={async (action, payload = {}) => {
        if (action !== 'input') return false;
        inputMinigame(local.current, local.current.host, payload, Date.now());
        return true;
      }}
    />
  );
}

export default function GodMode({
  character,
  age,
  onExit,
}: {
  character: string;
  age: number;
  onExit: () => void;
}) {
  const remote = useRef<RemoteMotion | null>(null);
  const [destination, setDestination] = useState(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('play') === 'getai'
      ? 'game:rhythm'
      : 'explore',
  );
  const [era, setEra] = useState<WorldEra>('pastimes');
  const [replay, setReplay] = useState(0);
  const [category, id] = destination.split(':');
  const backToWorld = () => setDestination('explore');
  const sceneId = `${destination}:${era}:${replay}`;
  const bridge = useRef<PhoneBridge>({
    screen: { id: sceneId, destination, era, character, age },
    connected: false,
    ack: 0,
  });
  const gameAction = useRef<
    ((command: PhoneCommand) => Promise<void> | void) | null
  >(null);
  useEffect(() => {
    bridge.current.screen = { id: sceneId, destination, era, character, age };
    remote.current = null;
    bridge.current.handle = async (command) => {
      if (command.action === 'navigate') {
        const next = command.payload.destination;
        if (
          next === 'explore' ||
          next === 'game:eraser' ||
          MINIGAMES.some((g) => `game:${g.id}` === next) ||
          Object.keys(ACTIVITIES).some((id) => `activity:${id}` === next) ||
          PASTIMES_1950S.some((_, i) => `pastime:${i}` === next)
        )
          setDestination(next as string);
        const nextEra = command.payload.era;
        if (EXPLORATION_ERAS.some((e) => e.id === nextEra))
          setEra(nextEra as WorldEra);
      } else if (command.action === 'restart') setReplay((value) => value + 1);
      else await gameAction.current?.(command);
    };
  }, [sceneId, destination, era, character, age]);
  return (
    <section className="god-mode">
      <nav className="god-mode-toolbar" aria-label="God mode">
        <strong>God mode</strong>
        <PhoneConnection remote={remote} bridge={bridge} />
        <label>
          Era
          <select
            aria-label="God mode era"
            disabled={destination === 'game:eraser'}
            value={era}
            onChange={(event) => setEra(event.target.value as WorldEra)}
          >
            {EXPLORATION_ERAS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.id === 'pastimes' ? '1950s' : entry.year} · {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Go to
          <select
            aria-label="God mode destination"
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              setReplay(0);
            }}
          >
            <option value="explore">Walk around</option>
            <optgroup label="Minigames">
              {MINIGAMES.map((game) => (
                <option key={game.id} value={`game:${game.id}`}>
                  {game.name}
                </option>
              ))}
              <option value="game:eraser">Flag Eraser Showdown</option>
            </optgroup>
            <optgroup label="Neighbourhood activities">
              {Object.entries(ACTIVITIES).map(([key, activity]) => (
                <option key={key} value={`activity:${key}`}>
                  {activity.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="1950s pastimes">
              {PASTIMES_1950S.map((pastime, index) => (
                <option key={pastime.id} value={`pastime:${index}`}>
                  {pastime.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => setReplay((value) => value + 1)}
        >
          <RotateCcw size={16} /> Restart
        </button>
        <button className="secondary" onClick={onExit}>
          <ArrowLeft size={16} /> Lobby
        </button>
      </nav>
      <div key={`${destination}:${era}:${replay}`}>
        {category === 'game' && id === 'eraser' ? (
          <EraserGame
            embedded
            initialCharacter={character}
            initialAge={age}
            bridge={bridge}
            gameAction={gameAction}
          />
        ) : category === 'game' ? (
          <InstantMinigame
            bridge={bridge}
            gameAction={gameAction}
            remote={remote}
            kind={id as MinigameId}
            era={era}
            character={character}
            age={age}
          />
        ) : (
          <>
            <FreeExplore
              remoteMotion={remote}
              onWalk={(position) => {
                bridge.current.screen = { ...bridge.current.screen, position };
              }}
              character={character}
              initialEra={category === 'pastime' ? 'pastimes' : era}
              onEraChange={setEra}
              onExit={onExit}
            />
            {category === 'activity' && (
              <NeighbourhoodVisit
                bridge={bridge}
                gameAction={gameAction}
                id={id as ActivityId}
                character={character}
                age={age}
                onClose={backToWorld}
              />
            )}
            {category === 'pastime' && (
              <PastimeEncounter
                bridge={bridge}
                gameAction={gameAction}
                attraction={PASTIMES_1950S[Number(id)]}
                onClose={backToWorld}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
