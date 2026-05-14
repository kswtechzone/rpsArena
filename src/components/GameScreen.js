'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/hooks/useSocket';
import { CHOICES } from '@/lib/gameLogic';

const CHOICE_KEYS = ['rock', 'paper', 'scissors'];

export default function GameScreen() {
  const {
    room, setRoom, setGameScreen, roundResult, setRoundResult,
    countdownText, setCountdownText, chosenCount, setChosenCount, setLeaderboard,
    updateStats,
  } = useGame();
  const { emit, on, off, socketId } = useSocket();

  const [myChoice, setMyChoice] = useState(null);
  const [phase, setPhase] = useState('countdown'); // countdown | choosing | result | finished
  const [roundTimer, setRoundTimer] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  const EMOJIS = ['🔥', '😂', '🤯', '💀', '👑', '😤', '🎯', '⚡'];

  const isHost = room?.hostId === socketId;
  const totalPlayers = room?.players?.length || 0;

  // Socket event listeners
  useEffect(() => {
    if (!room) return;

    const handleCountdownTick = ({ text }) => {
      setCountdownText(text);
      if (text.includes('SHOOT')) {
        setTimeout(() => {
          setCountdownText('');
        }, 800);
      }
    };

    const handleRoundStarted = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setMyChoice(null);
      setPhase('choosing');
      setChosenCount(0);
      setCountdownText('');
      // Start round timer locally
      let t = updatedRoom.settings?.roundTimer || 15;
      setRoundTimer(t);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        t--;
        setRoundTimer(t);
        if (t <= 0) {
          clearInterval(timerRef.current);
          // Only auto-submit if this specific client hasn't chosen yet
          setMyChoice((currentChoice) => {
            if (!currentChoice) {
              const random = CHOICE_KEYS[Math.floor(Math.random() * 3)];
              emit('submit_choice', { choice: random });
              return random;
            }
            return currentChoice;
          });
        }
      }, 1000);
    };

    const handleChoiceSubmitted = ({ chosenCount: count, totalPlayers: total }) => {
      setChosenCount(count);
    };

    const handleRoundResult = ({ room: updatedRoom, roundResult: result }) => {
      clearInterval(timerRef.current);
      setRoom(updatedRoom);
      setRoundResult(result);
      setPhase(updatedRoom.state === 'finished' ? 'finished' : 'result');

      // Update persistent stats
      if (result.result === 'draw') {
        updateStats('draw');
      } else if (result.winners?.includes(socketId)) {
        updateStats('win');
      } else if (result.draws?.includes(socketId)) {
        updateStats('draw');
      } else {
        updateStats('loss');
      }
    };

    const handleNextRound = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setMyChoice(null);
      setRoundResult(null);
      setChosenCount(0);
      setPhase('countdown');
      // Host triggers countdown
      if (updatedRoom.hostId === socketId) {
        setTimeout(() => emit('start_countdown'), 500);
      }
    };

    const handlePlayerLeft = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setMessages((m) => [...m, { system: true, text: 'A player disconnected' }]);
    };

    const handleChat = ({ chatMsg: msg }) => {
      setMessages((m) => [...m, msg]);
    };

    const handleRematchStarted = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setMyChoice(null);
      setRoundResult(null);
      setChosenCount(0);
      setPhase('countdown');
      setMessages((m) => [...m, { system: true, text: 'Rematch started! Get ready!' }]);
      // Host triggers countdown automatically
      if (updatedRoom.hostId === socketId) {
        setTimeout(() => emit('start_countdown'), 1000);
      }
    };

    on('countdown_tick', handleCountdownTick);
    on('round_started', handleRoundStarted);
    on('choice_submitted', handleChoiceSubmitted);
    on('round_result', handleRoundResult);
    on('next_round_started', handleNextRound);
    on('rematch_started', handleRematchStarted);
    on('player_left', handlePlayerLeft);
    on('chat_message', handleChat);

    return () => {
      off('countdown_tick', handleCountdownTick);
      off('round_started', handleRoundStarted);
      off('choice_submitted', handleChoiceSubmitted);
      off('round_result', handleRoundResult);
      off('next_round_started', handleNextRound);
      off('rematch_started', handleRematchStarted);
      off('player_left', handlePlayerLeft);
      off('chat_message', handleChat);
    };
  }, [room, socketId, myChoice, on, off, emit, setRoom, setRoundResult, setCountdownText, setChosenCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitChoice = useCallback((choice) => {
    if (myChoice) return;
    clearInterval(timerRef.current);
    setMyChoice(choice);
    emit('submit_choice', { choice });
  }, [myChoice, emit]);

  const handleNextRound = () => {
    if (isHost) {
      emit('next_round');
    }
  };

  const handleRematch = () => {
    if (isHost) {
      emit('rematch');
    }
  };

  const handleReturnToLobby = () => {
    emit('leave_room');
    setGameScreen('home');
  };

  const handleSendChat = () => {
    if (!chatMsg.trim()) return;
    emit('send_chat', { message: chatMsg.trim() });
    setChatMsg('');
  };

  const sendEmoji = (emoji) => {
    emit('send_chat', { message: emoji });
    setShowEmojiPanel(false);
  };

  const getMyWinLoss = () => {
    const me = room?.players?.find((p) => p.id === socketId);
    return me ? { wins: me.wins, losses: me.losses, score: me.score } : { wins: 0, losses: 0, score: 0 };
  };

  const isWinner = roundResult?.result?.winners?.includes(socketId);
  const isDraw = roundResult?.result?.result === 'draw' ||
    roundResult?.result?.draws?.includes(socketId);

  if (!room) return null;

  const myStats = getMyWinLoss();
  const sortedPlayers = [...(room.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>
            ⚔️ Round {room.currentRound}/{room.settings?.rounds}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Room: <span style={{ color: 'var(--neon-purple)', fontWeight: 700 }}>{room.code}</span>
          </div>
        </div>

        {/* My Stats */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-glass)',
            borderRadius: '999px',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Score: <span style={{ color: 'var(--neon-purple)', fontWeight: 700 }}>{myStats.score}</span>
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            W: <span style={{ color: '#10b981', fontWeight: 700 }}>{myStats.wins}</span>
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            L: <span style={{ color: '#ef4444', fontWeight: 700 }}>{myStats.losses}</span>
          </span>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleReturnToLobby}>
          🚪 Leave
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', flex: 1 }}>
        {/* Main Game Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Phase: Countdown */}
          {phase === 'countdown' && (
            <div
              className="glass-card"
              style={{
                padding: '60px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '300px',
              }}
            >
              <div style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 600 }}>
                Get Ready...
              </div>
              {countdownText && (
                <div className="countdown-text">{countdownText}</div>
              )}
              {!countdownText && (
                <div style={{ fontSize: '48px', animation: 'bounce 1s ease-in-out infinite' }}>⏳</div>
              )}
            </div>
          )}

          {/* Phase: Choosing */}
          {phase === 'choosing' && (
            <div
              className="glass-card"
              style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Timer */}
              {roundTimer !== null && (
                <div style={{ width: '100%', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Choose your move!</span>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: roundTimer <= 5 ? '#ef4444' : 'var(--neon-cyan)',
                        animation: roundTimer <= 5 ? 'glow 0.5s ease-in-out infinite' : 'none',
                      }}
                    >
                      ⏱ {roundTimer}s
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(roundTimer / (room.settings?.roundTimer || 15)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Choices */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
                {CHOICE_KEYS.map((choice) => (
                  <button
                    key={choice}
                    id={`mp-choice-${choice}`}
                    className={`choice-btn ${choice} ${myChoice === choice ? 'selected' : ''}`}
                    onClick={() => handleSubmitChoice(choice)}
                    disabled={!!myChoice}
                  >
                    <span className="choice-emoji">{CHOICES[choice].emoji}</span>
                    <span className="choice-label">{CHOICES[choice].label}</span>
                  </button>
                ))}
              </div>

              {/* Waiting indicator */}
              <div
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '999px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                }}
              >
                {myChoice ? (
                  <span style={{ color: '#10b981' }}>
                    ✅ You chose {CHOICES[myChoice]?.emoji} — Waiting for others...
                  </span>
                ) : (
                  <span>Waiting... {chosenCount}/{totalPlayers} have chosen</span>
                )}
              </div>
            </div>
          )}

          {/* Phase: Result */}
          {(phase === 'result' || phase === 'finished') && roundResult && (
            <div
              className="glass-card"
              style={{ padding: '32px', textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}
            >
              {/* Result banner */}
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  marginBottom: '8px',
                  background: isWinner
                    ? 'linear-gradient(135deg, #eab308, #f97316)'
                    : isDraw
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {isWinner ? '🏆 You Win!' : isDraw ? '🤝 Draw!' : '😢 You Lost!'}
              </div>

              {roundResult.result?.winningChoice && (
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  {CHOICES[roundResult.result.winningChoice]?.emoji}{' '}
                  <strong>{CHOICES[roundResult.result.winningChoice]?.label}</strong> wins this round!
                </p>
              )}

              {/* All Choices */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                {roundResult.choices?.map(({ playerId, choice }) => {
                  const player = room.players.find((p) => p.id === playerId);
                  const isWin = roundResult.result?.winners?.includes(playerId);
                  const isLose = roundResult.result?.losers?.includes(playerId);
                  const isPlayerDraw = roundResult.result?.draws?.includes(playerId);

                  return (
                    <div
                      key={playerId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '16px 20px',
                        background: isWin ? 'rgba(234,179,8,0.1)' : isLose ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${isWin ? 'rgba(234,179,8,0.5)' : isLose ? 'rgba(239,68,68,0.3)' : 'var(--border-glass)'}`,
                        borderRadius: '16px',
                        minWidth: '90px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: isWin ? '#eab308' : isLose ? '#ef4444' : 'var(--text-muted)',
                        }}
                      >
                        {isWin ? '👑 Winner' : isLose ? '💀 Loser' : '🤝 Draw'}
                      </div>
                      <div style={{ fontSize: '42px' }}>{CHOICES[choice]?.emoji || '?'}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>
                        {player?.avatar} {player?.name || 'Player'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              {phase === 'result' && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {isHost ? (
                    <button id="next-round-mp-btn" className="btn btn-primary btn-lg" onClick={handleNextRound}>
                      ▶️ Next Round
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Waiting for host to start next round...
                    </div>
                  )}
                </div>
              )}

              {phase === 'finished' && (
                <div>
                  <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '20px' }} className="text-gradient-gold">
                    🎉 Game Over!
                  </h2>
                  {/* Final Standings */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Final Standings
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sortedPlayers.map((player, idx) => (
                        <div key={player.id} className="leaderboard-row">
                          <div
                            className="rank-badge"
                            style={{
                              background: idx === 0 ? 'rgba(234,179,8,0.2)' : idx === 1 ? 'rgba(148,163,184,0.2)' : idx === 2 ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.1)',
                              color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#f97316' : 'var(--text-secondary)',
                            }}
                          >
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '20px' }}>{player.avatar}</div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontWeight: 700 }}>{player.name}{player.id === socketId ? ' (you)' : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'var(--neon-purple)' }}>{player.score} pts</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>W:{player.wins} L:{player.losses}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {isHost && (
                      <button id="rematch-btn" className="btn btn-primary" onClick={handleRematch}>
                        🔄 Rematch
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={handleReturnToLobby}>
                      🏠 Back to Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Scoreboard */}
          <div className="glass-card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Live Scoreboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: player.id === socketId ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${player.id === socketId ? 'rgba(168,85,247,0.3)' : 'var(--border-glass)'}`,
                    borderRadius: '10px',
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                  <span style={{ fontSize: '18px' }}>{player.avatar}</span>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{player.name}</span>
                  <span style={{ fontWeight: 800, color: 'var(--neon-purple)' }}>{player.score}</span>
                  {/* Choice Status */}
                  {phase === 'choosing' && (
                    <span style={{ fontSize: '12px', color: player.choice ? '#10b981' : 'var(--text-muted)' }}>
                      {player.choice ? '✅' : '⏳'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700 }}>💬 Chat</h2>
            <button
              onClick={() => setShowEmojiPanel(!showEmojiPanel)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              😊
            </button>
          </div>

          {showEmojiPanel && (
            <div
              style={{
                padding: '10px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => sendEmoji(e)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
                Game started! React in chat 🎮
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className="chat-message"
                style={msg.system ? { justifyContent: 'center' } : {}}
              >
                {msg.system ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontStyle: 'italic',
                    }}
                  >
                    {msg.text}
                  </span>
                ) : (
                  <>
                    <div style={{ fontSize: '16px' }}>{msg.avatar}</div>
                    <div className="chat-bubble" style={{ borderRadius: '10px 10px 10px 3px' }}>
                      <div className="chat-name">{msg.playerName}</div>
                      <div className="chat-text">{msg.message}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '10px', borderTop: '1px solid var(--border-glass)' }}>
            <input
              id="game-chat-input"
              className="input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              placeholder="React..."
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              maxLength={200}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSendChat} style={{ flexShrink: 0 }}>
              ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
