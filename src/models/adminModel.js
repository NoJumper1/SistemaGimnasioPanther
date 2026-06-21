export async function findByUsername(db, username) {
  return db.prepare('SELECT * FROM admins WHERE username = ?').bind(username).first();
}

export async function findById(db, id) {
  return db.prepare('SELECT * FROM admins WHERE id = ?').bind(id).first();
}

export async function updatePassword(db, id, passwordHash) {
  await db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run();
}

export async function create(db, { username, passwordHash, role = 'admin' }) {
  const { meta } = await db
    .prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
    .bind(username, passwordHash, role)
    .run();
  return findById(db, meta.last_row_id);
}
