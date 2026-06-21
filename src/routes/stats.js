import { Hono } from 'hono';
import dayjs from 'dayjs';
import { render } from '../lib/render.js';
import * as stats from '../models/statsModel.js';

const app = new Hono();

app.get('/', async (c) => {
  const db = c.env.DB;

  const [kpis, revenueByMonth, newMembersByMonth, checkinsByDay, visitsByMonth, planDistribution, memberStatusCounts, paymentMethods] = await Promise.all([
    stats.getKPIs(db),
    stats.getRevenueByMonth(db, 12),
    stats.getNewMembersByMonth(db, 12),
    stats.getCheckinsByDay(db, 30),
    stats.getVisitsByMonth(db, 12),
    stats.getPlanDistribution(db),
    stats.getMemberStatusCounts(db),
    stats.getPaymentMethodDistribution(db),
  ]);

  const monthLabels = revenueByMonth.map((r) => dayjs(r.month + '-01').format('MMM YYYY'));
  const dayLabels   = checkinsByDay.map((r) => dayjs(r.day).format('DD MMM'));

  return c.html(render('stats', {
    title: 'Estadísticas',
    kpis,
    charts: {
      monthLabels,
      dayLabels,
      revenueData:      revenueByMonth.map((r) => r.total),
      newMembersData:   newMembersByMonth.map((r) => r.total),
      checkinsData:     checkinsByDay.map((r) => r.total),
      visitsMonthData:  visitsByMonth.map((r) => r.total),
      planLabels:       planDistribution.map((r) => r.label),
      planData:         planDistribution.map((r) => r.total),
      statusLabels:     memberStatusCounts.map((r) => r.label),
      statusData:       memberStatusCounts.map((r) => r.total),
      paymentLabels:    paymentMethods.map((r) => r.label),
      paymentData:      paymentMethods.map((r) => r.total),
    },
  }));
});

export default app;
