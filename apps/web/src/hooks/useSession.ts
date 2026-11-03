import { useState } from 'react';

const SESSION_KEY = 'wemsic_session';
// Kept in localStorage, unlike the session, so it survives leaving the room.
const NAME_KEY = 'wemsic_name';

export interface Session {
  roomCode: string;
  playerId: string;
  displayName: string;
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  try {
    localStorage.setItem(NAME_KEY, session.displayName);
  } catch {
    // Storage can be blocked; the name just won't be remembered.
  }
}

/** The name this device last played under, to prefill Create and Join. */
export function loadSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/** Stable session reference for the component lifetime (avoids re-read loops). */
export function useSession(): Session | null {
  const [session] = useState(() => loadSession());
  return session;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
