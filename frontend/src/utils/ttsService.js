/**
 * TTS Service — abstraction layer supporting:
 *   - 'browser'     : Web Speech API with best-available system voice
 *   - 'elevenlabs'  : ElevenLabs neural TTS (human-quality, requires API key)
 *   - 'openai'      : OpenAI TTS — nova/shimmer voices (requires API key)
 *
 * The API key is stored in localStorage by the teacher/parent in Settings.
 * No backend proxy is needed; the key is called directly from the browser.
 */

// ── ElevenLabs ──────────────────────────────────────────────────────────────

export const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel — calm, clear ★' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella — warm, friendly' },
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria — natural, American' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte — warm, British' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill — clear, authoritative' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian — deep, friendly' },
];

export const OPENAI_VOICES = [
  { id: 'nova',    name: 'Nova — warm, upbeat ★' },
  { id: 'shimmer', name: 'Shimmer — soft, calm' },
  { id: 'alloy',   name: 'Alloy — neutral, clear' },
  { id: 'echo',    name: 'Echo — warm male' },
  { id: 'fable',   name: 'Fable — expressive' },
  { id: 'onyx',    name: 'Onyx — deep male' },
];

// ── Browser voice selection ──────────────────────────────────────────────────
// Priority order — highest-quality voices listed first.
// Neural/Enhanced/Premium voices are far cleaner than the default system voice.
const PREFERRED_VOICE_NAMES = [
  // macOS premium (downloadable in System Settings → Accessibility → Spoken Content)
  'Ava (Premium)', 'Zoe (Premium)', 'Samantha (Enhanced)',
  'Karen (Enhanced)', 'Daniel (Enhanced)',
  // Chrome built-in neural voices (available in Chrome 33+)
  'Google US English', 'Google UK English Female', 'Google UK English Male',
  // Windows neural (online voices, Windows 11)
  'Microsoft Aria Online (Natural)', 'Microsoft Jenny Online (Natural)',
  'Microsoft Emma Online (Natural)', 'Microsoft Ryan Online (Natural)',
  // iOS / macOS standard (still clear)
  'Samantha', 'Daniel', 'Karen',
];

function getBestBrowserVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }
  // Fall back to first English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

// Load voices — some browsers (Chrome) return empty array until this event fires
let _voicesReady = false;
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const init = () => {
    window.speechSynthesis.getVoices(); // trigger load
    _voicesReady = true;
  };
  if (window.speechSynthesis.getVoices().length > 0) {
    _voicesReady = true;
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', init, { once: true });
  }
}

// ── Provider implementations ─────────────────────────────────────────────────

function browserSpeak(text, rate = 0.8) {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getBestBrowserVoice();
    if (voice) utterance.voice = voice;
    utterance.lang  = 'en-US';
    utterance.rate  = rate;   // 0.8 = slightly slower, crucial for dyslexia
    utterance.pitch = 1.0;
    utterance.onend   = resolve;
    utterance.onerror = resolve; // don't reject — just resolve silently
    window.speechSynthesis.speak(utterance);
  });
}

// ── Module-level audio tracking (needed to stop ElevenLabs/OpenAI audio) ────
let _currentAudio = null;

async function elevenLabsSpeak(text, apiKey, voiceId, rate = 0.9) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5', // fast + high-quality, English
        voice_settings: {
          stability: 0.70,          // higher = more consistent, less expressive
          similarity_boost: 0.85,   // higher = more on-voice
          style: 0.25,              // subtle style (children respond well to mild expressiveness)
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => response.status);
    throw new Error(`ElevenLabs ${response.status}: ${err}`);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = rate;
  _currentAudio = audio;

  return new Promise((resolve, reject) => {
    audio.onended = () => { _currentAudio = null; URL.revokeObjectURL(url); resolve(); };
    audio.onerror = (e) => { _currentAudio = null; URL.revokeObjectURL(url); reject(e); };
    audio.play().catch(reject);
  });
}

async function openAISpeak(text, apiKey, voiceId = 'nova', rate = 0.9) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',   // tts-1-hd for higher quality (2× cost)
      input: text,
      voice: voiceId,
      speed: rate,      // OpenAI accepts 0.25–4.0
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.status);
    throw new Error(`OpenAI TTS ${response.status}: ${err}`);
  }

  const blob = await response.blob();
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  _currentAudio = audio;

  return new Promise((resolve, reject) => {
    audio.onended = () => { _currentAudio = null; URL.revokeObjectURL(url); resolve(); };
    audio.onerror = (e) => { _currentAudio = null; URL.revokeObjectURL(url); reject(e); };
    audio.play().catch(reject);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak text using the configured provider.
 *
 * @param {string} text           - Text to speak
 * @param {object} settings       - { provider, elevenLabsKey, elevenLabsVoice,
 *                                    openAIKey, openAIVoice, speechRate }
 * @returns {Promise<void>}
 */
export async function speak(text, settings = {}) {
  const {
    provider       = 'browser',
    elevenLabsKey  = '',
    elevenLabsVoice = ELEVENLABS_VOICES[0].id,
    openAIKey      = '',
    openAIVoice    = 'nova',
    speechRate     = 0.85,
  } = settings;

  if (provider === 'elevenlabs' && elevenLabsKey) {
    try {
      return await elevenLabsSpeak(text, elevenLabsKey, elevenLabsVoice, speechRate);
    } catch (err) {
      console.warn('ElevenLabs TTS failed, falling back to browser:', err.message);
      return browserSpeak(text, speechRate);
    }
  }

  if (provider === 'openai' && openAIKey) {
    try {
      // OpenAI speed param: 0.25–4.0 — map our 0.6–1.2 range to 0.6–1.0
      return await openAISpeak(text, openAIKey, openAIVoice, Math.min(speechRate, 1.0));
    } catch (err) {
      console.warn('OpenAI TTS failed, falling back to browser:', err.message);
      return browserSpeak(text, speechRate);
    }
  }

  return browserSpeak(text, speechRate);
}

export function stopSpeaking() {
  // Stop browser speech synthesis
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  // Stop ElevenLabs / OpenAI audio
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio = null;
  }
}

export function listBrowserVoices() {
  return window.speechSynthesis?.getVoices() ?? [];
}
