import { useState, useRef, useEffect } from 'react';

// ── Age helper ────────────────────────────────────────────────────────────────
function ageMin(ageGroup) {
  if (ageGroup === '6-10')  return 0;
  if (ageGroup === '11-14') return 10;
  return 14; // '15+'
}

// ── Data ──────────────────────────────────────────────────────────────────────

const DIGIT_PAIRS = [
  {
    a: '6', b: '9', colorA: '#2D68C4', colorB: '#DC2626',
    tipA: 'Belly at BOTTOM, tail curls UP',
    tipB: 'Head at TOP, tail goes DOWN',
    trick: 'Thumb UP = 6 ↑    Thumb DOWN = 9 ↓',
    mnemonic: '6 sits on the floor. 9 hangs from the ceiling.',
  },
  {
    a: '2', b: '5', colorA: '#059669', colorB: '#7C3AED',
    tipA: 'Hump at top-RIGHT → then flat bottom going right',
    tipB: 'Flat top going LEFT → then curves to the right',
    trick: '2 starts RIGHT at the top.  5 starts LEFT at the top.',
    mnemonic: 'A 2 has a swan neck leaning right. A 5 has a flat hat going left.',
  },
  {
    a: '3', b: '8', colorA: '#D97706', colorB: '#DC2626',
    tipA: 'OPEN on the left — two bumps facing right',
    tipB: 'CLOSED all the way around — two stacked circles',
    trick: '3 is open (has a gap). 8 is closed (like glasses).',
    mnemonic: 'Put two 3s back-to-back and you get an 8.',
  },
  {
    a: '17', b: '71', colorA: '#0891B2', colorB: '#B45309',
    tipA: '"Seventeen" sounds like seven-teen but TENS digit (1) comes FIRST',
    tipB: '"Seventy-one" → TENS digit (7) is bigger and comes first',
    trick: 'Write left → right: the bigger-value part always goes to the LEFT.',
    mnemonic: 'Tens on the LEFT, Units on the RIGHT — always, without exception.',
  },
];

const PLACE_VALUE_SETS = {
  '6-10': [
    {
      a: { display: '306', cols: [{ d: '3', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 300 }, { d: '0', label: 'T', full: 'Tens', color: '#D97706', val: 0 }, { d: '6', label: 'U', full: 'Units', color: '#DC2626', val: 6 }] },
      b: { display: '360', cols: [{ d: '3', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 300 }, { d: '6', label: 'T', full: 'Tens', color: '#D97706', val: 60 }, { d: '0', label: 'U', full: 'Units', color: '#DC2626', val: 0 }] },
      tip: 'The 6 moved one column LEFT — so it went from 6 to 60! Zeros hold the empty columns.',
    },
    {
      a: { display: '204', cols: [{ d: '2', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 200 }, { d: '0', label: 'T', full: 'Tens', color: '#D97706', val: 0 }, { d: '4', label: 'U', full: 'Units', color: '#DC2626', val: 4 }] },
      b: { display: '240', cols: [{ d: '2', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 200 }, { d: '4', label: 'T', full: 'Tens', color: '#D97706', val: 40 }, { d: '0', label: 'U', full: 'Units', color: '#DC2626', val: 0 }] },
      tip: '4 in units = 4. 4 in tens = 40. The column decides the value!',
    },
  ],
  '11-14': [
    {
      a: { display: '1,023', cols: [{ d: '1', label: 'Th', full: 'Thousands', color: '#059669', val: 1000 }, { d: '0', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 0 }, { d: '2', label: 'T', full: 'Tens', color: '#D97706', val: 20 }, { d: '3', label: 'U', full: 'Units', color: '#DC2626', val: 3 }] },
      b: { display: '1,203', cols: [{ d: '1', label: 'Th', full: 'Thousands', color: '#059669', val: 1000 }, { d: '2', label: 'H', full: 'Hundreds', color: '#2D68C4', val: 200 }, { d: '0', label: 'T', full: 'Tens', color: '#D97706', val: 0 }, { d: '3', label: 'U', full: 'Units', color: '#DC2626', val: 3 }] },
      tip: '1,023 vs 1,203: the 2 jumps from tens (×10) to hundreds (×100). Zeros keep the other digits in their correct column.',
    },
    {
      a: { display: '0.35', cols: [{ d: '3', label: '1/10', full: 'Tenths', color: '#7C3AED', val: 0.3 }, { d: '5', label: '1/100', full: 'Hundredths', color: '#0891B2', val: 0.05 }] },
      b: { display: '0.53', cols: [{ d: '5', label: '1/10', full: 'Tenths', color: '#7C3AED', val: 0.5 }, { d: '3', label: '1/100', full: 'Hundredths', color: '#0891B2', val: 0.03 }] },
      tip: '0.35 ≠ 0.53. The FIRST decimal digit is worth 10 times more than the second. 0.5 > 0.35!',
    },
  ],
  '15+': [
    {
      a: { display: '3.6×10²', cols: [{ d: '3.6', label: '×10²', full: '= 360', color: '#2D68C4', val: 360 }] },
      b: { display: '3.6×10³', cols: [{ d: '3.6', label: '×10³', full: '= 3600', color: '#7C3AED', val: 3600 }] },
      tip: 'Each extra power of 10 moves the decimal point one more place to the RIGHT (×10).',
    },
    {
      a: { display: '−2³', cols: [{ d: '−2³', label: '= −8', full: '−(2³) = −8', color: '#DC2626', val: -8 }] },
      b: { display: '(−2)³', cols: [{ d: '(−2)³', label: '= −8', full: '(−2)×(−2)×(−2) = −8', color: '#059669', val: -8 }] },
      tip: '−2³ means −(2³) = −8. (−2)³ means (−2)×(−2)×(−2) = −8. Both equal −8 here, but −2⁴ = −16 while (−2)⁴ = +16!',
    },
  ],
};

