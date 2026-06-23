import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/db.js';
import { registerSocketHandlers } from './socket/socketHandlers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
let CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
// Strip trailing slash if present to prevent CORS mismatch issues
if (CLIENT_URL.endsWith('/')) {
  CLIENT_URL = CLIENT_URL.slice(0, -1);
}

app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Register socket controllers
registerSocketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Battleship Multiplayer Server is running!    `);
  console.log(` Port: ${PORT}                                 `);
  console.log(` Client URL: ${CLIENT_URL}                      `);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('PostgreSQL pool closed');
      process.exit(0);
    });
  });
});
