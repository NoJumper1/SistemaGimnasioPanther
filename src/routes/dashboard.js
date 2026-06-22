import { Hono } from 'hono';
import dayjs from 'dayjs';
import { render } from '../lib/render.js';
import { getAll } from '../models/memberModel.js';
import { getLatestForAllMembers } from '../models/subscriptionModel.js';
import { countToday as checkinsToday } from '../models/checkinModel.js';
import { countToday as visitsToday } from '../models/visitModel.js';
import { getMemberStatus, STATUS_LABELS, STATUS_BADGE_CLASSES } from '../models/memberStatus.js';

const app = new Hono();

app.get('/', async (c) => {
  const db = c.env.DB;
  const [members, latestByMember, checkinsCount, visitsCount] = await Promise.all([
    getAll(db),
    getLatestForAllMembers(db),
    checkinsToday(db),
    visitsToday(db),
  ]);

  const counts = { activo: 0, caducado: 0, sin_suscripcion: 0 };
  const expiringSoon = [];
  const today = dayjs();

  for (const member of members) {
    const latest = latestByMember.get(member.id);
    const { status, endDate } = getMemberStatus(latest);
    counts[status] += 1;

    if (status === 'activo' && endDate) {
      const daysLeft = dayjs(endDate).diff(today.startOf('day'), 'day');
      if (daysLeft <= 7) expiringSoon.push({ member, endDate, daysLeft });
    }
  }

  expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);

  return c.html(render('dashboard', {
    title: 'Dashboard',
    admin: c.get('admin'),
    counts,
    expiringSoon,
    totalMembers: members.length,
    checkinsToday: checkinsCount,
    visitsToday: visitsCount,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
  }));
});

export default app;
