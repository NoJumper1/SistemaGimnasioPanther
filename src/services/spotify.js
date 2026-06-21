'use strict';
/* ══════════════════════════════════════════════════════════════
   Spotify "Currently Playing" service — Panther Zone Gym
   Flujo: OAuth Authorization Code → refresh automático → poll c/15s
   ══════════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

const TOKENS_PATH   = path.join(__dirname, '../../data/spotify.json');
const POLL_MS       = 15_000;
const REDIRECT_URI  = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/screensaver/spotify/callback';
const SCOPES        = 'user-read-currently-playing user-read-playback-state';

/* ── Estado en memoria ─────────────────────────────────────────── */
let _state = {
  connected:   false,
  isPlaying:   false,
  active:      false,
  song:        null,
  artist:      null,
  albumArt:    null,
  error:       null,
};

let _pollTimer = null;

/* ── Tokens ────────────────────────────────────────────────────── */
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
    }
  } catch {}
  return null;
}

function saveTokens(data) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2));
}

function clearTokens() {
  if (fs.existsSync(TOKENS_PATH)) fs.unlinkSync(TOKENS_PATH);
}

/* ── HTTP helpers ──────────────────────────────────────────────── */
function basicAuth() {
  const id  = process.env.SPOTIFY_CLIENT_ID  || '';
  const sec = process.env.SPOTIFY_CLIENT_SECRET || '';
  return 'Basic ' + Buffer.from(`${id}:${sec}`).toString('base64');
}

async function doRefresh(refreshToken) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function spotifyGet(endpoint, accessToken) {
  const url = `https://api.spotify.com/v1${endpoint}`;
  let res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (res.status === 401) {
    const tokens = loadTokens();
    if (!tokens?.refresh_token) return { status: 401, data: null };

    const refreshed = await doRefresh(tokens.refresh_token);
    if (!refreshed?.access_token) return { status: 401, data: null };

    saveTokens({ ...tokens, access_token: refreshed.access_token, ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}) });
    res = await fetch(url, { headers: { Authorization: `Bearer ${refreshed.access_token}` } });
  }

  if (res.status === 204) return { status: 204, data: null };
  if (!res.ok) return { status: res.status, data: null };
  return { status: res.status, data: await res.json() };
}

/* ── Exchange code → tokens (OAuth callback) ───────────────────── */
async function exchangeCode(code) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

/* ── Poll Spotify ──────────────────────────────────────────────── */
async function poll() {
  const tokens = loadTokens();
  if (!tokens?.access_token) {
    _state = { ..._state, connected: false, active: false, isPlaying: false };
    return;
  }

  try {
    const { status, data } = await spotifyGet('/me/player/currently-playing', tokens.access_token);

    if (status === 401 || status === 403) {
      _state = { ..._state, connected: false, active: false, error: 'Token inválido — reconecta Spotify' };
      return;
    }

    if (status === 204 || !data) {
      // Nada reproduciéndose
      _state = { connected: true, isPlaying: false, active: false, song: null, artist: null, albumArt: null, error: null };
      return;
    }

    if (data.is_playing && data.item) {
      const images = data.item.album?.images || [];
      // Preferir imagen mediana (índice 1), fallback a la primera
      const albumArt = (images[1] || images[0])?.url || null;

      _state = {
        connected: true,
        isPlaying: true,
        active:    true,
        song:      data.item.name,
        artist:    data.item.artists.map(a => a.name).join(', '),
        albumArt,
        error:     null,
      };
    } else {
      _state = { ..._state, connected: true, active: false, isPlaying: false, error: null };
    }
  } catch (e) {
    _state = { ..._state, error: e.message };
  }
}

/* ── API pública ───────────────────────────────────────────────── */
function getState() { return { ..._state }; }

function isConfigured() {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

function start() {
  if (!loadTokens()) return;
  _state.connected = true;
  poll();
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(poll, POLL_MS);
  console.log('[Spotify] Polling iniciado cada', POLL_MS / 1000, 's');
}

function stop() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  _state = { ..._state, connected: false, active: false };
}

function getAuthUrl() {
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('client_id',     process.env.SPOTIFY_CLIENT_ID || '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri',  REDIRECT_URI);
  url.searchParams.set('scope',         SCOPES);
  url.searchParams.set('show_dialog',   'true');
  return url.toString();
}

module.exports = { getState, isConfigured, start, stop, loadTokens, saveTokens, clearTokens, exchangeCode, getAuthUrl };
