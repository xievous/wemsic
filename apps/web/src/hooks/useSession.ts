import { useState } from 'react';

const SESSION_KEY = 'wemsic_session';

export interface Session {
  roomCode: string;
  playerId: string;
  displayName: string;
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
