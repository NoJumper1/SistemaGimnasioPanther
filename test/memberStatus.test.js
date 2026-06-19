const test = require('node:test');
const assert = require('node:assert');
const { getMemberStatus } = require('../src/models/memberStatus');

test('sin suscripción -> sin_suscripcion', () => {
  const result = getMemberStatus(null, '2026-06-15');
  assert.strictEqual(result.status, 'sin_suscripcion');
  assert.strictEqual(result.endDate, null);
});

test('vence exactamente hoy -> activo', () => {
  const result = getMemberStatus({ end_date: '2026-06-15' }, '2026-06-15');
  assert.strictEqual(result.status, 'activo');
});

test('venció ayer -> caducado', () => {
  const result = getMemberStatus({ end_date: '2026-06-14' }, '2026-06-15');
  assert.strictEqual(result.status, 'caducado');
});

test('vence en el futuro -> activo', () => {
  const result = getMemberStatus({ end_date: '2026-07-01' }, '2026-06-15');
  assert.strictEqual(result.status, 'activo');
});
