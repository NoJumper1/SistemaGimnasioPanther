import dayjs from 'dayjs';

function fillMonths(rows, months = 12, valueKey = 'total') {
  const map = new Map(rows.map((r) => [r.month, r[valueKey]]));
  const result = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM');
    result.push({ month, [valueKey]: map.get(month) || 0 });
  }
  return result;
}

function fillDays(rows, days = 30) {
  const map = new Map(rows.map((r) => [r.day, r.total]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    result.push({ day, total: map.get(day) || 0 });
  }
  return result;
}

export async function getKPIs(db) {
  const currentMonth = dayjs().format('YYYY-MM');

  const [activeRow, revenueRow, checkinsRow, visitsRow, totalRevenueRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM members WHERE active = 1').first(),
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions WHERE strftime('%Y-%m', payment_date) = ?`).bind(currentMonth).first(),
    db.prepare(`SELECT COUNT(*) as count FROM checkins WHERE strftime('%Y-%m', timestamp) = ?`).bind(currentMonth).first(),
    db.prepare(`SELECT COUNT(*) as count FROM visits WHERE strftime('%Y-%m', timestamp) = ?`).bind(currentMonth).first(),
    db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions').first(),
  ]);

  return {
    activeMembers: activeRow.count,
    monthlyRevenue: revenueRow.total,
    monthlyCheckins: checkinsRow.count,
    monthlyVisits: visitsRow.count,
    totalRevenue: totalRevenueRow.total,
  };
}

export async function getRevenueByMonth(db, months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const { results } = await db
    .prepare(`SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total FROM subscriptions WHERE payment_date >= ? GROUP BY month ORDER BY month`)
    .bind(since)
    .all();
  return fillMonths(results, months, 'total');
}

export async function getNewMembersByMonth(db, months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const { results } = await db
    .prepare(`SELECT strftime('%Y-%m', join_date) as month, COUNT(*) as total FROM members WHERE join_date >= ? GROUP BY month ORDER BY month`)
    .bind(since)
    .all();
  return fillMonths(results, months, 'total');
}

export async function getCheckinsByDay(db, days = 30) {
  const since = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
  const { results } = await db
    .prepare(`SELECT date(timestamp) as day, COUNT(*) as total FROM checkins WHERE date(timestamp) >= ? GROUP BY day ORDER BY day`)
    .bind(since)
    .all();
  return fillDays(results, days);
}

export async function getPlanDistribution(db) {
  const { results } = await db
    .prepare(
      `SELECT COALESCE(p.name, 'Personalizado') as label, COUNT(*) as total
       FROM subscriptions s
       LEFT JOIN plans p ON p.id = s.plan_id
       GROUP BY s.plan_id
       ORDER BY total DESC`
    )
    .all();
  return results;
}

export async function getMemberStatusCounts(db) {
  const [activeRow, expiredRow, noSubRow] = await Promise.all([
    db.prepare(
      `SELECT COUNT(*) as count FROM members m WHERE m.active = 1
       AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id AND s.end_date >= date('now'))`
    ).first(),
    db.prepare(
      `SELECT COUNT(*) as count FROM members m WHERE m.active = 1
       AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id)
       AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id AND s.end_date >= date('now'))`
    ).first(),
    db.prepare(
      `SELECT COUNT(*) as count FROM members m WHERE m.active = 1
       AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.member_id = m.id)`
    ).first(),
  ]);

  return [
    { label: 'Vigente', total: activeRow.count },
    { label: 'Vencida', total: expiredRow.count },
    { label: 'Sin suscripción', total: noSubRow.count },
  ];
}

export async function getPaymentMethodDistribution(db) {
  const { results } = await db
    .prepare(
      `SELECT COALESCE(NULLIF(payment_method, ''), 'No especificado') as label, COUNT(*) as total
       FROM subscriptions GROUP BY payment_method ORDER BY total DESC`
    )
    .all();
  return results;
}

export async function getVisitsByMonth(db, months = 12) {
  const since = dayjs().subtract(months - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const { results } = await db
    .prepare(`SELECT strftime('%Y-%m', timestamp) as month, COUNT(*) as total FROM visits WHERE date(timestamp) >= ? GROUP BY month ORDER BY month`)
    .bind(since)
    .all();
  return fillMonths(results, months, 'total');
}
