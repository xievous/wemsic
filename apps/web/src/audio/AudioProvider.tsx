import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// A tiny silent WAV used to "unlock" autoplay on the shared audio element from
// a user gesture (tapping Enable sound). Once unlocked, later programmatic
// play() calls on the same element are allowed by browser autoplay policies.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const VOLUME_STORAGE_KEY = 'wemsic.volume';
const DEFAULT_VOLUME = 0.8;

function loadStoredVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed));
  } catch {
    /* ignore */
  }
  return DEFAULT_VOLUME;
}

interface AudioContextValue {
  /** True once the player has granted a gesture so previews can autoplay. */
  enabled: boolean;
  /** Call from a user gesture (e.g. a button click) to unlock audio. */
  enableAudio: () => void;
  /** Play a preview url on the shared, already-unlocked element. */
  playPreview: (url?: string | null) => void;
  /** Stop playback. */
  stop: () => void;
  /** Current playback volume, 0 to 1. Persists across rounds and replays. */
  volume: number;
  /** Update the playback volume (0 to 1). */
  setVolume: (value: number) => void;
}

const Ctx = createContext<AudioContextValue | null>(null);

function resolveSrc(el: HTMLAudioElement, url: string): void {
  try {
    const abs = new URL(url, window.location.href).href;
    if (el.src !== abs) el.src = url;
  } catch {
    if (el.src !== url) el.src = url;
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPreviewRef = useRef<string | null>(null);
  const unlockedRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolumeState] = useState<number>(loadStoredVolume);

  // Keep the shared audio element in sync with the current volume. This runs on
  // mount and whenever volume changes, so the setting carries across rounds and
  // into a replay without any per-round wiring.
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [volume]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    const el = audioRef.current;
    if (el) el.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const playPreviewInternal = useCallback((url: string) => {
    const el = audioRef.current;
    if (!el) return;
    resolveSrc(el, url);
    el.muted = false;
    el.volume = volume;
    el.currentTime = 0;
    void el.play().catch(() => {});
  }, [volume]);

  const playPendingPreview = useCallback(() => {
    const pending = pendingPreviewRef.current;
    if (pending) playPreviewInternal(pending);
  }, [playPreviewInternal]);

  const enableAudio = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      try {
        el.src = SILENT_WAV;
        el.currentTime = 0;
        // Unlock in the user gesture, then immediately chain the first real
        // preview (if one was queued) while the gesture is still active.
        void el
          .play()
          .then(() => {
            unlockedRef.current = true;
            playPendingPreview();
          })
          .catch(() => {});
      } catch {
        /* ignore */
      }
    }
    setEnabled(true);
  }, [playPendingPreview]);

  const playPreview = useCallback(
    (url?: string | null) => {
      if (!url) return;
      pendingPreviewRef.current = url;
      if (!enabled && !unlockedRef.current) return;
      playPreviewInternal(url);
    },
    [enabled, playPreviewInternal],
  );

  // If a round starts right after lobby unlock, the preview may have been
  // queued before the silent clip finished — replay once we're enabled.
  useEffect(() => {
    if (enabled) playPendingPreview();
  }, [enabled, playPendingPreview]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  return (
    <Ctx.Provider value={{ enabled, enableAudio, playPreview, stop, volume, setVolume }}>
      <audio ref={audioRef} preload="auto" style={{ display: 'none' }} />
      {children}
    </Ctx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}

