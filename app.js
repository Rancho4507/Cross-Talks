// --- DOM Elements ---
const sourceText = document.getElementById('source-text');
const outputText = document.getElementById('output-text');
const sourceLang = document.getElementById('source-lang');
const targetLang = document.getElementById('target-lang');
const translateBtn = document.getElementById('translate-btn');
const micBtn = document.getElementById('mic-btn');
const listenBtn = document.getElementById('listen-btn');
const copyBtn = document.getElementById('copy-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const networkBadge = document.getElementById('network-badge');
const htmlRoot = document.documentElement;

// --- Language Code to BCP-47 Speech Locale Mapping ---
const SPEECH_LOCALES = {
  en: 'en-US', hi: 'hi-IN', es: 'es-ES', zh: 'zh-CN', ar: 'ar-SA',
  fr: 'fr-FR', bn: 'bn-IN', pt: 'pt-BR', ru: 'ru-RU', ur: 'ur-PK',
  id: 'id-ID', de: 'de-DE', ja: 'ja-JP', mr: 'mr-IN', te: 'te-IN',
  tr: 'tr-TR', ta: 'ta-IN', ko: 'ko-KR', vi: 'vi-VN', it: 'it-IT',
  gu: 'gu-IN', pl: 'pl-PL', uk: 'uk-UA', kn: 'kn-IN', ml: 'ml-IN',
  fa: 'fa-IR', th: 'th-TH', nl: 'nl-NL', pa: 'pa-IN', sw: 'sw-KE'
};

// --- 1. Theme Toggle & Persistence ---
const savedTheme = localStorage.getItem('crosstalks-theme') || 'light';
htmlRoot.setAttribute('data-theme', savedTheme);
if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlRoot.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlRoot.setAttribute('data-theme', newTheme);
    localStorage.setItem('crosstalks-theme', newTheme);
    if (themeIcon) themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// --- 2. Online / Offline Status Detection ---
function updateOnlineStatus() {
  if (networkBadge) {
    if (navigator.onLine) {
      networkBadge.textContent = '⚡ Online Mode';
      networkBadge.style.opacity = '1';
    } else {
      networkBadge.textContent = '⚠️ Offline Mode';
      networkBadge.style.opacity = '0.7';
    }
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// --- 3. Translation Engine ---
async function translateText() {
  const text = sourceText.value.trim();
  if (!text) {
    outputText.textContent = 'Please enter text to translate.';
    return;
  }

  const fromLang = sourceLang.value;
  const toLang = targetLang.value;

  if (fromLang === toLang) {
    outputText.textContent = text;
    return;
  }

  outputText.textContent = 'Translating...';
  translateBtn.disabled = true;
  translateBtn.style.opacity = '0.6';

  try {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.responseData && data.responseData.translatedText) {
      outputText.textContent = data.responseData.translatedText;
    } else {
      outputText.textContent = 'Translation unavailable. Try again.';
    }
  } catch (error) {
    console.error('Translation Error:', error);
    outputText.textContent = 'Error connecting to translation service.';
  } finally {
    translateBtn.disabled = false;
    translateBtn.style.opacity = '1';
  }
}

translateBtn.addEventListener('click', translateText);

sourceText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    translateText();
  }
});

// --- 4. Speech to Text (Microphone Input) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  let isRecognizing = false;

  micBtn.addEventListener('click', () => {
    if (isRecognizing) {
      recognition.stop();
      return;
    }

    try {
      const selectedLocale = SPEECH_LOCALES[sourceLang.value] || 'en-US';
      recognition.lang = selectedLocale;
      recognition.start();
      isRecognizing = true;
      micBtn.style.opacity = '0.7';
      micBtn.innerHTML = '<span>🔴</span> Listening...';
    } catch (err) {
      console.error('Recognition start error:', err);
      isRecognizing = false;
      micBtn.innerHTML = '<span>🎤</span> Speak';
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sourceText.value = transcript;
    translateText();
  };

  recognition.onspeechend = () => {
    recognition.stop();
  };

  recognition.onend = () => {
    isRecognizing = false;
    micBtn.style.opacity = '1';
    micBtn.innerHTML = '<span>🎤</span> Speak';
  };

  recognition.onerror = (event) => {
    console.error('Speech Recognition Error:', event.error);
    isRecognizing = false;
    micBtn.style.opacity = '1';
    micBtn.innerHTML = '<span>🎤</span> Speak';
    if (event.error === 'not-allowed') {
      alert('Microphone access was denied. Please allow microphone permission in browser settings.');
    }
  };
} else {
  micBtn.addEventListener('click', () => {
    alert('Voice input is not supported in this browser. Please use Google Chrome or Edge.');
  });
}

// --- 5. Text to Speech (Listen Output) ---
listenBtn.addEventListener('click', () => {
  const text = outputText.textContent;
  if (!text || text === 'Translation will appear here...' || text === 'Translating...') return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const targetLocale = SPEECH_LOCALES[targetLang.value] || 'en-US';
  utterance.lang = targetLocale;
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang === targetLocale || v.lang.startsWith(targetLang.value));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  listenBtn.style.opacity = '0.6';
  utterance.onend = () => {
    listenBtn.style.opacity = '1';
  };
  utterance.onerror = (err) => {
    console.error('SpeechSynthesis Error:', err);
    listenBtn.style.opacity = '1';
  };

  window.speechSynthesis.speak(utterance);
});

if (typeof window.speechSynthesis !== 'undefined') {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// --- 6. Copy to Clipboard ---
copyBtn.addEventListener('click', async () => {
  const text = outputText.textContent;
  if (!text || text === 'Translation will appear here...' || text === 'Translating...') return;

  try {
    await navigator.clipboard.writeText(text);
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span>✅</span> Copied!';
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
    }, 1800);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});