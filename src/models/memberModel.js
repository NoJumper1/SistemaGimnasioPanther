export async function getAll(db, { includeInactive = false, search = '' } = {}) {
  let query = 'SELECT * FROM members WHERE 1=1';
  const params = [];

  if (!includeInactive) {
    query += ' AND active = 1';
  }
  if (search) {
    query += ' AND full_name LIKE ?';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY full_name ASC';

  const stmt = params.length
    ? db.prepare(query).bind(...params)
    : db.prepare(query);
  const { results } = await stmt.all();
  return results;
}

export async function getById(db, id) {
  return db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
}

export async function search(db, term, limit = 10) {
  const { results } = await db
    .prepare('SELECT * FROM members WHERE active = 1 AND full_name LIKE ? ORDER BY full_name ASC LIMIT ?')
    .bind(`%${term}%`, limit)
    .all();
  return results;
}

export async function create(db, { fullName, email, phone, joinDate, notes }) {
  const { meta } = await db
    .prepare(
      `INSERT INTO members (full_name, email, phone, join_date, notes)
       VALUES (?, ?, ?, COALESCE(?, date('now')), ?)`
    )
    .bind(fullName, email || null, phone || null, joinDate || null, notes || null)
    .run();
  return getById(db, meta.last_row_id);
}

export async function update(db, id, { fullName, email, phone, notes }) {
  await db
    .prepare('UPDATE members SET full_name = ?, email = ?, phone = ?, notes = ? WHERE id = ?')
    .bind(fullName, email || null, phone || null, notes || null, id)
    .run();
  return getById(db, id);
}

export async function setActive(db, id, active) {
  await db.prepare('UPDATE members SET active = ? WHERE id = ?').bind(active ? 1 : 0, id).run();
  return getById(db, id);
}
