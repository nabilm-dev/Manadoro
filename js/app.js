/* =============================================
   ManaDoro — app.js
   Modern Digital Pomodoro with Media Detection & History
   ============================================= */

'use strict';

// ---- Config ----
const MODES = {
  focus:      25 * 60,
  shortBreak:  5 * 60,
  longBreak:  15 * 60,
};

const MODE_LABELS = {
  focus:      'Focus Time',
  shortBreak: 'Short Break',
  longBreak:  'Long Break',
};

// ---- State ----
let currentMode       = 'focus';
let currentTime       = MODES.focus;
let totalTime         = MODES.focus;
let isRunning         = false;
let sessions          = 0;
let timerInterval     = null;
let colonBlinkInterval= null;

// Track current media info
let currentMedia = {
  title: '',
  artist: '',
  isPlaying: false
};

// ---- DOM Elements ----
const dM0           = document.getElementById('d-m0');
const dM1           = document.getElementById('d-m1');
const dS0           = document.getElementById('d-s0');
const dS1           = document.getElementById('d-s1');
const btnStart      = document.getElementById('btn-start');
const btnReset      = document.getElementById('btn-reset');
const btnSkip       = document.getElementById('btn-skip');
const btnLabel      = document.getElementById('btn-label');
const iconPlay      = document.getElementById('icon-play');
const iconPause     = document.getElementById('icon-pause');
const progressFill  = document.getElementById('progress-fill');
const progressText  = document.getElementById('progress-text');
const modeLabel     = document.getElementById('mode-label');
const mainCard      = document.getElementById('main-card');
const sessionsCount = document.getElementById('sessions-count');
const sessionsDots  = document.querySelectorAll('.session-dot');
const colonDots     = document.querySelectorAll('.colon-dot');
const historyList   = document.getElementById('history-list');
const historyBadge  = document.getElementById('history-badge');
const btnClearHist  = document.getElementById('btn-clear-history');

// =============================================
// DIGITAL DISPLAY UPDATE
// =============================================

function updateDisplay(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  dM0.textContent = mm[0];
  dM1.textContent = mm[1];
  dS0.textContent = ss[0];
  dS1.textContent = ss[1];

  // Browser Tab Title
  const modeEmoji = currentMode === 'focus' ? '🍅' : (currentMode === 'shortBreak' ? '☕' : '🌴');
  document.title = `${modeEmoji} ${mm}:${ss} — ManaDoro`;

  // Progress Bar
  const elapsed = totalTime - seconds;
  const pct = Math.min(100, Math.round((elapsed / totalTime) * 100));
  progressFill.style.width = pct + '%';
  progressText.textContent = pct + '%';
}

// =============================================
// TIMER CONTROLS
// =============================================

function tick() {
  if (currentTime <= 0) {
    sessionComplete();
    return;
  }
  currentTime--;
  updateDisplay(currentTime);
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerInterval = setInterval(tick, 1000);

  iconPlay.style.display  = 'none';
  iconPause.style.display = 'block';
  btnLabel.textContent    = 'Pause';

  mainCard.classList.add('pulsing');
  startColonBlink();
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;

  iconPlay.style.display  = 'block';
  iconPause.style.display = 'none';
  btnLabel.textContent    = 'Resume';

  mainCard.classList.remove('pulsing');
  stopColonBlink();
}

function resetTimer() {
  pauseTimer();
  currentTime = MODES[currentMode];
  totalTime   = MODES[currentMode];
  updateDisplay(currentTime);
  btnLabel.textContent = 'Start';
}

function sessionComplete() {
  pauseTimer();
  playBeep();

  // Log to history
  addHistoryItem(currentMode, 'completed');

  if (currentMode === 'focus') {
    sessions++;
    updateSessionDots();

    if (sessions % 4 === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }
  } else {
    switchMode('focus');
  }

  // Auto-start next session after gentle pause
  setTimeout(() => startTimer(), 1000);
}

function skipSession() {
  pauseTimer();
  addHistoryItem(currentMode, 'skipped');

  if (currentMode === 'focus') {
    sessions++;
    updateSessionDots();
    if (sessions % 4 === 0) {
      switchMode('longBreak');
    } else {
      switchMode('shortBreak');
    }
  } else {
    switchMode('focus');
  }
}

// =============================================
// MODE SWITCHING
// =============================================

function switchMode(mode) {
  currentMode = mode;
  currentTime = MODES[mode];
  totalTime   = MODES[mode];

  updateDisplay(currentTime);
  modeLabel.textContent = MODE_LABELS[mode].toUpperCase();

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  iconPlay.style.display  = 'block';
  iconPause.style.display = 'none';
  btnLabel.textContent    = 'Start';
}

// =============================================
// COLON BLINK
// =============================================

function startColonBlink() {
  stopColonBlink();
  colonBlinkInterval = setInterval(() => {
    colonDots.forEach(d => d.classList.toggle('blink-off'));
  }, 1000);
}

function stopColonBlink() {
  clearInterval(colonBlinkInterval);
  colonBlinkInterval = null;
  colonDots.forEach(d => d.classList.remove('blink-off'));
}

// =============================================
// SESSION DOTS
// =============================================

