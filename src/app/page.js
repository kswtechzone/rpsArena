'use client';
import { useGame } from '@/context/GameContext';
import HomeScreen from '@/components/HomeScreen';
import SinglePlayerScreen from '@/components/SinglePlayerScreen';
import LobbyScreen from '@/components/LobbyScreen';
import GameScreen from '@/components/GameScreen';
import LeaderboardScreen from '@/components/LeaderboardScreen';
import ParticleBackground from '@/components/ParticleBackground';

export default function Home() {
  const { gameScreen } = useGame();

  const renderScreen = () => {
    switch (gameScreen) {
      case 'singleplayer':
        return <SinglePlayerScreen />;
      case 'lobby':
        return <LobbyScreen />;
      case 'game':
        return <GameScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="bg-animated" />
      <ParticleBackground />
      <div style={{ position: 'relative', zIndex: 10 }}>{renderScreen()}</div>
    </main>
  );
}
