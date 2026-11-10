import type { LobbyState } from '@wemsic/shared';
import { startBlocker } from './startStatus';

/** What the action bar's main button does when tapped. */
export type LobbyActionKind = 'start' | 'cancel' | 'ready' | 'unready' | 'sound';

export interface LobbyAction {
  /** One line on the left of the bar: what the room is waiting for. */
  status: string;
  kind: LobbyActionKind;
  label: string;
  disabled: boolean;
  /** Tapping it should also unlock audio on this device (a tap counts as the gesture). */
  enablesSound: boolean;
  /** Tapping it should also ready this player up first (the online host). */
  readiesFirst: boolean;
}

/**
 * The lobby's one main action for this device, and the status line beside it.
 *
 * In host-screen mode the host runs the shared screen (needs sound, never
 * readies) and players only answer on their phones (ready, no sound). Online,
 * everyone plays on their own device, so everyone needs sound and readies up,
 * the host included. The online host's Start also readies them, so it's one
 * tap; it's enabled when their own ready is the only thing missing.
 */
export function lobbyAction(
  lobby: LobbyState,
  myPlayerId: string,
  { soundOn, countdownLeft }: { soundOn: boolean; countdownLeft: number | null },
): LobbyAction {
  const me = lobby.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const hostMode = lobby.settings.roomType === 'host';
  const needsSound = !hostMode || isHost;
  const needsReady = !hostMode || !isHost;
  const ready = me?.isReady ?? false;
  const counting = countdownLeft !== null && countdownLeft > 0;

  if (isHost) {
    if (counting) {
      return {
        status: 'Tap again to cancel',
        kind: 'cancel',
        label: `Starting in ${countdownLeft}…`,
        disabled: false,
        enablesSound: false,
        readiesFirst: false,
      };
    }
    // Judge the room as if the host were already ready: Start does that for them.
    const asIfReady: LobbyState = needsReady
      ? { ...lobby, players: lobby.players.map((p) => (p.id === myPlayerId ? { ...p, isReady: true } : p)) }
      : lobby;
    const blocker = startBlocker(asIfReady, myPlayerId);
    return {
      status: blocker ?? 'Everyone is ready. Let’s go!',
      kind: 'start',
      label: needsSound && !soundOn ? 'Sound on & start' : 'Start the game',
      disabled: blocker !== null,
      enablesSound: needsSound && !soundOn,
      readiesFirst: needsReady && !ready,
    };
  }

  const waitingLine = startBlocker(lobby, myPlayerId) ?? 'Waiting for the host to start';
  const status = counting ? `The host is starting the game in ${countdownLeft}…` : waitingLine;

  if (ready && needsSound && !soundOn) {
    // Readied on an earlier visit (or before a reload): sound isn't on here yet.
    return {
      status: 'Turn on sound so the songs play on this device',
      kind: 'sound',
      label: 'Turn on sound',
      disabled: false,
      enablesSound: true,
      readiesFirst: false,
    };
  }
  if (ready) {
    return { status, kind: 'unready', label: 'Ready', disabled: false, enablesSound: false, readiesFirst: false };
  }
  return {
    status: counting
      ? status
      : needsSound
        ? 'Tap ready when your music is in. This also turns on sound.'
        : 'Tap ready when your music is in',
    kind: 'ready',
    label: 'I’m ready',
    disabled: false,
    enablesSound: needsSound && !soundOn,
    readiesFirst: false,
  };
}
