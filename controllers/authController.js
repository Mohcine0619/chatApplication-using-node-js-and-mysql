const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.register = (req, res) => { 
  const { username, password } = req.body; // recupere les variables de requete body
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).send('Internal server error');
    if (results.length > 0) {
      return res.status(400).send('Username already exists');
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) return res.status(500).send('Internal server error');
      res.status(200).send('Registration successful');
    });
  });
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.status(500).send('Internal server error');
    if (results.length === 0 || !bcrypt.compareSync(password, results[0].password)) {
      return res.status(400).send('Invalid username or password');
    }
    req.session.user = results[0];
    res.status(200).send('Login successful');
  });
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};