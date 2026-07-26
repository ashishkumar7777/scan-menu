const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Enable CORS for React Frontend
app.use(cors());
app.use(express.json());

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Allows requests from React Frontend
    methods: ["GET", "POST"]
  }
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);
  socket.on('disconnect', () => console.log('Socket Disconnected'));
});

// Register Routes
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));