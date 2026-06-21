/* ═══════════════════════════════════════════════════════════════
   screensaver.js — Panther Zone Gym
   ═══════════════════════════════════════════════════════════════ */

const QUOTES = [
  "El dolor que sientes hoy es la fuerza que sentirás mañana.",
  "No pares cuando estés cansado. Para cuando hayas terminado.",
  "Cada repetición te acerca más a tu mejor versión.",
  "El cuerpo logra lo que la mente cree.",
  "La disciplina es el puente entre tus metas y tus logros.",
  "Tu único límite eres tú mismo. Supéralo.",
  "El éxito no se da, se gana con cada entrenamiento.",
  "Sé más fuerte que tus excusas.",
  "Un día a la vez. Un rep a la vez. Tú puedes."
];

const SCAN_MS      = 1800;
const RESULT_MS    = 3500;
const AUTO_DEMO_MS = 9000;
const NP_REFRESH   = 15000;  // refresca now-playing cada 15s (mismo intervalo que el servidor)

let scanInProgress = false;
let autoTimer      = null;
let quoteIndex     = 0;

/* ── Reloj ─────────────────────────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const tEl = document.getElementById('ss-time');
  const dEl = document.getElementById('ss-date');
  if (tEl) tEl.textContent = now.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  if (dEl) dEl.textContent = now.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

/* ── Frases motivadoras ─────────────────────────────────────────── */
function rotateQuote() {
  const els = ['ss-quote', 'ss-quote-mobile'].map(id => document.getElementById(id)).filter(Boolean);
  els.forEach(el => el.classList.add('fade-out'));
  setTimeout(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    els.forEach(el => {
      el.textContent = QUOTES[quoteIndex];
      el.classList.remove('fade-out');
    });
  }, 550);
}

function initQuotes() {
  quoteIndex = Math.floor(Math.random() * QUOTES.length);
  ['ss-quote', 'ss-quote-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = QUOTES[quoteIndex];
  });
  setInterval(rotateQuote, 6000);
}

/* ── "Está sonando" ─────────────────────────────────────────────── */
async function loadNowPlaying() {
  try {
    const res  = await fetch('/api/screensaver/nowplaying');
    const data = await res.json();
    const bar  = document.getElementById('ss-np-bar');
    if (!bar) return;

    const songEl   = document.getElementById('np-song');
    const artistEl = document.getElementById('np-artist');
    const albumEl  = document.getElementById('np-album');

    if (data.active && data.song) {
      if (songEl)   songEl.textContent   = data.song;
      if (artistEl) artistEl.textContent = data.artist || '—';
      if (albumEl) {
        if (data.albumArt) {
          albumEl.src           = data.albumArt;
          albumEl.style.display = 'block';
        } else {
          albumEl.style.display = 'none';
        }
      }
      bar.classList.add('active');
    } else {
      if (songEl)   songEl.textContent   = '—';
      if (artistEl) artistEl.textContent = '—';
      if (albumEl)  albumEl.style.display = 'none';
      bar.classList.remove('active');
    }
  } catch {}
}

/* ── Imagen destacada ───────────────────────────────────────────── */
async function loadFeaturedImage() {
  try {
    const res  = await fetch('/api/screensaver/featured');
    const data = await res.json();
    const img  = document.getElementById('ss-featured-img');
    const ph   = document.getElementById('ss-featured-placeholder');

    if (data.url && img) {
      img.src = data.url;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    } else {
      if (img) img.style.display = 'none';
      if (ph) ph.style.display = '';
    }
  } catch {}
}

