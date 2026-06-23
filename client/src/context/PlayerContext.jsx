import { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext.jsx';

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('battleship_player_name') || '');
  const [playerId, setPlayerId] = useState(() => {
    const stored = localStorage.getItem('battleship_player_id');
    return stored ? parseInt(stored) : null;
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [activePlayers, setActivePlayers] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Authenticate (register name)
  const login = (baseName) => {
    if (!socket || !isConnected) return;
    setIsAuthenticating(true);
    socket.emit('join-lobby', { playerName: baseName });
  };

  const logout = () => {
    if (socket && isConnected) {
      socket.emit('logout');
    }
    localStorage.removeItem('battleship_player_name');
    localStorage.removeItem('battleship_player_id');
    localStorage.removeItem('battleship_active_game_id');
    setPlayerName('');
    setPlayerId(null);
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    // If we have a saved player name, auto-authenticate on socket connect/reconnect
    if (playerName) {
      socket.emit('join-lobby', { playerName });
    }

    // Name assignment reply
    socket.on('name-assigned', ({ finalName, player }) => {
      console.log('Name assigned from server:', finalName);
      setPlayerName(finalName);
      setPlayerId(player.id);
      localStorage.setItem('battleship_player_name', finalName);
      localStorage.setItem('battleship_player_id', player.id.toString());
      setIsAuthenticating(false);
    });

    // Leaderboard update
    socket.on('leaderboard-update', (data) => {
      setLeaderboard(data);
    });

    // Active player updates
    socket.on('lobby-update', ({ sessions: openSessions, activePlayers }) => {
      setSessions(openSessions);
      setActivePlayers(activePlayers);
    });

    return () => {
      socket.off('name-assigned');
      socket.off('leaderboard-update');
      socket.off('lobby-update');
    };
  }, [socket, isConnected]);

  const isAuthenticated = !!playerName && !!playerId;

  return (
    <PlayerContext.Provider
      value={{
        playerName,
        playerId,
        isAuthenticated,
        isAuthenticating,
        leaderboard,
        activePlayers,
        sessions,
        login,
        logout
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
