import { Hono } from 'hono';
import { render } from '../lib/render.js';
import * as planModel from '../models/planModel.js';

const app = new Hono();

app.get('/', async (c) => {
  const plans = await planModel.getAll(c.env.DB, { includeInactive: true });
  return c.html(render('plans/list', { title: 'Planes', admin: c.get('admin'), plans }));
});

app.get('/new', (c) => c.html(render('plans/form', { title: 'Nuevo plan', admin: c.get('admin'), plan: null })));

app.post('/', async (c) => {
  const body = await c.req.parseBody();
  const { name, duration_days, price } = body;

  if (!name || !duration_days) {
    return c.html(render('plans/form', { title: 'Nuevo plan', admin: c.get('admin'), plan: null, error: 'Nombre y duración son obligatorios.' }), 400);
  }

  await planModel.create(c.env.DB, {
    name: name.trim(),
    durationDays: parseInt(duration_days, 10),
    price: parseFloat(price) || 0,
  });
  return c.redirect('/plans');
});

app.get('/:id/edit', async (c) => {
  const plan = await planModel.getById(c.env.DB, c.req.param('id'));
  if (!plan) return c.html('Plan no encontrado', 404);
  return c.html(render('plans/form', { title: 'Editar plan', admin: c.get('admin'), plan }));
});

app.post('/:id', async (c) => {
  const body = await c.req.parseBody();
  const { name, duration_days, price, active } = body;
  await planModel.update(c.env.DB, c.req.param('id'), {
    name: name.trim(),
    durationDays: parseInt(duration_days, 10),
    price: parseFloat(price) || 0,
    active: active === 'on',
  });
  return c.redirect('/plans');
});

app.post('/:id/delete', async (c) => {
  await planModel.remove(c.env.DB, c.req.param('id'));
  return c.redirect('/plans');
});

export default app;
