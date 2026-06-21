import { Hono } from 'hono';
import dayjs from 'dayjs';
import { render } from '../lib/render.js';
import * as memberModel from '../models/memberModel.js';
import * as subscriptionModel from '../models/subscriptionModel.js';
import * as planModel from '../models/planModel.js';
import * as checkinModel from '../models/checkinModel.js';
import { getMemberStatus, STATUS_LABELS, STATUS_BADGE_CLASSES } from '../models/memberStatus.js';

const app = new Hono();

/* ── Listado ─────────────────────────────────────────────────── */
app.get('/', async (c) => {
  const db = c.env.DB;
  const search = c.req.query('search') || '';
  const statusFilter = c.req.query('status') || '';

  const [members, latestByMember] = await Promise.all([
    memberModel.getAll(db, { search }),
    subscriptionModel.getLatestForAllMembers(db),
  ]);

  let rows = members.map((member) => {
    const latest = latestByMember.get(member.id);
    const { status, endDate } = getMemberStatus(latest);
    return { member, status, endDate };
  });

  if (statusFilter) rows = rows.filter((row) => row.status === statusFilter);

  return c.html(render('members/list', { title: 'Socios', rows, search, statusFilter, STATUS_LABELS, STATUS_BADGE_CLASSES }));
});

/* ── Nuevo ───────────────────────────────────────────────────── */
app.get('/new', (c) => c.html(render('members/form', { title: 'Nuevo socio', member: null })));

app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const { full_name, email, phone, join_date, notes } = body;

  if (!full_name || !full_name.trim()) {
    return c.html(render('members/form', { title: 'Nuevo socio', member: null, error: 'El nombre completo es obligatorio.' }), 400);
  }

  const member = await memberModel.create(c.env.DB, {
    fullName: full_name.trim(), email, phone, joinDate: join_date, notes,
  });
  return c.redirect(`/members/${member.id}`);
});

/* ── Detalle ─────────────────────────────────────────────────── */
app.get('/:id', async (c) => {
  const db = c.env.DB;
  const member = await memberModel.getById(db, c.req.param('id'));
  if (!member) return c.html('Socio no encontrado', 404);

  const [subscriptions, latest, plans, recentCheckins] = await Promise.all([
    subscriptionModel.getByMember(db, member.id),
    subscriptionModel.getLatestByMember(db, member.id),
    planModel.getAll(db),
    checkinModel.getByMember(db, member.id, 10),
  ]);

  const { status, endDate } = getMemberStatus(latest);

  return c.html(render('members/detail', {
    title: member.full_name,
    member, subscriptions, status, endDate, plans, recentCheckins,
    STATUS_LABELS, STATUS_BADGE_CLASSES,
    today: dayjs().format('YYYY-MM-DD'),
  }));
});

/* ── Editar ──────────────────────────────────────────────────── */
app.get('/:id/edit', async (c) => {
  const member = await memberModel.getById(c.env.DB, c.req.param('id'));
  if (!member) return c.html('Socio no encontrado', 404);
  return c.html(render('members/form', { title: 'Editar socio', member }));
});

app.post('/:id', async (c) => {
  const body = await c.req.parseBody();
  const { full_name, email, phone, notes } = body;
  const id = c.req.param('id');

  if (!full_name || !full_name.trim()) {
    const member = await memberModel.getById(c.env.DB, id);
    return c.html(render('members/form', { title: 'Editar socio', member, error: 'El nombre completo es obligatorio.' }), 400);
  }

  await memberModel.update(c.env.DB, id, { fullName: full_name.trim(), email, phone, notes });
  return c.redirect(`/members/${id}`);
});

app.post('/:id/deactivate', async (c) => {
  await memberModel.setActive(c.env.DB, c.req.param('id'), false);
  return c.redirect(`/members/${c.req.param('id')}`);
});

app.post('/:id/activate', async (c) => {
  await memberModel.setActive(c.env.DB, c.req.param('id'), true);
  return c.redirect(`/members/${c.req.param('id')}`);
});

/* ── Suscripciones (anidadas en /members/:memberId/subscriptions) */
app.post('/:memberId/subscriptions', async (c) => {
  const memberId = c.req.param('memberId');
  const member = await memberModel.getById(c.env.DB, memberId);
  if (!member) return c.html('Socio no encontrado', 404);

  const body = await c.req.parseBody();
  const { plan_id, start_date, end_date, amount, payment_method, notes } = body;

  if (!start_date || !end_date) return c.html('Fecha de inicio y fin son obligatorias.', 400);

  await subscriptionModel.create(c.env.DB, {
    memberId,
    planId: plan_id || null,
    startDate: start_date,
    endDate: end_date,
    amount: parseFloat(amount) || 0,
    paymentMethod: payment_method,
    paymentDate: start_date,
    registeredBy: c.get('admin')?.id || null,
    notes,
  });

  return c.redirect(`/members/${memberId}`);
});

export default app;
