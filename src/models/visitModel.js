const db = require('../db/database');

function create({ visitorName, registeredBy }) {
  const result = db
    .prepare('INSERT INTO visits (visitor_name, registered_by) VALUES (?, ?)')
    .run(visitorName, registeredBy || null);
  return db.prepare('SELECT * FROM visits WHERE id = ?').get(result.lastInsertRowid);
}

function getRecent(limit = 20) {
  return db
    .prepare('SELECT * FROM visits ORDER BY id DESC LIMIT ?')
    .all(limit);
}

module.exports = { create, getRecent };
