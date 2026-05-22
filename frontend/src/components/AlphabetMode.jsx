import { useState } from 'react';

// ── Letter data ──────────────────────────────────────────────────────────────
// tricky: letters that dyslexic learners most commonly confuse due to
// rotational / mirror symmetry or visual similarity.
//
// stroke objects follow British education guidance (current sources):
//   • BDA Dyslexia Style Guide (2023) — bdadyslexia.org.uk
//   • BDA Handwriting and Dyslexia guidance (2023)
//   • DfE "The Reading Framework" (September 2023) — supersedes Letters & Sounds 2007
//   • DfE SEND Code of Practice 0-25 (updated September 2024)
//   • National Handwriting Association (NHA) — nha-handwriting.org.uk (2024)
//   • Dyslexia/SpLD Trust Primary Schools Framework (2022-2024)
//   • Letter-join Handwriting & Dyslexia guide (BDA-recommended, 2023)
//
// Letter families used below (Letter-join / NHA classification):
//   Curly Caterpillar (anticlockwise) — a c d e g o q s
//   Tall letters                      — b d h k l
//   One-Armed Robot (arch)            — h m n r  b p
//   Going-under (descender)           — g j p q y
//   Zig-zag (diagonal)               — k v w x y z
//   Crossbar letters                  — f t
const ALPHABET_DATA = [
  {
    letter: 'a', word: 'Apple', emoji: '🍎', sound: 'a', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — starts like c',
      bda: 'Round to the left like c, then close and go down',
      steps: [
        'Start near the top on the right side',
        'Curve round to the LEFT — all the way round (like the letter c)',
        'Close the circle — touch where you started',
        'Go back DOWN to the writing line',
      ],
    },
  },
  {
    letter: 'b', word: 'Bat', emoji: '🦇', sound: 'b', tricky: true,
    confusesWith: ['d', 'p'],
    tip: 'In the word "bed" 🛏️ the b is at the START — its bump faces RIGHT, like a headboard. Remember: the stick comes FIRST, then the bump curves right →',
    stroke: {
      family: 'One-Armed Robot — tall',
      bda: 'Big stick down, bounce up halfway, curve round to the right',
      steps: [
        'Start at the TOP — go straight DOWN to the writing line',
        'Bounce back UP to halfway',
        'Curve round to the RIGHT — making the round bump',
        'Touch the writing line to close the bump',
        '⚠️ The bump always faces RIGHT',
      ],
    },
  },
  {
    letter: 'c', word: 'Cat', emoji: '🐱', sound: 'c', tricky: false,
    stroke: {
      family: 'Curly Caterpillar',
      bda: 'Curve round to the left — leave the letter open',
      steps: [
        'Start near the top on the right side',
        'Curve round to the LEFT — down and round the bottom',
        'Stop — leave the letter OPEN on the right',
      ],
    },
  },
  {
    letter: 'd', word: 'Dog', emoji: '🐶', sound: 'd', tricky: true,
    confusesWith: ['b', 'q'],
    tip: 'In the word "bed" 🛏️ the d is at the END — its bump faces LEFT, like a footboard. Remember: draw the circle FIRST (like the letter c), then add the tall stick on the RIGHT.',
    stroke: {
      family: 'Curly Caterpillar — tall',
      bda: 'Round like c FIRST, then go up tall and back down',
      steps: [
        'Start the SAME way as c — curve round to the LEFT',
        'Go all the way round and close the circle',
        'Keep going UP — all the way to the top',
        'Come back DOWN to the writing line',
        '⚠️ Circle FIRST, then the tall stick — never the other way round',
        '⚠️ The bump always faces LEFT',
      ],
    },
  },
  {
    letter: 'e', word: 'Elephant', emoji: '🐘', sound: 'e', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — starts with a bar',
      bda: 'Little line across, then curve round to the left',
      steps: [
        'Start in the middle — draw a short line to the RIGHT',
        'Curve UP and round to the LEFT',
        'Go down and round the bottom',
        'Stop — leave the letter OPEN',
      ],
    },
  },
  {
    letter: 'f', word: 'Fish', emoji: '🐟', sound: 'f', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — tall with cross-stroke',
      bda: 'Curve over at the top, go down, then add a cross in the middle',
      steps: [
        'Start near the top — curve over to the LEFT like a fish hook',
        'Go straight DOWN to the writing line',
        'Add a cross-stroke ACROSS in the middle',
      ],
    },
  },
  {
    letter: 'g', word: 'Goat', emoji: '🐐', sound: 'g', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — tail goes under the line',
      bda: 'Round like a, then tail goes below the writing line and curves left',
      steps: [
        'Start near the top on the right side',
        'Curve round to the LEFT — all the way round (like the letter a)',
        'Keep going DOWN past the writing line',
        'Curve the tail to the LEFT',
      ],
    },
  },
  {
    letter: 'h', word: 'Hat', emoji: '🎩', sound: 'h', tricky: false,
    stroke: {
      family: 'One-Armed Robot — tall',
      bda: 'Big stick down, bounce up, arch over and down',
      steps: [
        'Start at the TOP — go straight DOWN to the writing line',
        'Bounce back UP to above halfway',
        'Arch UP and OVER to the right',
        'Come back DOWN to the writing line',
      ],
    },
  },
  {
    letter: 'i', word: 'Igloo', emoji: '🧊', sound: 'i', tricky: false,
    stroke: {
      family: 'Long Ladder — short',
      bda: 'Short stick down, then add the dot on top',
      steps: [
        'Start halfway up — go DOWN to the writing line',
        'Add a DOT just above the letter',
      ],
    },
  },
  {
    letter: 'j', word: 'Jar', emoji: '🫙', sound: 'j', tricky: false,
    stroke: {
      family: 'Long Ladder — tail goes under the line',
      bda: 'Short stick, go below the line and hook left, then add the dot',
      steps: [
        'Start halfway up — go DOWN past the writing line',
        'Curve round to the LEFT at the bottom (like a hook)',
        'Add a DOT just above',
      ],
    },
  },
  {
    letter: 'k', word: 'Kite', emoji: '🪁', sound: 'k', tricky: false,
    stroke: {
      family: 'One-Armed Robot — tall with kicks',
      bda: 'Tall stick down, kick up-right, kick down-right',
      steps: [
        'Start at the TOP — go straight DOWN to the writing line',
        'Go back to halfway up',
        'Kick UP and out to the RIGHT',
        'Kick DOWN and out to the RIGHT from the same middle point',
      ],
    },
  },
  {
    letter: 'l', word: 'Lion', emoji: '🦁', sound: 'l', tricky: false,
    stroke: {
      family: 'Long Ladder — the simplest letter!',
      bda: 'One stroke — straight down from top to writing line',
      steps: [
        'Start at the TOP',
        'Go straight DOWN to the writing line — that\'s it!',
      ],
    },
  },
  {
    letter: 'm', word: 'Moon', emoji: '🌙', sound: 'm', tricky: true,
    confusesWith: ['w'],
    tip: 'M has two MOUNTAINS pointing UP ⛰️⛰️. W has two WAVES pointing DOWN 🌊🌊. Say "M is for Mountains" to remember it goes UP!',
    stroke: {
      family: 'One-Armed Robot — double hump',
      bda: 'Down, arch over right, down, arch over right, down — two humps',
      steps: [
        'Start halfway up on the left — go DOWN to the writing line',
        'Bounce back up to halfway',
        'Arch UP and OVER to the right — FIRST hump — come back down',
        'Bounce up to halfway again',
        'Arch UP and OVER to the right — SECOND hump — come back down',
        '⚠️ m has TWO humps; n has only ONE',
      ],
    },
  },
  {
    letter: 'n', word: 'Nest', emoji: '🪺', sound: 'n', tricky: true,
    confusesWith: ['u', 'h'],
    tip: 'n is a tiny bridge 🌉 — one arch that opens DOWNWARD. u is a cup 🥛 — it curves UPWARD to hold things. Tip the n upside down and it becomes u!',
    stroke: {
      family: 'One-Armed Robot — single hump',
      bda: 'Down, arch over right, down — one hump',
      steps: [
        'Start halfway up on the left — go DOWN to the writing line',
        'Bounce back up to halfway',
        'Arch UP and OVER to the right — ONE hump — come back down',
        '⚠️ n has ONE hump; m has TWO humps',
      ],
    },
  },
  {
    letter: 'o', word: 'Octopus', emoji: '🐙', sound: 'o', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — full circle',
      bda: 'All the way round — close the circle',
      steps: [
        'Start near the top on the right side',
        'Curve round to the LEFT — all the way round',
        'Close the circle back where you started',
      ],
    },
  },
  {
    letter: 'p', word: 'Pig', emoji: '🐷', sound: 'p', tricky: true,
    confusesWith: ['b', 'q'],
    tip: 'p hangs BELOW the line (it has a tail going down). Its bump faces RIGHT. Remember: "the pig snout 🐽 faces right." The stick starts above and goes down below the line.',
    stroke: {
      family: 'One-Armed Robot — tail goes under the line',
      bda: 'Stick down below the line, bounce up, curve round to the right',
      steps: [
        'Start halfway up — go DOWN past the writing line',
        'Bounce back up to halfway',
        'Curve round to the RIGHT — making the round bump',
        'Close the bump at the writing line (not below it)',
        '⚠️ The bump faces RIGHT — same side as b',
        '⚠️ The tail hangs below the writing line — unlike b',
      ],
    },
  },
  {
    letter: 'q', word: 'Queen', emoji: '👸', sound: 'q', tricky: true,
    confusesWith: ['p', 'd'],
    tip: 'q hangs BELOW the line. Its bump faces LEFT. Remember: "the queen 👸 always looks left (haughtily)." The tail goes down and to the RIGHT.',
    stroke: {
      family: 'Curly Caterpillar — tail goes under the line',
      bda: 'Full circle like o, then tail goes straight down below the line',
      steps: [
        'Start near the top on the right side — curve round to the LEFT',
        'Go all the way round — close the circle',
        'Keep going DOWN past the writing line',
        '⚠️ The bump faces LEFT — same side as d',
        '⚠️ The tail hangs below the writing line — unlike d',
      ],
    },
  },
  {
    letter: 'r', word: 'Rainbow', emoji: '🌈', sound: 'r', tricky: false,
    stroke: {
      family: 'One-Armed Robot — short shoulder',
      bda: 'Down, bounce up, add a tiny bump to the right — then stop',
      steps: [
        'Start halfway up — go DOWN to the writing line',
        'Bounce back up to halfway',
        'Add a small curved bump to the RIGHT — then stop',
        'Do NOT close the arch — leave it open',
      ],
    },
  },
  {
    letter: 's', word: 'Snake', emoji: '🐍', sound: 's', tricky: false,
    stroke: {
      family: 'Curly Caterpillar — wiggly',
      bda: 'Curve left then change direction — like a wiggling snake',
      steps: [
        'Start near the top — curve round to the LEFT (like the start of c)',
        'At the middle, change direction — curve round to the RIGHT',
        'Finish at the bottom left — leave the letter open',
      ],
    },
  },
  {
    letter: 't', word: 'Tree', emoji: '🌳', sound: 't', tricky: false,
    stroke: {
      family: 'Long Ladder — with a cross-stroke (not as tall as b, d, h)',
      bda: 'Down from just below the top, then add a cross in the middle',
      steps: [
        'Start NOT at the very top — a little bit below it',
        'Go DOWN to the writing line',
        'Add a cross-stroke ACROSS in the middle',
      ],
    },
  },
  {
    letter: 'u', word: 'Umbrella', emoji: '☂️', sound: 'u', tricky: true,
    confusesWith: ['n'],
    tip: 'u is a cup 🥛 — open at the TOP so it can hold water. n is a bridge — open at the BOTTOM. Turn a cup upside down and it becomes a bridge!',
    stroke: {
      family: 'Long Ladder — cup shape',
      bda: 'Down, round the bottom like a cup, back up, then down again',
      steps: [
        'Start halfway up on the left — go DOWN toward the writing line',
        'Curve round the bottom — like the base of a cup',
        'Come back UP to halfway on the right',
        'Come back DOWN to the writing line',
        '⚠️ The opening is at the TOP — u holds water, n lets it fall',
      ],
    },
  },
  {
    letter: 'v', word: 'Volcano', emoji: '🌋', sound: 'v', tricky: false,
    stroke: {
      family: 'Zig-zag Monster',
      bda: 'Slant down-right to a point, then slant up-right',
      steps: [
        'Start halfway up on the left',
        'Slant DOWN to the right — to a sharp point',
        'Slant back UP to the right — back to halfway',
      ],
    },
  },
  {
    letter: 'w', word: 'Water', emoji: '💧', sound: 'w', tricky: true,
    confusesWith: ['m'],
    tip: 'W has WAVES pointing DOWN 🌊🌊. M has MOUNTAINS pointing UP ⛰️⛰️. Flip M upside down and you get W — they are opposite!',
    stroke: {
      family: 'Zig-zag Monster — double',
      bda: 'Two v shapes joined — all points go DOWN',
      steps: [
        'Start halfway up on the left',
        'Slant DOWN-RIGHT to a point',
        'Slant back UP to a middle point',
        'Slant DOWN-RIGHT to another point',
        'Slant back UP to the right',
        '⚠️ w points DOWN; m arches UP',
      ],
    },
  },
  {
    letter: 'x', word: 'Fox', emoji: '🦊', sound: 'x', tricky: false,
    stroke: {
      family: 'Zig-zag Monster — crossing strokes',
      bda: 'Two strokes that cross in the middle',
      steps: [
        'Slant DOWN from top-LEFT to bottom-RIGHT',
        'Slant DOWN from top-RIGHT to bottom-LEFT',
        'The two strokes cross in the middle',
      ],
    },
  },
  {
    letter: 'y', word: 'Yak', emoji: '🦬', sound: 'y', tricky: false,
    stroke: {
      family: 'Zig-zag Monster — tail goes under the line',
      bda: 'Like v, but the right stroke keeps going down below the line',
      steps: [
        'Start halfway up on the left',
        'Slant DOWN-RIGHT to the middle point',
        'From the top-RIGHT — slant down through the same middle point',
        'Keep going DOWN past the writing line — then curve left',
      ],
    },
  },
  {
    letter: 'z', word: 'Zebra', emoji: '🦓', sound: 'z', tricky: false,
    stroke: {
      family: 'Zig-zag Monster',
      bda: 'Across the top, slant down-left, across the bottom',
      steps: [
        'Draw a line ACROSS to the right along the top',
        'Slant DOWN to the bottom-left corner',
        'Draw a line ACROSS to the right along the writing line',
      ],
    },
  },
];

