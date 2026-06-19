# Sistema de Gimnasio — Contexto para Claude

## Qué es este proyecto

Sistema web local (Node.js + Express + SQLite) para administrar socios, suscripciones y control de acceso de un gimnasio llamado **Panther Zone Gym**. Corre en `http://localhost:3000`.

## Cómo arrancar

```bash
# Asegurarse de que existe .env (copiar de .env.example si no existe)
node src/server.js
# o en desarrollo:
npm run dev
```

El archivo `.env` necesita `PORT=3000` y `SESSION_SECRET`. No está en el repositorio.

## Datos de demostración

```bash
node src/db/seedDemo.js
```

Inserta 50 socios ficticios, ~80 suscripciones, ~655 check-ins y ~124 visitas distribuidas en los últimos 12 meses. Solo correr una vez (detecta si ya hay datos).

## Estructura clave

```
src/
  server.js          # entrada
  app.js             # Express config
  db/
    database.js      # conexión SQLite (crea data/gimnasio.sqlite)
    schema.sql       # tablas — se ejecuta al iniciar, usar CREATE TABLE IF NOT EXISTS
    seed.js          # usuario admin y planes de ejemplo
    seedDemo.js      # datos ficticios para demostración
  models/
    memberModel.js
    subscriptionModel.js
    checkinModel.js       # incluye countToday()
    visitModel.js         # visitantes del día; incluye countToday()
    statsModel.js         # todas las queries de estadísticas
    memberStatus.js       # lógica activo/caducado/sin_suscripcion
    planModel.js
    adminModel.js
  routes/
    checkin.js       # GET/POST /checkin, POST /checkin/visita
    members.js
    subscriptions.js
    plans.js
    dashboard.js
    auth.js
    stats.js         # GET /stats
  views/             # plantillas EJS
    stats.ejs        # página de estadísticas con Chart.js + exportar PDF
  public/
    js/checkin.js    # búsqueda en vivo de socios
    img/logo.png     # logo del gimnasio (panther rojo/negro)
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
- Dashboard con tarjetas: Vigentes, Vencidos, Total socios, Check-ins hoy, Visitas hoy
- CRUD de socios
- Planes de membresía
- Registro de pagos/suscripciones
- Check-in de socios (valida suscripción activa)
- **Visitas del día**: formulario independiente, no requiere socio registrado, se guarda en tabla `visits`
- **Estadísticas** (`/stats`): KPIs + 6 gráficas con Chart.js + botón exportar PDF
  - Ingresos mensuales (barras)
  - Estado de socios (dona)
  - Check-ins por día — últimos 30 días (línea)
  - Nuevos socios vs visitas por mes (línea doble)
  - Distribución por plan (dona)
  - Método de pago (dona)
  - PDF con encabezado: logo + "Panther Zone Gym" + dirección + línea roja, 2 páginas A4

## Repositorio

GitHub: https://github.com/NoJumper1/SistemaGimnasioPanther
Rama principal: `master`

## Fase 2 pendiente

Integración con lector de huellas dactilares USB. El esquema ya tiene los campos reservados:
- `members.fingerprint_id`
- `checkins.method` admite `'fingerprint'`
