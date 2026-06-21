import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import { render } from '../lib/render.js';
import { findByUsername } from '../models/adminModel.js';
import { signToken } from '../middleware/requireAuth.js';

const app = new Hono();

app.get('/login', (c) => {
  return c.html(render('login', { error: null, layout: false }));
});

app.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const { username, password } = body;

  const admin = await findByUsername(c.env.DB, username || '');
  const passwordOk = admin ? await bcrypt.compare(password || '', admin.password_hash) : false;

  if (!admin || !passwordOk) {
    return c.html(render('login', { error: 'Usuario o contraseña incorrectos.', layout: false }), 401);
  }

  const token = await signToken(
    { id: admin.id, username: admin.username, role: admin.role },
    c.env.JWT_SECRET
  );

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 12, // 12 horas
    path: '/',
  });

  return c.redirect('/');
});

app.post('/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.redirect('/login');
});

export default app;
