# Battleship Multiplayer: Tactical Naval Combat

An immersive, high-fidelity tactical naval combat simulator featuring real-time multiplayer PvP engagements, advanced AI battle systems, and a persistent global leaderboard.

---

## Overview

Battleship Multiplayer is a production-grade, real-time strategy web application designed for seamless PvP matchmaking and single-player tactical simulation. Engineered with glassmorphic aesthetics, instant WebSocket communication, and transaction-safe PostgreSQL statistics tracking, it delivers a competitive, responsive gaming experience directly in the browser.

---

## Core Features

### Real-Time Multiplayer PvP
Instant peer-to-peer matchmaking through dedicated room codes or public lobbies. Features synchronized coordinate attack grids, real-time board states, a persistent session chat, and automated 30-second turn timers to ensure steady pacing.

### Tactical Single-Player AI
Battle against advanced simulated computer opponents. Adjustable ranking difficulties (Easy, Medium, and Hard) adapt to player proficiency by employing distinct grid search algorithms. AI practice matches are automatically isolated from the global rankings to preserve leaderboard integrity.

### Global Officer Leaderboard
A persistent ranking registry tracking top active tactical officers. Players are graded by total battles, wins, losses, win rates, and shot accuracy. Stats are updated in real time via PostgreSQL database triggers upon game finalization.

### Dynamic Session & State Recovery
Robust auto-reconnect routines allow players to resume in-progress matches instantly upon tab refreshes or network drops. Suffix-free usernames are assigned on login, dynamically appending index counters only when identical usernames are online simultaneously.

### Immersive Audio Soundscapes
Adaptive background orchestrations and responsive sound effects (missile launches, explosions, water splashes) provide immediate feedback for game actions, complete with a persistent volume toggle.

---

## Architecture & Tech Stack

### Frontend Client
* **Framework**: React 18 (bundled via Vite)
* **Styling**: Tailored Tailwind CSS, glassmorphism, responsive viewport layouts (12x12 grid auto-scaling)
* **Animations**: Framer Motion micro-interactions and status transitions
* **Sockets**: Socket.IO Client for instant event propagation

### Backend Server
* **Runtime**: Node.js & Express
* **Real-time Engine**: Socket.IO Server managing rooms and connection state
* **State Management**: InMemory GameManager controlling turns, placement timers, disconnect timeouts, and AI instances

### Database Layer
* **Engine**: PostgreSQL
* **Schema**: Relational tables for players and game sessions, with automatic view aggregation for leaderboard metrics

---

## Project Structure

```
battleship/
├── client/              # Frontend React Application
│   ├── src/
│   │   ├── components/  # User interfaces, gameboards, placement grids
│   │   ├── context/     # GameState, PlayerRegistry, and Socket providers
│   │   └── hooks/       # Custom hook wrappers (timers, audio contexts)
│   └── public/          # Static assets (favicon, sound elements)
└── server/              # Node.js Express Server
    └── src/
        ├── db/          # PostgreSQL database schema and client pool config
        ├── game/        # AI tactical logic, GameManager, and session state
        ├── players/     # Player profile and leaderboard controllers
        └── socket/      # WebSocket event listeners and room routing
```

---

## Local Development & Configuration

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL database instance

### 1. Database Setup
Create a database named `battleship` and initialize the schema using the provided SQL file:
```bash
psql -U postgres -d battleship -f server/src/db/schema.sql
```

### 2. Server Configuration
Create a `.env` file in the `server/` subdirectory:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/battleship
PORT=3001
CLIENT_URL=http://localhost:5173
```

### 3. Execution

#### Start Backend
```bash
cd server
npm install
npm run dev
```

#### Start Frontend
```bash
cd client
npm install
npm run dev
```
The client application will run at `http://localhost:5173`.

---

## Deployment Playbook

### Backend: Render (Node.js & WebSockets)
1. Register a new **Web Service** on Render and link the repository.
2. Configure the environment:
   * **Root Directory**: `server`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
3. Add the following **Environment Variables**:
   * `DATABASE_URL`: Your production PostgreSQL connection string.
   * `CLIENT_URL`: Your production frontend URL (e.g., `https://battleship.vercel.app`).
   * `PORT`: Set to `3001` or let Render assign one automatically.

### Database: Supabase or Railway (PostgreSQL)
1. Provision a PostgreSQL instance.
2. Run the `server/src/db/schema.sql` script within the database's SQL Editor to set up the tables, views, and indexes.
3. Copy the database connection URI to use in your backend's `DATABASE_URL` configuration.

### Frontend: Vercel (Static Hosting)
1. Create a new project on Vercel and import the repository.
2. Configure the deployment:
   * **Root Directory**: `client`
   * **Framework Preset**: `Vite` (automatically detected)
3. Add the following **Environment Variable**:
   * `VITE_SOCKET_URL`: The URL of your deployed Render backend (e.g., `https://battleship-backend.onrender.com`).
4. Execute the deployment.
