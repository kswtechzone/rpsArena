'use client';
import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/hooks/useSocket';

export default function HomeScreen() {
  const { playerName, setPlayerName, setGameScreen, setRoom, globalStats, rankInfo } = useGame();
  const { emit, on, off, isConnected } = useSocket();
  const [mode, setMode] = useState(null); // null | 'join' | 'create'
  const [roomCode, setRoomCode] = useState('');
  const [settings, setSettings] = useState({
    maxPlayers: 4,
    rounds: 3,
    mode: 'ffa',
    roundTimer: 15,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const ACHIEVEMENT_LABELS = {
    first_win: { icon: '🏆', text: 'First Victory' },
    streak_5: { icon: '🔥', text: 'Unstoppable (5 Streak)' },
    weekly_7: { icon: '📅', text: 'Weekly Warrior' },
  };

  const handleSinglePlayer = () => {
    if (!playerName.trim()) {
      setError('Enter your name first!');
      return;
    }
    setGameScreen('singleplayer');
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name first!');
      return;
    }
    setLoading(true);
    setError('');

    const handleRoomCreated = ({ room }) => {
      off('room_created', handleRoomCreated);
      setRoom(room);
      setGameScreen('lobby');
      setLoading(false);
    };

    on('room_created', handleRoomCreated);
    emit('create_room', { playerName: playerName.trim(), settings });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name first!');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      setError('Enter a valid 6-character room code.');
      return;
    }
    setLoading(true);
    setError('');

    const handleJoined = ({ room }) => {
      off('room_joined', handleJoined);
      off('join_error', handleJoinError);
      setRoom(room);
      setGameScreen('lobby');
      setLoading(false);
    };

    const handleJoinError = ({ message }) => {
      off('room_joined', handleJoined);
      off('join_error', handleJoinError);
      setError(message);
      setLoading(false);
    };

    on('room_joined', handleJoined);
    on('join_error', handleJoinError);
    emit('join_room', { code: roomCode.trim().toUpperCase(), playerName: playerName.trim() });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Hero */}
      <div
        className="animate-fade-in-up"
        style={{ textAlign: 'center', marginBottom: '40px' }}
      >
        <div style={{ marginBottom: '16px' }}>
          <img 
            src="/logo.png" 
            alt="RPS Arena Logo" 
            style={{ 
              width: '160px', 
              height: '160px', 
              borderRadius: '30px', 
              boxShadow: '0 0 40px rgba(168,85,247,0.3)',
              border: '2px solid rgba(255,255,255,0.1)'
            }} 
          />
        </div>
        <h1
          className="text-gradient"
          style={{
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 900,
            letterSpacing: '-2px',
            lineHeight: 1.1,
            marginBottom: '12px',
          }}
        >
          RPS Arena
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '480px', margin: '0 auto' }}>
          Play Rock Paper Scissors online — solo vs AI or with friends in real-time multiplayer rooms.
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            padding: '6px 16px',
            background: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 600,
            color: isConnected ? '#10b981' : '#ef4444',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
              animation: isConnected ? 'glow 2s infinite' : 'none',
            }}
          />
          {isConnected ? 'Server Online' : 'Connecting...'}
        </div>
      </div>

      {/* Name Input */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '32px',
          animationDelay: '0.1s',
        }}
      >
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: '10px',
          }}
        >
          Your Name
        </label>
        <input
          id="player-name-input"
          className="input"
          placeholder="Enter your username..."
          value={playerName}
          maxLength={20}
          onChange={(e) => {
            setPlayerName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSinglePlayer()}
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: 600 }}>
            ⚠️ {error}
          </p>
        )}

        {/* Player Profile / Rank Dashboard */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Rank Ribbon */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: rankInfo.color,
              color: '#000',
              padding: '4px 12px',
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              borderBottomLeftRadius: '12px',
              boxShadow: `0 0 15px ${rankInfo.color}40`,
            }}
          >
            {rankInfo.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${rankInfo.color}, #000)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: '2px solid rgba(255,255,255,0.1)',
              }}
            >
              {rankInfo.isAce ? '👑' : '🎖️'}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>{playerName || 'Guest Player'}</div>
              <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                {Array.from({ length: rankInfo.stars }).map((_, i) => (
                  <span key={i} style={{ color: '#fbbf24', fontSize: '12px' }}>⭐</span>
                ))}
              </div>
            </div>
          </div>

          {/* Points Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span>Experience Points</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{globalStats.points} pts</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min((globalStats.points / 1500) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${rankInfo.color}, #fff)`,
                  transition: 'width 1.5s ease',
                }}
              />
            </div>
            {globalStats.previousPoints !== globalStats.points && (
              <div style={{ fontSize: '9px', color: '#10b981', marginTop: '4px', textAlign: 'right' }}>
                +{globalStats.points - globalStats.previousPoints} points gained!
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wins</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>{globalStats.wins}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Losses</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>{globalStats.losses}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Streak</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#06b6d4' }}>{globalStats.streak}</div>
            </div>
          </div>

          {/* Achievements Row */}
          {globalStats.achievements?.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {globalStats.achievements.map(id => (
                <div
                  key={id}
                  title={ACHIEVEMENT_LABELS[id]?.text}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {ACHIEVEMENT_LABELS[id]?.icon}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
          {/* Single Player */}
          <button
            id="single-player-btn"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', fontSize: '16px' }}
            onClick={handleSinglePlayer}
          >
            🤖 Single Player vs AI
          </button>

          {/* Multiplayer */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <button
              id="create-room-btn"
              className={`btn ${mode === 'create' ? 'btn-cyan' : 'btn-secondary'}`}
              style={{ width: '100%' }}
              onClick={() => setMode(mode === 'create' ? null : 'create')}
            >
              ➕ Create Room
            </button>
            <button
              id="join-room-btn"
              className={`btn ${mode === 'join' ? 'btn-green' : 'btn-secondary'}`}
              style={{ width: '100%' }}
              onClick={() => setMode(mode === 'join' ? null : 'join')}
            >
              🔑 Join Room
            </button>
          </div>

          {/* Leaderboard */}
          <button
            id="leaderboard-btn"
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setGameScreen('leaderboard')}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Join Room Panel */}
        {mode === 'join' && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '20px',
              padding: '20px',
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '16px',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#10b981',
                marginBottom: '10px',
              }}
            >
              Room Code
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                id="room-code-input"
                className="input"
                placeholder="e.g. ABC123"
                value={roomCode}
                maxLength={6}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700 }}
              />
              <button
                id="join-submit-btn"
                className="btn btn-green"
                onClick={handleJoinRoom}
                disabled={loading}
                style={{ flexShrink: 0 }}
              >
                {loading ? '...' : 'Join'}
              </button>
            </div>
          </div>
        )}

        {/* Create Room Panel */}
        {mode === 'create' && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '20px',
              padding: '20px',
              background: 'rgba(6,182,212,0.06)',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Players
                </label>
                <select
                  id="max-players-select"
                  value={settings.maxPlayers}
                  onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}
                  className="input"
                  style={{ padding: '10px 12px' }}
                >
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n} style={{ background: '#1a1030' }}>
                      {n} Players
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Rounds
                </label>
                <select
                  id="rounds-select"
                  value={settings.rounds}
                  onChange={(e) => setSettings({ ...settings, rounds: +e.target.value })}
                  className="input"
                  style={{ padding: '10px 12px' }}
                >
                  {[1, 3, 5, 7, 10].map((n) => (
                    <option key={n} value={n} style={{ background: '#1a1030' }}>
                      Best of {n}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                  }}
                >
                  Game Mode
                </label>
                <select
                  id="game-mode-select"
                  value={settings.mode}
                  onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                  className="input"
                  style={{ padding: '10px 12px' }}
                >
                  <option value="ffa" style={{ background: '#1a1030' }}>
                    ⚔️ Free For All
                  </option>
                  <option value="knockout" style={{ background: '#1a1030' }}>
                    💥 Knockout Elimination
                  </option>
                  <option value="team" style={{ background: '#1a1030' }}>
                    🤝 Team Mode
                  </option>
                </select>
              </div>
            </div>

            <button
              id="create-submit-btn"
              className="btn btn-cyan"
              style={{ width: '100%' }}
              onClick={handleCreateRoom}
              disabled={loading}
            >
              {loading ? '⏳ Creating...' : '🚀 Create Room'}
            </button>
          </div>
        )}
      </div>

      {/* Feature Pills */}
      <div
        className="animate-fade-in-up"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center',
          marginTop: '32px',
          animationDelay: '0.2s',
        }}
      >
        {[
          { icon: '⚡', label: 'Real-time Multiplayer' },
          { icon: '🌐', label: 'Up to 8 Players' },
          { icon: '💬', label: 'Live Chat' },
          { icon: '🏆', label: 'Leaderboards' },
          { icon: '🤖', label: 'AI Opponent' },
        ].map(({ icon, label }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {icon} {label}
          </div>
        ))}
      </div>
    </div>
  );
}
