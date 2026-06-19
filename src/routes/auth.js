const express = require('express');
const bcrypt = require('bcrypt');
const adminModel = require('../models/adminModel');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.admin) return res.redirect('/');
  res.render('login', { error: null, layout: false });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = adminModel.findByUsername(username || '');

  const passwordOk = admin ? bcrypt.compareSync(password || '', admin.password_hash) : false;
  if (!admin || !passwordOk) {
    return res.status(401).render('login', { error: 'Usuario o contraseña incorrectos.', layout: false });
  }

  req.session.admin = { id: admin.id, username: admin.username, role: admin.role };
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
