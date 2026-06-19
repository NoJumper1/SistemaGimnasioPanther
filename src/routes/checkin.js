const express = require('express');
const dayjs = require('dayjs');
const memberModel = require('../models/memberModel');
const subscriptionModel = require('../models/subscriptionModel');
const checkinModel = require('../models/checkinModel');
const visitModel = require('../models/visitModel');
const { getMemberStatus } = require('../models/memberStatus');

const router = express.Router();

router.get('/', (req, res) => {
  const recent = checkinModel.getRecent(15);
  const recentVisits = visitModel.getRecent(15);
  res.render('checkin', { title: 'Check-in', recent, recentVisits, result: null, visitResult: null });
});

router.post('/visita', (req, res) => {
  const visitorName = (req.body.visitor_name || '').trim();
  if (!visitorName) {
    const recent = checkinModel.getRecent(15);
    const recentVisits = visitModel.getRecent(15);
    return res.render('checkin', {
      title: 'Check-in',
      recent,
      recentVisits,
      result: null,
      visitResult: { ok: false, message: 'Ingresa el nombre del visitante.' },
    });
  }

  visitModel.create({ visitorName, registeredBy: req.session.admin.id });

  const recent = checkinModel.getRecent(15);
  const recentVisits = visitModel.getRecent(15);
  res.render('checkin', {
    title: 'Check-in',
    recent,
    recentVisits,
    result: null,
    visitResult: { ok: true, name: visitorName },
  });
});

// Búsqueda en vivo usada por public/js/checkin.js
router.get('/search', (req, res) => {
  const term = (req.query.q || '').trim();
  if (term.length < 2) return res.json([]);
  const members = memberModel.search(term, 10);
  res.json(members.map((m) => ({ id: m.id, full_name: m.full_name })));
});

router.post('/', (req, res) => {
  const memberId = req.body.member_id;
  const member = memberModel.getById(memberId);

  if (!member) {
    return res.status(404).render('checkin', {
      title: 'Check-in',
      recent: checkinModel.getRecent(15),
      recentVisits: visitModel.getRecent(15),
      result: { ok: false, message: 'Socio no encontrado.' },
      visitResult: null,
    });
  }

  const latest = subscriptionModel.getLatestByMember(member.id);
  const { status, endDate } = getMemberStatus(latest);

  let allowed = status === 'activo';
  let reason = null;
  if (!member.active) {
    allowed = false;
    reason = 'El socio está dado de baja.';
  } else if (status === 'caducado') {
    reason = `Suscripción caducada el ${endDate}.`;
  } else if (status === 'sin_suscripcion') {
    reason = 'No tiene ninguna suscripción registrada.';
  }

  checkinModel.create({
    memberId: member.id,
    result: allowed ? 'allowed' : 'denied',
    reason,
    method: 'manual',
    registeredBy: req.session.admin.id,
  });

  res.render('checkin', {
    title: 'Check-in',
    recent: checkinModel.getRecent(15),
    recentVisits: visitModel.getRecent(15),
    result: {
      ok: allowed,
      memberName: member.full_name,
      message: allowed ? 'Puede entrar' : `Acceso denegado: ${reason}`,
    },
    visitResult: null,
  });
});

module.exports = router;