function updateSessionDots() {
  const cyclePos = sessions % 4;

  sessionsDots.forEach((dot, i) => {
    dot.classList.remove('completed', 'current');
    if (i < cyclePos) {
      dot.classList.add('completed');
    } else if (i === cyclePos && cyclePos < 4) {
      dot.classList.add('current');
    }
  });

  sessionsCount.textContent = `${sessions} Sesi Selesai`;
}

// =============================================
// WEB AUDIO CHIME
// =============================================

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tones = [
      { freq: 523.25, start: 0,    dur: 0.3 }, // C5
      { freq: 659.25, start: 0.18, dur: 0.3 }, // E5
      { freq: 783.99, start: 0.36, dur: 0.5 }, // G5
    ];

    tones.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch (e) {
    // AudioContext not allowed or unsupported
  }
}

// =============================================
// SPOTIFY & BROWSER MEDIA DETECTION
// =============================================

async function fetchSpotify() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/spotify', { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();
    updateSpotifyUI(data);
  } catch (e) {
    // Keep last state or wait
  }
}

function updateSpotifyUI(data) {
  const section  = document.getElementById('spotify-section');
  const titleEl  = document.getElementById('song-title');
  const artistEl = document.getElementById('song-artist');
  const statusEl = document.getElementById('spotify-status');
  const dotEl    = document.getElementById('spotify-dot');
  const wrapper  = titleEl.parentElement;

  if (data && (data.isPlaying || (data.title && data.title !== '— — —'))) {
    currentMedia = {
      title: data.title,
      artist: data.artist || '',
      isPlaying: data.isPlaying
    };

    section.classList.add('is-active');
    dotEl.classList.toggle('playing', data.isPlaying);

    if (data.isPlaying) {
      statusEl.textContent = 'SEDANG MEMUTAR';
    } else {
      statusEl.textContent = 'DIJEDA (PAUSED)';
    }

    titleEl.textContent  = data.title;
    artistEl.textContent = data.artist || (data.app ? `via ${data.app}` : 'Spotify / Web Player');

    // Check marquee
    titleEl.classList.remove('marquee-active');
    void titleEl.offsetWidth;
    if (titleEl.scrollWidth > wrapper.offsetWidth) {
      titleEl.classList.add('marquee-active');
    }
  } else {
    currentMedia = { title: '', artist: '', isPlaying: false };
    section.classList.remove('is-active');
    dotEl.classList.remove('playing');
    statusEl.textContent = 'MENUNGGU MUSIK...';
    titleEl.textContent  = 'Tidak ada lagu yang diputar';
    artistEl.textContent = 'Buka Spotify / Browser dan putar lagu';
    titleEl.classList.remove('marquee-active');
  }
}

// Poll every 3 seconds
fetchSpotify();
setInterval(fetchSpotify, 3000);

// =============================================
// HISTORY / RIWAYAT SESI
// =============================================

const STORAGE_KEY = 'manadoro_history_v1';

function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

function addHistoryItem(mode, status) {
  const list = getHistory();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short' });

  const item = {
    id: Date.now(),
    mode: mode,
    modeLabel: MODE_LABELS[mode] || mode,
    timestamp: `${dateStr}, ${timeStr}`,
    songTitle: currentMedia.title ? `${currentMedia.title} • ${currentMedia.artist}` : 'Tanpa musik',
    status: status
  };

  list.unshift(item); // Newest first
  if (list.length > 50) list.pop(); // Keep last 50
  saveHistory(list);
  renderHistory();
}

function renderHistory() {
  const list = getHistory();
  historyBadge.textContent = list.length;

  if (list.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <p>Belum ada riwayat sesi. Mulai timer dan selesaikan fokusmu!</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = list.map(item => {
    const isCompleted = item.status === 'completed';
    const statusText = isCompleted ? '✓ Selesai' : '⏭ Dilewati';
    const statusClass = isCompleted ? 'completed' : 'skipped';

    return `
      <div class="history-item">
        <div class="history-item-left">
          <span class="history-mode-pill ${item.mode}">
            ${item.mode === 'focus' ? '🍅' : (item.mode === 'shortBreak' ? '☕' : '🌴')} ${item.modeLabel}
          </span>
          <div class="history-details">
            <span class="history-track-name" title="${item.songTitle}">🎵 ${item.songTitle}</span>
            <span class="history-time">${item.timestamp}</span>
          </div>
        </div>
        <div class="history-status-badge ${statusClass}">
          ${statusText}
        </div>
      </div>
    `;
  }).join('');
}

btnClearHist.addEventListener('click', () => {
  if (confirm('Hapus semua riwayat sesi?')) {
    saveHistory([]);
    renderHistory();
  }
});

// =============================================
// EVENT LISTENERS & SHORTCUTS
// =============================================

btnStart.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

btnReset.addEventListener('click', () => {
  resetTimer();
});

btnSkip.addEventListener('click', () => {
  skipSession();
});

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === currentMode) return;
    pauseTimer();
    switchMode(btn.dataset.mode);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    btnStart.click();
  }
  if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
    btnReset.click();
  }
  if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
    btnSkip.click();
  }
});

// =============================================
// INIT
// =============================================

(function init() {
  updateDisplay(MODES.focus);
  modeLabel.textContent = MODE_LABELS.focus.toUpperCase();
  updateSessionDots();
  renderHistory();
})();
