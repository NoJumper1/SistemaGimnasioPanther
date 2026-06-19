const express = require('express');
const dayjs = require('dayjs');
const memberModel = require('../models/memberModel');
const subscriptionModel = require('../models/subscriptionModel');
const planModel = require('../models/planModel');
const checkinModel = require('../models/checkinModel');
const { getMemberStatus, STATUS_LABELS, STATUS_BADGE_CLASSES } = require('../models/memberStatus');

const router = express.Router();

router.get('/', (req, res) => {
  const { search = '', status: statusFilter = '' } = req.query;
  const members = memberModel.getAll({ search });
  const latestByMember = subscriptionModel.getLatestForAllMembers();

  let rows = members.map((member) => {
    const latest = latestByMember.get(member.id);
    const { status, endDate } = getMemberStatus(latest);
    return { member, status, endDate };
  });

  if (statusFilter) {
    rows = rows.filter((row) => row.status === statusFilter);
  }

  res.render('members/list', {
    title: 'Socios',
    rows,
    search,
    statusFilter,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
  });
});

router.get('/new', (req, res) => {
  res.render('members/form', { title: 'Nuevo socio', member: null });
});

router.post('/', (req, res) => {
  const { full_name, email, phone, join_date, notes } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).render('members/form', {
      title: 'Nuevo socio',
      member: null,
      error: 'El nombre completo es obligatorio.',
    });
  }
  const member = memberModel.create({
    fullName: full_name.trim(),
    email,
    phone,
    joinDate: join_date,
    notes,
  });
  res.redirect(`/members/${member.id}`);
});

router.get('/:id', (req, res) => {
  const member = memberModel.getById(req.params.id);
  if (!member) return res.status(404).send('Socio no encontrado');

  const subscriptions = subscriptionModel.getByMember(member.id);
  const latest = subscriptionModel.getLatestByMember(member.id);
  const { status, endDate } = getMemberStatus(latest);
  const plans = planModel.getAll();
  const recentCheckins = checkinModel.getByMember(member.id, 10);

  res.render('members/detail', {
    title: member.full_name,
    member,
    subscriptions,
    status,
    endDate,
    plans,
    recentCheckins,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
    today: dayjs().format('YYYY-MM-DD'),
  });
});

router.get('/:id/edit', (req, res) => {
  const member = memberModel.getById(req.params.id);
  if (!member) return res.status(404).send('Socio no encontrado');
  res.render('members/form', { title: 'Editar socio', member });
});

router.post('/:id', (req, res) => {
  const { full_name, email, phone, notes } = req.body;
  if (!full_name || !full_name.trim()) {
    const member = memberModel.getById(req.params.id);
    return res.status(400).render('members/form', {
      title: 'Editar socio',
      member,
      error: 'El nombre completo es obligatorio.',
    });
  }
  memberModel.update(req.params.id, { fullName: full_name.trim(), email, phone, notes });
  res.redirect(`/members/${req.params.id}`);
});

router.post('/:id/deactivate', (req, res) => {
  memberModel.setActive(req.params.id, false);
  res.redirect(`/members/${req.params.id}`);
});

router.post('/:id/activate', (req, res) => {
  memberModel.setActive(req.params.id, true);
  res.redirect(`/members/${req.params.id}`);
});

module.exports = router;
