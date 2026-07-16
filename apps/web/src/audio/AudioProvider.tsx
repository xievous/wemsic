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

export interface PlayPreviewOptions {
  /** Loop the 30s preview clip until stop() or the next preview. */
  loop?: boolean;
}

interface AudioContextValue {
  /** True once the player has granted a gesture so previews can autoplay. */
  enabled: boolean;
  /** Call from a user gesture (e.g. a button click) to unlock audio. */
  enableAudio: () => void;
  /** Play a preview url on the shared, already-unlocked element. */
  playPreview: (url?: string | null, options?: PlayPreviewOptions) => void;
  /** Play a short, satisfying "correct guess" click/ding sound effect. */
  playCorrectChime: () => void;
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

type WindowWithWebkitAudio = Window &
  typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPreviewRef = useRef<string | null>(null);
  const pendingLoopRef = useRef(false);
  const unlockedRef = useRef(false);
  const effectCtxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolumeState] = useState<number>(loadStoredVolume);
  const volumeRef = useRef(volume);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
    const el = audioRef.current;
    if (el) el.volume = volume;
  }, [volume]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    const el = audioRef.current;
    if (el) el.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const playPreviewInternal = useCallback(async (url: string, loop: boolean) => {
    const el = audioRef.current;
    if (!el) return;

    el.loop = loop;
    el.muted = false;
    el.volume = volumeRef.current;

    const startPlayback = () => {
      el.currentTime = 0;
      void el.play().catch(() => {});
    };

    resolveSrc(el, url);

    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('loadeddata', onReady);
        resolve();
      };
      const onReady = () => {
        finish();
        startPlayback();
      };
      el.addEventListener('canplay', onReady, { once: true });
      el.addEventListener('loadeddata', onReady, { once: true });
      window.setTimeout(finish, 2500);
    });

    if (el.paused && el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
    }
  }, []);

  const playPendingPreview = useCallback(() => {
    const pending = pendingPreviewRef.current;
    if (!pending || !unlockedRef.current) return;
    void playPreviewInternal(pending, pendingLoopRef.current);
  }, [playPreviewInternal]);

  const enableAudio = useCallback(() => {
    // Mark enabled immediately so the UI updates on the user gesture. Autoplay
    // unlock still runs via the silent clip; previews may play once that resolves
    // or as soon as `enabled` is true (see playPreview).
    setEnabled(true);

    const el = audioRef.current;
    if (!el) {
      unlockedRef.current = true;
      playPendingPreview();
      return;
    }

    try {
      el.loop = false;
      el.muted = false;
      el.volume = volumeRef.current;
      el.src = SILENT_WAV;
      el.currentTime = 0;
      const onUnlocked = () => {
        unlockedRef.current = true;
        playPendingPreview();
      };
      void el.play().then(onUnlocked).catch(onUnlocked);
    } catch {
      unlockedRef.current = true;
      playPendingPreview();
    }
  }, [playPendingPreview]);

  const playPreview = useCallback(
    (url?: string | null, options?: PlayPreviewOptions) => {
      if (!url) return;
      pendingPreviewRef.current = url;
      pendingLoopRef.current = options?.loop ?? false;
      if (!enabledRef.current && !unlockedRef.current) return;
      void playPreviewInternal(url, pendingLoopRef.current);
    },
    [playPreviewInternal],
  );

  useEffect(() => {
    if (enabled) playPendingPreview();
  }, [enabled, playPendingPreview]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = false;
    el.pause();
  }, []);

  const playCorrectChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vol = Math.min(1, Math.max(0, volumeRef.current));
    if (vol <= 0) return;

    let ctx = effectCtxRef.current;
    if (!ctx) {
      const AudioCtor =
        window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioCtor) return;
      ctx = new AudioCtor();
      effectCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = vol * 0.6;
    master.connect(ctx.destination);

    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(2600, now);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.5, now + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    click.connect(clickGain).connect(master);
    click.start(now);
    click.stop(now + 0.06);

    [880, 1320].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.012);
      const gain = ctx!.createGain();
      const peak = i === 0 ? 0.32 : 0.14;
      gain.gain.setValueAtTime(0.0001, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain).connect(master);
      osc.start(now + 0.012);
      osc.stop(now + 0.45);
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        enabled,
        enableAudio,
        playPreview,
        playCorrectChime,
        stop,
        volume,
        setVolume,
      }}
    >
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
