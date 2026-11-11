import { Alert, Box, Button, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TvRoundedIcon from '@mui/icons-material/TvRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import type { RoomType } from '@wemsic/shared';
import { useNavigate } from 'react-router-dom';
import { createRoomWithHost } from '../api/client';
import { AvatarMaker } from '../components/avatar/AvatarMaker';
import { BIG_BUTTON_SX, BigField, FormCard, MakerAndFields } from '../components/FormCard';
import { Layout } from '../components/Layout';
import { loadSavedLook, loadSavedName, saveLook, saveSession } from '../hooks/useSession';
import { useSocket } from '../socket/SocketContext';

/** One way to play: a big icon, two to four words, one short line. */
function ModeTile({
  active,
  onClick,
  Icon,
  title,
  line,
}: {
  active: boolean;
  onClick: () => void;
  Icon: SvgIconComponent;
  title: string;
  line: string;
}) {
  return (
    <ButtonBase
      aria-pressed={active}
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        textAlign: 'left',
        gap: { xs: 0.75, sm: 1.25 },
        p: { xs: 1.75, sm: 2.75 },
        minHeight: { sm: 150 },
        borderRadius: { xs: '18px', sm: '22px' },
        border: '3px solid',
        borderColor: active ? 'primary.main' : 'rgba(20,33,63,0.1)',
        bgcolor: active ? 'rgba(58,107,255,0.08)' : 'background.paper',
        transition: 'border-color 150ms ease, background-color 150ms ease',
        '&:hover': { borderColor: active ? 'primary.main' : 'rgba(58,107,255,0.5)' },
        '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 3 },
      }}
    >
      {active && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 10, sm: 16 },
            right: { xs: 10, sm: 16 },
            width: { xs: 26, sm: 36 },
            height: { xs: 26, sm: 36 },
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
        </Box>
      )}
      <Icon sx={{ fontSize: { xs: 40, sm: 60 }, color: active ? 'primary.main' : 'text.secondary' }} />
      <Typography
        sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 700, fontSize: { xs: '1.3rem', sm: '1.9rem' }, lineHeight: 1.05 }}
      >
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ fontWeight: 500, fontSize: { xs: '0.95rem', sm: '1.2rem' } }}>
        {line}
      </Typography>
    </ButtonBase>
  );
}

export function CreateRoom() {
  const navigate = useNavigate();
  const { resetRoomState } = useSocket();
  const [name, setName] = useState(loadSavedName);
  const [look, setLook] = useState(loadSavedLook);
  const [roomType, setRoomType] = useState<RoomType>('online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // On one big screen the host only runs the game, so there's no name or avatar to set.
  const plays = roomType === 'online';

  useEffect(() => {
    resetRoomState();
  }, [resetRoomState]);

  async function handleCreate() {
    const displayName = plays ? name.trim() : 'Host';
    if (!displayName) {
      setError('Enter your name to keep going');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { roomCode, playerId } = await createRoomWithHost(displayName, roomType, plays ? look : undefined);
      resetRoomState();
      if (plays) saveLook(look);
      // Only a real name is remembered for next time, never the screen's "Host".
      saveSession({ roomCode, playerId, displayName }, { rememberName: plays });
      navigate(`/lobby/${roomCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the room. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const createButton = (
    <Button
      variant="contained"
      size="large"
      onClick={handleCreate}
      disabled={loading}
      fullWidth
      startIcon={loading ? undefined : <PlayArrowRoundedIcon sx={{ transform: 'scale(1.4)' }} />}
      sx={BIG_BUTTON_SX}
    >
      {loading ? <CircularProgress size={30} color="inherit" /> : 'Create room'}
    </Button>
  );

  return (
    <Layout maxWidth="md">
      <FormCard title="Host a game">
        <Box
          role="group"
          aria-label="How you're playing"
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: { xs: 1.25, sm: 2 }, mb: { xs: 2.5, sm: 3.5 } }}
        >
          <ModeTile
            active={roomType === 'online'}
            onClick={() => setRoomType('online')}
            Icon={PhoneIphoneRoundedIcon}
            title="Everyone on phones"
            line="Each phone plays the music"
          />
          <ModeTile
            active={roomType === 'host'}
            onClick={() => setRoomType('host')}
            Icon={TvRoundedIcon}
            title="One big screen"
            line="This screen plays, phones answer"
          />
        </Box>

        {plays ? (
          <MakerAndFields maker={<AvatarMaker value={look} onChange={setLook} />}>
            <BigField
              id="create-name"
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              inputProps={{ maxLength: 24 }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            {createButton}
          </MakerAndFields>
        ) : (
          <Stack spacing={2.25}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '18px', bgcolor: 'rgba(58,107,255,0.08)' }}
            >
              <TvRoundedIcon sx={{ fontSize: { xs: 36, sm: 44 }, color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 600, fontSize: { xs: '1.05rem', sm: '1.3rem' } }}>
                This screen runs the game. You won&apos;t play.
              </Typography>
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            {createButton}
          </Stack>
        )}
      </FormCard>
    </Layout>
  );
}
