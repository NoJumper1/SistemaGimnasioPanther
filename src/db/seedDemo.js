/**
 * Datos ficticios de demostración para visualizar estadísticas.
 * Ejecutar: node src/db/seedDemo.js
 */
const db = require('./database');
const dayjs = require('dayjs');

const NOMBRES = [
  'Carlos Mendoza','Luis Torres','Ana García','María López','José Hernández',
  'Pedro Ramírez','Laura Sánchez','Miguel Flores','Sofía Martínez','Diego Romero',
  'Valentina Cruz','Andrés Morales','Fernanda Jiménez','Ricardo Vargas','Paola Reyes',
  'Alejandro Castro','Daniela Ortiz','Eduardo Núñez','Karla Gutiérrez','Javier Ruiz',
  'Natalia Díaz','Óscar Mendez','Gabriela Aguilar','Héctor Vega','Mónica Peña',
  'Roberto Silva','Claudia Ramos','Francisco Herrera','Verónica Moreno','Iván Delgado',
  'Adriana Ríos','Samuel León','Mariana Fuentes','Arturo Medina','Leticia Campos',
  'Ernesto Rojas','Silvia Ávila','Manuel Serrano','Patricia Guerrero','Julio Navarro',
  'Brenda Castillo','Enrique Sandoval','Lorena Domínguez','Raúl Blanco','Xóchitl Acosta',
  'Gerardo Espinoza','Lucía Ibarra','Víctor Carrillo','Gloria Padilla','Armando Lara',
];

const VISITAS_NOMBRES = [
  'Juan Pérez','Marco García','Ana Ruiz','Luis Blanco','Teresa Soto',
  'Pablo Mora','Diana Cruz','Felipe Ríos','Susana Vela','Rodrigo Montes',
  'Camila Torres','Martín Reyes','Elena Vargas','Hugo Cisneros','Nadia Ponce',
];

const METODOS = ['Efectivo', 'Efectivo', 'Efectivo', 'Transferencia', 'Transferencia'];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateAgo(days) {
  return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
}

function datetimeAgo(days, hour) {
  return dayjs().subtract(days, 'day').hour(hour).minute(rnd(0,59)).second(0).format('YYYY-MM-DD HH:mm:ss');
}

