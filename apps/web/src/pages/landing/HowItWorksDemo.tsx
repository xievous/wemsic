import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Box, ButtonBase, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import type { AvatarLook, CatalogSearchResult } from '@wemsic/shared';
import { useEffect, useState } from 'react';
import { fetchPresetPlaylists } from '../../api/client';
import { BouncingBars } from '../../components/BouncingBars';
import { Eko } from '../../components/eko/Eko';
import { INK, TILE_COLORS } from '../../theme';
import { BotAvatar, lookColor } from '../../components/avatar/BotAvatar';
import { presetResults } from '../lobby/coverItems';
import { DEMO_STEPS, DEMO_STEP_MS } from './demoSteps';

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const drop = keyframes`
  from { transform: translateY(-260px) rotate(var(--from)); opacity: 0; }
  60% { opacity: 1; }
  to { transform: translateY(0) rotate(var(--to)); opacity: 1; }
`;
const ringTick = keyframes`from { stroke-dashoffset: 0; } to { stroke-dashoffset: 100; }`;
const floatUp = keyframes`
  0% { opacity: 0; transform: translateY(0) rotate(-10deg); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-80px) rotate(12deg); }
`;
const popIn = keyframes`from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); }`;
const plusUp = keyframes`
  0% { opacity: 0; transform: translateY(20px) scale(0.6); }
  30% { opacity: 1; transform: translateY(0) scale(1.1); }
  80% { opacity: 1; transform: translateY(-14px) scale(1); }
  100% { opacity: 0; transform: translateY(-30px); }
`;
const tapPress = keyframes`
  0% { opacity: 0; transform: scale(1.4); }
  40% { opacity: 1; transform: scale(1); }
  70% { opacity: 1; transform: scale(0.7); }
  100% { opacity: 0; transform: scale(1.5); }
`;
const fill = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`;

const PICKERS = [
  { name: 'Oscar', look: { color: 0, face: 0, top: 2 } },
  { name: 'Sam', look: { color: 1, face: 3, top: 6 } },
  { name: 'Jo', look: { color: 3, face: 2, top: 4 } },
];
/** The popular playlists the Pick step drops in, by preset id. */
const DEMO_PRESETS = ['80s', 'disney', 'top-hits-global'];
const ANSWERS = ['Blinding Lights', 'Take On Me', 'Africa', 'Levitating'];
const RIGHT_ANSWER = 1;
/** Tile colours for the four answers, skipping the teal that looks like a right answer. */
const ANSWER_TILES = [TILE_COLORS[0], TILE_COLORS[1], TILE_COLORS[3], TILE_COLORS[5]];

export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function Avatar({ look }: { look: AvatarLook }) {
  return (
    <Box sx={{ width: 30, height: 30, flexShrink: 0 }}>
      <BotAvatar look={look} />
    </Box>
  );
}

/** Pick: three popular playlists drop into a pile, each tagged with who picked it. */
function PickScene({ covers, still }: { covers: (CatalogSearchResult | undefined)[]; still: boolean }) {
  const tilts = [
    { from: '-20deg', to: '-9deg', left: 0, top: 30 },
    { from: '18deg', to: '5deg', left: 70, top: 70 },
    { from: '-14deg', to: '-2deg', left: 130, top: 120 },
  ];
  return (
    <Box
      sx={{
        position: 'absolute',
        // Towards the middle of the stage, leaving Eko room on the right.
        left: { xs: 14, md: '14%' },
        top: { xs: 26, md: '12%' },
        width: 300,
        height: 320,
        transform: { xs: 'scale(0.72)', md: 'none' },
        transformOrigin: 'top left',
      }}
    >
      {PICKERS.map((p, i) => {
        const cover = covers[i];
        const t = tilts[i]!;
        return (
          <Box
            key={p.name}
            sx={{
              position: 'absolute',
              left: t.left,
              top: t.top,
              width: 170,
              height: 170,
              borderRadius: '16px',
              background: `linear-gradient(140deg, ${lookColor(p.look)}, #3A6BFF)`,
              boxShadow: '0 18px 30px -16px rgba(20,33,63,0.55)',
              '--from': t.from,
              '--to': t.to,
              transform: `rotate(${t.to})`,
              animation: still ? 'none' : `${drop} 650ms cubic-bezier(.34,1.45,.64,1) ${150 + i * 550}ms both`,
            }}
          >
            {cover?.thumbnailUrl && (
              <Box
                component="img"
                src={cover.thumbnailUrl}
                alt=""
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px', display: 'block' }}
              />
            )}
            <Box
              sx={{
                position: 'absolute',
                left: 10,
                bottom: -14,
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: 'background.paper',
                borderRadius: 999,
                py: 0.5,
                pl: 0.5,
                pr: 1.25,
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 6px 16px -8px rgba(20,33,63,0.45)',
              }}
            >
              <Avatar look={p.look} />
              {p.name}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** Play: the clip plays on a dark stage while the round timer runs down. */
