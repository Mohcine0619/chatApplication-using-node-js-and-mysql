const express = require('express');
const http = require('http');//pour creer des serveur http
const socketIo = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');//Importer le module body-parser pour analyser les corps de requêtes HTTP.
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes'); //Importer les routes d'authentification.
const chatRoutes = require('./routes/chatRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { engine } = require('express-handlebars');//Importer le moteur de templates Handlebars.
const RedisStore = require('connect-redis').default;//Importer le module connect-redis pour stocker les sessions dans Redis.
const redis = require('redis');//Importer le module redis pour interagir avec Redis.

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let onlineUsers = {}; // Store online users

// Configurer Handlebars comme moteur de templates avec un helper eq pour vérifier l'égalité.
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: {
    eq: function (a, b) {
      return a === b;
    }
  }
}));
app.set('view engine', 'handlebars');

// Utiliser body-parser pour analyser les corps de requêtes JSON et URL-encodées.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const redisClient = redis.createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().catch(console.error);
//Créer un client Redis et gérer les erreurs de connexion.
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret',
  resave: false,
  saveUninitialized: true
});
//Configurer le middleware de session pour utiliser Redis comme magasin de sessions.
app.use(sessionMiddleware);

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
//Utiliser le middleware de session avec Socket.IO pour accéder aux sessions dans les sockets.

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
});//Définir une route GET pour /chat qui rend la vue chat avec les utilisateurs et les messages pour l'utilisateur actuel.

io.on('connection', (socket) => {//gerer la connextion
  console.log('New client connected');

  socket.on('storeSocketId', (userId) => {
    socket.request.session.socketId = socket.id;
    socket.request.session.save();
    onlineUsers[userId] = { socketId: socket.id, username: socket.request.session.user.username };
    io.emit('updateOnlineUsers', onlineUsers);
    console.log('Connected user ID:', userId); // Log the connected user ID
  });//Gérer l'événement storeSocketId pour stocker l'ID de socket de l'utilisateur et mettre à jour la liste des utilisateurs en ligne.

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
//demarrer le server sr le port 3000