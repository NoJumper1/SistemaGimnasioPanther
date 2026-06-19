const express = require('express');
const planModel = require('../models/planModel');

const router = express.Router();

router.get('/', (req, res) => {
  const plans = planModel.getAll({ includeInactive: true });
  res.render('plans/list', { title: 'Planes', plans });
});

router.get('/new', (req, res) => {
  res.render('plans/form', { title: 'Nuevo plan', plan: null });
});

router.post('/', (req, res) => {
  const { name, duration_days, price } = req.body;
  if (!name || !duration_days) {
    return res.status(400).render('plans/form', {
      title: 'Nuevo plan',
      plan: null,
      error: 'Nombre y duración son obligatorios.',
    });
  }
  planModel.create({
    name: name.trim(),
    durationDays: parseInt(duration_days, 10),
    price: parseFloat(price) || 0,
  });
  res.redirect('/plans');
});

router.get('/:id/edit', (req, res) => {
  const plan = planModel.getById(req.params.id);
  if (!plan) return res.status(404).send('Plan no encontrado');
  res.render('plans/form', { title: 'Editar plan', plan });
});

router.post('/:id', (req, res) => {
  const { name, duration_days, price, active } = req.body;
  planModel.update(req.params.id, {
    name: name.trim(),
    durationDays: parseInt(duration_days, 10),
    price: parseFloat(price) || 0,
    active: active === 'on',
  });
  res.redirect('/plans');
});

router.post('/:id/delete', (req, res) => {
  planModel.remove(req.params.id);
  res.redirect('/plans');
});

module.exports = router;
