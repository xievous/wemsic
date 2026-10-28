import { Box, Button, IconButton, Popover, Slider, Stack, Tooltip, Typography } from '@mui/material';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeDownRoundedIcon from '@mui/icons-material/VolumeDownRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { useState } from 'react';

export function EnableSoundButton({ onClick, sx }: { onClick: () => void; sx?: object }) {
  return (
    <Tooltip title="Enable sound">
      <IconButton
        aria-label="Enable sound"
        onClick={onClick}
        sx={{
          color: 'rgba(255,255,255,0.7)',
          p: 0.5,
          '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
          ...sx,
        }}
      >
        <VolumeOffRoundedIcon />
      </IconButton>
    </Tooltip>
  );
}

export function FloatingEnableSound({ onEnable }: { onEnable: () => void }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 16, sm: 24 },
        right: { xs: 16, sm: 24 },
        zIndex: 10,
      }}
    >
      <Button
        size="small"
        variant="outlined"
        startIcon={<VolumeUpRoundedIcon sx={{ fontSize: 18 }} />}
        onClick={onEnable}
        sx={{
          borderRadius: 999,
          px: 1.75,
          py: 0.5,
          fontSize: '0.8125rem',
          fontWeight: 600,
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(20,33,63,0.12)',
          color: 'text.secondary',
          boxShadow: '0 4px 20px -8px rgba(14,26,60,0.2)',
          '&:hover': {
            bgcolor: 'background.paper',
            borderColor: 'primary.main',
            color: 'primary.main',
          },
        }}
      >
        Enable sound
      </Button>
    </Box>
  );
}

export function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (value: number) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const muted = volume === 0;
  const VolumeIcon = muted
    ? VolumeOffRoundedIcon
    : volume < 0.5
      ? VolumeDownRoundedIcon
      : VolumeUpRoundedIcon;

  return (
    <>
      <IconButton
        aria-label="Adjust volume"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ color: '#fff', p: 0.5 }}
      >
        <VolumeIcon />
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'visible' } } }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ px: 1.5, py: 1, width: 180 }}
        >
          <Slider
            aria-label="Volume"
            size="small"
            value={Math.round(volume * 100)}
            onChange={(_, v) => onChange((Array.isArray(v) ? v[0] : v) / 100)}
            min={0}
            max={100}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          >
            {Math.round(volume * 100)}%
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}