function seedDemo() {
  const adminId = db.prepare('SELECT id FROM admins LIMIT 1').get()?.id || 1;

  // Obtener o crear planes
  let plans = db.prepare('SELECT * FROM plans').all();
  if (plans.length === 0) {
    db.prepare('INSERT INTO plans (name, duration_days, price) VALUES (?,?,?)').run('Mensual', 30, 350);
    db.prepare('INSERT INTO plans (name, duration_days, price) VALUES (?,?,?)').run('Trimestral', 90, 900);
    db.prepare('INSERT INTO plans (name, duration_days, price) VALUES (?,?,?)').run('Anual', 365, 3000);
    plans = db.prepare('SELECT * FROM plans').all();
  } else {
    // Actualizar precios si son 0
    db.prepare("UPDATE plans SET price = 350 WHERE name = 'Mensual' AND price = 0").run();
    db.prepare("UPDATE plans SET price = 900 WHERE name = 'Trimestral' AND price = 0").run();
    db.prepare("UPDATE plans SET price = 3000 WHERE name = 'Anual' AND price = 0").run();
    plans = db.prepare('SELECT * FROM plans').all();
  }

  const planMensual    = plans.find(p => p.name === 'Mensual')    || plans[0];
  const planTrimestral = plans.find(p => p.name === 'Trimestral') || plans[0];
  const planAnual      = plans.find(p => p.name === 'Anual')      || plans[0];

  const insertMember = db.prepare(
    'INSERT INTO members (full_name, phone, join_date, active) VALUES (?, ?, ?, 1)'
  );
  const insertSub = db.prepare(
    `INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, amount, payment_method, payment_date, registered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertCheckin = db.prepare(
    `INSERT INTO checkins (member_id, timestamp, result, reason, method, registered_by)
     VALUES (?, ?, ?, ?, 'manual', ?)`
  );
  const insertVisit = db.prepare(
    `INSERT INTO visits (visitor_name, timestamp, registered_by) VALUES (?, ?, ?)`
  );

  const existingCount = db.prepare('SELECT COUNT(*) as n FROM members').get().n;
  if (existingCount >= 40) {
    console.log('Ya existen suficientes datos de demostración. Abortando.');
    return;
  }

  console.log('Insertando datos ficticios...');

  // ── SOCIOS ──────────────────────────────────────────────────────────────
  // 50 socios con join_date distribuidos en los últimos 12 meses
  const memberIds = [];
  for (let i = 0; i < NOMBRES.length; i++) {
    const joinDaysAgo = rnd(5, 365);
    const joinDate = dateAgo(joinDaysAgo);
    const phone = `55${rnd(10000000, 99999999)}`;
    const result = insertMember.run(NOMBRES[i], phone, joinDate);
    memberIds.push({ id: result.lastInsertRowid, joinDate, joinDaysAgo });
  }

  // ── SUSCRIPCIONES ────────────────────────────────────────────────────────
  // Cada socio tiene 1-3 suscripciones históricas, distribuidas en los últimos 12 meses
  for (const { id, joinDate, joinDaysAgo } of memberIds) {
    const numSubs = rnd(1, 3);
    let cursor = joinDaysAgo; // empezar desde cuando se unió

    for (let s = 0; s < numSubs; s++) {
      const plan = s === 0
        ? pick([planMensual, planMensual, planTrimestral, planAnual])
        : pick([planMensual, planMensual, planTrimestral]);

      const startDate = dateAgo(cursor);
      const endDate   = dayjs(startDate).add(plan.duration_days, 'day').format('YYYY-MM-DD');
      const payDate   = startDate;
      const metodo    = pick(METODOS);

      // Pequeña variación en el precio (±10%)
      const precio = Math.round(plan.price * (0.9 + Math.random() * 0.2));

      insertSub.run(id, plan.id, startDate, endDate, precio, metodo, payDate, adminId);

      // Siguiente suscripción empieza cuando termina la anterior
      cursor = Math.max(0, cursor - plan.duration_days - rnd(0, 15));
      if (cursor <= 0) break;
    }
  }

  // ── CHECK-INS ────────────────────────────────────────────────────────────
  // Simular actividad diaria los últimos 60 días (5-20 check-ins por día)
  const activeMembers = db.prepare('SELECT id FROM members WHERE active = 1').all();
  for (let day = 0; day < 60; day++) {
    const checkinsHoy = rnd(5, 20);
    // Menos en fin de semana
    const fecha = dayjs().subtract(day, 'day');
    const dow = fecha.day(); // 0=dom, 6=sab
    const cantidad = (dow === 0 || dow === 6) ? rnd(2, 8) : checkinsHoy;

    const shuffle = [...activeMembers].sort(() => Math.random() - 0.5).slice(0, cantidad);
    for (const m of shuffle) {
      const hora = pick([6,7,7,8,8,9,10,16,17,17,18,18,19,20]);
      const ts = datetimeAgo(day, hora);
      insertCheckin.run(m.id, ts, 'allowed', null, adminId);
    }
  }

  // Algunos check-ins denegados
  for (let i = 0; i < 15; i++) {
    const m = pick(activeMembers);
    const day = rnd(0, 30);
    const hora = pick([8,9,10,17,18,19]);
    const ts = datetimeAgo(day, hora);
    insertCheckin.run(m.id, ts, 'denied', 'Suscripción caducada.', adminId);
  }

  // ── VISITAS DEL DÍA ──────────────────────────────────────────────────────
  // Distribuidas en los últimos 60 días (1-5 por día)
  for (let day = 0; day < 60; day++) {
    const cantidad = rnd(0, 4);
    for (let v = 0; v < cantidad; v++) {
      const nombre = pick(VISITAS_NOMBRES);
      const hora = pick([9,10,11,16,17,18,19]);
      const ts = datetimeAgo(day, hora);
      insertVisit.run(nombre, ts, adminId);
    }
  }

  const totalSubs    = db.prepare('SELECT COUNT(*) as n FROM subscriptions').get().n;
  const totalCheckins = db.prepare('SELECT COUNT(*) as n FROM checkins').get().n;
  const totalVisits  = db.prepare('SELECT COUNT(*) as n FROM visits').get().n;

  console.log(`✓ ${memberIds.length} socios creados`);
  console.log(`✓ ${totalSubs} suscripciones insertadas`);
  console.log(`✓ ${totalCheckins} check-ins insertados`);
  console.log(`✓ ${totalVisits} visitas insertadas`);
  console.log('Listo. Abre http://localhost:3000/stats para ver las estadísticas.');
}

seedDemo();
