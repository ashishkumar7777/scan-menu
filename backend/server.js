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

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

app.set('socketio', io);
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Socket Connected: ${socket.id}`);
  socket.on('disconnect', () => console.log('Socket Disconnected'));
});

// Routes
const orderRoutes = require('./routes/orderRoutes');
const itemRoutes = require('./routes/itemRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportRoutes = require('./routes/reports');
const tableRoutes = require('./routes/tableRoutes');

app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tables', tableRoutes);

// Mount Order routes to all possible endpoints used by QR / POS
app.use('/api/orders', orderRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/payment', orderRoutes);
app.use('/api/razorpay', orderRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));