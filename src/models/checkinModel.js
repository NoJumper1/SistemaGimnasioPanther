const db = require('../db/database');

function create({ memberId, result, reason, method = 'manual', registeredBy }) {
  const insertResult = db
    .prepare(
      `INSERT INTO checkins (member_id, result, reason, method, registered_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(memberId, result, reason || null, method, registeredBy || null);
  return db.prepare('SELECT * FROM checkins WHERE id = ?').get(insertResult.lastInsertRowid);
}

function getRecent(limit = 20) {
  return db
    .prepare(
      `SELECT c.*, m.full_name
       FROM checkins c
       JOIN members m ON m.id = c.member_id
       ORDER BY c.id DESC
       LIMIT ?`
    )
    .all(limit);
}

function getByMember(memberId, limit = 20) {
  return db
    .prepare('SELECT * FROM checkins WHERE member_id = ? ORDER BY id DESC LIMIT ?')
    .all(memberId, limit);
}

module.exports = { create, getRecent, getByMember };
