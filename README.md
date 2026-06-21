# Sistema de Registro y Control de Acceso para Gimnasio

Sistema web local para administrar socios, suscripciones (pagos manuales) y control de acceso (check-in) de un gimnasio.

## Funcionalidad

- **Login** de administrador/coach.
- **Dashboard**: socios activos, caducados, sin suscripción, y próximos a vencer (7 días).
- **CRUD de socios**: alta, edición, baja lógica, historial de pagos.
- **Planes de membresía** configurables (nombre, duración en días, precio).
- **Registro de pagos**: por plan (calcula la fecha de vencimiento automáticamente) o personalizado.
- **Check-in**: búsqueda en vivo del socio y respuesta inmediata de **PUEDE ENTRAR** / **ACCESO DENEGADO** con motivo. Cada intento queda registrado para auditoría.

## Requisitos

- Node.js 18 o superior.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.example` a `.env` y cambia `SESSION_SECRET` por un valor aleatorio:

```bash
cp .env.example .env
```

## Ejecutar

```bash
npm run dev      # desarrollo, con recarga automática
npm start        # producción
```

## En caso de que el puerto este ocupado y marque error
```
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue

```

La app queda disponible en `http://localhost:3000`.

Al iniciar por primera vez se crea automáticamente:

- Un usuario administrador: **usuario `admin`, contraseña `admin123`** (cámbiala apenas inicies sesión).
- Tres planes de ejemplo: Mensual (30 días), Trimestral (90 días), Anual (365 días) — con precio en $0, edítalos en la sección "Planes" con tus precios reales.

La base de datos se guarda en `data/gimnasio.sqlite` (se crea sola, no se sube al repositorio).

## Pruebas

```bash
npm test
```

Corre las pruebas unitarias de la lógica de estado de suscripción (`activo` / `caducado` / `sin_suscripcion`).

## Fase 2 (pendiente, no incluida en esta versión)

El gimnasio cuenta con un lector de huellas dactilares USB para el control de acceso. Su integración queda pendiente hasta identificar marca/modelo y SDK disponible. El esquema de datos ya reserva los campos necesarios:

- `members.fingerprint_id`: para vincular la huella enrolada de cada socio.
- `checkins.method`: ya admite el valor `'fingerprint'` además de `'manual'`.

Cuando se tenga el hardware, el plan es construir un pequeño servicio puente local que hable con el SDK del lector y reutilice la misma lógica de validación de acceso (`src/models/memberStatus.js`).
