-- Seed inicial del sistema Panther Zone Gym
-- Ejecutar: wrangler d1 execute gimnasio --file=src/db/seed.sql
-- (Para local: agregar --local)

-- Admin por defecto: usuario=admin, contraseña=admin123
-- CAMBIA LA CONTRASEÑA después del primer inicio de sesión
INSERT OR IGNORE INTO admins (username, password_hash, role)
VALUES ('admin', '$2b$10$cpzOLONQpA8WjfQv3updKuNoVwS0ZHW1t/njLpati76f.nVc.ZnqO', 'admin');

-- Planes por defecto
INSERT OR IGNORE INTO plans (name, duration_days, price, active)
VALUES ('Mensual', 30, 0, 1);

INSERT OR IGNORE INTO plans (name, duration_days, price, active)
VALUES ('Trimestral', 90, 0, 1);

INSERT OR IGNORE INTO plans (name, duration_days, price, active)
VALUES ('Anual', 365, 0, 1);
