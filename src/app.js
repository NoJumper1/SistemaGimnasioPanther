const path = require('path');
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const membersRoutes = require('./routes/members');
const subscriptionsRoutes = require('./routes/subscriptions');
const plansRoutes = require('./routes/plans');
const checkinRoutes = require('./routes/checkin');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-cambiame',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 }, // 12 horas
  })
);

// Rutas públicas
app.use('/', authRoutes);

// A partir de aquí, todo requiere sesión iniciada
app.use(requireAuth);

app.use('/', dashboardRoutes);
app.use('/members', membersRoutes);
app.use('/members/:memberId/subscriptions', subscriptionsRoutes);
app.use('/plans', plansRoutes);
app.use('/checkin', checkinRoutes);

module.exports = app;