const SYMBOL_PAIRS = [
  {
    a: '+', b: '×', nameA: 'Plus (add)', nameB: 'Times (multiply)',
    colorA: '#059669', colorB: '#2D68C4',
    tip: '+ is a straight cross. × is that SAME cross rotated 45°. Straight = add. Tilted = multiply.',
    ageMin: 0,
  },
  {
    a: '÷', b: '+', nameA: 'Divide', nameB: 'Plus',
    colorA: '#7C3AED', colorB: '#059669',
    tip: '÷ has a dot ABOVE and BELOW the line. + has no dots. The dots in ÷ represent the numerator and denominator of a fraction.',
    ageMin: 0,
  },
  {
    a: '<', b: '>', nameA: 'Less than', nameB: 'Greater than',
    colorA: '#0891B2', colorB: '#E44B3A',
    tip: 'The CROCODILE always eats the bigger number — its wide open mouth faces the larger value. Or: < looks like an L for Less.',
    ageMin: 0,
  },
  {
    a: '≤', b: '≥', nameA: 'Less than or equal to', nameB: 'Greater than or equal to',
    colorA: '#0891B2', colorB: '#E44B3A',
    tip: 'The underline means "OR exactly equal to". x ≤ 5 means x can be 5 OR any number less than 5.',
    ageMin: 14,
  },
];

const ALL_SYMBOLS = [
  { sym: '+',  name: 'Plus',            meaning: 'Add — combine amounts',          example: '3 + 4 = 7',   color: '#059669', ageMin: 0 },
  { sym: '−',  name: 'Minus',           meaning: 'Subtract — take away',           example: '9 − 5 = 4',   color: '#DC2626', ageMin: 0 },
  { sym: '×',  name: 'Multiply',        meaning: 'Groups of — repeated adding',    example: '3 × 4 = 12',  color: '#2D68C4', ageMin: 0 },
  { sym: '÷',  name: 'Divide',          meaning: 'Share into equal groups',        example: '12 ÷ 4 = 3',  color: '#7C3AED', ageMin: 0 },
  { sym: '=',  name: 'Equals',          meaning: 'Same value on both sides',       example: '2 + 3 = 5',   color: '#D97706', ageMin: 0 },
  { sym: '<',  name: 'Less than',       meaning: 'Smaller — open mouth eats big',  example: '3 < 7',       color: '#0891B2', ageMin: 0 },
  { sym: '>',  name: 'Greater than',    meaning: 'Larger — open mouth eats big',   example: '8 > 2',       color: '#E44B3A', ageMin: 0 },
  { sym: '%',  name: 'Percent',         meaning: 'Parts per 100',                  example: '50% = ½',     color: '#D97706', ageMin: 5  },
  { sym: '²',  name: 'Squared',         meaning: 'Number × itself',               example: '4² = 16',     color: '#7C3AED', ageMin: 10 },
  { sym: '√',  name: 'Square root',     meaning: '? × itself = this number',       example: '√9 = 3',      color: '#059669', ageMin: 10 },
  { sym: 'π',  name: 'Pi',              meaning: '≈ 3.14159 — circle ratio',       example: 'C = 2πr',     color: '#B45309', ageMin: 10 },
  { sym: '≤',  name: 'Less/equal',      meaning: 'Less than OR equal to',          example: 'x ≤ 5',       color: '#0891B2', ageMin: 14 },
  { sym: '≥',  name: 'Greater/equal',   meaning: 'Greater than OR equal to',       example: 'x ≥ 0',       color: '#E44B3A', ageMin: 14 },
  { sym: '∞',  name: 'Infinity',        meaning: 'No end — goes on forever',       example: '1, 2, 3… ∞',  color: '#DC2626', ageMin: 14 },
];

