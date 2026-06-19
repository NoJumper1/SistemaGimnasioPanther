const db = require('../db/database');

function getAll({ includeInactive = false, search = '' } = {}) {
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

  return db.prepare(query).all(...params);
}

function getById(id) {
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id);
}

/** Búsqueda en vivo para el check-in: solo socios activos, por nombre, límite razonable. */
function search(term, limit = 10) {
  return db
    .prepare('SELECT * FROM members WHERE active = 1 AND full_name LIKE ? ORDER BY full_name ASC LIMIT ?')
    .all(`%${term}%`, limit);
}

function create({ fullName, email, phone, joinDate, notes }) {
  const result = db
    .prepare(
      `INSERT INTO members (full_name, email, phone, join_date, notes)
       VALUES (?, ?, ?, COALESCE(?, date('now')), ?)`
    )
    .run(fullName, email || null, phone || null, joinDate || null, notes || null);
  return getById(result.lastInsertRowid);
}

function update(id, { fullName, email, phone, notes }) {
  db.prepare(
    'UPDATE members SET full_name = ?, email = ?, phone = ?, notes = ? WHERE id = ?'
  ).run(fullName, email || null, phone || null, notes || null, id);
  return getById(id);
}

function setActive(id, active) {
  db.prepare('UPDATE members SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return getById(id);
}

module.exports = { getAll, getById, search, create, update, setActive };
