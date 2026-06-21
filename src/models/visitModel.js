export async function create(db, { visitorName, registeredBy }) {
  const { meta } = await db
    .prepare('INSERT INTO visits (visitor_name, registered_by) VALUES (?, ?)')
    .bind(visitorName, registeredBy || null)
    .run();
  return db.prepare('SELECT * FROM visits WHERE id = ?').bind(meta.last_row_id).first();
}

export async function getRecent(db, limit = 20) {
  const { results } = await db
    .prepare('SELECT * FROM visits ORDER BY id DESC LIMIT ?')
    .bind(limit)
    .all();
  return results;
}

export async function countToday(db) {
  const row = await db
    .prepare(`SELECT COUNT(*) as count FROM visits WHERE date(timestamp) = date('now')`)
    .first();
  return row.count;
}
