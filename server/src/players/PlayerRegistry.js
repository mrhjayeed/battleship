import pool from '../db/db.js';

export async function assignName(baseName, activeNames = []) {
  let index = 1;
  let finalName = baseName;

  while (activeNames.includes(finalName)) {
    index++;
    finalName = `${baseName} ${index}`;
  }

  // Upsert player record in the database
  const result = await pool.query(
    `INSERT INTO players (name, base_name, name_index, last_seen)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (name)
     DO UPDATE SET last_seen = NOW()
     RETURNING *`,
    [finalName, baseName, index]
  );

  return result.rows[0];
}

export async function getPlayerByName(name) {
  const result = await pool.query('SELECT * FROM players WHERE name = $1', [name]);
  return result.rows[0];
}

export async function getPlayerById(id) {
  const result = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
  return result.rows[0];
}

export async function getOrCreateAIPlayer(difficulty) {
  const finalName = `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`;
  const result = await pool.query(
    `INSERT INTO players (name, base_name, name_index, last_seen)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (name)
     DO UPDATE SET last_seen = NOW()
     RETURNING *`,
    [finalName, 'AI']
  );
  return result.rows[0];
}

export async function updatePlayerStats(playerId, won, shots, hits, durationSeconds) {
  const wins = won ? 1 : 0;
  const losses = won ? 0 : 1;

  await pool.query(
    `UPDATE players SET
      games_played = games_played + 1,
      wins = wins + $1,
      losses = losses + $2,
      total_shots = total_shots + $3,
      total_hits = total_hits + $4,
      current_win_streak = CASE WHEN $1 = 1 THEN current_win_streak + 1 ELSE 0 END,
      longest_win_streak = GREATEST(longest_win_streak,
        CASE WHEN $1 = 1 THEN current_win_streak + 1 ELSE longest_win_streak END),
      total_game_duration_seconds = total_game_duration_seconds + $5,
      last_seen = NOW()
    WHERE id = $6`,
    [wins, losses, shots, hits, durationSeconds, playerId]
  );
}

export async function getLeaderboard() {
  const result = await pool.query('SELECT * FROM leaderboard LIMIT 10');
  return result.rows;
}

export async function getPlayerProfile(name) {
  const result = await pool.query('SELECT * FROM leaderboard WHERE name = $1', [name]);
  return result.rows[0];
}

export async function touchPlayer(id) {
  await pool.query('UPDATE players SET last_seen = NOW() WHERE id = $1', [id]);
}
