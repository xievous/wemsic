import './eko.css';

/** Eko's expressions, drawn on the visor. */
export type EkoFace =
  | 'happy'
  | 'neutral'
  | 'sleepy'
  | 'focused'
  | 'whoa'
  | 'starry'
  | 'oops'
  | 'love';

/** Eko's dance moves; each one animates a different mix of parts. */
export type EkoMove =
  | 'sway'
  | 'bob'
  | 'pump'
  | 'step'
  | 'spin'
  | 'jump'
  | 'robot'
  | 'roof'
  | 'scratch'
  | 'slump';

const INK = '#14213F';
const CYAN = '#00BFD8';
const EQ_BARS = [
  { x: 74, color: '#00BFD8', delay: 0 },
  { x: 90, color: '#16C79A', delay: -0.3 },
  { x: 106, color: '#FFB020', delay: -0.12 },
  { x: 122, color: '#2DB7FF', delay: -0.42 },
];

/**
 * The wemsic mascot: a visor robot, drawn in SVG and animated in CSS. The
 * move and face are data attributes, so switching them never remounts it.
 * With `desk`, Eko stands behind a DJ desk; with `entrance`, it slides in
 * once when it mounts. Decorative only, so it's hidden from screen readers.
 */
export function Eko({
  face = 'happy',
  move = 'bob',
  desk = false,
  entrance = false,
}: {
  face?: EkoFace;
  move?: EkoMove;
  desk?: boolean;
  entrance?: boolean;
}) {
  return (
    <svg
      className={entrance ? 'eko eko-entrance' : 'eko'}
      viewBox="0 0 200 232"
      aria-hidden="true"
      focusable="false"
      data-face={face}
      data-move={move}
    >
      {!desk && (
        <ellipse
          className="eko-shadow"
          style={{ transformOrigin: '100px 226px' }}
          cx="100"
          cy="226"
          rx="46"
          ry="7"
          fill="rgba(0,0,0,0.28)"
        />
      )}
      <g className="eko-rig" style={{ transformOrigin: '100px 222px' }}>
        <g className="eko-leg-l" style={{ transformOrigin: '85px 196px' }}>
          <rect x="80" y="194" width="10" height="18" rx="4" fill="#2348C9" />
          <rect x="72" y="209" width="24" height="12" rx="6" fill="#E9F2FF" />
        </g>
        <g className="eko-leg-r" style={{ transformOrigin: '115px 196px' }}>
          <rect x="110" y="194" width="10" height="18" rx="4" fill="#2348C9" />
          <rect x="104" y="209" width="24" height="12" rx="6" fill="#E9F2FF" />
        </g>
        <g className="eko-arm-l" style={{ transformOrigin: '38px 122px' }}>
          <rect x="31" y="118" width="14" height="46" rx="7" fill="#6C5CE7" />
        </g>
        <g className="eko-arm-r" style={{ transformOrigin: '162px 122px' }}>
          <rect x="155" y="118" width="14" height="46" rx="7" fill="#6C5CE7" />
        </g>
        <g className="eko-head" style={{ transformOrigin: '100px 100px' }}>
          <line
            x1="100"
            y1="70"
            x2="100"
            y2="48"
            stroke="#6C5CE7"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle className="eko-antenna" cx="100" cy="42" r="7" />
          <path
            d="M66 104 A34 34 0 0 1 134 104 Z"
            fill="#E9F2FF"
            stroke="#3A6BFF"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect x="74" y="77" width="52" height="20" rx="10" fill={INK} />
          <Face face={face} />
        </g>
        <rect x="52" y="96" width="96" height="102" rx="18" fill="#3A6BFF" />
        <rect x="64" y="116" width="72" height="60" rx="11" fill={INK} />
        {EQ_BARS.map((b) => (
          <rect
            key={b.x}
            className="eko-eq"
            style={{ transformOrigin: `${b.x + 5}px 168px`, animationDelay: `${b.delay}s` }}
            x={b.x}
            y="128"
            width="10"
            height="40"
            rx="4"
            fill={b.color}
          />
        ))}
      </g>
      {desk && <DjDesk />}
    </svg>
  );
}

