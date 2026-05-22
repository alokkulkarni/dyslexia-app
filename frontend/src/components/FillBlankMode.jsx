import { syllabify } from '../utils/syllables.js';

/**
 * Fill-in-the-blank game mode.
 * Shows the definition (back of card); user types the word (front).
 * Awards +15 points for correct. 2-level hint system:
 *   Level 1 — first letter + blanks
 *   Level 2 — syllable breakdown of the answer
 */
export function FillBlankMode({
  flashcards,
  currentCardIndex,
  fillInput,
  fillResult,
  fillHintLevel,
  onInputChange,
  onSubmit,
  onHint,
  onNext,
  onSpeak,
  isSpeaking,
  syllableMode,
}) {
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="mode-empty">
        <div style={{ fontSize: '4rem' }}>✏️</div>
        <h3>No flashcards yet!</h3>
        <p>Upload a document to create flashcards, then come back to play!</p>
      </div>
    );
  }

  const card = flashcards[currentCardIndex];
  const answer = card.front;

  const getHint = () => {
    if (fillHintLevel === 0) return null;
    if (fillHintLevel === 1) {
      const blanks = '_'.repeat(Math.max(0, answer.length - 1));
      return `First letter: ${answer[0].toUpperCase()}${blanks}`;
    }
    return `Syllables: ${syllabify(answer)}`;
  };

  const renderAnswerReveal = (text) => {
    if (!syllableMode || !text) return text;
    const parts = syllabify(text).split('·');
    if (parts.length <= 1) return text;
    return parts.map((part, i) => (
      <span key={i}>
        {part}
        {i < parts.length - 1 && <span className="syllable-dot" aria-hidden="true">·</span>}
      </span>
    ));
  };

  const hint = getHint();
  const isCorrect = fillResult === 'correct';

  return (
    <div className="fill-container">
      <div className="fill-header">
        <span className="fill-progress">Card {currentCardIndex + 1} of {flashcards.length}</span>
        <span className="fill-reward">+15 pts per correct</span>
      </div>

      <div className="fill-definition-box">
        <p className="fill-label">What word is being described?</p>
        <div className="fill-definition-text">
          {card.back}
          <button
            className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`}
            onClick={() => onSpeak(card.back)}
            title={isSpeaking ? 'Stop' : 'Listen'}
            aria-label="Listen to definition"
          >
            {isSpeaking ? '⏹' : '🔊'}
          </button>
        </div>
      </div>

      {!fillResult && (
        <div className="fill-input-area">
          <input
            type="text"
            className="fill-input"
            value={fillInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type the word here..."
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            autoFocus
            aria-label="Your answer"
          />
          <div className="fill-buttons">
            <button className="primary" onClick={onSubmit} disabled={!fillInput.trim()}>
              ✅ Check
            </button>
            <button
              className="accent"
              onClick={onHint}
              disabled={fillHintLevel >= 2}
              title={fillHintLevel >= 2 ? 'No more hints' : 'Get a hint (-0 pts)'}
            >
              💡 Hint {fillHintLevel > 0 ? `(${fillHintLevel}/2)` : ''}
            </button>
          </div>
        </div>
      )}

      {hint && !fillResult && (
        <div className="fill-hint" role="alert">
          💡 {hint}
        </div>
      )}

      {fillResult && (
        <div className={`fill-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`} role="alert">
          <div className="feedback-message">
            {isCorrect ? '🎉 Brilliant! +15 points!' : '❌ Not quite — the answer was:'}
          </div>
          <div className="feedback-answer">
            {renderAnswerReveal(answer)}
            <button
              className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`}
              onClick={() => onSpeak(answer)}
              title={isSpeaking ? 'Stop' : 'Listen to the answer'}
            >
              {isSpeaking ? '⏹' : '🔊'}
            </button>
          </div>
          <button className="primary" style={{ marginTop: '1rem' }} onClick={onNext}>
            Next Card ➡️
          </button>
        </div>
      )}
    </div>
  );
}
