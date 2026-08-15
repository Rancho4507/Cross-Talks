// ==========================================
// 1. Dark / Light Theme Controller
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeIcon.textContent = '☀️';
} else {
  document.documentElement.setAttribute('data-theme', 'light');
  themeIcon.textContent = '🌙';
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  let newTheme = 'light';

  if (currentTheme === 'light') {
    newTheme = 'dark';
    themeIcon.textContent = '☀️';
  } else {
    themeIcon.textContent = '🌙';
  }

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// ==========================================
// 2. Application Core Logic
// ==========================================
let isOnline = navigator.onLine;
const loadedPipelines = {};

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const sourceText = document.getElementById('source-text');
const targetText = document.getElementById('target-text');
const sourceLang = document.getElementById('source-lang');
const targetLang = document.getElementById('target-lang');

// Network Status
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
  isOnline = navigator.onLine;
  if (isOnline) {
    statusBadge.textContent = "Online Mode";
    statusBadge.className = "badge online";
  } else {
    statusBadge.textContent = "Offline Mode (Local AI)";
    statusBadge.className = "badge offline";
  }
}
updateOnlineStatus();

// Load or retrieve in-browser ONNX local translation model
async function getOfflineModel(src, tgt) {
  const modelName = `Xenova/opus-mt-${src}-${tgt}`;
  
  if (loadedPipelines[modelName]) {
    return loadedPipelines[modelName];
  }

  if (window.pipeline) {
    targetText.placeholder = `Loading local AI model (${src} -> ${tgt})...`;
    try {
      const pipe = await window.pipeline('translation', modelName);
      loadedPipelines[modelName] = pipe;
      targetText.placeholder = "Translation will appear here...";
      return pipe;
    } catch (err) {
      console.error(`Offline model ${modelName} unavailable:`, err);
      return null;
    }
  }
  return null;
}

// Translation Action Handler
document.getElementById('translate-btn').addEventListener('click', async () => {
  const text = sourceText.value.trim();
  if (!text) return;

  const src = sourceLang.value;
  const tgt = targetLang.value;

  targetText.value = "Translating...";

  if (isOnline) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.responseData && data.responseData.translatedText) {
        targetText.value = data.responseData.translatedText;
        // Background cache model for offline availability
        getOfflineModel(src, tgt);
      } else {
        throw new Error("Invalid API payload");
      }
    } catch (e) {
      console.warn("Online API failed, falling back to local engine:", e);
      await translateOffline(text, src, tgt);
    }
  } else {
    await translateOffline(text, src, tgt);
  }
});

async function translateOffline(text, src, tgt) {
  const model = await getOfflineModel(src, tgt);
  if (model) {
    try {
      const output = await model(text);
      targetText.value = output[0].translation_text;
    } catch (err) {
      targetText.value = "Failed to translate with local model.";
    }
  } else {
    targetText.value = `Offline model for (${src.toUpperCase()} → ${tgt.toUpperCase()}) is not cached yet. Connect online ONCE to download this language pair.`;
  }
}

// ==========================================
// 3. Speech (STT & TTS) Handlers
// ==========================================
const speechLangMap = {
  'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
  'zh': 'zh-CN', 'hi': 'hi-IN', 'ne': 'ne-NP', 'gu': 'gu-IN',
  'te': 'te-IN', 'ta': 'ta-IN', 'bho': 'hi-IN', 'mai': 'hi-IN'
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  document.getElementById('mic-btn').addEventListener('click', () => {
    const langCode = sourceLang.value;
    recognition.lang = speechLangMap[langCode] || langCode;
    recognition.start();
    sourceText.placeholder = "Listening...";
  });

  recognition.onresult = (event) => {
    sourceText.value = event.results[0][0].transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
  };
} else {
  document.getElementById('mic-btn').disabled = true;
}

function speakText(text, langCode) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangMap[langCode] || langCode;
    window.speechSynthesis.speak(utterance);
  }
}

document.getElementById('listen-src-btn').addEventListener('click', () => {
  speakText(sourceText.value, sourceLang.value);
});

document.getElementById('listen-target-btn').addEventListener('click', () => {
  speakText(targetText.value, targetLang.value);
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('Service Worker registration failed:', err);
    });
  });
}