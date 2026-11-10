import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { Box, ButtonBase, CircularProgress, IconButton, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CoverArt, COVER_SIZE } from './CoverArt';

export interface CarouselCover {
  key: string;
  name: string;
  imageUrl?: string;
  meta: string;
}

const FADE = 56;

/**
 * A row of playlist covers that scrolls sideways. It runs to its card's edges
 * (pass the card's padding as `bleed`), fades out on a side where more covers
 * are hidden, and shows ‹ › buttons there on devices with a mouse.
 */
export function CoverCarousel<T extends CarouselCover>({
  items,
  onPick,
  busyKey,
  disabled,
  loading,
  empty,
  bleed,
}: {
  items: T[];
  onPick: (item: T) => void;
  /** The cover being added right now: it shows a spinner. */
  busyKey?: string | null;
  disabled?: boolean;
  /** Show placeholder covers instead of items. */
  loading?: boolean;
  /** Shown instead of the row when there are no items. */
  empty?: React.ReactNode;
  /** The card's horizontal padding, in theme spacing units, per breakpoint. */
  bleed: { xs: number; sm: number };
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    syncEdges();
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges, items.length, loading]);

  // A new list (search results, or the presets again) starts from the left.
  const firstKey = items[0]?.key;
  useEffect(() => {
    rowRef.current?.scrollTo({ left: 0 });
  }, [firstKey, loading]);

  const page = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth - 120), behavior: 'smooth' });
  };

  if (!loading && items.length === 0) {
    return <Box sx={{ py: 3 }}>{empty}</Box>;
  }

  const mask =
    edges.left && edges.right
      ? `linear-gradient(90deg, transparent, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent)`
      : edges.right
        ? `linear-gradient(90deg, #000 calc(100% - ${FADE}px), transparent)`
        : edges.left
          ? `linear-gradient(90deg, transparent, #000 ${FADE}px)`
          : undefined;

  const arrowSx = {
    position: 'absolute',
    zIndex: 2,
    top: { xs: 52, sm: 62 },
    width: 44,
    height: 44,
    bgcolor: 'background.paper',
    border: '1px solid rgba(20,33,63,0.08)',
    boxShadow: '0 8px 20px -10px rgba(20,33,63,0.45)',
    '&:hover': { bgcolor: 'background.paper', color: 'primary.main' },
    // Phones swipe; the buttons are for mice.
    '@media (hover: none)': { display: 'none' },
  } as const;

  return (
    <Box sx={{ position: 'relative', mx: { xs: -bleed.xs, sm: -bleed.sm } }}>
      {edges.left && (
        <IconButton aria-label="Previous playlists" onClick={() => page(-1)} sx={{ ...arrowSx, left: 8 }}>
          <ChevronLeftRoundedIcon />
        </IconButton>
      )}
      <Box
        ref={rowRef}
        onScroll={syncEdges}
        role="list"
        sx={{
          display: 'flex',
          gap: 1.75,
          overflowX: 'auto',
          px: { xs: bleed.xs, sm: bleed.sm },
          pt: 1,
          pb: 1.5,
          scrollPaddingInline: { xs: `${bleed.xs * 8}px`, sm: `${bleed.sm * 8}px` },
          scrollSnapType: 'x proximity',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      >
        {loading
          ? Array.from({ length: 6 }, (_, i) => <PlaceholderCover key={i} />)
          : items.map((item) => (
              <ButtonBase
                key={item.key}
                role="listitem"
                aria-label={`Add ${item.name}`}
                disabled={disabled}
                onClick={() => onPick(item)}
                sx={{
                  flex: '0 0 auto',
                  width: COVER_SIZE,
                  display: 'block',
                  textAlign: 'left',
                  borderRadius: '14px',
                  scrollSnapAlign: 'start',
                  '&.Mui-disabled': { opacity: busyKey === item.key ? 1 : 0.6 },
                  '&.Mui-focusVisible .cover-art': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                <Box className="cover-art" sx={{ position: 'relative', borderRadius: '14px' }}>
                  <CoverArt name={item.name} imageUrl={item.imageUrl} />
                  {busyKey === item.key && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '14px',
                        bgcolor: 'rgba(20,33,63,0.6)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        alignContent: 'center',
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={28} color="inherit" />
                      <Typography fontWeight={700}>Adding…</Typography>
                    </Box>
                  )}
                </Box>
                <CoverCaption name={item.name} meta={item.meta} />
              </ButtonBase>
            ))}
      </Box>
      {edges.right && (
        <IconButton aria-label="More playlists" onClick={() => page(1)} sx={{ ...arrowSx, right: 8 }}>
          <ChevronRightRoundedIcon />
        </IconButton>
      )}
    </Box>
  );
}

export function CoverCaption({ name, meta }: { name: string; meta: string }) {
  return (
    <>
      <Typography fontWeight={700} noWrap sx={{ mt: 1, fontSize: '1rem' }}>
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {meta}
      </Typography>
    </>
  );
}

function PlaceholderCover() {
  return (
    <Box aria-hidden sx={{ flex: '0 0 auto', width: COVER_SIZE }}>
      <Box
        sx={{
          width: COVER_SIZE,
          height: COVER_SIZE,
          borderRadius: '14px',
          bgcolor: '#E6EDF8',
          animation: 'cover-pulse 1.1s ease-in-out infinite alternate',
          '@keyframes cover-pulse': { to: { opacity: 0.45 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Box sx={{ mt: 1.25, height: 14, width: '70%', borderRadius: 1, bgcolor: '#E6EDF8' }} />
      <Box sx={{ mt: 0.75, height: 11, width: '45%', borderRadius: 1, bgcolor: '#E6EDF8' }} />
    </Box>
  );
}
