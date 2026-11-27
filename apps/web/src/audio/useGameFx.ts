import { useCallback } from 'react';
import { useSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { useAudio } from './AudioProvider';
import { buzz, deviceRole, fxPlan, type FxEvent } from './fx';

/**
 * Fire a game moment on this device: the sound and/or the phone buzz that
 * suit what this device is (big screen, online player or host-mode phone).
 * Both follow the Effects switch; sounds also need sound to be enabled.
 */
export function useGameFx() {
  const { lobby } = useSocket();
  const session = useSession();
  const { playSfx, effectsOn } = useAudio();
  const role = deviceRole(lobby, session?.playerId);

  return useCallback(
    (event: FxEvent, arg?: number) => {
      const plan = fxPlan(event, role);
      if (plan.sound) playSfx(event, arg);
      if (plan.buzz && effectsOn) buzz(plan.buzz);
    },
    [role, playSfx, effectsOn],
  );
}