// ── Confusable pairs with extended teaching content ──────────────────────────
const TRICKY_PAIRS = [
  {
    letters: ['b', 'd'],
    name: 'The BED Trick 🛏️',
    bedWord: true,
    tip: 'Write the word "bed" in lowercase. Look at it — it looks like a bed! The b is the headboard on the left with the bump facing RIGHT →. The d is the footboard on the right with the bump facing LEFT ←. The e in the middle is the mattress!',
    colorA: '#E84545',
    colorB: '#2D68C4',
  },
  {
    letters: ['p', 'q'],
    name: 'p and q — Mirror Twins 🪞',
    bedWord: false,
    tip: 'p and q are mirror images of each other. Both hang BELOW the line. p has its bump on the RIGHT (like a piggy snout 🐽 facing right). q has its bump on the LEFT (like a queen 👸 looking left). Say "pig goes right, queen goes left"!',
    colorA: '#9333EA',
    colorB: '#059669',
  },
  {
    letters: ['m', 'w'],
    name: 'Mountains ⛰️ and Waves 🌊',
    bedWord: false,
    tip: 'm has humps pointing UP — like two mountains ⛰️⛰️. w has humps pointing DOWN — like two waves 🌊🌊. Flip m upside down and you get w! Say "m for mountains means UP, w for waves means DOWN".',
    colorA: '#B45309',
    colorB: '#0369A1',
  },
  {
    letters: ['n', 'u'],
    name: 'Bridge 🌉 and Cup 🥛',
    bedWord: false,
    tip: 'n is a bridge — one arch open at the BOTTOM (like a tunnel). u is a cup — open at the TOP (to hold water). Tip a cup upside down and it becomes a bridge! "n is for kNeel-down bridge, u is for Up-facing cup."',
    colorA: '#C2410C',
    colorB: '#1D4ED8',
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function AlphabetMode({ onSpeak, isSpeaking }) {
  const [view, setView] = useState('grid');       // 'grid' | 'detail' | 'pairs'
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activePair, setActivePair] = useState(0);
  const [trickyOnly, setTrickyOnly] = useState(false);
  const [caseView, setCaseView] = useState('both'); // 'both' | 'upper' | 'lower'

  const displayLetters = trickyOnly
    ? ALPHABET_DATA.filter(l => l.tricky)
    : ALPHABET_DATA;

  const current = displayLetters[currentIdx] ?? ALPHABET_DATA[0];

  function speak(letterData) {
    const text = `The letter ${letterData.letter.toUpperCase()}. Sound: ${letterData.sound}. ${letterData.word} starts with ${letterData.letter.toUpperCase()}.`;
    onSpeak(text);
  }

  function goToLetter(letter) {
    const idx = displayLetters.findIndex(d => d.letter === letter);
    if (idx >= 0) {
      setCurrentIdx(idx);
      setView('detail');
    }
  }

  return (
    <div className="alphabet-container">

      {/* ── View tabs ── */}
      <div className="alph-tabs">
        <button className={`alph-tab ${view === 'grid'   ? 'active' : ''}`} onClick={() => setView('grid')}>
          🔤 All Letters
        </button>
        <button className={`alph-tab ${view === 'detail' ? 'active' : ''}`} onClick={() => setView('detail')}>
          🔍 Letter Focus
        </button>
        <button className={`alph-tab alph-tab-tricky ${view === 'pairs'  ? 'active' : ''}`} onClick={() => setView('pairs')}>
          ⚠️ Tricky Pairs
        </button>
      </div>

      {/* ══ GRID VIEW ══════════════════════════════════════════════════════════ */}
      {view === 'grid' && (
        <div className="alph-grid-view">
          <div className="alph-grid-header">
            <div className="alph-filter-row">
              <button
                className={`alph-filter-btn ${!trickyOnly ? 'active' : ''}`}
                onClick={() => { setTrickyOnly(false); setCurrentIdx(0); }}
              >
                All 26 Letters
              </button>
              <button
                className={`alph-filter-btn alph-filter-tricky ${trickyOnly ? 'active' : ''}`}
                onClick={() => { setTrickyOnly(true); setCurrentIdx(0); }}
              >
                ⚠️ Tricky Only ({ALPHABET_DATA.filter(l => l.tricky).length})
              </button>
            </div>
          </div>

          <div className="letter-grid">
            {displayLetters.map((data, idx) => (
              <button
                key={data.letter}
                className={`letter-tile ${data.tricky ? 'tricky' : ''}`}
                onClick={() => { setCurrentIdx(idx); setView('detail'); }}
                aria-label={`Letter ${data.letter.toUpperCase()}, ${data.tricky ? 'tricky letter, ' : ''}click to learn`}
              >
                <span className="tile-upper">{data.letter.toUpperCase()}</span>
                <span className="tile-lower">{data.letter}</span>
                {data.tricky && <span className="tile-warning" aria-hidden="true">⚠️</span>}
              </button>
            ))}
          </div>

          <p className="alph-legend">
            <span className="legend-tricky">⚠️ Orange = Tricky</span> — letters dyslexic learners often mix up.
            Click any letter to explore it up close!
          </p>
        </div>
      )}

      {/* ══ DETAIL VIEW ════════════════════════════════════════════════════════ */}
      {view === 'detail' && (
        <div className="alph-detail-view animate-pop">
          {/* Navigation */}
          <div className="alph-detail-nav">
            <button
              className="primary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}
            >← Prev</button>
            <span className="alph-nav-counter">
              {currentIdx + 1} / {displayLetters.length}
            </span>
            <button
              className="primary"
              disabled={currentIdx === displayLetters.length - 1}
              onClick={() => setCurrentIdx(i => i + 1)}
            >Next →</button>
          </div>

          {/* Case toggle */}
          <div className="alph-case-toggle">
            {['both', 'upper', 'lower'].map(c => (
              <button
                key={c}
                className={`case-toggle-btn ${caseView === c ? 'active' : ''}`}
                onClick={() => setCaseView(c)}
              >
                {c === 'both' ? 'Both' : c === 'upper' ? 'UPPER' : 'lower'}
              </button>
            ))}
          </div>

          {/* Tricky badge */}
          {current.tricky && (
            <div className="tricky-badge animate-pop" role="alert">
              ⚠️ Tricky Letter — easy to mix up! Read the tip below.
            </div>
          )}

          {/* Big letter display */}
          <div className="alph-letter-display">
            {(caseView === 'both' || caseView === 'upper') && (
              <div className="alph-case-box upper-box">
                <div className="case-label">UPPERCASE</div>
                <div className="alph-big-letter">{current.letter.toUpperCase()}</div>
              </div>
            )}
            {caseView === 'both' && <div className="alph-case-divider">↕</div>}
            {(caseView === 'both' || caseView === 'lower') && (
              <div className="alph-case-box lower-box">
                <div className="case-label">lowercase</div>
                <div className="alph-big-letter">{current.letter}</div>
              </div>
            )}
          </div>

          {/* Word + sound + TTS */}
          <div className="alph-word-row">
            <span className="alph-emoji" aria-hidden="true">{current.emoji}</span>
            <span className="alph-word">
              <span className="alph-word-initial">{current.word[0]}</span>
              {current.word.slice(1)}
            </span>
            <span className="alph-sound">/{current.sound}/</span>
            <button
              className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`}
              onClick={() => speak(current)}
              aria-label={isSpeaking ? 'Stop' : `Listen to letter ${current.letter.toUpperCase()}`}
            >{isSpeaking ? '⏹' : '🔊'}</button>
          </div>

          {/* Tricky tip */}
          {current.tricky && (
            <div className="tricky-tip animate-pop">
              <div className="tricky-tip-title">💡 Memory Tip</div>
              <p>{current.tip}</p>
              {current.confusesWith && (
                <div className="confuses-with">
                  <span>Often mixed up with:</span>
                  {current.confusesWith.map(l => (
                    <button
                      key={l}
                      className="confuse-badge"
                      onClick={() => goToLetter(l)}
                      aria-label={`Go to letter ${l.toUpperCase()}`}
                    >
                      {l.toUpperCase()} / {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="alph-detail-actions">

            <button onClick={() => setView('grid')}>↩ Back to Grid</button>
            {current.tricky && (
              <button className="accent" onClick={() => {
                const pairIdx = TRICKY_PAIRS.findIndex(p => p.letters.includes(current.letter));
                if (pairIdx >= 0) setActivePair(pairIdx);
                setView('pairs');
              }}>
                ⚠️ See Tricky Pair
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ TRICKY PAIRS VIEW ══════════════════════════════════════════════════ */}
      {view === 'pairs' && (
        <div className="alph-pairs-view">
          <p className="pairs-intro">
            These letters look very similar and are the most commonly mixed up by dyslexic readers.
            Study each pair and use the memory tip!
          </p>

          {/* Pair selector */}
          <div className="pairs-tab-row">
            {TRICKY_PAIRS.map((pair, i) => (
              <button
                key={i}
                className={`pairs-selector-btn ${activePair === i ? 'active' : ''}`}
                onClick={() => setActivePair(i)}
              >
                {pair.letters[0].toUpperCase()}/{pair.letters[1].toUpperCase()}
              </button>
            ))}
          </div>

          {(() => {
            const pair = TRICKY_PAIRS[activePair];
            const l1 = ALPHABET_DATA.find(d => d.letter === pair.letters[0]);
            const l2 = ALPHABET_DATA.find(d => d.letter === pair.letters[1]);
            return (
              <div className="pair-detail animate-pop" key={activePair}>
                <h3 className="pair-name">{pair.name}</h3>

                {/* BED trick special display for b/d */}
                {pair.bedWord && (
                  <div className="bed-trick" aria-label="The word bed showing b and d letters">
                    <div className="bed-letters-row">
                      <span className="bed-b" style={{ color: pair.colorA }}>b</span>
                      <span className="bed-e">e</span>
                      <span className="bed-d" style={{ color: pair.colorB }}>d</span>
                    </div>
                    <div className="bed-label">
                      🛏️ "bed" — the word shows you <em>both</em> letters!
                    </div>
                    <div className="bed-arrows">
                      <span style={{ color: pair.colorA }}>bump faces right →</span>
                      <span className="bed-arrow-gap">· mattress ·</span>
                      <span style={{ color: pair.colorB }}>← bump faces left</span>
                    </div>
                  </div>
                )}

                {/* Side-by-side letter cards */}
                <div className="pair-letters">
                  <div className="pair-letter-card" style={{ borderColor: pair.colorA }}>
                    <div className="pair-big-upper" style={{ color: pair.colorA }}>
                      {l1.letter.toUpperCase()}
                    </div>
                    <div className="pair-big-lower" style={{ color: pair.colorA }}>
                      {l1.letter}
                    </div>
                    <div className="pair-word">{l1.emoji} {l1.word}</div>
                    <button className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`} onClick={() => speak(l1)} aria-label={isSpeaking ? 'Stop' : `Hear ${l1.letter}`}>{isSpeaking ? '⏹' : '🔊'}</button>
                  </div>

                  <div className="pair-vs" aria-hidden="true">VS</div>

                  <div className="pair-letter-card" style={{ borderColor: pair.colorB }}>
                    <div className="pair-big-upper" style={{ color: pair.colorB }}>
                      {l2.letter.toUpperCase()}
                    </div>
                    <div className="pair-big-lower" style={{ color: pair.colorB }}>
                      {l2.letter}
                    </div>
                    <div className="pair-word">{l2.emoji} {l2.word}</div>
                    <button className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`} onClick={() => speak(l2)} aria-label={isSpeaking ? 'Stop' : `Hear ${l2.letter}`}>{isSpeaking ? '⏹' : '🔊'}</button>
                  </div>
                </div>

                <div className="pair-tip">
                  <div className="tricky-tip-title">💡 Remember</div>
                  <p>{pair.tip}</p>
                </div>

                {/* Quick jump to detail */}
                <div className="pair-explore-row">
                  <button onClick={() => goToLetter(l1.letter)}>
                    Explore {l1.letter.toUpperCase()} in detail
                  </button>
                  <button onClick={() => goToLetter(l2.letter)}>
                    Explore {l2.letter.toUpperCase()} in detail
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
