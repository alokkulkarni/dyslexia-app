import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import './App.css'
import { prebuiltCards } from './prebuiltCards.js'
import { syllabify } from './utils/syllables.js'
import { QuizMode } from './components/QuizMode.jsx'
import { FillBlankMode } from './components/FillBlankMode.jsx'
import { RewardStore, AVATARS } from './components/RewardStore.jsx'
import { speak, stopSpeaking, ELEVENLABS_VOICES, OPENAI_VOICES } from './utils/ttsService.js'

// Lazy-load the two heaviest modes (~33 KB + ~40 KB) so the initial bundle
// stays lean — they're only needed when the user actually navigates to them.
const AlphabetMode = lazy(() => import('./components/AlphabetMode.jsx'));
const NumbersMode  = lazy(() => import('./components/NumbersMode.jsx'));

const API_URL = import.meta.env.VITE_API_ENDPOINT || "http://localhost:3000";

// Colour values for the Meares-Irlen overlay
const OVERLAY_COLORS = {
  yellow: '#FFFF80',
  blue:   '#80DFFF',
  green:  '#90EE90',
  pink:   '#FFB6C1',
  orange: '#FFD580',
};

function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authState, setAuthState] = useState('login'); // login | signup | confirm | signedin
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Flashcard content ────────────────────────────────────────────────────────
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ageGroup, setAgeGroup] = useState('6-10');

  // ── Document decks ──────────────────────────────────────────────────────────
  const [userDecks, setUserDecks] = useState([]);       // all decks from DynamoDB
  const [activeDeckId, setActiveDeckId] = useState(null); // which deck is loaded
  const [cardCount, setCardCount] = useState(5);        // how many cards to generate

  // ── Game modes ───────────────────────────────────────────────────────────────
  const [gameMode, setGameMode] = useState('flashcard'); // flashcard | quiz | fillblank | alphabet

  // Quiz
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizSelectedIdx, setQuizSelectedIdx] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  // Fill-in-blank
  const [fillInput, setFillInput] = useState('');
  const [fillHintLevel, setFillHintLevel] = useState(0);
  const [fillResult, setFillResult] = useState(null); // null | 'correct' | 'wrong'

  // ── Gamification (persisted to localStorage) ─────────────────────────────────
  const [points, setPoints] = useState(() =>
    parseInt(localStorage.getItem('dyslexilearn_points') || '0')
  );
  const [streak, setStreak] = useState(() =>
    parseInt(localStorage.getItem('dyslexilearn_streak') || '0')
  );
  const [unlockedAvatars, setUnlockedAvatars] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dyslexilearn_unlocked') || '["owl","hero"]'); }
    catch { return ['owl', 'hero']; }
  });
  const [activeAvatar, setActiveAvatar] = useState(() =>
    localStorage.getItem('dyslexilearn_avatar') || 'hero'
  );
  const [showStore, setShowStore] = useState(false);

  // ── Accessibility ─────────────────────────────────────────────────────────────
  const [fontPref, setFontPref] = useState('opendyslexic');
  const [bgPref, setBgPref] = useState('default');
  const [rulerOn, setRulerOn] = useState(false);
  const [rulerColor, setRulerColor] = useState('#FFD700');
  const [mouseY, setMouseY] = useState(0);
  const [showAccessMenu, setShowAccessMenu] = useState(false);
  const [syllableMode, setSyllableMode] = useState(false);
  const [overlayColor, setOverlayColor] = useState('none');
  const [overlayOpacity, setOverlayOpacity] = useState(0.2);

  // ── TTS settings ─────────────────────────────────────────────────────────────
  const [ttsProvider, setTtsProvider] = useState(
    () => localStorage.getItem('tts_provider') || 'browser'
  );
  const [elevenLabsKey, setElevenLabsKey] = useState(
    // CVE-6: API keys in sessionStorage (cleared when tab closes) not localStorage
    () => sessionStorage.getItem('tts_elevenlabs_key') || ''
  );
  const [elevenLabsVoice, setElevenLabsVoice] = useState(
    () => localStorage.getItem('tts_elevenlabs_voice') || ELEVENLABS_VOICES[0].id
  );
  const [openAIKey, setOpenAIKey] = useState(
    // CVE-6: API keys in sessionStorage (cleared when tab closes) not localStorage
    () => sessionStorage.getItem('tts_openai_key') || ''
  );
  const [openAIVoice, setOpenAIVoice] = useState(
    () => localStorage.getItem('tts_openai_voice') || 'nova'
  );
  const [speechRate, setSpeechRate] = useState(
    () => parseFloat(localStorage.getItem('tts_speech_rate') || '0.85')
  );
  const [speakingText, setSpeakingText] = useState(null);
  const isSpeaking = speakingText !== null; // derived — used by QuizMode / FillBlankMode / AlphabetMode
  const currentAudioRef = useRef(null);

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Apply theme / font to body
  useEffect(() => {
    document.body.setAttribute('data-theme', bgPref);
    document.body.setAttribute('data-font', fontPref);
  }, [bgPref, fontPref]);

  // Track mouse for reading ruler
  useEffect(() => {
    if (!rulerOn) return;
    const handleMouseMove = (e) => setMouseY(e.clientY);
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [rulerOn]);

  // On sign-in: load flashcards and check streak
  useEffect(() => {
    if (authState === 'signedin') {
      fetchFlashcards();
      checkStreak();
    }
  }, [authState]);

  // Persist gamification state
  useEffect(() => { localStorage.setItem('dyslexilearn_points', points); }, [points]);
  useEffect(() => { localStorage.setItem('dyslexilearn_streak', streak); }, [streak]);
  useEffect(() => {
    localStorage.setItem('dyslexilearn_unlocked', JSON.stringify(unlockedAvatars));
  }, [unlockedAvatars]);
  useEffect(() => { localStorage.setItem('dyslexilearn_avatar', activeAvatar); }, [activeAvatar]);

  // Persist TTS settings (keys use sessionStorage — cleared on tab close to limit XSS exposure)
  useEffect(() => { localStorage.setItem('tts_provider', ttsProvider); }, [ttsProvider]);
  useEffect(() => { sessionStorage.setItem('tts_elevenlabs_key', elevenLabsKey); }, [elevenLabsKey]);
  useEffect(() => { localStorage.setItem('tts_elevenlabs_voice', elevenLabsVoice); }, [elevenLabsVoice]);
  useEffect(() => { sessionStorage.setItem('tts_openai_key', openAIKey); }, [openAIKey]);
  useEffect(() => { localStorage.setItem('tts_openai_voice', openAIVoice); }, [openAIVoice]);
  useEffect(() => { localStorage.setItem('tts_speech_rate', speechRate); }, [speechRate]);

  // Generate quiz question whenever mode or card changes
  useEffect(() => {
    if (gameMode !== 'quiz' || flashcards.length < 4) return;
    const question = flashcards[currentCardIndex];
    const pool = flashcards.filter((_, i) => i !== currentCardIndex);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const options = [
      { text: question.back, isCorrect: true },
      ...shuffled.slice(0, 3).map(d => ({ text: d.back, isCorrect: false })),
    ].sort(() => Math.random() - 0.5);
    setQuizQuestion({ question, options });
    setQuizAnswered(false);
    setQuizSelectedIdx(null);
  }, [gameMode, currentCardIndex, flashcards]);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const checkStreak = () => {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    const lastActive = localStorage.getItem('dyslexilearn_last_active');
    if (lastActive === today) return;
    if (lastActive === yesterday) {
      setStreak(s => s + 1);
    } else {
      setStreak(1); // first login or streak broken
    }
    localStorage.setItem('dyslexilearn_last_active', today);
  };

  // Renders a word with optional syllable-dot spans
  const renderSyllabified = (text) => {
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

  const activeAvatarData = AVATARS.find(a => a.id === activeAvatar) || AVATARS[1];

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchFlashcards = async () => {
    try {
      if (!API_URL || API_URL.includes("localhost")) {
        setFlashcards(prebuiltCards);
        return;
      }
      const res = await fetch(`${API_URL}/flashcards?userId=${userEmail}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.decks && data.decks.length > 0) {
          // Sort newest first
          const sorted = [...data.decks].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setUserDecks(sorted);
          // Auto-load the most recent deck
          setFlashcards(sorted[0].flashcards);
          setActiveDeckId(sorted[0].deckId);
          setCurrentCardIndex(0);
          setIsFlipped(false);
        } else {
          setFlashcards(prebuiltCards);
        }
      } else {
        setFlashcards(prebuiltCards);
      }
    } catch (e) {
      console.error(e);
      setFlashcards(prebuiltCards);
    }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────────

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!API_URL || API_URL.includes("localhost")) {
        setAuthState('confirm');
        return;
      }
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password })
      });
      if (res.ok) {
        setAuthState('confirm');
      } else {
        const data = await res.json();
        alert(`Error: ${data.message}`);
      }
    } catch (e) {
      alert("Error signing up");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!API_URL || API_URL.includes("localhost")) {
        setAuthState('login');
        alert("Confirmed! Please login.");
        return;
      }
      const res = await fetch(`${API_URL}/auth/confirm`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, code: confirmCode })
      });
      if (res.ok) {
        setAuthState('login');
        alert("Confirmed! Please login.");
      } else {
        const data = await res.json();
        alert(`Error: ${data.message}`);
      }
    } catch (e) {
      alert("Error confirming");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!API_URL || API_URL.includes("localhost")) {
        setToken("mock-jwt-token");
        setAuthState('signedin');
        return;
      }
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.idToken);
        setAuthState('signedin');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (e) {
      alert("Error logging in");
    } finally {
      setIsLoading(false);
    }
  };

  // ── File upload ───────────────────────────────────────────────────────────────

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const base64 = await toBase64(file);

      if (!API_URL || API_URL.includes("localhost")) {
        await new Promise(r => setTimeout(r, 2000));
        const mockCards = [
          { front: "Galaxy", back: "A huge collection of gas, dust, and billions of stars." },
          { front: "Planet", back: "A large round object in space that moves around a star." }
        ];
        const mockDeck = {
          deckId: `mock-${Date.now()}`,
          fileName: file.name,
          createdAt: new Date().toISOString(),
          flashcards: mockCards
        };
        setUserDecks(prev => [mockDeck, ...prev]);
        setFlashcards(mockCards);
        setActiveDeckId(mockDeck.deckId);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setPoints(p => p + 50);
        if (gameMode === 'numbers' || gameMode === 'alphabet') setGameMode('flashcard');
        alert(`🎉 Document processed! ${mockCards.length} cards created. You earned +50 points!`);
        return;
      }

      const uploadRes = await fetch(`${API_URL}/document/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fileContent: base64.split(',')[1],
          fileName: file.name,
          userId: userEmail
        })
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");

      const generateRes = await fetch(`${API_URL}/flashcards/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: userEmail,
          objectKey: uploadData.objectKey,
          ageGroup,
          cardCount,
          fileName: file.name,
          rawText: ""
        })
      });
      const genData = await generateRes.json();
      if (!generateRes.ok) throw new Error(genData.message || "Generate failed");

      // Add the new deck to the local list and activate it
      const newDeck = {
        deckId: genData.deckId,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        flashcards: genData.flashcards
      };
      setUserDecks(prev => [newDeck, ...prev]);
      setFlashcards(genData.flashcards);
      setActiveDeckId(genData.deckId);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setPoints(p => p + 50);
      if (gameMode === 'numbers' || gameMode === 'alphabet') setGameMode('flashcard');
      alert(`🎉 ${genData.flashcards.length} flashcards created! You earned +50 points!`);

    } catch (error) {
      console.error("Error processing document:", error);
      alert(`Failed to process document: ${error.message}`);
    } finally {
      setIsLoading(false);
      // Reset the file input so the same file can be re-uploaded
      event.target.value = '';
    }
  };

  // Load a saved deck into the active flashcard view
  const handleLoadDeck = (deck) => {
    setFlashcards(deck.flashcards);
    setActiveDeckId(deck.deckId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    if (gameMode === 'numbers' || gameMode === 'alphabet') setGameMode('flashcard');
  };

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  // ── TTS ───────────────────────────────────────────────────────────────────────

  const handleSpeak = async (text) => {
    // Always stop whatever is currently playing
    stopSpeaking();
    if (speakingText !== null) {
      setSpeakingText(null);
      if (speakingText === text) return; // same button clicked → just stop
      // different button → fall through and start the new one
    }
    setSpeakingText(text);
    try {
      await speak(text, {
        provider: ttsProvider,
        elevenLabsKey,
        elevenLabsVoice,
        openAIKey,
        openAIVoice,
        speechRate,
      });
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      // Only clear if this exact text is still the active one
      // (prevents clearing a different utterance started mid-flight)
      setSpeakingText(prev => prev === text ? null : prev);
    }
  };

  // ── Card navigation ───────────────────────────────────────────────────────────

  const prevCard = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    resetModeState();
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
    }, 300);
  };

  const nextCard = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    resetModeState();
    setTimeout(() => {
      setCurrentCardIndex(prev => (prev + 1) % flashcards.length);
    }, 300);
  };

  const resetModeState = () => {
    setFillInput('');
    setFillResult(null);
    setFillHintLevel(0);
  };

  const handleModeChange = (mode) => {
    setGameMode(mode);
    setQuizScore(0);
    setQuizTotal(0);
    resetModeState();
    setIsFlipped(false);
  };

  // ── Quiz handlers ─────────────────────────────────────────────────────────────

  const handleQuizAnswer = (idx) => {
    if (quizAnswered) return;
    setQuizSelectedIdx(idx);
    setQuizAnswered(true);
    setQuizTotal(t => t + 1);
    if (quizQuestion.options[idx].isCorrect) {
      setPoints(p => p + 10);
      setQuizScore(s => s + 1);
    }
  };

  // ── Fill-in-blank handlers ────────────────────────────────────────────────────

  const handleFillSubmit = () => {
    if (!fillInput.trim()) return;
    const correct   = flashcards[currentCardIndex].front;
    const normalize = s => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const isCorrect = normalize(fillInput) === normalize(correct);
    setFillResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setPoints(p => p + 15);
  };

  const handleFillHint = () => setFillHintLevel(h => Math.min(h + 1, 2));

  // ── Store handlers ────────────────────────────────────────────────────────────

  const handleBuyAvatar = (avatar) => {
    if (unlockedAvatars.includes(avatar.id) || points < avatar.cost) return;
    setPoints(p => p - avatar.cost);
    setUnlockedAvatars(prev => [...prev, avatar.id]);
  };

  const handleEquipAvatar = (avatar) => {
    if (!unlockedAvatars.includes(avatar.id)) return;
    setActiveAvatar(avatar.id);
  };

  // ── Auth screen ───────────────────────────────────────────────────────────────

  if (authState !== 'signedin') {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel text-center" style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ color: 'var(--primary-color)' }}>DyslexiLearn 🚀</h1>

          {authState === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <input type="email" placeholder="Email" required value={userEmail} onChange={e => setUserEmail(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px' }} />
              <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px' }} />
              <button type="submit" className="primary" disabled={isLoading}>{isLoading ? '...' : 'Log In'}</button>
              <p>No account? <a href="#" onClick={() => setAuthState('signup')}>Sign up</a></p>
            </form>
          )}

          {authState === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <input type="email" placeholder="Email" required value={userEmail} onChange={e => setUserEmail(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px' }} />
              <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px' }} />
              <button type="submit" className="primary" disabled={isLoading}>{isLoading ? '...' : 'Sign Up'}</button>
              <p>Have an account? <a href="#" onClick={() => setAuthState('login')}>Log in</a></p>
            </form>
          )}

          {authState === 'confirm' && (
            <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <p>Check your email for a verification code.</p>
              <input type="text" placeholder="Verification Code" required value={confirmCode} onChange={e => setConfirmCode(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px' }} />
              <button type="submit" className="primary" disabled={isLoading}>{isLoading ? '...' : 'Confirm'}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex];

  // ── Signed-in view ────────────────────────────────────────────────────────────

  return (
    <div className="app-container">

      {/* ── Header ── */}
      <header className="header">
        <div className="logo">
          <h1>DyslexiLearn 🚀</h1>
        </div>
        <div className="gamification-stats animate-pop">
          <div className="stat-badge" title="Daily Streak">🔥 {streak}</div>
          <div className="stat-badge" title="Total Points">⭐ {points}</div>
          <div
            className="stat-badge avatar-badge"
            onClick={() => setShowStore(true)}
            title="Open Avatar Store"
            style={{ cursor: 'pointer', fontSize: '1.5rem' }}
          >
            {activeAvatarData.emoji}
          </div>
          <button
            onClick={() => { setAuthState('login'); setToken(null); }}
            className="accent"
            style={{ marginLeft: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Mode switcher ── */}
      <div className="mode-switcher">
        <button
          className={`mode-btn ${gameMode === 'flashcard' ? 'active' : ''}`}
          onClick={() => handleModeChange('flashcard')}
        >
          🃏 Flashcards
        </button>
        <button
          className={`mode-btn ${gameMode === 'quiz' ? 'active' : ''}`}
          onClick={() => handleModeChange('quiz')}
        >
          🧠 Quiz
        </button>
        <button
          className={`mode-btn ${gameMode === 'fillblank' ? 'active' : ''}`}
          onClick={() => handleModeChange('fillblank')}
        >
          ✏️ Fill-in-Blank
        </button>
        {ageGroup === '6-10' && (
          <button
            className={`mode-btn ${gameMode === 'alphabet' ? 'active' : ''}`}
            onClick={() => handleModeChange('alphabet')}
            title="Alphabet learning — specially designed for ages 5–10"
          >
            🔤 Alphabet
          </button>
        )}
        <button
          className={`mode-btn ${gameMode === 'numbers' ? 'active' : ''}`}
          onClick={() => handleModeChange('numbers')}
          title="Maths & numbers — dyslexia-friendly support for all ages"
        >
          🔢 Numbers
        </button>
      </div>

      {/* ── Main content ── */}
      <main className="main-content">

        {/* Left: Upload section */}
        <section className="upload-section glass-panel">
          <div className="hero-avatar animate-pop">{activeAvatarData.emoji}</div>
          <h2>Ready to learn, {userEmail.split('@')[0]}?</h2>
          <p>Upload a story or document to create fun flashcards!</p>

          <div className="age-selector">
            <label htmlFor="age-group">Age group:</label>
            <select
              id="age-group"
              value={ageGroup}
              onChange={e => {
                const newAge = e.target.value;
                setAgeGroup(newAge);
                // Alphabet mode is only for ages 6-10; fall back to flashcards
                if (newAge !== '6-10' && gameMode === 'alphabet') {
                  setGameMode('flashcard');
                }
              }}
            >
              <option value="6-10">Up to 10 (Simple)</option>
              <option value="11-14">Ages 11–14 (Intermediate)</option>
              <option value="15+">Ages 15+ (Advanced)</option>
            </select>
          </div>

          {/* Card count selector */}
          <div className="card-count-selector">
            <label>Flashcards to generate:</label>
            <div className="card-count-options">
              {[3, 5, 8, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(n => (
                <button
                  key={n}
                  className={`card-count-btn${cardCount === n ? ' active' : ''}`}
                  onClick={() => setCardCount(n)}
                  type="button"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="upload-box">
            <input
              type="file"
              accept=".pdf,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <h3 style={{ color: 'var(--primary-color)' }}>
              {isLoading ? '⏳ Processing...' : '📄 Click to Upload PDF'}
            </h3>
            <p>{isLoading ? `Creating ${cardCount} flashcards…` : 'Max 10 MB · PDF or TXT'}</p>
          </label>

          {/* Saved deck library */}
          {userDecks.length > 0 && (
            <div className="deck-library">
              <h3 className="deck-library-title">📚 My Decks ({userDecks.length})</h3>
              <ul className="deck-list">
                {userDecks.map(deck => {
                  const date = new Date(deck.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const isActive = deck.deckId === activeDeckId;
                  return (
                    <li
                      key={deck.deckId}
                      className={`deck-item${isActive ? ' active' : ''}`}
                      onClick={() => handleLoadDeck(deck)}
                      title={`${deck.fileName} — ${deck.flashcards?.length ?? 0} cards`}
                    >
                      <span className="deck-icon">📄</span>
                      <span className="deck-info">
                        <span className="deck-name">{deck.fileName || 'Document'}</span>
                        <span className="deck-meta">{deck.flashcards?.length ?? 0} cards · {date}</span>
                      </span>
                      {isActive && <span className="deck-active-badge">▶</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Right: Active mode panel */}
        <section className="preview-section glass-panel">

          {gameMode === 'flashcard' && (
            <>
              <h2>Try a Flashcard!</h2>
              <p>Click the card to flip it, or click 🔊 to listen.</p>

              {flashcards.length > 0 ? (
                <>
                  <div className="card-preview mt-2">
                    <div
                      className={`card-inner ${isFlipped ? 'flipped' : ''}`}
                      onClick={() => {
                        if (!isFlipped) setPoints(p => p + 2);
                        setIsFlipped(f => !f);
                      }}
                    >
                      <div className="card-front">
                        <div>
                          <strong>{renderSyllabified(currentCard.front)}</strong>
                          <button
                            className={`accent mt-1${isSpeaking ? ' tts-speaking' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.front); }}
                            style={{ display: 'block', margin: '1rem auto 0', fontSize: '1rem', padding: '0.5rem 1rem' }}
                          >
                            {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                          </button>
                        </div>
                      </div>
                      <div className="card-back">
                        <div>
                          {currentCard.back}
                          <button
                            className={`primary mt-1${isSpeaking ? ' tts-speaking' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleSpeak(currentCard.back); }}
                            style={{ display: 'block', margin: '1rem auto 0', fontSize: '1rem', padding: '0.5rem 1rem' }}
                          >
                            {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-nav mt-2">
                    <button className="primary" onClick={prevCard}>⬅️ Prev</button>
                    <span className="card-counter">{currentCardIndex + 1} / {flashcards.length}</span>
                    <button className="primary" onClick={nextCard}>Next ➡️</button>
                  </div>
                </>
              ) : (
                <p style={{ marginTop: '2rem', textAlign: 'center' }}>No flashcards yet. Upload a document!</p>
              )}
            </>
          )}

          {gameMode === 'quiz' && (
            <QuizMode
              flashcards={flashcards}
              currentCardIndex={currentCardIndex}
              quizQuestion={quizQuestion}
              quizAnswered={quizAnswered}
              quizSelectedIdx={quizSelectedIdx}
              quizScore={quizScore}
              quizTotal={quizTotal}
              onAnswer={handleQuizAnswer}
              onNext={nextCard}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
              syllableMode={syllableMode}
            />
          )}

          {gameMode === 'fillblank' && (
            <FillBlankMode
              flashcards={flashcards}
              currentCardIndex={currentCardIndex}
              fillInput={fillInput}
              fillResult={fillResult}
              fillHintLevel={fillHintLevel}
              onInputChange={setFillInput}
              onSubmit={handleFillSubmit}
              onHint={handleFillHint}
              onNext={nextCard}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
              syllableMode={syllableMode}
            />
          )}

          {gameMode === 'alphabet' && (
            <Suspense fallback={<div className="mode-loading">Loading alphabet mode…</div>}>
              <AlphabetMode onSpeak={handleSpeak} isSpeaking={isSpeaking} />
            </Suspense>
          )}

          {gameMode === 'numbers' && (
            <Suspense fallback={<div className="mode-loading">Loading numbers mode…</div>}>
              <NumbersMode
                ageGroup={ageGroup}
                onSpeak={handleSpeak}
                speakingText={speakingText}
              />
            </Suspense>
          )}

        </section>
      </main>

      {/* ── Reading ruler ── */}
      {rulerOn && (
        <div
          className="reading-ruler"
          style={{ top: `${mouseY - 50}px`, borderColor: rulerColor }}
        />
      )}

      {/* ── Meares-Irlen colour overlay ── */}
      {overlayColor !== 'none' && (
        <div
          className="color-overlay"
          style={{
            backgroundColor: OVERLAY_COLORS[overlayColor],
            opacity: overlayOpacity,
          }}
        />
      )}

      {/* ── Accessibility toggle button ── */}
      <button
        className="access-menu-btn"
        onClick={() => setShowAccessMenu(!showAccessMenu)}
        title="Accessibility Settings"
        aria-label="Accessibility Settings"
      >
        ⚙️
      </button>

      {/* ── Accessibility panel ── */}
      {showAccessMenu && (
        <div className="access-panel animate-pop" role="dialog" aria-label="Accessibility Settings">
          <h3>Accessibility Settings</h3>

          <div className="access-option">
            <label>Font:</label>
            <select value={fontPref} onChange={e => setFontPref(e.target.value)}>
              <option value="opendyslexic">OpenDyslexic ★</option>
              <option value="lexend">Lexend (low visual stress)</option>
              <option value="atkinson">Atkinson Hyperlegible</option>
              <option value="standard">Standard (Outfit/Arial)</option>
            </select>
          </div>

          <div className="access-option">
            <label>Background:</label>
            <select value={bgPref} onChange={e => setBgPref(e.target.value)}>
              <option value="default">Default</option>
              <option value="yellow">Soft Yellow</option>
              <option value="blue">Soft Blue</option>
              <option value="green">Soft Green</option>
              <option value="pink">Soft Pink</option>
              <option value="cream">Soft Cream</option>
            </select>
          </div>

          <div className="access-option">
            <label>Colour Overlay:</label>
            <select value={overlayColor} onChange={e => setOverlayColor(e.target.value)}>
              <option value="none">None</option>
              <option value="yellow">Yellow</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="pink">Pink</option>
              <option value="orange">Orange</option>
            </select>
          </div>

          {overlayColor !== 'none' && (
            <div className="access-option">
              <label>Overlay strength:</label>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.05"
                value={overlayOpacity}
                onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                style={{ width: '100px' }}
              />
            </div>
          )}

          <div className="access-option-inline">
            <label>Reading Ruler:</label>
            <input
              type="checkbox"
              checked={rulerOn}
              onChange={e => setRulerOn(e.target.checked)}
            />
          </div>

          {rulerOn && (
            <div className="access-option-inline">
              <label>Ruler colour:</label>
              <input
                type="color"
                value={rulerColor}
                onChange={e => setRulerColor(e.target.value)}
                style={{ width: '42px', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
              />
            </div>
          )}

          <div className="access-option-inline">
            <label>Syllable breaks:</label>
            <input
              type="checkbox"
              checked={syllableMode}
              onChange={e => setSyllableMode(e.target.checked)}
            />
          </div>

          {/* ── TTS Settings ── */}
          <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '0.6rem 0' }} />
          <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>🔊 Voice (TTS)</p>

          <div className="access-option">
            <label>Voice provider:</label>
            <select value={ttsProvider} onChange={e => setTtsProvider(e.target.value)}>
              <option value="browser">Browser (free, built-in)</option>
              <option value="elevenlabs">ElevenLabs (human-quality)</option>
              <option value="openai">OpenAI TTS (natural)</option>
            </select>
          </div>

          {ttsProvider === 'elevenlabs' && (
            <>
              <div className="access-option">
                <label>ElevenLabs API key:</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={elevenLabsKey}
                  onChange={e => setElevenLabsKey(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div className="access-option">
                <label>Voice:</label>
                <select value={elevenLabsVoice} onChange={e => setElevenLabsVoice(e.target.value)}>
                  {ELEVENLABS_VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {ttsProvider === 'openai' && (
            <>
              <div className="access-option">
                <label>OpenAI API key:</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={openAIKey}
                  onChange={e => setOpenAIKey(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8rem', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div className="access-option">
                <label>Voice:</label>
                <select value={openAIVoice} onChange={e => setOpenAIVoice(e.target.value)}>
                  {OPENAI_VOICES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="access-option">
            <label>Speech speed: {Math.round(speechRate * 100)}%</label>
            <input
              type="range"
              min="0.6"
              max="1.2"
              step="0.05"
              value={speechRate}
              onChange={e => setSpeechRate(parseFloat(e.target.value))}
            />
          </div>

          <button
            className="tts-test-btn"
            onClick={() => handleSpeak('The big dog sat on a log. Reading helps us learn.')}
          >
            {isSpeaking ? '⏹ Stop' : '▶ Test voice'}
          </button>
        </div>
      )}

      {/* ── Reward Store modal ── */}
      {showStore && (
        <RewardStore
          points={points}
          unlockedAvatars={unlockedAvatars}
          activeAvatar={activeAvatar}
          onBuy={handleBuyAvatar}
          onEquip={handleEquipAvatar}
          onClose={() => setShowStore(false)}
        />
      )}

    </div>
  );
}

export default App
