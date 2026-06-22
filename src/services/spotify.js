'use strict';
/* ══════════════════════════════════════════════════════════════
   Spotify service — Cloudflare Workers
   Tokens almacenados en KV. Sin polling background (Workers son
   stateless); el estado se obtiene on-demand con caché KV 15s.
   ══════════════════════════════════════════════════════════════ */

const SCOPES = 'user-read-currently-playing user-read-playback-state';

function basicAuth(env) {
  const id  = env.SPOTIFY_CLIENT_ID  || '';
  const sec = env.SPOTIFY_CLIENT_SECRET || '';
  return 'Basic ' + btoa(`${id}:${sec}`);
}

export function isConfigured(env) {
  return !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
}

export function getAuthUrl(env) {
  const redirectUri = env.SPOTIFY_REDIRECT_URI || '';
  const url = new URL('https://accounts.spotify.com/authorize');
  url.searchParams.set('client_id',     env.SPOTIFY_CLIENT_ID || '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('scope',         SCOPES);
  url.searchParams.set('show_dialog',   'true');
  return url.toString();
}

/* ── Tokens en KV ───────────────────────────────────────────── */
export async function loadTokens(env) {
  return env.KV.get('spotify:tokens', 'json');
}

export async function saveTokens(env, data) {
  await env.KV.put('spotify:tokens', JSON.stringify(data));
  await env.KV.delete('spotify:nowplaying'); // invalidar caché
}

export async function clearTokens(env) {
  await Promise.all([
    env.KV.delete('spotify:tokens'),
    env.KV.delete('spotify:nowplaying'),
  ]);
}

/* ── OAuth ──────────────────────────────────────────────────── */
export async function exchangeCode(env, code) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(env),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: env.SPOTIFY_REDIRECT_URI || '',
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function doRefresh(env, refreshToken) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(env),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  return res.json();
}

/* ── Estado Now Playing (con caché KV 15s) ─────────────────── */
export async function getNowPlaying(env) {
  // Intentar caché primero
  const cached = await env.KV.get('spotify:nowplaying', 'json');
  if (cached) return cached;

  const tokens = await loadTokens(env);
  if (!tokens?.access_token) {
    return { connected: false, active: false, song: null, artist: null, albumArt: null };
  }

  const state = await fetchSpotifyState(env, tokens);

  // Guardar en caché por 15 segundos
  await env.KV.put('spotify:nowplaying', JSON.stringify(state), { expirationTtl: 60 });
  return state;
}

async function fetchSpotifyState(env, tokens) {
  let res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (res.status === 401) {
    if (!tokens.refresh_token) return { connected: false, active: false, song: null, artist: null, albumArt: null };
    const refreshed = await doRefresh(env, tokens.refresh_token);
    if (!refreshed?.access_token) return { connected: false, active: false, song: null, artist: null, albumArt: null };

    const merged = { ...tokens, access_token: refreshed.access_token };
    if (refreshed.refresh_token) merged.refresh_token = refreshed.refresh_token;
    await env.KV.put('spotify:tokens', JSON.stringify(merged));

    res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${refreshed.access_token}` },
    });
  }

  if (res.status === 204 || !res.ok) {
    return { connected: true, active: false, song: null, artist: null, albumArt: null };
  }

  const data = await res.json();
  if (data.is_playing && data.item) {
    const images = data.item.album?.images || [];
    const albumArt = (images[1] || images[0])?.url || null;
    return {
      connected: true,
      active: true,
      song: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(', '),
      albumArt,
    };
  }

  return { connected: true, active: false, song: null, artist: null, albumArt: null };
}
