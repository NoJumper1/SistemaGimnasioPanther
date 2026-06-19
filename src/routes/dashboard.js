const express = require('express');
const dayjs = require('dayjs');
const memberModel = require('../models/memberModel');
const subscriptionModel = require('../models/subscriptionModel');
const checkinModel = require('../models/checkinModel');
const visitModel = require('../models/visitModel');
const { getMemberStatus, STATUS_LABELS, STATUS_BADGE_CLASSES } = require('../models/memberStatus');

const router = express.Router();

router.get('/', (req, res) => {
  const members = memberModel.getAll();
  const latestByMember = subscriptionModel.getLatestForAllMembers();

  const counts = { activo: 0, caducado: 0, sin_suscripcion: 0 };
  const expiringSoon = [];
  const today = dayjs();

  for (const member of members) {
    const latest = latestByMember.get(member.id);
    const { status, endDate } = getMemberStatus(latest);
    counts[status] += 1;

    if (status === 'activo' && endDate) {
      const daysLeft = dayjs(endDate).diff(today.startOf('day'), 'day');
      if (daysLeft <= 7) {
        expiringSoon.push({ member, endDate, daysLeft });
      }
    }
  }

  expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);

  res.render('dashboard', {
    counts,
    expiringSoon,
    totalMembers: members.length,
    checkinsToday: checkinModel.countToday(),
    visitsToday: visitModel.countToday(),
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
  });
});

module.exports = router;