const WORD_PROBLEM_KEYS = [
  {
    label: 'Add (+)', op: '+', color: '#059669',
    words: ['more than', 'added to', 'increased by', 'total', 'sum', 'in all', 'altogether', 'gain', 'plus'],
    example: '"8 more sweets than Amy who has 5" → 5 + 8 = 13',
    ageMin: 0,
  },
  {
    label: 'Subtract (−)', op: '−', color: '#DC2626',
    words: ['less than', 'fewer than', 'decreased by', 'take away', 'how many left', 'remain', 'difference', 'lost'],
    example: '"12 birds, 4 flew away. How many remain?" → 12 − 4 = 8',
    ageMin: 0,
  },
  {
    label: 'Multiply (×)', op: '×', color: '#2D68C4',
    words: ['times', 'product', 'multiplied by', 'groups of', 'each', 'every', 'double', 'triple', 'lots of'],
    example: '"6 boxes, 8 eggs each. How many?" → 6 × 8 = 48',
    ageMin: 0,
  },
  {
    label: 'Divide (÷)', op: '÷', color: '#7C3AED',
    words: ['shared between', 'split equally', 'per person', 'each gets', 'how many in each', 'quotient', 'ratio of'],
    example: '"24 sweets shared between 6 friends" → 24 ÷ 6 = 4',
    ageMin: 0,
  },
  {
    label: 'Percentage (%)', op: '%', color: '#D97706',
    words: ['percent', '% of', 'out of 100', 'fraction of', 'proportion', 'interest rate', 'discount'],
    example: '"20% of 50 pupils got A" → 50 × 0.20 = 10',
    ageMin: 10,
  },
  {
    label: 'Algebra', op: 'x', color: '#B45309',
    words: ['find x', 'what number', 'unknown', 'solve', 'expression', 'equation', 'term', 'variable'],
    example: '"A number plus 5 equals 12. Find the number." → x + 5 = 12 → x = 7',
    ageMin: 14,
  },
];

const TIMES_TABLE_TIPS = [
  { n: 2,  shortcut: 'Double it',           pattern: '2, 4, 6, 8, 10…',         tip: 'Always even. Just count in 2s.',                                                      color: '#2D68C4', ageMin: 0  },
  { n: 5,  shortcut: 'Ends in 0 or 5',      pattern: '5, 10, 15, 20, 25…',       tip: 'Count on your fingers in groups of 5.',                                               color: '#059669', ageMin: 0  },
  { n: 10, shortcut: 'Add a zero',           pattern: '10, 20, 30, 40…',          tip: 'Slide every digit one column left (×10). Just add a 0.',                             color: '#7C3AED', ageMin: 0  },
  { n: 4,  shortcut: 'Double twice',         pattern: '4, 8, 12, 16, 20…',        tip: 'Double it, then double the answer again. 4×7 = double 7 (14) then double 14 = 28.',  color: '#D97706', ageMin: 0  },
  { n: 9,  shortcut: 'Finger trick',         pattern: '9, 18, 27, 36, 45…',       tip: 'Hold up 10 fingers. Fold down finger N. Left = tens, Right = units. Digits always add to 9!', color: '#E44B3A', ageMin: 0  },
  { n: 3,  shortcut: 'Double + one more',    pattern: '3, 6, 9, 12, 15…',         tip: '3×7 = 2×7 (14) + 7 = 21. Use ×2 and add one more group.',                           color: '#0891B2', ageMin: 0  },
  { n: 6,  shortcut: '×3 doubled',           pattern: '6, 12, 18, 24, 30…',       tip: 'Times 6 = times 3 then double. Even × 6 ends in that even digit: 4×6=24.',          color: '#B45309', ageMin: 5  },
  { n: 7,  shortcut: '5,6,7,8 → 56',        pattern: '7, 14, 21, 28, 35…',       tip: 'Hardest table! Remember: 7×8=56 (the digits 5,6,7,8 in order). 7×6 = 7×5 (35) + 7 = 42.', color: '#DC2626', ageMin: 5  },
  { n: 11, shortcut: 'Repeat the digit',     pattern: '11, 22, 33… 99, 110…',     tip: 'Up to 9: just repeat. 11×11=121, 11×12=132: add adjacent digits of the multiplier.', color: '#059669', ageMin: 5  },
  { n: 12, shortcut: '×10 plus ×2',          pattern: '12, 24, 36, 48, 60…',      tip: '12×7 = (10×7) + (2×7) = 70 + 14 = 84. Split into easy parts.',                     color: '#2D68C4', ageMin: 5  },
];

