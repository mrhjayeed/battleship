import pool from '../db/db.js';
import { getShipCells } from './ShipLogic.js';

export class GameSession {
  constructor(row) {
    this.id = row.id;
    this.sessionName = row.session_name;
    this.hostPlayerId = row.host_player_id;
    this.guestPlayerId = row.guest_player_id;
    this.gridSize = row.grid_size;
    this.shipConfig = row.ship_config;
    this.status = row.status;
    this.winnerPlayerId = row.winner_player_id;
    this.hostBoard = row.host_board || null; // Array of placed ships
    this.guestBoard = row.guest_board || null;
    this.hostShots = row.host_shots || []; // Array of shots { row, col, result, sunk, shipType }
    this.guestShots = row.guest_shots || [];
    this.currentTurn = row.current_turn; // 'host' | 'guest'
    this.moveLog = row.move_log || [];
    this.chatLog = row.chat_log || [];
    this.isAiGame = row.is_ai_game || false;
    this.aiDifficulty = row.ai_difficulty || null;
    this.startedAt = row.started_at;
    this.finishedAt = row.finished_at;
    this.createdAt = row.created_at;
  }

  static async fetch(id) {
    const result = await pool.query(
      `SELECT gs.*,
              h.name AS host_name,
              g.name AS guest_name
       FROM game_sessions gs
       LEFT JOIN players h ON h.id = gs.host_player_id
       LEFT JOIN players g ON g.id = gs.guest_player_id
       WHERE gs.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    
    const session = new GameSession(result.rows[0]);
    session.hostName = result.rows[0].host_name;
    session.guestName = result.rows[0].guest_name;
    return session;
  }

  static async create(data) {
    const result = await pool.query(
      `INSERT INTO game_sessions (
        session_name, host_player_id, guest_player_id, grid_size, ship_config, status, is_ai_game, ai_difficulty
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [
        data.sessionName,
        data.hostPlayerId,
        data.guestPlayerId || null,
        data.gridSize || 10,
        JSON.stringify(data.shipConfig),
        data.status || 'waiting',
        data.isAiGame || false,
        data.aiDifficulty || null
      ]
    );

    const session = new GameSession(result.rows[0]);
    // Retrieve host name
    const hostRes = await pool.query('SELECT name FROM players WHERE id = $1', [data.hostPlayerId]);
    session.hostName = hostRes.rows[0]?.name || 'Host';

    if (data.guestPlayerId) {
      const guestRes = await pool.query('SELECT name FROM players WHERE id = $1', [data.guestPlayerId]);
      session.guestName = guestRes.rows[0]?.name || 'Guest';
    }

    return session;
  }

  async save() {
    await pool.query(
      `UPDATE game_sessions SET
        status = $1,
        winner_player_id = $2,
        host_board = $3::jsonb,
        guest_board = $4::jsonb,
        host_shots = $5::jsonb,
        guest_shots = $6::jsonb,
        current_turn = $7,
        move_log = $8::jsonb,
        chat_log = $9::jsonb,
        started_at = $10,
        finished_at = $11,
        guest_player_id = $12
       WHERE id = $13`,
      [
        this.status,
        this.winnerPlayerId,
        this.hostBoard ? JSON.stringify(this.hostBoard) : null,
        this.guestBoard ? JSON.stringify(this.guestBoard) : null,
        JSON.stringify(this.hostShots),
        JSON.stringify(this.guestShots),
        this.currentTurn,
        JSON.stringify(this.moveLog),
        JSON.stringify(this.chatLog),
        this.startedAt,
        this.finishedAt,
        this.guestPlayerId,
        this.id
      ]
    );
  }

  placeShips(role, ships) {
    if (role === 'host') {
      this.hostBoard = ships;
    } else {
      this.guestBoard = ships;
    }

    // Check if both ready
    if (this.hostBoard && this.guestBoard) {
      this.status = 'active';
      this.startedAt = new Date();
      this.currentTurn = Math.random() < 0.5 ? 'host' : 'guest';
    }
  }

  fireShot(firingRole, row, col) {
    if (this.status !== 'active') return null;
    if (this.currentTurn !== firingRole) return null;

    const targetRole = firingRole === 'host' ? 'guest' : 'host';
    const targetBoard = targetRole === 'host' ? this.hostBoard : this.guestBoard;
    const targetShots = firingRole === 'host' ? this.hostShots : this.guestShots;

    // Check if already fired
    const alreadyFired = targetShots.some(s => s.row === row && s.col === col);
    if (alreadyFired) return null;

    let result = 'miss';
    let hitShipType = null;
    let shipSunk = false;

    // Evaluate hit
    for (const ship of targetBoard) {
      const cells = getShipCells(ship);
      const cellHit = cells.find(cell => cell.y === row && cell.x === col);
      
      if (cellHit) {
        result = 'hit';
        hitShipType = ship.type;

        // Check if all cells of this ship are hit
        const hitMap = new Set(targetShots.map(s => `${s.row},${s.col}`));
        hitMap.add(`${row},${col}`); // Include current shot

        const shipCellsSunk = cells.every(cell => hitMap.has(`${cell.y},${cell.x}`));
        if (shipCellsSunk) {
          shipSunk = true;
        }
        break;
      }
    }

    const shotResult = {
      row,
      col,
      result,
      sunk: shipSunk,
      shipType: hitShipType,
      timestamp: new Date().toISOString()
    };

    targetShots.push(shotResult);

    // Add to replay log
    this.moveLog.push({
      turn: firingRole,
      ...shotResult
    });

    // Check if game is over (all target board ships sunk)
    const hitMapAll = new Set(targetShots.map(s => `${s.row},${s.col}`));
    const allSunk = targetBoard.every(ship => {
      const cells = getShipCells(ship);
      return cells.every(cell => hitMapAll.has(`${cell.y},${cell.x}`));
    });

    if (allSunk) {
      this.status = 'finished';
      this.winnerPlayerId = firingRole === 'host' ? this.hostPlayerId : this.guestPlayerId;
      this.finishedAt = new Date();
    } else {
      // In classic Battleship, you get another turn on hit, otherwise it alternates
      // Let's implement standard rule: hit = keep turn, miss = alternate turn
      if (result === 'miss') {
        this.currentTurn = targetRole;
      }
    }

    return shotResult;
  }

  addChatMessage(senderName, message) {
    const chatMsg = {
      sender: senderName,
      message,
      timestamp: new Date().toISOString()
    };
    this.chatLog.push(chatMsg);
    return chatMsg;
  }
}
