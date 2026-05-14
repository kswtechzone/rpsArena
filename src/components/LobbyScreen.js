'use client';
import { useEffect, useState, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { useSocket } from '@/hooks/useSocket';

export default function LobbyScreen() {
  const { room, setRoom, playerName, setGameScreen, setRoundResult, setCountdownText, setChosenCount, resetGame } = useGame();
  const { emit, on, off, socketId } = useSocket();
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);
  const isHost = room?.hostId === socketId;

  useEffect(() => {
    if (!room) return;

    const handlePlayerJoined = ({ room: updatedRoom, playerName: newPlayerName }) => {
      setRoom(updatedRoom);
      setMessages((m) => [
        ...m,
        { system: true, text: `${newPlayerName} joined the room`, timestamp: Date.now() },
      ]);
    };

    const handlePlayerLeft = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setMessages((m) => [...m, { system: true, text: 'A player left the room', timestamp: Date.now() }]);
    };

    const handleSettingsUpdated = ({ room: updatedRoom }) => setRoom(updatedRoom);
    const handlePlayerReady = ({ room: updatedRoom }) => setRoom(updatedRoom);

    const handleGameStarted = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setGameScreen('game');
    };

    const handleCountdownTick = ({ text }) => {
      setCountdownText(text);
    };

    const handleRoundStarted = ({ room: updatedRoom }) => {
      setRoom(updatedRoom);
      setCountdownText('');
      setChosenCount(0);
      setGameScreen('game');
    };

    const handleChat = ({ chatMsg: msg }) => {
      setMessages((m) => [...m, msg]);
    };

    on('player_joined', handlePlayerJoined);
    on('player_left', handlePlayerLeft);
    on('settings_updated', handleSettingsUpdated);
    on('player_ready', handlePlayerReady);
    on('game_started', handleGameStarted);
    on('countdown_tick', handleCountdownTick);
    on('round_started', handleRoundStarted);
    on('chat_message', handleChat);

    return () => {
      off('player_joined', handlePlayerJoined);
      off('player_left', handlePlayerLeft);
      off('settings_updated', handleSettingsUpdated);
      off('player_ready', handlePlayerReady);
      off('game_started', handleGameStarted);
      off('countdown_tick', handleCountdownTick);
      off('round_started', handleRoundStarted);
      off('chat_message', handleChat);
    };
  }, [room, socketId, on, off, setRoom, setGameScreen, setRoundResult, setCountdownText, setChosenCount]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLeave = () => {
    emit('leave_room');
    resetGame();
  };

  const handleReady = () => {
    const me = room?.players.find((p) => p.id === socketId);
    emit('set_ready', { isReady: !me?.isReady });
  };

  const handleStartGame = () => {
    emit('start_game');
  };

  const handleSendChat = () => {
    if (!chatMsg.trim()) return;
    emit('send_chat', { message: chatMsg.trim() });
    setChatMsg('');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
  };

  if (!room) return null;

  const me = room.players.find((p) => p.id === socketId);
  const allReady = room.players.every((p) => p.isReady || p.id === room.hostId);
  const canStart = isHost && room.players.length >= 2 && allReady;

  const modeLabels = { ffa: '⚔️ Free For All', knockout: '💥 Knockout', team: '🤝 Team Mode' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleLeave}>
            ← Leave
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 800 }}>🎮 Game Lobby</h1>
          <div
            style={{
              padding: '6px 16px',
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--neon-purple)',
            }}
          >
            {modeLabels[room.settings.mode]}
          </div>
        </div>

        {/* Room Code */}
        <div
          className="glass-card"
          style={{ padding: '20px 28px', marginBottom: '20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Room Code — Share to Invite
          </div>
          <div
            id="room-code-display"
            className="room-code"
            style={{ cursor: 'pointer' }}
            onClick={copyCode}
            title="Click to copy"
          >
            {room.code}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '10px' }}
            onClick={copyCode}
          >
            📋 Copy Code
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          {/* Left: Players + Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Players */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700 }}>
                  Players ({room.players.length}/{room.settings.maxPlayers})
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Best of {room.settings.rounds}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {room.players.map((player) => (
                  <div key={player.id} className="player-card">
                    <div className="player-avatar">{player.avatar}</div>
                    <div className="player-info">
                      <div className="player-name">
                        {player.name}
                        {player.id === socketId && (
                          <span style={{ color: 'var(--neon-cyan)', fontSize: '11px', marginLeft: '6px' }}>
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="player-meta">
                        W:{player.wins} L:{player.losses}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {player.isHost && (
                        <span className="badge badge-host">HOST</span>
                      )}
                      {!player.isHost && (
                        <span className={`badge ${player.isReady ? 'badge-ready' : 'badge-waiting'}`}>
                          {player.isReady ? 'READY' : 'WAITING'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: room.settings.maxPlayers - room.players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: '2px dashed rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      +
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      Waiting for player...
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                {!isHost && (
                  <button
                    id="ready-btn"
                    className={`btn ${me?.isReady ? 'btn-secondary' : 'btn-green'}`}
                    style={{ flex: 1 }}
                    onClick={handleReady}
                  >
                    {me?.isReady ? '✅ Ready!' : '🙋 Ready Up'}
                  </button>
                )}
                {isHost && (
                  <button
                    id="start-match-btn"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleStartGame}
                    disabled={!canStart}
                    title={!canStart ? 'Need 2+ players and all ready' : ''}
                  >
                    🚀 Start Match
                  </button>
                )}
              </div>

              {isHost && !canStart && room.players.length < 2 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                  Need at least 2 players to start
                </p>
              )}
            </div>
          </div>

          {/* Right: Chat */}
          <div
            className="glass-card"
            style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: '400px' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700 }}>💬 Live Chat</h2>
            </div>

            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px' }}>
              {messages.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  No messages yet. Say hello! 👋
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
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontStyle: 'italic',
                      }}
                    >
                      {msg.text}
                    </span>
                  ) : (
                    <>
                      <div style={{ fontSize: '18px', flexShrink: 0 }}>{msg.avatar}</div>
                      <div className="chat-bubble">
                        <div className="chat-name">{msg.playerName}</div>
                        <div className="chat-text">{msg.message}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-row">
              <input
                id="chat-input"
                className="input"
                style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                placeholder="Message..."
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                maxLength={200}
              />
              <button
                id="send-chat-btn"
                className="btn btn-primary btn-sm"
                onClick={handleSendChat}
                style={{ flexShrink: 0 }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