/** A white card-style desk with two platters and a fader, matching the site's cards. */
function DjDesk() {
  return (
    <g>
      <ellipse cx="100" cy="227" rx="78" ry="4" fill="rgba(20,33,63,0.12)" />
      <rect
        x="22"
        y="178"
        width="156"
        height="46"
        rx="16"
        fill="#FFFFFF"
        stroke="rgba(20,33,63,0.08)"
        strokeWidth="1.5"
      />
      <circle cx="62" cy="201" r="13" fill="rgba(58,107,255,0.12)" />
      <circle cx="62" cy="201" r="4" fill="#3A6BFF" />
      <circle cx="138" cy="201" r="13" fill="rgba(58,107,255,0.12)" />
      <circle cx="138" cy="201" r="4" fill="#3A6BFF" />
      <rect x="90" y="198.5" width="20" height="5" rx="2.5" fill="rgba(58,107,255,0.25)" />
    </g>
  );
}

// Eyes sit on the visor: the left one centred at x 90, the right at x 110, both at y 87.
function Face({ face }: { face: EkoFace }) {
  switch (face) {
    case 'happy':
      return (
        <>
          <Stroke d="M85 90 L90 84 L95 90" />
          <Stroke d="M105 90 L110 84 L115 90" />
        </>
      );
    case 'neutral':
      return (
        <g className="eko-blink" style={{ transformOrigin: '100px 87px' }}>
          <rect x="86.5" y="82" width="7" height="10" rx="3.5" fill={CYAN} />
          <rect x="106.5" y="82" width="7" height="10" rx="3.5" fill={CYAN} />
        </g>
      );
    case 'sleepy':
      return (
        <>
          <Stroke d="M85 86 Q90 91 95 86" />
          <Stroke d="M105 86 Q110 91 115 86" />
          <text
            className="eko-zz"
            x="124"
            y="70"
            fontFamily="Fredoka, sans-serif"
            fontWeight="700"
            fontSize="11"
            fill="#9FB4FF"
          >
            z
          </text>
        </>
      );
    case 'focused':
      return (
        <>
          <rect x="85" y="86" width="10" height="3.2" rx="1.6" fill={CYAN} />
          <rect x="105" y="86" width="10" height="3.2" rx="1.6" fill={CYAN} />
        </>
      );
    case 'whoa':
      return (
        <g className="eko-blink" style={{ transformOrigin: '100px 87px' }}>
          <circle cx="90" cy="87" r="4.6" stroke={CYAN} strokeWidth="2.6" fill="none" />
          <circle cx="110" cy="87" r="4.6" stroke={CYAN} strokeWidth="2.6" fill="none" />
        </g>
      );
    case 'starry':
      return (
        <>
          <Star cx={90} cy={87} r={6.5} />
          <Star cx={110} cy={87} r={6.5} />
        </>
      );
    case 'oops':
      return (
        <>
          <Stroke d="M86 83 L94 87 L86 91" />
          <Stroke d="M114 83 L106 87 L114 91" />
          <path className="eko-drop" d="M123 66 Q127 72 123 75 Q119 72 123 66 Z" fill="#9FDBFF" />
        </>
      );
    case 'love':
      return (
        <>
          <Heart cx={90} cy={87} />
          <Heart cx={110} cy={87} />
        </>
      );
  }
}

function Stroke({ d }: { d: string }) {
  return (
    <path
      d={d}
      stroke={CYAN}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <path
      className="eko-twinkle"
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      d={`M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`}
      fill="#FFB020"
    />
  );
}

function Heart({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      className="eko-pulse"
      style={{ transformOrigin: `${cx}px ${cy}px` }}
      d={`M${cx} ${cy + 4.5} C${cx - 8} ${cy - 1} ${cx - 4.5} ${cy - 7.5} ${cx} ${cy - 3} C${cx + 4.5} ${cy - 7.5} ${cx + 8} ${cy - 1} ${cx} ${cy + 4.5} Z`}
      fill="#FF6B9A"
    />
  );
}
