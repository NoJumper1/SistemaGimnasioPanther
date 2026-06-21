import { Hono } from 'hono';
import { requireAuth } from './middleware/requireAuth.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import membersRoutes from './routes/members.js';
import plansRoutes from './routes/plans.js';
import checkinRoutes from './routes/checkin.js';
import statsRoutes from './routes/stats.js';
import screensaverRoutes from './routes/screensaver.js';

const app = new Hono();

// ── Rutas públicas ────────────────────────────────────────────────
app.route('/', authRoutes);

// ── Imágenes subidas por el usuario (R2) ─────────────────────────
// Deben ser públicas (el screensaver las consume sin sesión)
app.get('/img/carousel/:key', async (c) => {
  const obj = await c.env.R2.get(`carousel/${c.req.param('key')}`);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=3600');
  return new Response(obj.body, { headers });
});

app.get('/img/featured/:key', async (c) => {
  const obj = await c.env.R2.get(`featured/${c.req.param('key')}`);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=3600');
  return new Response(obj.body, { headers });
});

// ── Rutas protegidas ─────────────────────────────────────────────
const secured = new Hono();
secured.use('*', requireAuth);
secured.route('/', dashboardRoutes);
secured.route('/members', membersRoutes);
secured.route('/plans', plansRoutes);
secured.route('/checkin', checkinRoutes);
secured.route('/stats', statsRoutes);
secured.route('/', screensaverRoutes);

app.route('/', secured);

// ── Fallback: assets estáticos (CSS, JS, logo, etc.) ─────────────
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
