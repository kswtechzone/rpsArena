'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [playerName, setPlayerNameState] = useState('');
  const [room, setRoom] = useState(null);
  const [gameScreen, setGameScreen] = useState('home'); // home, singleplayer, lobby, game, results, leaderboard
  const [roundResult, setRoundResult] = useState(null);
  const [countdownText, setCountdownText] = useState('');
  const [chosenCount, setChosenCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    previousPoints: 0,
    streak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    activeDays: [],
    achievements: [],
  });

  const getRankInfo = (pts) => {
    if (pts < 50) return { name: 'Begin', stars: 1, color: '#94a3b8' };
    if (pts < 150) return { name: 'Elite', stars: 2, color: '#10b981' };
    if (pts < 400) return { name: 'Masters', stars: 3, color: '#3b82f6' };
    if (pts < 800) return { name: 'GrandMaster', stars: 4, color: '#a855f7' };
    if (pts < 1500) return { name: 'Super', stars: 5, color: '#f59e0b' };
    return { name: 'Ace', stars: 5, color: '#ef4444', isAce: true };
  };

  // Load name and stats on mount
  useEffect(() => {
    const savedName = localStorage.getItem('rps_player_name');
    if (savedName) setPlayerNameState(savedName);

    const savedStats = localStorage.getItem('rps_global_stats_v2');
    if (savedStats) {
      try {
        setGlobalStats(JSON.parse(savedStats));
      } catch (e) {
        console.error('Failed to parse global stats');
      }
    }
  }, []);

  const setPlayerName = (name) => {
    setPlayerNameState(name);
    localStorage.setItem('rps_player_name', name);
  };

  const updateStats = useCallback((outcome) => {
    setGlobalStats((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const newActiveDays = prev.activeDays.includes(today) 
        ? prev.activeDays 
        : [...(prev.activeDays || []), today];

      const winPoints = 2;
      const newPoints = outcome === 'win' ? prev.points + winPoints : prev.points;
      const newWins = outcome === 'win' ? prev.wins + 1 : prev.wins;
      const newStreak = outcome === 'win' ? (prev.streak || 0) + 1 : 0;
      
      const newAchievements = [...(prev.achievements || [])];
      if (outcome === 'win' && !newAchievements.includes('first_win')) {
        newAchievements.push('first_win');
      }
      if (newStreak >= 5 && !newAchievements.includes('streak_5')) {
        newAchievements.push('streak_5');
      }
      if (newActiveDays.length >= 7 && !newAchievements.includes('weekly_7')) {
        newAchievements.push('weekly_7');
      }

      const newStats = {
        ...prev,
        wins: newWins,
        losses: outcome === 'loss' ? prev.losses + 1 : prev.losses,
        draws: outcome === 'draw' ? prev.draws + 1 : prev.draws,
        previousPoints: prev.points,
        points: newPoints,
        streak: newStreak,
        maxStreak: Math.max(prev.maxStreak || 0, newStreak),
        activeDays: newActiveDays,
        lastPlayedDate: today,
        achievements: newAchievements,
      };

      localStorage.setItem('rps_global_stats_v2', JSON.stringify(newStats));
      return newStats;
    });
  }, []);

  const updateRoom = useCallback((newRoom) => {
    setRoom(newRoom);
  }, []);

  const resetGame = useCallback(() => {
    setRoom(null);
    setGameScreen('home');
    setRoundResult(null);
    setCountdownText('');
    setChosenCount(0);
  }, []);

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        globalStats,
        updateStats,
        rankInfo: getRankInfo(globalStats.points),
        room,
        setRoom: updateRoom,
        gameScreen,
        setGameScreen,
        roundResult,
        setRoundResult,
        countdownText,
        setCountdownText,
        chosenCount,
        setChosenCount,
        leaderboard,
        setLeaderboard,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
