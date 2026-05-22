import { syllabify } from '../utils/syllables.js';

/**
 * Multiple-choice quiz mode.
 * Shows the front of a card as the question; presents 4 options (1 correct + 3 distractors).
 * Awards +10 points for a correct answer (handled by parent via onAnswer).
 */
export function QuizMode({
  flashcards,
  currentCardIndex,
  quizQuestion,
  quizAnswered,
  quizSelectedIdx,
  quizScore,
  quizTotal,
  onAnswer,
  onNext,
  onSpeak,
  isSpeaking,
  syllableMode,
}) {
  if (flashcards.length < 4) {
    return (
      <div className="mode-empty">
        <div style={{ fontSize: '4rem' }}>🧩</div>
        <h3>Not enough cards yet!</h3>
        <p>You need at least 4 flashcards to play Quiz Mode. Upload a document to generate more!</p>
      </div>
    );
  }

  if (!quizQuestion) return null;

  const { question, options } = quizQuestion;

  const renderWord = (text) => {
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

  const correctOption = options.find(o => o.isCorrect);
  const selectedCorrect = quizAnswered && options[quizSelectedIdx]?.isCorrect;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <span className="quiz-progress">Card {currentCardIndex + 1} of {flashcards.length}</span>
        {quizTotal > 0 && (
          <span className="quiz-score">
            🎯 {quizScore}/{quizTotal} correct
          </span>
        )}
        <span className="quiz-reward">+10 pts per correct</span>
      </div>

      <div className="quiz-question-box">
        <p className="quiz-label">What does this word mean?</p>
        <div className="quiz-word">
          {renderWord(question.front)}
          <button
            className={`tts-btn${isSpeaking ? ' tts-speaking' : ''}`}
            onClick={() => onSpeak(question.front)}
            title={isSpeaking ? 'Stop' : 'Listen'}
            aria-label={isSpeaking ? 'Stop speaking' : `Listen to ${question.front}`}
          >
            {isSpeaking ? '⏹' : '🔊'}
          </button>
        </div>
      </div>

      <div className="quiz-options">
        {options.map((opt, idx) => {
          let cls = 'quiz-option';
          if (quizAnswered) {
            if (opt.isCorrect) cls += ' correct';
            else if (idx === quizSelectedIdx) cls += ' wrong';
          }
          return (
            <button
              key={idx}
              className={cls}
              onClick={() => onAnswer(idx)}
              disabled={quizAnswered}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {quizAnswered && (
        <div className={`quiz-feedback ${selectedCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
          {selectedCorrect
            ? '🎉 Correct! +10 points!'
            : `❌ The answer was: "${correctOption?.text}"`}
        </div>
      )}

      <div className="quiz-actions">
        {quizAnswered && (
          <button className="primary" onClick={onNext}>
            Next Card ➡️
          </button>
        )}
      </div>
    </div>
  );
}
