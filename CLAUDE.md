# Sistema de Gimnasio — Contexto para Claude

## Qué es este proyecto

Sistema web local (Node.js + Express + SQLite) para administrar socios, suscripciones y control de acceso de un gimnasio. Corre en `http://localhost:3000`.

## Cómo arrancar

```bash
# Asegurarse de que existe .env (copiar de .env.example si no existe)
node src/server.js
# o en desarrollo:
npm run dev
```

El archivo `.env` necesita `PORT=3000` y `SESSION_SECRET`. No está en el repositorio.

## Estructura clave

```
src/
  server.js          # entrada
  app.js             # Express config
  db/
    database.js      # conexión SQLite (crea data/gimnasio.sqlite)
    schema.sql       # tablas — se ejecuta al iniciar, usar CREATE TABLE IF NOT EXISTS
    seed.js          # usuario admin y planes de ejemplo
  models/
    memberModel.js
    subscriptionModel.js
    checkinModel.js
    visitModel.js    # visitantes del día (sin ser socios)
    memberStatus.js  # lógica activo/caducado/sin_suscripcion
    planModel.js
    adminModel.js
  routes/
    checkin.js       # GET/POST /checkin, POST /checkin/visita
    members.js
    subscriptions.js
    plans.js
    dashboard.js
    auth.js
  views/             # plantillas EJS
  public/
    js/checkin.js    # búsqueda en vivo de socios
```

## Base de datos

SQLite en `data/gimnasio.sqlite` (no versionado). Tablas principales:

- `admins` — usuarios del sistema
- `members` — socios (baja lógica con campo `active`)
- `plans` — planes de membresía configurables
- `subscriptions` — pagos/suscripciones por socio
- `checkins` — registro de entradas de socios (result: `allowed`|`denied`)
- `visits` — visitas del día de personas externas (solo nombre, sin member_id)

Para agregar tablas: editar `schema.sql` usando `CREATE TABLE IF NOT EXISTS`.

## Funcionalidades implementadas

- Login admin/coach
- Dashboard con estadísticas (activos, caducados, próximos a vencer)
- CRUD de socios
- Planes de membresía
- Registro de pagos/suscripciones
- Check-in de socios (valida suscripción activa)
- **Visitas del día**: formulario independiente, no requiere socio registrado, se guarda en tabla `visits`

## Repositorio

GitHub: https://github.com/NoJumper1/SistemaGimnasioPanther  
Rama principal: `master`

## Fase 2 pendiente

Integración con lector de huellas dactilares USB. El esquema ya tiene los campos reservados:
- `members.fingerprint_id`
- `checkins.method` admite `'fingerprint'`
