import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import { Box, Button, ButtonBase, IconButton } from '@mui/material';
import { randomLook, type AvatarLook } from '@wemsic/shared';
import { AVATAR_COLORS } from '../../theme';
import { BotAvatar } from './BotAvatar';
import { stepPart } from './lookParts';

const COLOR_NAMES = ['Blue', 'Pink', 'Mint', 'Amber', 'Violet', 'Cyan', 'Orange', 'Ink', 'Red'];
/** The preview's size; the arrow rows line up with the top piece and the visor. */
const PREVIEW = { xs: 150, sm: 190 };
const SWATCH = { xs: 30, sm: 34 };

function Arrow({ dir, label, onClick, row }: { dir: 1 | -1; label: string; onClick: () => void; row: number }) {
  return (
    <IconButton
      aria-label={label}
      onClick={onClick}
      sx={{
        gridColumn: dir === -1 ? 1 : 3,
        gridRow: row,
        width: { xs: 44, sm: 52 },
        height: { xs: 44, sm: 52 },
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.primary',
        '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: 'background.paper' },
      }}
    >
      {dir === -1 ? <ChevronLeftRoundedIcon fontSize="large" /> : <ChevronRightRoundedIcon fontSize="large" />}
    </IconButton>
  );
}

/**
 * Build-your-own mini Eko: arrows beside the top piece change it, arrows
 * beside the visor change the face, one tap on a dot sets the colour, and
 * Shuffle rolls all three.
 */
export function AvatarMaker({ value, onChange }: { value: AvatarLook; onChange: (look: AvatarLook) => void }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `44px ${PREVIEW.xs}px 44px`,
          sm: `52px ${PREVIEW.sm}px 52px`,
        },
        gridTemplateRows: {
          xs: `${PREVIEW.xs * 0.37}px ${PREVIEW.xs * 0.63}px auto auto`,
          sm: `${PREVIEW.sm * 0.37}px ${PREVIEW.sm * 0.63}px auto auto`,
        },
        columnGap: 1.25,
        alignItems: 'center',
        justifyItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Arrow dir={-1} row={1} label="Previous top" onClick={() => onChange(stepPart(value, 'top', -1))} />
      <Box sx={{ gridColumn: 2, gridRow: '1 / span 2', width: PREVIEW, height: PREVIEW }}>
        <BotAvatar look={value} />
      </Box>
      <Arrow dir={1} row={1} label="Next top" onClick={() => onChange(stepPart(value, 'top', 1))} />
      <Arrow dir={-1} row={2} label="Previous face" onClick={() => onChange(stepPart(value, 'face', -1))} />
      <Arrow dir={1} row={2} label="Next face" onClick={() => onChange(stepPart(value, 'face', 1))} />

      <Box
        role="group"
        aria-label="Colour"
        sx={{
          gridColumn: '1 / -1',
          gridRow: 3,
          mt: 2.25,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 1,
          // Two rows: five dots, then four.
          maxWidth: { xs: SWATCH.xs * 5 + 8 * 4, sm: SWATCH.sm * 5 + 8 * 4 },
        }}
      >
        {AVATAR_COLORS.map((c, i) => {
          const on = i === value.color;
          return (
            <ButtonBase
              key={c.bg}
              aria-label={COLOR_NAMES[i]}
              aria-pressed={on}
              onClick={() => onChange({ ...value, color: i })}
              sx={{
                width: SWATCH,
                height: SWATCH,
                borderRadius: '50%',
                bgcolor: c.bg,
                boxShadow: on ? '0 0 0 3px #fff, 0 0 0 6px #14213F' : 'inset 0 0 0 2px rgba(20,33,63,0.12)',
                '&.Mui-focusVisible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 5 },
              }}
            />
          );
        })}
      </Box>

      <Button
        variant="outlined"
        startIcon={<CasinoRoundedIcon />}
        onClick={() => onChange(randomLook())}
        sx={{ gridColumn: '1 / -1', gridRow: 4, mt: 2, borderRadius: 999, borderWidth: 2, fontWeight: 700, fontSize: '1.1rem', px: 2.5, '&:hover': { borderWidth: 2 } }}
      >
        Shuffle
      </Button>
    </Box>
  );
}
