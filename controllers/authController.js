const bcrypt = require('bcrypt');
const path = require('path');
const db = require('../config/db');

exports.register = (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) throw err;
    res.redirect('/auth/login');
  });
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) throw err;
    if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
      req.session.user = results[0];
      console.log('User logged in:', req.session.user); // Debugging line
      res.redirect('/chat');
    } else {
      res.redirect('/auth/login');
    }
  });
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};