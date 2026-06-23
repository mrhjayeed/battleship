-- Players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,         -- final assigned name e.g. "John 2"
  base_name VARCHAR(50) NOT NULL,           -- original input e.g. "John"
  name_index INTEGER DEFAULT 1,            -- 1 = "John", 2 = "John 2", etc.
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_shots INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  total_game_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name VARCHAR(100),
  host_player_id INTEGER REFERENCES players(id),
  guest_player_id INTEGER REFERENCES players(id),
  grid_size INTEGER DEFAULT 10,            -- 8, 10, or 12
  ship_config JSONB NOT NULL,              -- { carrier: 1, battleship: 1, ... }
  status VARCHAR(20) DEFAULT 'waiting',   -- waiting | placing | active | finished
  winner_player_id INTEGER REFERENCES players(id),
  host_board JSONB,                        -- ship placements (hidden from guest)
  guest_board JSONB,                       -- ship placements (hidden from host)
  host_shots JSONB DEFAULT '[]',           -- array of { row, col, result }
  guest_shots JSONB DEFAULT '[]',
  current_turn VARCHAR(10) DEFAULT 'host', -- 'host' | 'guest'
  move_log JSONB DEFAULT '[]',             -- full replay data
  chat_log JSONB DEFAULT '[]',
  is_ai_game BOOLEAN DEFAULT FALSE,
  ai_difficulty VARCHAR(10) DEFAULT NULL,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard WITH (security_invoker = true) AS
SELECT
  id,
  name,
  games_played,
  wins,
  losses,
  CASE WHEN games_played > 0
    THEN ROUND((wins::DECIMAL / games_played) * 100, 1)
    ELSE 0
  END AS win_rate,
  CASE WHEN total_shots > 0
    THEN ROUND((total_hits::DECIMAL / total_shots) * 100, 1)
    ELSE 0
  END AS accuracy,
  longest_win_streak,
  CASE WHEN wins > 0
    THEN ROUND(total_game_duration_seconds::DECIMAL / wins / 60, 1)
    ELSE NULL
  END AS avg_win_duration_minutes
FROM players
WHERE games_played > 0
ORDER BY wins DESC, win_rate DESC;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_players_base_name ON players(base_name);
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen);
