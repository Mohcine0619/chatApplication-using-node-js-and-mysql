const db = require('../config/db');

exports.getHomePage = (req, res) => {
  db.query('SELECT * FROM users', (err, users) => {
    if (err) throw err;
    db.query('SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?', 
      [req.session.user.id, req.session.user.id], (err, messages) => {
      if (err) throw err;
      res.render('chat', { users, user: req.session.user, messages });
    });
  });
};

exports.getMessages = (req, res) => {
  const { userId } = req.params;
  db.query('SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', 
    [req.session.user.id, userId, userId, req.session.user.id], (err, messages) => {
    if (err) throw err;
    res.json(messages);
  });
};

exports.sendMessage = (req, res) => {
  const { receiverId, message } = req.body;
  if (!receiverId || !message) {
    return res.status(400).send('Receiver ID and message are required.');
  }
  db.query('INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)', 
    [req.session.user.id, receiverId, message], (err) => {
    if (err) throw err;
    res.sendStatus(200);
  });
};