const CLOCK_TIMES = [
  { hour: 12, minute: 0,  label: '12 o\'clock',     digital: '12:00', tip: 'Both hands point straight UP to 12.',                                     ageMin: 0 },
  { hour: 3,  minute: 0,  label: '3 o\'clock',      digital: '3:00',  tip: 'Short hand (red) points RIGHT → to 3. Long hand (blue) points UP to 12.',  ageMin: 0 },
  { hour: 6,  minute: 0,  label: '6 o\'clock',      digital: '6:00',  tip: 'Short hand points DOWN ↓ to 6. Long hand points UP to 12.',                ageMin: 0 },
  { hour: 9,  minute: 0,  label: '9 o\'clock',      digital: '9:00',  tip: 'Short hand points LEFT ← to 9. Long hand points UP to 12.',                ageMin: 0 },
  { hour: 6,  minute: 30, label: 'Half past 6',     digital: '6:30',  tip: 'Long hand points DOWN to 6 = halfway around. Short hand is between 6 & 7.', ageMin: 0 },
  { hour: 3,  minute: 15, label: 'Quarter past 3',  digital: '3:15',  tip: 'Long hand points RIGHT to 3 = a quarter of the way round (15 minutes).',    ageMin: 0 },
  { hour: 2,  minute: 45, label: 'Quarter to 3',    digital: '2:45',  tip: 'Long hand at 9 = three-quarters round = 15 minutes to the next hour.',      ageMin: 5 },
  { hour: 10, minute: 25, label: '25 past 10',      digital: '10:25', tip: 'Each big number = 5 minutes. Count: 5,10,15,20,25 — long hand at 5.',        ageMin: 5 },
];

const SECTIONS = [
  { id: 'digits',     label: '🔢 Digit Pairs',    desc: 'Tricky reversed numbers'    },
  { id: 'place',      label: '📊 Place Value',    desc: '306 vs 360'                 },
  { id: 'tables',     label: '✖️ Times Tables',   desc: 'Patterns & shortcuts'        },
  { id: 'symbols',    label: '🔣 Symbols',        desc: '+ vs × vs ÷'                },
  { id: 'wordprob',   label: '📝 Word Problems',  desc: 'Key maths vocabulary'        },
  { id: 'time',       label: '🕐 Telling Time',   desc: 'Clock face & direction'      },
  { id: 'numberline', label: '↔️ Number Line',    desc: 'Counting & negatives'        },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ClockFace({ hour, minute }) {
  const cx = 90, cy = 90, r = 76;
  const toRad = deg => (deg * Math.PI) / 180;
  const hourAngle   = ((hour % 12) + minute / 60) * 30 - 90;
  const minuteAngle = minute * 6 - 90;
  const hx = cx + 46 * Math.cos(toRad(hourAngle));
  const hy = cy + 46 * Math.sin(toRad(hourAngle));
  const mx = cx + 64 * Math.cos(toRad(minuteAngle));
  const my = cy + 64 * Math.sin(toRad(minuteAngle));

  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-label="Clock face" className="nums-clock-svg">
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#2D68C4" strokeWidth="4" />
      {/* Tick marks */}
      {Array.from({ length: 60 }, (_, i) => {
        const a = i * 6 - 90;
        const inner = i % 5 === 0 ? r - 13 : r - 7;
        return (
          <line key={i}
            x1={cx + inner * Math.cos(toRad(a))} y1={cy + inner * Math.sin(toRad(a))}
            x2={cx + (r - 2) * Math.cos(toRad(a))} y2={cy + (r - 2) * Math.sin(toRad(a))}
            stroke={i % 5 === 0 ? '#444' : '#ccc'} strokeWidth={i % 5 === 0 ? 2.5 : 1}
          />
        );
      })}
      {/* Numbers */}
      {[12,1,2,3,4,5,6,7,8,9,10,11].map((n, i) => {
        const a = i * 30 - 90;
        return (
          <text key={n}
            x={cx + 60 * Math.cos(toRad(a))} y={cy + 60 * Math.sin(toRad(a))}
            textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="700"
            fill={n === 3 || n === 9 ? '#2D68C4' : '#1a1a2e'}
            fontFamily="OpenDyslexic, sans-serif"
          >{n}</text>
        );
      })}
      {/* Hour hand — red, short */}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
      {/* Minute hand — blue, long */}
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#2D68C4" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#1a1a2e" />
    </svg>
  );
}

