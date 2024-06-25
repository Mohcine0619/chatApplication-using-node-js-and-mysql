const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { engine } = require('express-handlebars');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up Handlebars view engine with the 'eq' helper
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: {
    eq: function (a, b) {
      return a === b;
    }
  }
}));
app.set('view engine', 'handlebars');

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

app.use('/auth', authRoutes);
app.use('/chat', authMiddleware, chatRoutes);

// Serve static files from the public directory
app.use(express.static('public'));

// Example server-side code (Node.js with Express)
app.get('/chat', (req, res) => {
  res.render('chat', {
    user: req.user, // Assuming req.user contains the logged-in user's data
    users: getAllUsers(), // Function to get all users
    messages: getMessagesForUser(req.user.id) // Function to get messages for the logged-in user
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('sendMessage', (data) => {
    console.log('Message received:', data); // Debugging line
    // Broadcast the message to all connected clients
    io.emit('receiveMessage', {
      sender: data.sender,
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message
    });
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});