/* ── Estado del lector ──────────────────────────────────────────── */
function setReaderState(state, data = {}) {
  const reader = document.getElementById('fp-reader');
  if (!reader) return;

  reader.className = 'fp-reader' + (state !== 'idle' ? ` state-${state}` : '');

  ['idle', 'scanning', 'success', 'error', 'expired'].forEach(s => {
    const el = document.getElementById(`status-${s}`);
    if (el) el.classList.add('hidden');
  });

  const active = document.getElementById(`status-${state}`);
  if (active) active.classList.remove('hidden');

  if (state === 'success' && data.name) {
    const nameEl = document.getElementById('member-name-display');
    if (nameEl) nameEl.textContent = `¡Bienvenido/a, ${data.name}!`;
    const tEl = document.getElementById('access-time');
    if (tEl) tEl.textContent = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  if (state === 'expired' && data.name) {
    const nameEl = document.getElementById('member-expired-display');
    if (nameEl) nameEl.textContent = data.name;
  }
}

/* ── Demo scan ──────────────────────────────────────────────────── */
async function triggerScan() {
  if (scanInProgress) return;
  scanInProgress = true;
  clearTimeout(autoTimer);

  setReaderState('scanning');
  await delay(SCAN_MS);

  try {
    const res  = await fetch('/api/screensaver/demo-scan');
    const data = await res.json();

    if (data.result === 'allowed') {
      setReaderState('success', { name: data.firstName });
    } else if (data.result === 'expired') {
      setReaderState('expired', { name: data.firstName });
    } else {
      setReaderState('error');
    }
  } catch {
    setReaderState('error');
  }

  await delay(RESULT_MS);
  setReaderState('idle');
  scanInProgress = false;
  scheduleAutoDemo();
}

function scheduleAutoDemo() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(triggerScan, AUTO_DEMO_MS);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ── Carrusel de promociones ────────────────────────────────────── */
const VISIBLE = 5;
let carouselImages = [];
let carouselOffset = 0;
let carouselTimer  = null;

async function initCarousel() {
  try {
    const res = await fetch('/api/screensaver/carousel');
    carouselImages = await res.json();
  } catch {
    carouselImages = [];
  }

  const track = document.getElementById('ss-carousel-track');
  const empty = document.getElementById('ss-carousel-empty');

  if (!carouselImages.length) {
    if (track) track.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
    return;
  }

  renderCarousel();
  buildDots();

  if (carouselImages.length > VISIBLE) {
    carouselTimer = setInterval(advanceCarousel, 5000);
  }
}

function renderCarousel() {
  const track = document.getElementById('ss-carousel-track');
  if (!track) return;

  track.innerHTML = '';
  for (let i = 0; i < VISIBLE; i++) {
    const idx = (carouselOffset + i) % carouselImages.length;
    const div = document.createElement('div');
    div.className = 'ss-carousel-item slide-in';
    div.innerHTML = `<img src="${carouselImages[idx]}" alt="Imagen ${idx + 1}" loading="lazy">`;
    track.appendChild(div);
  }
}

function buildDots() {
  const container = document.getElementById('ss-carousel-dots');
  if (!container) return;
  const pages = Math.ceil(carouselImages.length / VISIBLE);
  container.innerHTML = Array.from({ length: pages }, (_, i) =>
    `<div class="ss-carousel-dot${i === 0 ? ' active' : ''}" data-page="${i}"></div>`
  ).join('');
}

function advanceCarousel() {
  carouselOffset = (carouselOffset + 1) % carouselImages.length;
  renderCarousel();
  const page = Math.floor(carouselOffset / VISIBLE);
  document.querySelectorAll('.ss-carousel-dot').forEach((d, i) =>
    d.classList.toggle('active', i === page % Math.ceil(carouselImages.length / VISIBLE))
  );
}

/* ── ESC para cerrar ────────────────────────────────────────────── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.location.href = '/';
  });
}

/* ── Init ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);

  initQuotes();
  initCarousel();
  initKeyboard();

  loadNowPlaying();
  loadFeaturedImage();

  setInterval(loadNowPlaying, NP_REFRESH);
  setInterval(loadFeaturedImage, 60000);

  scheduleAutoDemo();
});
