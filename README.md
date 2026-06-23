# 🚢 Battleship Multiplayer | Tactical Naval Combat

A production-grade, real-time multiplayer Battleship game web application. Designed with modern gaming aesthetics, seamless real-time WebSocket gameplay, vs-AI tactical single-player simulations, and a global officer leaderboard powered by PostgreSQL.

---

## 🌟 Key Features

- **Real-Time Multiplayer**: Instant PvP lobby matchmaking, live coordinate attack grids, automatic turn countdown clocks (30s limits), and a secure chat communication link.
- **Single Player vs AI**: Simulated single-player match against tactical AI players with adjustable rank difficulties (Easy, Medium, Hard).
- **Global Rankings (Leaderboard)**: Live statistics leaderboard ranking top active tactical officers by PvP wins, accuracy, and win rates. AI practice matches are automatically excluded from rankings.
- **Dynamic Session Handling**: Suffix-free usernames on login that only append numbers (e.g. `Captain Ahab 2`) if the name is actively online in the system at the exact same moment.
- **Audio Soundscapes**: Adaptive naval battle music and missile impact sound effects with persistent volume toggles.
- **State Recovery**: Robust reconnect routines allowing players to resume in-progress matches upon tab refreshes or network hiccups.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Socket.IO Client.
* **Backend**: Node.js, Express, Socket.IO Server.
* **Database**: PostgreSQL (Raw client pool).
* **Styling & Assets**: Premium dark navy glassmorphic layout, SVG iconography.

---

## 📂 Project Structure

```
battleship/
├── client/          # Frontend React Application
│   ├── src/
│   │   ├── components/  # GamePages, Lobby, and UI buttons
│   │   ├── context/     # GameState, PlayerRegistry, and Socket providers
│   │   └── hooks/       # Custom hooks (timer, sounds)
│   └── public/          # Favicon and audio assets
└── server/          # Node.js + Express Backend
    └── src/
        ├── db/          # PostgreSQL schema and initialization
        ├── game/        # AI logic and GameSession state engines
        ├── players/     # Player stats and leaderboard registry
        └── socket/      # WebSocket event controllers
```

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally)

### 1. Database Initialization
Create a database named `battleship` and run the script in `server/src/db/schema.sql` to initialize the tables:
```bash
psql -U postgres -d battleship -f server/src/db/schema.sql
```

### 2. Configure Environment Variables
Create a `.env` file in the `server/` directory:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/battleship
PORT=3001
CLIENT_URL=http://localhost:5174
```

### 3. Install & Start Server
```bash
cd server
npm install
npm run dev
```

### 4. Install & Start Client
```bash
cd ../client
npm install
npm run dev
```
Open `http://localhost:5174/` in your browser.

---

## 🚀 GitHub Push Guide

To push your repository to GitHub, open your terminal in the project root directory and execute:

```bash
# 1. Initialize Git Repository
git init

# 2. Stage All Project Files
git add .

# 3. Create First Commit
git commit -m "feat: battleship tactical release with timer, active player counters, and AI exclusions"

# 4. Link Your GitHub Repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 5. Rename Main Branch
git branch -M main

# 6. Push Files
git push -u origin main
```

---

## ☁️ Deployment Instructions

### Option A: Railway (Recommended — Best PostgreSQL support)
1. **Prepare PostgreSQL**: Railway provides a PostgreSQL database out of the box. Create a Railway project and add a "PostgreSQL" service.
2. **Deploy Backend**: 
   - Add a new service from your GitHub repository pointing to the `server/` subdirectory.
   - Set environment variables:
     - `DATABASE_URL`: Automatically populated by Railway link.
     - `PORT`: Set to `8080`.
     - `CLIENT_URL`: Your frontend URL (e.g. `https://your-battleship.up.railway.app`).
3. **Deploy Frontend**:
   - Create a service pointing to the `client/` subdirectory.
   - Add a build environment variable: `VITE_SOCKET_URL` set to your backend service URL.
   - Deploy as a static app.

### Option B: Render + Supabase (Free Tier Alternative)
1. **Supabase Setup**:
   - Create a project on Supabase and copy the **URI Connection String** under Database Settings.
2. **Deploy Server on Render**:
   - Create a new **Web Service** on Render connected to your repository.
   - Specify `server` as the root directory.
   - Configure **Environment Variables**:
     - `DATABASE_URL`: Your Supabase connection string.
     - `CLIENT_URL`: Your frontend static URL.
3. **Deploy Client on Render**:
   - Create a **Static Site** pointing to the `client` directory.
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add environment variable `VITE_SOCKET_URL` pointing to your Render backend web service.
