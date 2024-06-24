const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const exphbs = require('express-handlebars');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up Handlebars view engine
app.engine('handlebars', exphbs.engine());
app.set('view engine', 'handlebars');

// Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

app.use('/auth', authRoutes);
app.use('/chat', authMiddleware, chatRoutes);

// Serve static files from the public directory
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('sendMessage', (data) => {
    io.emit('receiveMessage', data);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});