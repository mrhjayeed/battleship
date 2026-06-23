import { SocketProvider } from './context/SocketContext.jsx';
import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx';
import { GameProvider, useGame } from './context/GameContext.jsx';
import EntryPage from './components/lobby/EntryPage.jsx';
import LobbyPage from './components/lobby/LobbyPage.jsx';
import GamePage from './components/game/GamePage.jsx';

function MainApp() {
  const { isAuthenticated } = usePlayer();
  const { status } = useGame();

  if (!isAuthenticated) {
    return <EntryPage />;
  }

  if (status === 'lobby') {
    return <LobbyPage />;
  }

  return <GamePage />;
}

export default function App() {
  return (
    <SocketProvider>
      <PlayerProvider>
        <GameProvider>
          <MainApp />
        </GameProvider>
      </PlayerProvider>
    </SocketProvider>
  );
}
