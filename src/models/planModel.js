const db = require('../db/database');

function getAll({ includeInactive = false } = {}) {
  if (includeInactive) {
    return db.prepare('SELECT * FROM plans ORDER BY duration_days ASC').all();
  }
  return db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY duration_days ASC').all();
}

function getById(id) {
  return db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
}

function create({ name, durationDays, price }) {
  const result = db
    .prepare('INSERT INTO plans (name, duration_days, price, active) VALUES (?, ?, ?, 1)')
    .run(name, durationDays, price);
  return getById(result.lastInsertRowid);
}

function update(id, { name, durationDays, price, active }) {
  db.prepare(
    'UPDATE plans SET name = ?, duration_days = ?, price = ?, active = ? WHERE id = ?'
  ).run(name, durationDays, price, active ? 1 : 0, id);
  return getById(id);
}

function remove(id) {
  // Baja lógica para no romper el historial de suscripciones que la referencian
  db.prepare('UPDATE plans SET active = 0 WHERE id = ?').run(id);
}

module.exports = { getAll, getById, create, update, remove };