function PlayScene({ still }: { still: boolean }) {
  const [secs, setSecs] = useState(still ? 12 : 15);
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setSecs((s) => Math.max(9, s - 1)), DEMO_STEP_MS / 6);
    return () => clearInterval(id);
  }, [still]);

  const notes = [
    { ch: '♪', left: '18%', top: { xs: 190, md: 250 }, color: 'primary.main', delay: 0.2 },
    { ch: '♫', left: '74%', top: { xs: 200, md: 260 }, color: 'success.main', delay: 1 },
    { ch: '♪', left: '30%', top: { xs: 215, md: 280 }, color: '#FF5C9E', delay: 1.6 },
  ];
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: { xs: 22, md: 34 },
          transform: 'translateX(-50%)',
          width: { xs: '90%', md: '82%' },
          height: { xs: 150, md: 200 },
          borderRadius: '22px',
          bgcolor: INK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 3, md: 4.5 },
          color: '#fff',
          boxShadow: '0 20px 40px -24px rgba(20,33,63,0.8)',
        }}
      >
        <BouncingBars variant="stageLarge" />
        <Box sx={{ position: 'relative', width: { xs: 80, md: 104 }, height: { xs: 80, md: 104 } }}>
          <svg viewBox="0 0 104 104" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
            <Box
              component="circle"
              cx="52"
              cy="52"
              r="46"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              pathLength={289}
              sx={{
                stroke: (t) => t.palette.success.main,
                strokeDasharray: 289,
                strokeDashoffset: still ? 60 : 0,
                animation: still ? 'none' : `${ringTick} ${DEMO_STEP_MS}ms linear both`,
              }}
            />
          </svg>
          <Typography
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.6rem', md: '2.2rem' },
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {secs}
          </Typography>
        </Box>
      </Box>
      {!still &&
        notes.map((n, i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              position: 'absolute',
              left: n.left,
              top: n.top,
              color: n.color,
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              fontSize: '2.2rem',
              opacity: 0,
              animation: `${floatUp} 2.2s ease-out ${n.delay}s infinite`,
            }}
          >
            {n.ch}
          </Box>
        ))}
    </>
  );
}

/** Guess: a tap on the right answer turns it green and scores 100. */
function GuessScene({ still }: { still: boolean }) {
  // 0 waiting, 1 picked, 2 scored.
  const [phase, setPhase] = useState(still ? 2 : 0);
  useEffect(() => {
    if (still) return;
    const picked = setTimeout(() => setPhase(1), 1100);
    const scored = setTimeout(() => setPhase(2), 1500);
    return () => {
      clearTimeout(picked);
      clearTimeout(scored);
    };
  }, [still]);

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 12, md: 26 },
          right: { xs: 12, md: 26 },
          top: { xs: 18, md: 30 },
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: { xs: 1, md: 1.75 },
        }}
      >
        {ANSWERS.map((answer, i) => {
          const right = i === RIGHT_ANSWER;
          const tile = ANSWER_TILES[i]!;
          return (
            <Box
              key={answer}
              sx={{
                position: 'relative',
                borderRadius: '18px',
                minHeight: { xs: 64, md: 92 },
                p: { xs: 1.5, md: 2.25 },
                display: 'flex',
                alignItems: 'flex-end',
                fontFamily: '"Fredoka", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.25rem' },
                lineHeight: 1.15,
                bgcolor: right && phase >= 1 ? 'success.main' : tile.bg,
                color: right && phase >= 1 ? '#053D2E' : tile.text,
                opacity: !right && phase >= 1 ? 0.35 : 1,
                boxShadow: right && phase >= 1 ? '0 0 0 4px rgba(22,199,154,0.35)' : 'none',
                transition: 'background-color 250ms ease, opacity 250ms ease, box-shadow 250ms ease',
              }}
            >
              {answer}
              {right && !still && (
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 46,
                    height: 46,
                    ml: '-23px',
                    mt: '-23px',
                    borderRadius: '50%',
                    bgcolor: 'rgba(20,33,63,0.18)',
                    border: '3px solid rgba(20,33,63,0.5)',
                    opacity: 0,
                    animation: `${tapPress} 1.1s cubic-bezier(.16,1,.3,1) 0.2s both`,
                  }}
                />
              )}
              {right && phase >= 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: '#fff',
                    color: 'success.main',
                    display: 'grid',
                    placeItems: 'center',
                    animation: still ? 'none' : `${popIn} 300ms cubic-bezier(.34,1.6,.64,1) both`,
                  }}
                >
                  <CheckRoundedIcon sx={{ fontSize: 22 }} />
                </Box>
              )}
              {right && phase >= 1 && !still && (
                <Typography
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: -44,
                    left: '50%',
                    ml: '-40px',
                    fontFamily: '"Fredoka", sans-serif',
                    fontWeight: 700,
                    fontSize: '2.6rem',
                    color: 'success.main',
                    textShadow: '0 4px 0 rgba(20,33,63,0.12)',
                    animation: `${plusUp} 1.6s cubic-bezier(.16,1,.3,1) both`,
                  }}
                >
                  +100
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 12, md: 26 },
          bottom: { xs: 14, md: 22 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 0.75, md: 1.25 },
        }}
      >
        {PICKERS.slice(0, 2).map((p, i) => (
          <Box
            key={p.name}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
              border: '1px solid rgba(20,33,63,0.08)',
              borderRadius: 999,
              py: 0.5,
              pl: 0.5,
              pr: 1.75,
              fontWeight: 700,
              boxShadow: '0 8px 18px -12px rgba(20,33,63,0.4)',
            }}
          >
            <Avatar look={p.look} />
            {p.name}
            <Box
              component="span"
              sx={{
                fontVariantNumeric: 'tabular-nums',
                color: i === 0 && phase >= 2 ? 'success.main' : 'text.secondary',
              }}
            >
              {i === 0 && phase >= 2 ? 100 : 0}
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
}

