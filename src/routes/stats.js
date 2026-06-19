const express = require('express');
const dayjs = require('dayjs');
const stats = require('../models/statsModel');

const router = express.Router();

router.get('/', (req, res) => {
  const kpis = stats.getKPIs();
  const revenueByMonth = stats.getRevenueByMonth(12);
  const newMembersByMonth = stats.getNewMembersByMonth(12);
  const checkinsByDay = stats.getCheckinsByDay(30);
  const visitsByMonth = stats.getVisitsByMonth(12);
  const planDistribution = stats.getPlanDistribution();
  const memberStatusCounts = stats.getMemberStatusCounts();
  const paymentMethods = stats.getPaymentMethodDistribution();

  // Etiquetas legibles para los meses (ej: "Jun 2025")
  const monthLabels = revenueByMonth.map((r) =>
    dayjs(r.month + '-01').format('MMM YYYY')
  );
  const dayLabels = checkinsByDay.map((r) =>
    dayjs(r.day).format('DD MMM')
  );

  res.render('stats', {
    title: 'Estadísticas',
    kpis,
    charts: {
      monthLabels,
      dayLabels,
      revenueData: revenueByMonth.map((r) => r.total),
      newMembersData: newMembersByMonth.map((r) => r.total),
      checkinsData: checkinsByDay.map((r) => r.total),
      visitsMonthData: visitsByMonth.map((r) => r.total),
      planLabels: planDistribution.map((r) => r.label),
      planData: planDistribution.map((r) => r.total),
      statusLabels: memberStatusCounts.map((r) => r.label),
      statusData: memberStatusCounts.map((r) => r.total),
      paymentLabels: paymentMethods.map((r) => r.label),
      paymentData: paymentMethods.map((r) => r.total),
    },
  });
});

module.exports = router;
