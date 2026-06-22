import { Hono } from 'hono';
import { render } from '../lib/render.js';
import { getMemberStatus } from '../models/memberStatus.js';
import * as spotify from '../services/spotify.js';

const app = new Hono();
const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;
const MEDIA_RE = /\.(jpe?g|png|gif|webp|mp4|webm)$/i;
const VIDEO_RE = /\.(mp4|webm)$/i;
const ALLOWED_UPLOAD = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm))$/;

/* ── Helpers R2 ─────────────────────────────────────────────── */
async function listR2Images(r2, prefix) {
  const list = await r2.list({ prefix });
  return list.objects
    .map((o) => o.key.replace(prefix, ''))
    .filter((f) => IMAGE_RE.test(f))
    .sort();
}

// Devuelve { filename, type } para imágenes y videos
async function listR2Media(r2, prefix) {
  const list = await r2.list({ prefix });
  return list.objects
    .map((o) => {
      const filename = o.key.replace(prefix, '');
      if (!MEDIA_RE.test(filename)) return null;
      return { filename, type: VIDEO_RE.test(filename) ? 'video' : 'image' };
    })
    .filter(Boolean)
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

async function getFeaturedImage(r2) {
  const files = await listR2Images(r2, 'featured/');
  return files.length ? `/img/featured/${files[0]}` : null;
}

/* ═══════════════════════════════════════════════════════════════
   SCREENSAVER
   ═══════════════════════════════════════════════════════════════ */

app.get('/screensaver', (c) => c.html(render('screensaver', { layout: false })));

/* ── API: demo scan ───────────────────────────────────────────── */
app.get('/api/screensaver/demo-scan', async (c) => {
  if (Math.random() < 0.1) return c.json({ result: 'not_found' });

  const member = await c.env.DB
    .prepare('SELECT id, full_name FROM members WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
    .first();

  if (!member) return c.json({ result: 'not_found' });

  const sub = await c.env.DB
    .prepare('SELECT end_date FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC LIMIT 1')
    .bind(member.id)
    .first();

  const { status } = getMemberStatus(sub);
  const firstName = member.full_name.split(' ')[0];
  return c.json({ result: status === 'activo' ? 'allowed' : 'expired', firstName });
});

/* ── API: carrusel ────────────────────────────────────────────── */
app.get('/api/screensaver/carousel', async (c) => {
  const files = await listR2Images(c.env.R2, 'carousel/');
  return c.json(files.map((f) => `/img/carousel/${f}`));
});

/* ── API: now playing ─────────────────────────────────────────── */
app.get('/api/screensaver/nowplaying', async (c) => {
  const state = await spotify.getNowPlaying(c.env);
  return c.json(state);
});

/* ── API: imagen destacada ────────────────────────────────────── */
app.get('/api/screensaver/featured', async (c) => {
  return c.json({ url: await getFeaturedImage(c.env.R2) });
});

/* ═══════════════════════════════════════════════════════════════
   SPOTIFY OAUTH
   ═══════════════════════════════════════════════════════════════ */

app.get('/screensaver/spotify/auth', (c) => {
  if (!spotify.isConfigured(c.env)) {
    return c.html(
      'Faltan SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET. ' +
      'Configúralos con <code>wrangler secret put</code>.', 400
    );
  }
  return c.redirect(spotify.getAuthUrl(c.env));
});

app.get('/screensaver/spotify/callback', async (c) => {
  const { code, error } = c.req.query();
  if (error || !code) return c.redirect('/screensaver/carousel-admin?spotify=cancelled');

  const tokens = await spotify.exchangeCode(c.env, code);
  if (!tokens?.access_token) return c.redirect('/screensaver/carousel-admin?spotify=error');

  await spotify.saveTokens(c.env, tokens);
  return c.redirect('/screensaver/carousel-admin?spotify=ok');
});

app.post('/screensaver/spotify/disconnect', async (c) => {
  await spotify.clearTokens(c.env);
  return c.redirect('/screensaver/carousel-admin');
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — CARRUSEL
   ═══════════════════════════════════════════════════════════════ */

app.get('/screensaver/carousel-admin', async (c) => {
  const [media, featured, spotifyState] = await Promise.all([
    listR2Media(c.env.R2, 'carousel/'),
    getFeaturedImage(c.env.R2),
    spotify.getNowPlaying(c.env),
  ]);

  return c.html(render('carousel-admin', {
    title: 'Carrusel · Admin',
    admin: c.get('admin'),
    media,
    featured,
    spotifyState,
    spotifyConfigured: spotify.isConfigured(c.env),
    spotifyMsg: c.req.query('spotify') || null,
  }));
});

/* ── Upload carrusel (imagen o video) ───────────────────────── */
app.post('/screensaver/carousel/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('photo');

  if (file && file.size > 0) {
    if (!ALLOWED_UPLOAD.test(file.type)) {
      return c.redirect('/screensaver/carousel-admin');
    }
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 200 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) return c.redirect('/screensaver/carousel-admin');
    const ext = file.name.split('.').pop().toLowerCase();
    const key = `carousel/${Date.now()}.${ext}`;
    await c.env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  }

  return c.redirect('/screensaver/carousel-admin');
});

/* ── Borrar imagen/video del carrusel ────────────────────────── */
app.post('/screensaver/carousel/delete', async (c) => {
  const body = await c.req.parseBody();
  const filename = (body.filename || '').replace(/[^a-zA-Z0-9._-]/g, '');
  if (filename && MEDIA_RE.test(filename)) {
    await c.env.R2.delete(`carousel/${filename}`);
  }
  return c.redirect('/screensaver/carousel-admin');
});

/* ── Upload imagen destacada ─────────────────────────────────── */
app.post('/screensaver/featured/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('featured');

  if (file && file.size > 0 && file.type.startsWith('image/')) {
    if (file.size > 10 * 1024 * 1024) return c.html('Imagen demasiado grande (máx. 10 MB)', 400);
    const ext = file.name.split('.').pop().toLowerCase();
    // Borrar la imagen destacada anterior
    const existing = await listR2Images(c.env.R2, 'featured/');
    await Promise.all(existing.map((f) => c.env.R2.delete(`featured/${f}`)));
    await c.env.R2.put(`featured/featured.${ext}`, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  }

  return c.redirect('/screensaver/carousel-admin');
});

/* ── Borrar imagen destacada ─────────────────────────────────── */
app.post('/screensaver/featured/delete', async (c) => {
  const existing = await listR2Images(c.env.R2, 'featured/');
  await Promise.all(existing.map((f) => c.env.R2.delete(`featured/${f}`)));
  return c.redirect('/screensaver/carousel-admin');
});

export default app;
