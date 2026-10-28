import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAudio } from '../audio/AudioProvider';
import { Layout } from '../components/Layout';
import { useSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';
import { PadView } from './game/PadView';
import { PlayerView } from './game/PlayerView';
import { PresenterView } from './game/PresenterView';
import { FloatingEnableSound } from './game/SoundControls';
import type { GameViewProps } from './game/types';

export function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    round,
    roundProgress,
    reveal,
    lastTypingResult,
    lobby,
    joinRoom,
    connected,
    gameEnd,
  } = useSocket();

  const { enabled: audioEnabled, enableAudio, playPreview, stop } = useAudio();
  const lastAudioKeyRef = useRef<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [revealTimeLeft, setRevealTimeLeft] = useState(0);

  const session = useSession();
  const joinedRef = useRef(false);

  const roundEndsAt = roundProgress?.roundEndsAt ?? round?.roundEndsAt ?? 0;
  const roundDurationMs =
    roundProgress?.roundDurationMs ?? round?.roundDurationMs ?? 1;
  const playerStatuses = roundProgress?.players ?? round?.players ?? [];
  const previewUrl = round?.previewUrl;
  const roundIndex = round?.roundIndex;

  const timerExpired = timeLeft <= 0 && roundEndsAt > 0;
  const showOthersGuesses = lobby?.settings.showOthersGuesses ?? false;

  // Host screen mode splits the experience: the host device is a "presenter"
  // (big visuals + sound, no answering) and players use their phones as answer
  // pads (no sound, no question/visuals). Online mode keeps everyone identical.
  const roomType = lobby?.settings.roomType ?? 'online';
  const amHost = lobby ? lobby.hostPlayerId === session?.playerId : false;
  const isPresenter = roomType === 'host' && amHost;
  const isPad = roomType === 'host' && !amHost;

  useEffect(() => {
    if (!session || session.roomCode !== code?.toUpperCase()) {
      navigate('/');
      return;
    }
    if (!connected || joinedRef.current) return;
    joinedRef.current = true;
    joinRoom(session.roomCode, session.playerId);
  }, [code, connected, joinRoom, navigate, session]);

  useEffect(() => {
    joinedRef.current = false;
  }, [code]);

  useEffect(() => {
    const roomCode = code?.toUpperCase();
    if (gameEnd && session?.roomCode === roomCode) {
      navigate(`/results/${code}`);
    }
    if (lobby && lobby.roomCode === roomCode && lobby.phase === 'lobby') {
      navigate(`/lobby/${code}`);
    }
  }, [gameEnd, lobby, code, navigate, session?.roomCode]);

  useEffect(() => {
    if (!roundEndsAt) return;
    const tick = () => setTimeLeft(Math.max(0, roundEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [roundEndsAt]);

  const revealEndsAt = reveal?.nextRoundStartsAt ?? 0;
  const revealDurationMs = reveal?.betweenRoundsDelayMs ?? 1;

  useEffect(() => {
    if (!revealEndsAt) return;
    const tick = () => setRevealTimeLeft(Math.max(0, revealEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [revealEndsAt]);

  useEffect(() => {
    // Player pads never play audio in host mode — the host screen is the only
    // sound source. Queue the preview even before sound is unlocked so round 1
    // plays as soon as the user taps Enable sound.
    if (isPad) return;
    if (previewUrl === undefined || roundIndex === undefined) return;
    const key = `${roundIndex}:${previewUrl}`;
    if (lastAudioKeyRef.current === key) return;
    lastAudioKeyRef.current = key;
    playPreview(previewUrl, { loop: true });
  }, [previewUrl, roundIndex, playPreview, isPad]);

  // Keep the preview playing through reveal until the next round starts.
  // playPreview swaps tracks on round:start; only stop when fully idle.
  useEffect(() => {
    if (round || reveal) return;
    stop();
  }, [reveal, round, stop]);

  // Stop playback when leaving the game screen.
  useEffect(() => () => stop(), [stop]);

  if (!session) return null;

  const myStatus = playerStatuses.find((p) => p.playerId === session.playerId);
  const viewProps: GameViewProps = {
    playerId: session.playerId,
    round,
    reveal,
    playerStatuses,
    timeLeft,
    progress: roundEndsAt > 0 ? Math.min(100, (timeLeft / roundDurationMs) * 100) : 0,
    revealProgress:
      revealEndsAt > 0 ? Math.min(100, (revealTimeLeft / revealDurationMs) * 100) : 0,
    timerExpired,
    showOthersGuesses,
    myBothCorrect: showOthersGuesses
      ? lastTypingResult?.bothCorrect
      : myStatus?.bothCorrect,
  };

  const showFloatingEnableSound = !audioEnabled && !isPad && (!round || Boolean(reveal));

  return (
    <Layout maxWidth={isPresenter ? 'lg' : 'md'}>
      {isPresenter ? (
        <PresenterView {...viewProps} />
      ) : isPad ? (
        <PadView {...viewProps} />
      ) : (
        <PlayerView {...viewProps} />
      )}
      {showFloatingEnableSound && <FloatingEnableSound onEnable={enableAudio} />}
    </Layout>
  );
}
