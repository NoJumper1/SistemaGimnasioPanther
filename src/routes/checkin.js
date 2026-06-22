import { Hono } from 'hono';
import { render } from '../lib/render.js';
import * as memberModel from '../models/memberModel.js';
import * as subscriptionModel from '../models/subscriptionModel.js';
import * as checkinModel from '../models/checkinModel.js';
import * as visitModel from '../models/visitModel.js';
import { getMemberStatus } from '../models/memberStatus.js';

const app = new Hono();

app.get('/', async (c) => {
  const db = c.env.DB;
  const [recent, recentVisits] = await Promise.all([
    checkinModel.getRecent(db, 15),
    visitModel.getRecent(db, 15),
  ]);
  return c.html(render('checkin', { title: 'Check-in', admin: c.get('admin'), recent, recentVisits, result: null, visitResult: null }));
});

app.post('/visita', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const visitorName = (body.visitor_name || '').trim();

  const [recent, recentVisits] = await Promise.all([
    checkinModel.getRecent(db, 15),
    visitModel.getRecent(db, 15),
  ]);

  if (!visitorName) {
    return c.html(render('checkin', {
      title: 'Check-in', admin: c.get('admin'), recent, recentVisits, result: null,
      visitResult: { ok: false, message: 'Ingresa el nombre del visitante.' },
    }));
  }

  await visitModel.create(db, { visitorName, registeredBy: c.get('admin')?.id });

  const [recentFresh, recentVisitsFresh] = await Promise.all([
    checkinModel.getRecent(db, 15),
    visitModel.getRecent(db, 15),
  ]);

  return c.html(render('checkin', {
    title: 'Check-in', admin: c.get('admin'), recent: recentFresh, recentVisits: recentVisitsFresh,
    result: null, visitResult: { ok: true, name: visitorName },
  }));
});

// Búsqueda en vivo para public/js/checkin.js
app.get('/search', async (c) => {
  const term = (c.req.query('q') || '').trim();
  if (term.length < 2) return c.json([]);
  const members = await memberModel.search(c.env.DB, term, 10);
  return c.json(members.map((m) => ({ id: m.id, full_name: m.full_name })));
});

app.post('/', async (c) => {
  const db = c.env.DB;
  const body = await c.req.parseBody();
  const memberId = body.member_id;
  const member = await memberModel.getById(db, memberId);

  const [recent, recentVisits] = await Promise.all([
    checkinModel.getRecent(db, 15),
    visitModel.getRecent(db, 15),
  ]);

  if (!member) {
    return c.html(render('checkin', {
      title: 'Check-in', admin: c.get('admin'), recent, recentVisits,
      result: { ok: false, message: 'Socio no encontrado.' }, visitResult: null,
    }), 404);
  }

  const latest = await subscriptionModel.getLatestByMember(db, member.id);
  const { status, endDate } = getMemberStatus(latest);

  let allowed = status === 'activo';
  let reason = null;
  if (!member.active) {
    allowed = false;
    reason = 'El socio está dado de baja.';
  } else if (status === 'caducado') {
    reason = `Suscripción vencida el ${endDate}.`;
  } else if (status === 'sin_suscripcion') {
    reason = 'No tiene ninguna suscripción registrada.';
  }

  await checkinModel.create(db, {
    memberId: member.id,
    result: allowed ? 'allowed' : 'denied',
    reason,
    method: 'manual',
    registeredBy: c.get('admin')?.id,
  });

  const [recentFresh, recentVisitsFresh] = await Promise.all([
    checkinModel.getRecent(db, 15),
    visitModel.getRecent(db, 15),
  ]);

  return c.html(render('checkin', {
    title: 'Check-in',
    admin: c.get('admin'),
    recent: recentFresh,
    recentVisits: recentVisitsFresh,
    result: {
      ok: allowed,
      memberName: member.full_name,
      message: allowed ? 'Puede entrar' : `Acceso denegado: ${reason}`,
    },
    visitResult: null,
  }));
});

export default app;
