export async function create(db, { memberId, result, reason, method = 'manual', registeredBy }) {
  const { meta } = await db
    .prepare(
      `INSERT INTO checkins (member_id, result, reason, method, registered_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(memberId, result, reason || null, method, registeredBy || null)
    .run();
  return db.prepare('SELECT * FROM checkins WHERE id = ?').bind(meta.last_row_id).first();
}

export async function getRecent(db, limit = 20) {
  const { results } = await db
    .prepare(
      `SELECT c.*, m.full_name
       FROM checkins c
       JOIN members m ON m.id = c.member_id
       ORDER BY c.id DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();
  return results;
}

export async function getByMember(db, memberId, limit = 20) {
  const { results } = await db
    .prepare('SELECT * FROM checkins WHERE member_id = ? ORDER BY id DESC LIMIT ?')
    .bind(memberId, limit)
    .all();
  return results;
}

export async function countToday(db) {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM checkins WHERE date(timestamp) = date('now')`)
    .first();
  return row.count;
}
