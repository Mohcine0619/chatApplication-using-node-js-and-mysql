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
const RedisStore = require('connect-redis').default; // Updated way to require connect-redis
const redis = require('redis');

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

const redisClient = redis.createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().catch(console.error);

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }), // Updated to use RedisStore class
  secret: 'secret',
  resave: false,
  saveUninitialized: true
});

app.use(sessionMiddleware);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

app.use('/auth', authRoutes);
app.use('/chat', authMiddleware, chatRoutes);

// Serve static files from the public directory
app.use(express.static('public'));

app.get('/chat', (req, res) => {
  res.render('chat', {
    user: req.session.user, // Ensure req.session.user contains the logged-in user's data
    users: getAllUsers(), // Function to get all users
    messages: getMessagesForUser(req.session.user.id) // Function to get messages for the logged-in user
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');

  // Store the socket ID in the session
  socket.on('storeSocketId', (userId) => {
    socket.request.session.socketId = socket.id;
    socket.request.session.save();
  });

  // Retrieve the socket ID from the session
  const socketId = socket.request.session.socketId;
  if (socketId) {
    socket.join(socketId);
  }

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