/** Where Eko stands in each step: beside the pile, under the stage, by the scores. */
const EKO_SPOT = [
  { width: { xs: 120, md: 170 }, right: { xs: 8, md: 24 }, bottom: { xs: 6, md: 14 } },
  { width: { xs: 130, md: 200 }, right: { xs: 'calc(50% - 65px)', md: 'calc(50% - 100px)' }, bottom: { xs: 10, md: 18 } },
  { width: { xs: 100, md: 140 }, right: { xs: 8, md: 22 }, bottom: { xs: 6, md: 6 } },
];

/**
 * Eko acting out a game, one step at a time, in sync with the big verbs
 * beside it. `run` changes on every step change so each scene's animations
 * start over.
 */
export function HowItWorksDemo({
  step,
  run,
  still,
  onJump,
}: {
  step: number;
  run: number;
  /** Reduced motion: no drops, ticks or pops; each scene shows its end state. */
  still: boolean;
  onJump: (step: number) => void;
}) {
  const [covers, setCovers] = useState<(CatalogSearchResult | undefined)[]>([]);
  useEffect(() => {
    fetchPresetPlaylists()
      .then((catalog) => {
        const all = presetResults(catalog);
        setCovers(DEMO_PRESETS.map((id) => all.find((p) => p.id === id)));
      })
      .catch(() => setCovers([]));
  }, []);

  const current = DEMO_STEPS[step]!;
  const spot = EKO_SPOT[step]!;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid rgba(20,33,63,0.08)',
        borderRadius: { xs: '24px', md: '30px' },
        boxShadow: '0 30px 60px -30px rgba(20,33,63,0.35)',
        p: { xs: 1.5, md: 2.5 },
        pb: { xs: 1.25, md: 2 },
        minWidth: 0,
        // On desktop the card fills its column, from "Pick." down to the buttons.
        flex: { md: 1 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          height: { xs: 330, md: 'auto' },
          flex: { md: 1 },
          minHeight: { md: 420 },
          overflow: 'hidden',
          borderRadius: '22px',
          background: 'linear-gradient(180deg, #F6F9FF, #EAF1FF)',
        }}
      >
        <Box key={run} sx={{ position: 'absolute', inset: 0, animation: `${fadeIn} 350ms ease both` }}>
          {step === 0 && <PickScene covers={covers} still={still} />}
          {step === 1 && <PlayScene still={still} />}
          {step === 2 && <GuessScene still={still} />}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            zIndex: 3,
            ...spot,
            transition: 'right 500ms cubic-bezier(.16,1,.3,1), bottom 500ms cubic-bezier(.16,1,.3,1), width 500ms cubic-bezier(.16,1,.3,1)',
          }}
        >
          <Eko face={current.face} move={current.move} />
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25, mt: 1.75 }}>
        {DEMO_STEPS.map((s, i) => (
          <ButtonBase
            key={s.verb}
            aria-label={`Show step ${i + 1}: ${s.verb}`}
            onClick={() => onJump(i)}
            sx={{ height: 8, borderRadius: 999, bgcolor: 'rgba(20,33,63,0.12)', overflow: 'hidden', display: 'block' }}
          >
            <Box
              key={i === step ? run : i}
              sx={{
                height: '100%',
                bgcolor: 'primary.main',
                transformOrigin: 'left',
                transform: i < step || (i === step && still) ? 'scaleX(1)' : 'scaleX(0)',
                animation: i === step && !still ? `${fill} ${DEMO_STEP_MS}ms linear both` : 'none',
              }}
            />
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
