const db = require('../db/database');
const dayjs = require('dayjs');

// Rellena meses faltantes con 0 para que las gráficas no tengan huecos
function fillMonths(rows, months = 12, valueKey = 'total') {
  const map = new Map(rows.map((r) => [r.month, r[valueKey]]));
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM');
    result.push({ month, [valueKey]: map.get(month) || 0 });
  }
  return result;
}

// Rellena días faltantes con 0
function fillDays(rows, days = 30) {
  const map = new Map(rows.map((r) => [r.day, r.total]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    result.push({ day, total: map.get(day) || 0 });
  }
  return result;
}

function getKPIs() {
  const currentMonth = dayjs().format('YYYY-MM');

  const activeMembersResult = db
    .prepare(`SELECT COUNT(*) as count FROM members WHERE active = 1`)
    .get();

  const monthlyRevenueResult = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions
       WHERE strftime('%Y-%m', payment_date) = ?`
    )
    .get(currentMonth);

  const monthlyCheckinsResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM checkins
       WHERE strftime('%Y-%m', timestamp) = ?`
    )
    .get(currentMonth);

  const monthlyVisitsResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM visits
       WHERE strftime('%Y-%m', timestamp) = ?`
    )
    .get(currentMonth);

  const totalRevenueResult = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions`)
    .get();

  return {
    activeMembers: activeMembersResult.count,
    monthlyRevenue: monthlyRevenueResult.total,
    monthlyCheckins: monthlyCheckinsResult.count,
    monthlyVisits: monthlyVisitsResult.count,
    totalRevenue: totalRevenueResult.total,
  };
}

function getRevenueByMonth(months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
       FROM subscriptions
       WHERE payment_date >= ?
       GROUP BY month ORDER BY month`
    )
    .all(since);
  return fillMonths(rows, months, 'total');
}

function getNewMembersByMonth(months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', join_date) as month, COUNT(*) as total
       FROM members
       WHERE join_date >= ?
       GROUP BY month ORDER BY month`
    )
    .all(since);
  return fillMonths(rows, months, 'total');
}

function getCheckinsByDay(days = 30) {
  const since = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT date(timestamp) as day, COUNT(*) as total
       FROM checkins
       WHERE date(timestamp) >= ?
       GROUP BY day ORDER BY day`
    )
    .all(since);
  return fillDays(rows, days);
}

function getPlanDistribution() {
  return db
    .prepare(
      `SELECT COALESCE(p.name, 'Personalizado') as label, COUNT(*) as total
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       GROUP BY s.plan_id
       ORDER BY total DESC`
    )
    .all();
}

function getMemberStatusCounts() {
  // Socios activos con suscripción vigente
  const active = db
    .prepare(
      `SELECT COUNT(*) as count FROM members m
       WHERE m.active = 1
         AND EXISTS (
           SELECT 1 FROM subscriptions s
           WHERE s.member_id = m.id AND s.end_date >= date('now')
         )`
    )
    .get().count;

  // Socios activos con suscripción caducada
  const expired = db
    .prepare(
      `SELECT COUNT(*) as count FROM members m
       WHERE m.active = 1
         AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id)
         AND NOT EXISTS (
           SELECT 1 FROM subscriptions s
           WHERE s.member_id = m.id AND s.end_date >= date('now')
         )`
    )
    .get().count;

  // Socios activos sin ninguna suscripción
  const noSub = db
    .prepare(
      `SELECT COUNT(*) as count FROM members m
       WHERE m.active = 1
         AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id)`
    )
    .get().count;

  return [
    { label: 'Activo', total: active },
    { label: 'Caducado', total: expired },
    { label: 'Sin suscripción', total: noSub },
  ];
}

function getPaymentMethodDistribution() {
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(payment_method, ''), 'No especificado') as label, COUNT(*) as total
       FROM subscriptions
       GROUP BY payment_method
       ORDER BY total DESC`
    )
    .all();
}

function getVisitsByMonth(months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', timestamp) as month, COUNT(*) as total
       FROM visits
       WHERE date(timestamp) >= ?
       GROUP BY month ORDER BY month`
    )
    .all(since);
  return fillMonths(rows, months, 'total');
}

module.exports = {
  getKPIs,
  getRevenueByMonth,
  getNewMembersByMonth,
  getCheckinsByDay,
  getPlanDistribution,
  getMemberStatusCounts,
  getPaymentMethodDistribution,
  getVisitsByMonth,
};
