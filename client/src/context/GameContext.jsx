import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext.jsx';
import { usePlayer } from './PlayerContext.jsx';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { playerName } = usePlayer();
  const lastSocketIdRef = useRef(null);

  const [gameId, setGameId] = useState(() => localStorage.getItem('battleship_active_game_id') || null);
  const [status, setStatus] = useState('lobby'); // lobby | placing | active | finished
  const [opponentName, setOpponentName] = useState(null);
  const [gridSize, setGridSize] = useState(10);
  const [shipConfig, setShipConfig] = useState(null);
  const [role, setRole] = useState(null); // 'host' | 'guest'
  const [currentTurn, setCurrentTurn] = useState(null); // 'host' | 'guest'
  const [myBoard, setMyBoard] = useState(null);
  const [myShots, setMyShots] = useState([]);
  const [opponentShots, setOpponentShots] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [isAiGame, setIsAiGame] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [gameOverStats, setGameOverStats] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] = useState(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);

  // Sound triggers (to be consumed by useSound hook via custom events or state change)
  const [lastEvent, setLastEvent] = useState(null); // { type: 'hit'|'miss'|'victory'|'defeat' }

  const resetGameState = useCallback(() => {
    setStatus('lobby');
    setOpponentName(null);
    setRole(null);
    setCurrentTurn(null);
    setMyBoard(null);
    setMyShots([]);
    setOpponentShots([]);
    setChatLog([]);
    setIsAiGame(false);
    setAiDifficulty(null);
    setWinnerId(null);
    setGameOverStats(null);
    setOpponentDisconnected(false);
    setOpponentReady(false);
    setRematchRequestedByOpponent(false);
    setRematchRequestedByMe(false);
    setLastEvent(null);
  }, []);

  const createGame = useCallback((config, sessionName, isAi, difficulty) => {
    if (!socket || !isConnected) return;
    resetGameState();
    socket.emit('create-game', { config, sessionName, isAiGame: isAi, aiDifficulty: difficulty });
  }, [socket, isConnected, resetGameState]);

  const joinGame = useCallback((id) => {
    if (!socket || !isConnected) return;
    resetGameState();
    socket.emit('join-game', { gameId: id });
  }, [socket, isConnected, resetGameState]);

  const rejoinGame = useCallback((id) => {
    if (!socket || !isConnected || !playerName) return;
    socket.emit('rejoin-game', { gameId: id, playerName });
  }, [socket, isConnected, playerName]);

  const placeShips = useCallback((ships) => {
    if (!socket || !isConnected || !gameId) return;
    setMyBoard(ships);
    socket.emit('place-ships', { gameId, ships });
  }, [socket, isConnected, gameId]);

  const fireShot = useCallback((row, col) => {
    if (!socket || !isConnected || !gameId) return;
    socket.emit('fire-shot', { gameId, row, col });
  }, [socket, isConnected, gameId]);

  const sendChat = useCallback((message) => {
    if (!socket || !isConnected || !gameId) return;
    socket.emit('send-chat', { gameId, message });
  }, [socket, isConnected, gameId]);

  const requestRematch = useCallback(() => {
    console.log('requestRematch clicked:', { hasSocket: !!socket, isConnected, gameId });
    if (!socket || !isConnected || !gameId) {
      console.warn('requestRematch blocked: socket connection or game ID missing');
      return;
    }
    setRematchRequestedByMe(true);
    socket.emit('rematch-request', { gameId });
  }, [socket, isConnected, gameId]);

  const leaveGame = useCallback(() => {
    console.log('leaveGame clicked:', { hasSocket: !!socket, isConnected, gameId });
    if (socket && isConnected && gameId) {
      socket.emit('leave-game', { gameId });
    }
    localStorage.removeItem('battleship_active_game_id');
    setGameId(null);
    resetGameState();
  }, [socket, isConnected, gameId, resetGameState]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Game joined
    socket.on('game-joined', ({ gameId: newGameId, opponentName: oppName, config, gridSize: gSize, role: myRole, isAiGame: isAi, aiDifficulty: diff, status: initialStatus }) => {
      console.log('Joined game session:', newGameId);
      setGameId(newGameId);
      setOpponentName(oppName);
      setGridSize(gSize);
      setShipConfig(config);
      setRole(myRole);
      setIsAiGame(isAi);
      setAiDifficulty(diff);
      setStatus(initialStatus);
      localStorage.setItem('battleship_active_game_id', newGameId);
      lastSocketIdRef.current = socket.id;
    });

    // Opponent joined
    socket.on('opponent-joined', ({ opponentName: oppName, status: nextStatus }) => {
      setOpponentName(oppName);
      setStatus(nextStatus);
    });

    // Opponent is ready
    socket.on('opponent-ready', () => {
      setOpponentReady(true);
    });

    // Game starts
    socket.on('game-start', ({ currentTurn: firstTurn }) => {
      setStatus('active');
      setCurrentTurn(firstTurn);
    });

    // Shot results
    socket.on('shot-result', ({ row, col, result, shipSunk, shipType, nextTurn, firingRole }) => {
      const isMyShot = firingRole === role;

      if (isMyShot) {
        setMyShots((prev) => [...prev, { row, col, result, sunk: shipSunk, shipType }]);
        setLastEvent({ type: result === 'hit' ? 'hit' : 'miss' });
      } else {
        setOpponentShots((prev) => [...prev, { row, col, result, sunk: shipSunk, shipType }]);
        setLastEvent({ type: result === 'hit' ? 'hit' : 'miss' });
      }
      
      setCurrentTurn(nextTurn);
    });

    // Chat messages
    socket.on('chat-message', (chatMsg) => {
      setChatLog((prev) => [...prev, chatMsg]);
    });

    // Game Over
    socket.on('game-over', ({ winner, reason, stats }) => {
      setStatus('finished');
      setWinnerId(stats.winnerId);
      setGameOverStats(stats);
      setLastEvent({ type: winner === role ? 'victory' : 'defeat' });
      localStorage.removeItem('battleship_active_game_id');
    });

    // Auto-place due to timeout
    socket.on('placement-auto', ({ role: autoPlacedRole }) => {
      if (autoPlacedRole === role) {
        // Handled inside ShipPlacement.jsx
        setLastEvent({ type: 'auto-placed' });
      }
    });

    // Rejoin succeeded
    socket.on('game-rejoined', (data) => {
      console.log('Rejoined game session:', data.gameId);
      setGameId(data.gameId);
      setRole(data.role);
      setOpponentName(data.opponentName);
      setGridSize(data.gridSize);
      setShipConfig(data.config);
      setStatus(data.status);
      setMyBoard(data.myBoard);
      setMyShots(data.myShots || []);
      setOpponentShots(data.opponentShots || []);
      setCurrentTurn(data.currentTurn);
      setChatLog(data.chatLog || []);
      setIsAiGame(data.isAiGame);
      setAiDifficulty(data.aiDifficulty);
      setWinnerId(data.winnerId);
      setOpponentDisconnected(false);
      localStorage.setItem('battleship_active_game_id', data.gameId);
      lastSocketIdRef.current = socket.id;
    });

    // Opponent disconnected/reconnected
    socket.on('opponent-disconnected', () => {
      setOpponentDisconnected(true);
    });

    socket.on('opponent-reconnected', () => {
      setOpponentDisconnected(false);
    });

    // Opponent requested rematch
    socket.on('opponent-requested-rematch', () => {
      setRematchRequestedByOpponent(true);
    });

    // Rematch triggers new game ID
    socket.on('rematch-start', ({ newGameId }) => {
      resetGameState();
      setGameId(newGameId);
      localStorage.setItem('battleship_active_game_id', newGameId);
      // Wait for re-fetch / re-join
    });

    return () => {
      socket.off('game-joined');
      socket.off('opponent-joined');
      socket.off('opponent-ready');
      socket.off('game-start');
      socket.off('shot-result');
      socket.off('chat-message');
      socket.off('game-over');
      socket.off('placement-auto');
      socket.off('game-rejoined');
      socket.off('opponent-disconnected');
      socket.off('opponent-reconnected');
      socket.off('opponent-requested-rematch');
      socket.off('rematch-start');
    };
  }, [socket, isConnected, role, resetGameState]);

  // Handle rejoining on first mount or reconnection if gameId is stored in localStorage
  useEffect(() => {
    if (gameId && playerName && isConnected && socket && socket.id !== lastSocketIdRef.current) {
      console.log('Socket ID changed, rejoining game:', gameId);
      lastSocketIdRef.current = socket.id;
      rejoinGame(gameId);
    }
  }, [gameId, playerName, isConnected, socket, rejoinGame]);

  return (
    <GameContext.Provider
      value={{
        gameId,
        status,
        opponentName,
        gridSize,
        shipConfig,
        role,
        currentTurn,
        myBoard,
        myShots,
        opponentShots,
        chatLog,
        isAiGame,
        aiDifficulty,
        winnerId,
        gameOverStats,
        opponentDisconnected,
        opponentReady,
        rematchRequestedByOpponent,
        rematchRequestedByMe,
        lastEvent,
        setLastEvent,
        createGame,
        joinGame,
        rejoinGame,
        placeShips,
        fireShot,
        sendChat,
        requestRematch,
        leaveGame
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
