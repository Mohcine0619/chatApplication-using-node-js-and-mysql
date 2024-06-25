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
const RedisStore = require('connect-redis').default;
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let onlineUsers = {}; // Store online users

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
  store: new RedisStore({ client: redisClient }),
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
    user: req.session.user,
    users: getAllUsers(),
    messages: getMessagesForUser(req.session.user.id)
  });
});

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('storeSocketId', (userId) => {
    socket.request.session.socketId = socket.id;
    socket.request.session.save();
    onlineUsers[userId] = { socketId: socket.id, username: socket.request.session.user.username };
    io.emit('updateOnlineUsers', onlineUsers);
    console.log('Connected user ID:', userId); // Log the connected user ID
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(onlineUsers).find(key => onlineUsers[key].socketId === socket.id);
    if (userId) {
      delete onlineUsers[userId];
      io.emit('updateOnlineUsers', onlineUsers);
      console.log('Online user IDs:', Object.keys(onlineUsers)); // Log online user IDs
    }
    console.log('Client disconnected');
  });

  socket.on('sendMessage', (data) => {
    console.log('Message received:', data);
    io.emit('receiveMessage', {
      sender: data.sender,
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message
    });
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});