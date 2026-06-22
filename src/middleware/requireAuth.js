import { jwtVerify, SignJWT } from 'jose';
import { getCookie } from 'hono/cookie';

export async function requireAuth(c, next) {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET || 'dev-secret-cambiame');
    const { payload } = await jwtVerify(token, secret);
    c.set('admin', payload);
    await next();
  } catch {
    return c.redirect('/login');
  }
}

export async function requireAdmin(c, next) {
  const admin = c.get('admin');
  if (admin?.role !== 'admin') return c.redirect('/');
  await next();
}

export async function signToken(payload, secret) {
  const key = new TextEncoder().encode(secret || 'dev-secret-cambiame');
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key);
}
