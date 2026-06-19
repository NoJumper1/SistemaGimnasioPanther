const db = require('../db/database');

function findByUsername(username) {
  return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

function findById(id) {
  return db.prepare('SELECT * FROM admins WHERE id = ?').get(id);
}

function updatePassword(id, passwordHash) {
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

function create({ username, passwordHash, role = 'admin' }) {
  const result = db
    .prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, passwordHash, role);
  return findById(result.lastInsertRowid);
}

module.exports = { findByUsername, findById, updatePassword, create };
