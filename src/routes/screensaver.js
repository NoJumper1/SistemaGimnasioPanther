const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/database');
const { getMemberStatus } = require('../models/memberStatus');
const spotify = require('../services/spotify');

const router = express.Router();

const CAROUSEL_DIR    = path.join(__dirname, '../public/img/carousel');
const FEATURED_DIR    = path.join(__dirname, '../public/img/featured');
const IMAGE_RE        = /\.(jpe?g|png|gif|webp)$/i;

for (const dir of [CAROUSEL_DIR, FEATURED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ── Multer: carrusel ─────────────────────────────────────────── */
const carouselStorage = multer.diskStorage({
  destination: CAROUSEL_DIR,
  filename: (_, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage: carouselStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

/* ── Multer: imagen destacada ─────────────────────────────────── */
const featuredStorage = multer.diskStorage({
  destination: FEATURED_DIR,
  filename: (_, file, cb) => cb(null, `featured${path.extname(file.originalname).toLowerCase()}`)
});
const uploadFeatured = multer({
  storage: featuredStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

/* ── Helper: imagen destacada ─────────────────────────────────── */
function getFeaturedImage() {
  const files = fs.readdirSync(FEATURED_DIR).filter(f => IMAGE_RE.test(f));
  return files.length ? `/img/featured/${files[0]}` : null;
}

/* ═══════════════════════════════════════════════════════════════
   SCREENSAVER
   ═══════════════════════════════════════════════════════════════ */

router.get('/screensaver', (req, res) => {
  res.render('screensaver', { layout: false });
});

/* ── API: demo scan ───────────────────────────────────────────── */
router.get('/api/screensaver/demo-scan', (req, res) => {
  if (Math.random() < 0.1) return res.json({ result: 'not_found' });

  const member = db.prepare(
    'SELECT id, full_name FROM members WHERE active = 1 ORDER BY RANDOM() LIMIT 1'
  ).get();

  if (!member) return res.json({ result: 'not_found' });

  const sub = db.prepare(
    'SELECT end_date FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC LIMIT 1'
  ).get(member.id);

  const { status } = getMemberStatus(sub);
  const firstName = member.full_name.split(' ')[0];
  return res.json({ result: status === 'activo' ? 'allowed' : 'expired', firstName });
});

/* ── API: carrusel ────────────────────────────────────────────── */
router.get('/api/screensaver/carousel', (req, res) => {
  const files = fs.readdirSync(CAROUSEL_DIR)
    .filter(f => IMAGE_RE.test(f))
    .sort()
    .map(f => `/img/carousel/${f}`);
  res.json(files);
});

/* ── API: now playing (desde Spotify) ────────────────────────── */
router.get('/api/screensaver/nowplaying', (req, res) => {
  const { active, song, artist, albumArt, connected } = spotify.getState();
  res.json({ active, song, artist, albumArt, connected });
});

/* ── API: imagen destacada ────────────────────────────────────── */
router.get('/api/screensaver/featured', (req, res) => {
  res.json({ url: getFeaturedImage() });
});

/* ═══════════════════════════════════════════════════════════════
   SPOTIFY OAUTH
   ═══════════════════════════════════════════════════════════════ */

router.get('/screensaver/spotify/auth', (req, res) => {
  if (!spotify.isConfigured()) {
    return res.status(400).send(
      'Faltan SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en el archivo .env. ' +
      'Créalos en <a href="https://developer.spotify.com/dashboard">Spotify Dashboard</a>.'
    );
  }
  res.redirect(spotify.getAuthUrl());
});

router.get('/screensaver/spotify/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/screensaver/carousel-admin?spotify=cancelled');

  const tokens = await spotify.exchangeCode(code);
  if (!tokens?.access_token) return res.redirect('/screensaver/carousel-admin?spotify=error');

  spotify.saveTokens(tokens);
  spotify.start();
  res.redirect('/screensaver/carousel-admin?spotify=ok');
});

router.post('/screensaver/spotify/disconnect', (req, res) => {
  spotify.stop();
  spotify.clearTokens();
  res.redirect('/screensaver/carousel-admin');
});

/* ═══════════════════════════════════════════════════════════════
   ADMIN — CARRUSEL
   ═══════════════════════════════════════════════════════════════ */

router.get('/screensaver/carousel-admin', (req, res) => {
  const images           = fs.readdirSync(CAROUSEL_DIR).filter(f => IMAGE_RE.test(f));
  const featured         = getFeaturedImage();
  const spotifyState     = spotify.getState();
  const spotifyConfigured = spotify.isConfigured();
  const spotifyMsg       = req.query.spotify || null;

  res.render('carousel-admin', {
    title: 'Carrusel · Protector de Pantalla',
    images,
    featured,
    spotifyState,
    spotifyConfigured,
    spotifyMsg,
  });
});

router.post('/screensaver/carousel/upload', upload.single('photo'), (req, res) => {
  res.redirect('/screensaver/carousel-admin');
});

router.post('/screensaver/carousel/delete', (req, res) => {
  const file   = path.basename(req.body.filename || '');
  const target = path.join(CAROUSEL_DIR, file);
  if (IMAGE_RE.test(file) && fs.existsSync(target)) fs.unlinkSync(target);
  res.redirect('/screensaver/carousel-admin');
});

router.post('/screensaver/featured/upload', uploadFeatured.single('featured'), (req, res) => {
  const existing = fs.readdirSync(FEATURED_DIR).filter(f => IMAGE_RE.test(f));
  existing.forEach(f => {
    const p = path.join(FEATURED_DIR, f);
    if (req.file && path.resolve(req.file.path) !== path.resolve(p)) fs.unlinkSync(p);
  });
  res.redirect('/screensaver/carousel-admin');
});

router.post('/screensaver/featured/delete', (req, res) => {
  fs.readdirSync(FEATURED_DIR).filter(f => IMAGE_RE.test(f))
    .forEach(f => fs.unlinkSync(path.join(FEATURED_DIR, f)));
  res.redirect('/screensaver/carousel-admin');
});

module.exports = router;
