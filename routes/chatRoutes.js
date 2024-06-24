// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/', chatController.getHomePage);
router.get('/messages/:userId', chatController.getMessages);
router.post('/messages', chatController.sendMessage);

module.exports = router;