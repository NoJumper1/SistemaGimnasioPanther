const db = require('../db/database');

function getByMember(memberId) {
  return db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC, id DESC')
    .all(memberId);
}

function getLatestByMember(memberId) {
  return db
    .prepare('SELECT * FROM subscriptions WHERE member_id = ? ORDER BY end_date DESC, id DESC LIMIT 1')
    .get(memberId);
}

/**
 * Devuelve un mapa { member_id: latestSubscription } para todos los socios de una sola vez.
 * Evita N+1 queries en listados.
 */
function getLatestForAllMembers() {
  const rows = db
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
  for (const row of rows) {
    map.set(row.member_id, row);
  }
  return map;
}

function create({ memberId, planId, startDate, endDate, amount, paymentMethod, paymentDate, registeredBy, notes }) {
  const result = db
    .prepare(
      `INSERT INTO subscriptions
        (member_id, plan_id, start_date, end_date, amount, payment_method, payment_date, registered_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(memberId, planId || null, startDate, endDate, amount, paymentMethod || null, paymentDate, registeredBy || null, notes || null);
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = { getByMember, getLatestByMember, getLatestForAllMembers, create };
