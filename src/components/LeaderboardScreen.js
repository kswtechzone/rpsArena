'use client';
import { useGame } from '@/context/GameContext';

// Mock leaderboard data for display
const MOCK_LEADERBOARD = [
  { name: 'ViperKing', avatar: '🦊', wins: 234, losses: 45, score: 2891, winRate: 84 },
  { name: 'StormClaw', avatar: '🐉', wins: 198, losses: 67, score: 2534, winRate: 75 },
  { name: 'NightOwl', avatar: '🦅', wins: 176, losses: 89, score: 2231, winRate: 66 },
  { name: 'FrostByte', avatar: '🐺', wins: 154, losses: 112, score: 1987, winRate: 58 },
  { name: 'BlazeRunner', avatar: '🦁', wins: 143, losses: 98, score: 1876, winRate: 59 },
  { name: 'ShadowFox', avatar: '🦋', wins: 128, losses: 134, score: 1654, winRate: 49 },
  { name: 'CrystalWing', avatar: '🐯', wins: 112, losses: 145, score: 1432, winRate: 44 },
  { name: 'IronClad', avatar: '🐼', wins: 98, losses: 167, score: 1234, winRate: 37 },
];

export default function LeaderboardScreen() {
  const { setGameScreen } = useGame();

  const getRankStyle = (idx) => {
    if (idx === 0) return { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', rankColor: '#eab308' };
    if (idx === 1) return { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.25)', rankColor: '#94a3b8' };
    if (idx === 2) return { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', rankColor: '#f97316' };
    return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', rankColor: 'var(--text-muted)' };
  };

  const rankEmoji = (idx) => (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '32px',
        maxWidth: '700px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '28px' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setGameScreen('home')}>
          ← Back
        </button>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, textAlign: 'center' }} className="text-gradient">
            🏆 Leaderboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '4px' }}>
            Global All-Time Rankings
          </p>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Total Players', value: '12,847', icon: '👥' },
          { label: 'Games Played', value: '94,231', icon: '🎮' },
          { label: 'Active Today', value: '1,492', icon: '⚡' },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="glass-card"
            style={{ padding: '16px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--neon-purple)' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card" style={{ width: '100%', padding: '20px', overflow: 'hidden' }}>
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 70px 70px 80px 60px',
            gap: '12px',
            padding: '0 12px 12px',
            borderBottom: '1px solid var(--border-glass)',
            marginBottom: '10px',
          }}
        >
          {['#', 'Player', 'Wins', 'Losses', 'Score', 'Win%'].map((h) => (
            <div key={h} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: h === '#' || h === 'Player' ? 'left' : 'center' }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {MOCK_LEADERBOARD.map((player, idx) => {
            const style = getRankStyle(idx);
            return (
              <div
                key={player.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 70px 70px 80px 60px',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '12px',
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: idx < 3 ? '20px' : '15px',
                    color: style.rankColor,
                    textAlign: 'center',
                  }}
                >
                  {rankEmoji(idx)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: `${style.bg}`,
                      border: `2px solid ${style.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                    }}
                  >
                    {player.avatar}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{player.name}</span>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>{player.wins}</div>
                <div style={{ textAlign: 'center', fontWeight: 600, color: '#ef4444' }}>{player.losses}</div>
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {player.score.toLocaleString()}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: player.winRate >= 70 ? '#10b981' : player.winRate >= 50 ? '#eab308' : '#ef4444',
                      background: player.winRate >= 70 ? 'rgba(16,185,129,0.15)' : player.winRate >= 50 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    {player.winRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
        Rankings update in real-time as games are played
      </p>
    </div>
  );
}