function PlaceValueCard({ data }) {
  return (
    <div className="pv-number-card">
      <div className="pv-display">{data.display}</div>
      <div className="pv-cols">
        {data.cols.map((col, i) => (
          <div key={i} className="pv-col" style={{ borderColor: col.color }}>
            <div className="pv-col-label" style={{ background: col.color }}>{col.full}</div>
            <div className="pv-digit" style={{ color: col.color }}>{col.d}</div>
            {col.val !== undefined && (
              <div className="pv-val">= {typeof col.val === 'number' ? col.val : col.val}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NumbersMode({ ageGroup, onSpeak, speakingText }) {
  const [section, setSection]         = useState('digits');
  const [pairIdx, setPairIdx]         = useState(0);
  const [pvPairIdx, setPvPairIdx]     = useState(0);
  const [tableN, setTableN]           = useState(2);
  const [symView, setSymView]         = useState('pairs');   // 'pairs' | 'all'
  const [symPairIdx, setSymPairIdx]   = useState(0);
  const [selectedSym, setSelectedSym] = useState(null);
  const [clockIdx, setClockIdx]       = useState(0);
  const [nlSet, setNlSet]             = useState(0);
  const [selectedNlIdx, setSelectedNlIdx] = useState(null); // index of clicked number
  const nlScrollRef = useRef(null);

  // Clear selection when the number-set changes or section changes
  useEffect(() => { setSelectedNlIdx(null); }, [nlSet, section]);

  // Click outside number line → deselect
  useEffect(() => {
    if (section !== 'numberline') return;
    const handler = (e) => {
      if (nlScrollRef.current && !nlScrollRef.current.contains(e.target)) {
        setSelectedNlIdx(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [section]);

  // Helper: returns props for a TTS button that only activates for ITS OWN text
  const ttsBtn = (text, extra) => ({
    className: `tts-btn${speakingText === text ? ' tts-speaking' : ''}`,
    onClick: (e) => { e?.stopPropagation?.(); onSpeak(text); },
    title: speakingText === text ? 'Stop' : 'Listen',
    ...extra,
  });

  const ageMark = ageMin(ageGroup);

  // Filtered data per section
  const pvPairs   = PLACE_VALUE_SETS[ageGroup] || PLACE_VALUE_SETS['6-10'];
  const filteredSymPairs = SYMBOL_PAIRS.filter(p => p.ageMin <= ageMark);
  const filteredAllSyms  = ALL_SYMBOLS.filter(s => s.ageMin <= ageMark);
  const filteredWPKeys   = WORD_PROBLEM_KEYS.filter(k => k.ageMin <= ageMark);
  const filteredTables   = TIMES_TABLE_TIPS.filter(t => t.ageMin <= ageMark);
  const filteredClocks   = CLOCK_TIMES.filter(c => c.ageMin <= ageMark);
  const filteredNL = ageGroup === '6-10'
    ? [{ label: '0 → 20', min: 0, max: 20, step: 1, neg: false }, { label: '20 → 0 (backwards)', min: 20, max: 0, step: -1, neg: false, backwards: true }]
    : ageGroup === '11-14'
    ? [{ label: '−10 → 10', min: -10, max: 10, step: 1, neg: true }, { label: '−5 → 5 (decimals)', min: -5, max: 5, step: 0.5, neg: true, decimal: true }]
    : [{ label: '−20 → 20', min: -20, max: 20, step: 2, neg: true }, { label: 'Fractions: 0 → 1', min: 0, max: 8, step: 1, fractional: true }];

  const currentClock = filteredClocks[Math.min(clockIdx, filteredClocks.length - 1)];
  const currentNL    = filteredNL[Math.min(nlSet, filteredNL.length - 1)];

  function nlNumbers() {
    const nums = [];
    if (currentNL.backwards) {
      for (let i = currentNL.min; i >= currentNL.max; i--) nums.push(i);
    } else if (currentNL.fractional) {
      return ['0', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞', '1'];
    } else {
      const step = Math.abs(currentNL.step);
      for (let i = currentNL.min; i <= currentNL.max; i += step)
        nums.push(parseFloat(i.toFixed(2)));
    }
    return nums;
  }

  return (
    <div className="nums-mode">

      {/* ── Section tabs ── */}
      <div className="nums-sections">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`nums-sec-btn ${section === s.id ? 'active' : ''}`}
            onClick={() => setSection(s.id)}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
           SECTION 1: DIGIT PAIRS
      ══════════════════════════════════════════════════════ */}
      {section === 'digits' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">🔢 Commonly Confused Digits</h3>
          <p className="nums-section-desc">Dyslexic learners often reverse or rotate digits. Here are the most common confusions.</p>

          {/* Pair selector */}
          <div className="nums-pair-nav">
            {DIGIT_PAIRS.map((p, i) => (
              <button
                key={i}
                className={`nums-pair-btn ${pairIdx === i ? 'active' : ''}`}
                onClick={() => setPairIdx(i)}
              >
                {p.a} / {p.b}
              </button>
            ))}
          </div>

          {/* Pair detail */}
          {(() => {
            const pair = DIGIT_PAIRS[pairIdx];
            return (
              <div className="nums-pair-detail">
                <div className="nums-pair-cards">
                  <div className="nums-pair-card" style={{ borderColor: pair.colorA }}>
                    <div className="nums-big-digit" style={{ color: pair.colorA }}>{pair.a}</div>
                    <div className="nums-digit-tip" style={{ color: pair.colorA }}>{pair.tipA}</div>
                    <button
                      {...ttsBtn(`The number ${pair.a}`, { 'aria-label': `Hear ${pair.a}` })}
                    >{speakingText === `The number ${pair.a}` ? '⏹' : '🔊'}</button>
                  </div>

                  <div className="nums-pair-vs">VS</div>

                  <div className="nums-pair-card" style={{ borderColor: pair.colorB }}>
                    <div className="nums-big-digit" style={{ color: pair.colorB }}>{pair.b}</div>
                    <div className="nums-digit-tip" style={{ color: pair.colorB }}>{pair.tipB}</div>
                    <button
                      {...ttsBtn(`The number ${pair.b}`, { 'aria-label': `Hear ${pair.b}` })}
                    >{speakingText === `The number ${pair.b}` ? '⏹' : '🔊'}</button>
                  </div>
                </div>

                <div className="nums-trick-box">
                  <div className="nums-trick-title">✋ Quick trick</div>
                  <p>{pair.trick}</p>
                </div>
                <div className="nums-mnemonic-box">
                  <div className="nums-trick-title">💡 Memory tip</div>
                  <p>{pair.mnemonic}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 2: PLACE VALUE
      ══════════════════════════════════════════════════════ */}
      {section === 'place' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">📊 Place Value</h3>
          <p className="nums-section-desc">Moving a digit one column LEFT multiplies it by 10. Moving it RIGHT divides by 10. That's why 306 ≠ 360.</p>

          {pvPairs.length > 1 && (
            <div className="nums-pair-nav">
              {pvPairs.map((_, i) => (
                <button key={i} className={`nums-pair-btn ${pvPairIdx === i ? 'active' : ''}`} onClick={() => setPvPairIdx(i)}>
                  Example {i + 1}
                </button>
              ))}
            </div>
          )}

          {(() => {
            const pv = pvPairs[pvPairIdx];
            return (
              <div className="nums-pv-pair">
                <PlaceValueCard data={pv.a} />
                <div className="nums-pair-vs">≠</div>
                <PlaceValueCard data={pv.b} />
                <div className="nums-pv-tip">
                  <span>💡</span> {pv.tip}
                </div>
              </div>
            );
          })()}

          <div className="nums-rule-box">
            <strong>The Golden Rule:</strong> Every column is worth <em>10×</em> more than the column to its right.
            Units → Tens → Hundreds → Thousands → …
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 3: TIMES TABLES
      ══════════════════════════════════════════════════════ */}
      {section === 'tables' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">✖️ Times Tables</h3>
          <p className="nums-section-desc">Instead of memorising every fact, use these patterns and shortcuts. Working memory is limited — patterns help!</p>

          {/* Table selector */}
          <div className="nums-table-selector">
            {filteredTables.map(t => (
              <button
                key={t.n}
                className={`nums-table-btn ${tableN === t.n ? 'active' : ''}`}
                style={tableN === t.n ? { background: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}
                onClick={() => setTableN(t.n)}
              >
                ×{t.n}
              </button>
            ))}
          </div>

          {(() => {
            const tip = filteredTables.find(t => t.n === tableN) || filteredTables[0];
            return (
              <div className="nums-table-detail">
                <div className="nums-table-shortcut" style={{ background: tip.color }}>
                  {tip.shortcut}
                </div>
                <div className="nums-table-pattern">
                  <strong>Pattern: </strong>{tip.pattern}
                </div>
                <div className="nums-table-tip">💡 {tip.tip}</div>

                {/* The actual table grid */}
                <div className="nums-table-grid">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(i => (
                    <div key={i} className="nums-table-cell">
                      <span className="nums-table-eq">{tableN} × {i}</span>
                      <span className="nums-table-ans" style={{ color: tip.color }}>{tableN * i}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 4: SYMBOLS
      ══════════════════════════════════════════════════════ */}
      {section === 'symbols' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">🔣 Maths Symbols</h3>

          <div className="nums-sym-toggle">
            <button className={`nums-sym-tab ${symView === 'pairs' ? 'active' : ''}`} onClick={() => setSymView('pairs')}>
              ⚠️ Confused Pairs
            </button>
            <button className={`nums-sym-tab ${symView === 'all' ? 'active' : ''}`} onClick={() => setSymView('all')}>
              📖 All Symbols
            </button>
          </div>

          {symView === 'pairs' && (
            <>
              <div className="nums-pair-nav">
                {filteredSymPairs.map((p, i) => (
                  <button key={i} className={`nums-pair-btn ${symPairIdx === i ? 'active' : ''}`} onClick={() => setSymPairIdx(i)}>
                    {p.a} vs {p.b}
                  </button>
                ))}
              </div>

              {(() => {
                const pair = filteredSymPairs[Math.min(symPairIdx, filteredSymPairs.length - 1)];
                return (
                  <div className="nums-pair-detail">
                    <div className="nums-pair-cards">
                      <div className="nums-pair-card" style={{ borderColor: pair.colorA }}>
                        <div className="nums-big-digit" style={{ color: pair.colorA, fontSize: '4rem' }}>{pair.a}</div>
                        <div className="nums-sym-name" style={{ color: pair.colorA }}>{pair.nameA}</div>
                        <button {...ttsBtn(pair.nameA)}>
                          {speakingText === pair.nameA ? '⏹' : '🔊'}
                        </button>
                      </div>
                      <div className="nums-pair-vs">VS</div>
                      <div className="nums-pair-card" style={{ borderColor: pair.colorB }}>
                        <div className="nums-big-digit" style={{ color: pair.colorB, fontSize: '4rem' }}>{pair.b}</div>
                        <div className="nums-sym-name" style={{ color: pair.colorB }}>{pair.nameB}</div>
                        <button {...ttsBtn(pair.nameB)}>
                          {speakingText === pair.nameB ? '⏹' : '🔊'}
                        </button>
                      </div>
                    </div>
                    <div className="nums-trick-box">
                      <div className="nums-trick-title">💡 How to tell them apart</div>
                      <p>{pair.tip}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {symView === 'all' && (
            <div className="nums-sym-grid">
              {filteredAllSyms.map(s => (
                <div
                  key={s.sym}
                  className={`nums-sym-card ${selectedSym?.sym === s.sym ? 'selected' : ''}`}
                  style={{ borderColor: s.color }}
                  onClick={() => setSelectedSym(selectedSym?.sym === s.sym ? null : s)}
                >
                  <div className="nums-sym-big" style={{ color: s.color }}>{s.sym}</div>
                  <div className="nums-sym-label">{s.name}</div>
                  {selectedSym?.sym === s.sym && (
                    <div className="nums-sym-expanded">
                      <div className="nums-sym-meaning">{s.meaning}</div>
                      <div className="nums-sym-example">{s.example}</div>
                      <button {...ttsBtn(`${s.name}. ${s.meaning}. Example: ${s.example}`)}>
                        {speakingText === `${s.name}. ${s.meaning}. Example: ${s.example}` ? '⏹' : '🔊'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 5: WORD PROBLEMS
      ══════════════════════════════════════════════════════ */}
      {section === 'wordprob' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">📝 Word Problem Decoder</h3>
          <p className="nums-section-desc">Before doing any maths, find the <em>signal words</em> — they tell you which operation to use.</p>

          <div className="nums-wp-list">
            {filteredWPKeys.map(k => (
              <div key={k.op} className="nums-wp-card" style={{ borderLeft: `5px solid ${k.color}` }}>
                <div className="nums-wp-header">
                  <span className="nums-wp-op" style={{ color: k.color }}>{k.label}</span>
                  <button
                    {...ttsBtn(`${k.label}. Key words: ${k.words.join(', ')}. Example: ${k.example}`)}
                  >{speakingText === `${k.label}. Key words: ${k.words.join(', ')}. Example: ${k.example}` ? '⏹' : '🔊'}</button>
                </div>
                <div className="nums-wp-words">
                  {k.words.map(w => (
                    <span key={w} className="nums-wp-tag" style={{ background: k.color + '22', color: k.color, borderColor: k.color }}>
                      {w}
                    </span>
                  ))}
                </div>
                <div className="nums-wp-example">
                  📌 {k.example}
                </div>
              </div>
            ))}
          </div>

          <div className="nums-rule-box">
            <strong>Strategy:</strong> Read once to understand. Read again to <em>underline signal words</em>. Then pick your operation. Then solve.
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 6: TELLING TIME
      ══════════════════════════════════════════════════════ */}
      {section === 'time' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">🕐 Telling Time</h3>
          <p className="nums-section-desc">The clock runs <strong>clockwise</strong> — the same direction as reading: left → right → down. The <span style={{color:'#DC2626'}}>short red hand</span> = hour. The <span style={{color:'#2D68C4'}}>long blue hand</span> = minutes.</p>

          <div className="nums-pair-nav">
            {filteredClocks.map((c, i) => (
              <button key={i} className={`nums-pair-btn ${clockIdx === i ? 'active' : ''}`} onClick={() => setClockIdx(i)}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="nums-clock-panel">
            <div className="nums-clock-wrap">
              <ClockFace hour={currentClock.hour} minute={currentClock.minute} />
              <div className="nums-clock-labels">
                <div className="nums-clock-analog">🕐 {currentClock.label}</div>
                <div className="nums-clock-digital">💻 {currentClock.digital}</div>
              </div>
            </div>
            <div className="nums-clock-tip">
              <div className="nums-trick-title">💡 What to look for</div>
              <p>{currentClock.tip}</p>
              <button
                {...ttsBtn(`The time is ${currentClock.label}. ${currentClock.tip}`)}
              >{speakingText === `The time is ${currentClock.label}. ${currentClock.tip}` ? '⏹' : '🔊'}</button>
            </div>
          </div>

          <div className="nums-rule-box">
            <strong>Direction tip:</strong> Clock hands always move <em>left to right across the top</em> (9 → 12 → 3) then <em>right to left across the bottom</em> (3 → 6 → 9). This is <em>clockwise</em>. Dyslexic learners sometimes confuse clockwise with anti-clockwise.
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           SECTION 7: NUMBER LINE
      ══════════════════════════════════════════════════════ */}
      {section === 'numberline' && (
        <div className="nums-section-body">
          <h3 className="nums-section-title">↔️ Number Line</h3>
          <p className="nums-section-desc">Numbers always increase going RIGHT →. Negative numbers sit to the LEFT ← of zero.</p>

          <div className="nums-pair-nav">
            {filteredNL.map((nl, i) => (
              <button key={i} className={`nums-pair-btn ${nlSet === i ? 'active' : ''}`} onClick={() => setNlSet(i)}>
                {nl.label}
              </button>
            ))}
          </div>

          <div className="nums-nl-scroll" ref={nlScrollRef}>
            <div className="nums-nl-wrap">
              {/* Left arrow */}
              <div className="nums-nl-arrow">←</div>

              {/* The line */}
              <div className="nums-nl-track">
                {nlNumbers().map((n, i) => {
                  const isSelected = selectedNlIdx === i;
                  const hasSelection = selectedNlIdx !== null;
                  return (
                    <div
                      key={i}
                      className={[
                        'nums-nl-item',
                        n === 0 ? 'zero' : Number(n) < 0 ? 'negative' : 'positive',
                        currentNL.backwards && i === 0 ? 'highlight' : '',
                        isSelected ? 'nl-selected' : '',
                        hasSelection && !isSelected ? 'nl-dimmed' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setSelectedNlIdx(isSelected ? null : i)}
                    >
                      <div className="nums-nl-tick" />
                      <span className="nums-nl-num">{n}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right arrow */}
              <div className="nums-nl-arrow">→</div>
            </div>
          </div>

          {/* Zoom display — appears below the line, panel expands naturally */}
          {selectedNlIdx !== null && (() => {
            const n = nlNumbers()[selectedNlIdx];
            const num = Number(n);
            const isZero = n === 0 || n === '0';
            const isNeg  = num < 0;
            const color  = isZero ? '#DC2626' : isNeg ? '#7C3AED' : 'var(--primary-color)';
            const steps  = Math.abs(num);
            const desc   = isZero
              ? 'The starting point — neither positive nor negative'
              : isNeg
              ? `${steps} step${steps !== 1 ? 's' : ''} to the LEFT of zero`
              : `${steps} step${steps !== 1 ? 's' : ''} to the RIGHT of zero`;
            return (
              <div className="nl-zoom-display" style={{ '--nl-zoom-color': color }}>
                <div className="nl-zoom-circle">
                  <span className="nl-zoom-num">{n}</span>
                </div>
                <p className="nl-zoom-desc">{desc}</p>
                <button
                  className="nl-zoom-close"
                  onClick={() => setSelectedNlIdx(null)}
                  aria-label="Close"
                >✕</button>
              </div>
            );
          })()}

          {currentNL.neg && (
            <div className="nums-rule-box" style={{ borderLeft: '4px solid #DC2626' }}>
              <strong>Negative numbers:</strong> They live to the LEFT of zero. −5 is 5 steps left of zero. −5 is <em>less than</em> −1 even though 5 &gt; 1 — the minus sign flips the comparison!
            </div>
          )}
          {currentNL.backwards && (
            <div className="nums-rule-box">
              <strong>Counting backwards:</strong> Start at the right and move LEFT. Each step = −1. Say it aloud: "20, 19, 18…" — this helps with subtraction too.
            </div>
          )}
          {currentNL.fractional && (
            <div className="nums-rule-box">
              <strong>Fractions on a line:</strong> ½ is exactly halfway between 0 and 1. ¼ is halfway between 0 and ½. Fractions are just precise points between whole numbers.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
