const express = require('express');
const memberModel = require('../models/memberModel');
const subscriptionModel = require('../models/subscriptionModel');

const router = express.Router({ mergeParams: true });

router.post('/', (req, res) => {
  const memberId = req.params.memberId;
  const member = memberModel.getById(memberId);
  if (!member) return res.status(404).send('Socio no encontrado');

  const { plan_id, start_date, end_date, amount, payment_method, notes } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).send('Fecha de inicio y fin son obligatorias.');
  }

  subscriptionModel.create({
    memberId,
    planId: plan_id || null,
    startDate: start_date,
    endDate: end_date,
    amount: parseFloat(amount) || 0,
    paymentMethod: payment_method,
    paymentDate: start_date,
    registeredBy: req.session.admin.id,
    notes,
  });

  res.redirect(`/members/${memberId}`);
});

module.exports = router;
