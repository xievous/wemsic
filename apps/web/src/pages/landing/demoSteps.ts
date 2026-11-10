import type { EkoFace, EkoMove } from '../../components/eko/Eko';

export interface DemoStep {
  verb: string;
  /** One plain line under the verbs while this step is lit. */
  line: string;
  face: EkoFace;
  move: EkoMove;
}

/** Pick. Play. Guess. — how a game goes, one step at a time. */
export const DEMO_STEPS: DemoStep[] = [
  { verb: 'Pick', line: 'Choose a popular playlist or add your own.', face: 'happy', move: 'bob' },
  { verb: 'Play', line: 'Eko plays a short clip.', face: 'focused', move: 'pump' },
  { verb: 'Guess', line: 'Name it first to score.', face: 'starry', move: 'jump' },
];

/** How long each step shows before the next one. */
export const DEMO_STEP_MS = 3400;

export function nextStep(step: number): number {
  return (step + 1) % DEMO_STEPS.length;
}

/**
 * Moves the demo along every `stepMs`. Jumping to a step (a tap on a verb)
 * restarts that step's full time. With `auto` off (reduced motion) it only
 * moves when someone jumps; `pause` holds it while the tab is hidden.
 */
export function createDemoClock({
  onStep,
  auto,
  stepMs = DEMO_STEP_MS,
}: {
  onStep: (step: number) => void;
  auto: boolean;
  stepMs?: number;
}) {
  let step = 0;
  let paused = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!auto || paused) return;
    timer = setTimeout(() => go(nextStep(step)), stepMs);
  }

  function go(n: number) {
    step = n;
    onStep(step);
    schedule();
  }

  return {
    start: () => go(0),
    jump: (n: number) => go(n),
    setPaused(value: boolean) {
      paused = value;
      schedule();
    },
    stop() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
