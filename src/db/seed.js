const bcrypt = require('bcrypt');
const db = require('./database');

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

function seedDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  db.prepare(
    'INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(DEFAULT_USERNAME, passwordHash, 'admin');

  console.log('================================================');
  console.log(' Admin por defecto creado:');
  console.log(`   usuario:    ${DEFAULT_USERNAME}`);
  console.log(`   contraseña: ${DEFAULT_PASSWORD}`);
  console.log(' Cámbiala después de iniciar sesión por primera vez.');
  console.log('================================================');
}

function seedDefaultPlans() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM plans').get().n;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO plans (name, duration_days, price, active) VALUES (?, ?, ?, 1)'
  );
  insert.run('Mensual', 30, 0);
  insert.run('Trimestral', 90, 0);
  insert.run('Anual', 365, 0);
}

function seed() {
  seedDefaultAdmin();
  seedDefaultPlans();
}

module.exports = { seed, DEFAULT_USERNAME, DEFAULT_PASSWORD };
