import type { PlayerPlaylist } from '@wemsic/shared';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';

function PlaylistTile({
  playlist,
  onRemove,
  removing,
  disabled,
}: {
  playlist: PlayerPlaylist;
  onRemove: () => void;
  removing?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={`${playlist.name} · ${playlist.trackCount} tracks`} enterDelay={400}>
      <Box
        sx={{
          position: 'relative',
          width: 76,
          flexShrink: 0,
          opacity: removing ? 0.45 : 1,
          transition: 'opacity 160ms ease',
          '&:hover .playlist-delete, &:focus-within .playlist-delete': { opacity: 1 },
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: 'auto',
            borderRadius: '14px',
            overflow: 'hidden',
            bgcolor: 'rgba(20,33,63,0.06)',
            boxShadow: '0 8px 20px -14px rgba(14,26,60,0.35)',
          }}
        >
          {playlist.thumbnailUrl ? (
            <Box
              component="img"
              src={playlist.thumbnailUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: 'text.secondary',
              }}
            >
              <MusicNoteRoundedIcon sx={{ fontSize: 22, opacity: 0.55 }} />
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          noWrap
          sx={{
            display: 'block',
            mt: 0.75,
            textAlign: 'center',
            color: 'text.secondary',
            fontWeight: 600,
            px: 0.25,
          }}
        >
          {playlist.name}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Remove ${playlist.name}`}
          disabled={disabled || removing}
          onClick={onRemove}
          className="playlist-delete"
          sx={{
            position: 'absolute',
            top: -6,
            right: 2,
            width: 22,
            height: 22,
            bgcolor: 'background.paper',
            border: '1px solid rgba(20,33,63,0.1)',
            boxShadow: '0 4px 12px -6px rgba(14,26,60,0.35)',
            color: 'text.secondary',
            opacity: 0,
            transition: 'opacity 140ms ease, color 140ms ease, background-color 140ms ease',
            '&:hover': {
              color: 'error.main',
              bgcolor: 'rgba(255,84,112,0.08)',
              borderColor: 'rgba(255,84,112,0.25)',
            },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Tooltip>
  );
}

export function MyPlaylistsStrip({
  playlists,
  removingId,
  onRemove,
  disabled,
}: {
  playlists: PlayerPlaylist[];
  removingId?: string | null;
  onRemove: (playlistId: string) => void;
  disabled?: boolean;
}) {
  if (playlists.length === 0) return null;

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Your playlists · {playlists.reduce((sum, p) => sum + p.trackCount, 0)} tracks
      </Typography>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          overflowX: 'auto',
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          scrollbarWidth: 'thin',
        }}
      >
        {playlists.map((playlist) => (
          <PlaylistTile
            key={playlist.id}
            playlist={playlist}
            onRemove={() => onRemove(playlist.id)}
            removing={removingId === playlist.id}
            disabled={disabled}
          />
        ))}
      </Stack>
    </Stack>
  );
}
