export async function getAll(db, { includeInactive = false } = {}) {
  const query = includeInactive
    ? 'SELECT * FROM plans ORDER BY duration_days ASC'
    : 'SELECT * FROM plans WHERE active = 1 ORDER BY duration_days ASC';
  const { results } = await db.prepare(query).all();
  return results;
}

export async function getById(db, id) {
  return db.prepare('SELECT * FROM plans WHERE id = ?').bind(id).first();
}

export async function create(db, { name, durationDays, price }) {
  const { meta } = await db
    .prepare('INSERT INTO plans (name, duration_days, price, active) VALUES (?, ?, ?, 1)')
    .bind(name, durationDays, price)
    .run();
  return getById(db, meta.last_row_id);
}

export async function update(db, id, { name, durationDays, price, active }) {
  await db
    .prepare('UPDATE plans SET name = ?, duration_days = ?, price = ?, active = ? WHERE id = ?')
    .bind(name, durationDays, price, active ? 1 : 0, id)
    .run();
  return getById(db, id);
}

export async function remove(db, id) {
  // Baja lógica para no romper el historial de suscripciones
  await db.prepare('UPDATE plans SET active = 0 WHERE id = ?').bind(id).run();
}
