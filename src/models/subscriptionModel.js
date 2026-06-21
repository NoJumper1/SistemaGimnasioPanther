export async function getByMember(db, memberId) {
  const { results } = await db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC, id DESC')
    .bind(memberId)
    .all();
  return results;
}

export async function getLatestByMember(db, memberId) {
  return db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC, id DESC LIMIT 1')
    .bind(memberId)
    .first();
}

/**
 * Devuelve Map<member_id, latestSubscription> para todos los socios en una sola query.
 * Evita N+1 en listados.
 */
export async function getLatestForAllMembers(db) {
  const { results } = await db
    .prepare(
      `SELECT s.* FROM subscriptions s
       WHERE s.id = (
         SELECT s2.id FROM subscriptions s2
         WHERE s2.member_id = s.member_id
         ORDER BY s2.end_date DESC, s2.id DESC
         LIMIT 1
       )`
    )
    .all();

  const map = new Map();
  for (const row of results) map.set(row.member_id, row);
  return map;
}

export async function create(db, { memberId, planId, startDate, endDate, amount, paymentMethod, paymentDate, registeredBy, notes }) {
  const { meta } = await db
    .prepare(
      `INSERT INTO subscriptions
        (member_id, plan_id, start_date, end_date, amount, payment_method, payment_date, registered_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(memberId, planId || null, startDate, endDate, amount, paymentMethod || null, paymentDate, registeredBy || null, notes || null)
    .run();
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(meta.last_row_id).first();
}
