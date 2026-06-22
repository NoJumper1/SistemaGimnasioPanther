import { Hono } from 'hono';
import { render } from '../lib/render.js';
import * as spotify from '../services/spotify.js';

const app = new Hono();

const MEDIA_RE = /\.(jpe?g|png|gif|webp|mp4|webm)$/i;
const VIDEO_RE = /\.(mp4|webm)$/i;

/* ── Pantalla de anuncios (pública, sin login) ─────────────── */
app.get('/signage', (c) => c.html(render('signage', { layout: false })));

/* ── API: lista de imágenes y videos del carrusel ─────────── */
app.get('/api/signage/carousel', async (c) => {
  try {
    const list = await c.env.R2.list({ prefix: 'carousel/' });
    const items = list.objects
      .map((o) => {
        const filename = o.key.replace('carousel/', '');
        if (!MEDIA_RE.test(filename)) return null;
        return {
          url:  `/img/carousel/${filename}`,
          type: VIDEO_RE.test(filename) ? 'video' : 'image',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.url.localeCompare(b.url));
    return c.json(items);
  } catch (_) {
    return c.json([]);
  }
});

/* ── API: canción en reproducción (sin auth, dato público) ─── */
app.get('/api/signage/nowplaying', async (c) => {
  try {
    const state = await spotify.getNowPlaying(c.env);
    return c.json(state);
  } catch (_) {
    return c.json({ connected: false, active: false, song: null, artist: null, albumArt: null });
  }
});

export default app;
