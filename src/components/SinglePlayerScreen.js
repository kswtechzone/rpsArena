'use client';
import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { CHOICES, getComputerChoice, determineWinner, getResultMessage } from '@/lib/gameLogic';

const CHOICE_KEYS = ['rock', 'paper', 'scissors'];
const COUNTDOWN_TEXTS = ['Rock...', 'Paper...', 'Scissors...', 'SHOOT! 🎯'];

export default function SinglePlayerScreen() {
  const { playerName, setGameScreen, updateStats, globalStats } = useGame();
  const [phase, setPhase] = useState('idle'); // idle | countdown | choose | revealing | result
  const [countdownStep, setCountdownStep] = useState(0);
  const [playerChoice, setPlayerChoice] = useState(null);
  const [cpuChoice, setCpuChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState({ player: 0, cpu: 0, draws: 0 });
  const [rounds, setRounds] = useState(0);
  const [history, setHistory] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [lastPlayerChoice, setLastPlayerChoice] = useState(null);
  const countdownRef = useRef(null);

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('rps_sp_stats');
    if (savedStats) {
      try {
        setScores(JSON.parse(savedStats));
      } catch (e) {
        console.error('Failed to parse saved stats');
      }
    }
    return () => clearInterval(countdownRef.current);
  }, []);

  const startRound = () => {
    setPlayerChoice(null);
    setCpuChoice(null);
    setResult(null);
    setPhase('countdown');
    setCountdownStep(0);

    let step = 0;
    countdownRef.current = setInterval(() => {
      step++;
      setCountdownStep(step);
      if (step >= COUNTDOWN_TEXTS.length - 1) {
        clearInterval(countdownRef.current);
        setPhase('choose');
      }
    }, 900);
  };

  const handleChoice = (choice) => {
    if (phase !== 'choose') return;
    clearInterval(countdownRef.current);
    setPlayerChoice(choice);
    setPhase('revealing');

    // Slight delay for CPU reveal drama
      setTimeout(() => {
        const cpu = getComputerChoice(difficulty, lastPlayerChoice);
        setCpuChoice(cpu);
        setLastPlayerChoice(choice);
        const outcome = determineWinner(choice, cpu);
        setResult(outcome);
        setRounds((r) => r + 1);

        // Update session scores
        setScores((s) => {
          const newStats = {
            player: outcome === 'player1' ? s.player + 1 : s.player,
            cpu: outcome === 'player2' ? s.cpu + 1 : s.cpu,
            draws: outcome === 'draw' ? s.draws + 1 : s.draws,
          };
          localStorage.setItem('rps_sp_stats', JSON.stringify(newStats));
          return newStats;
        });

        // Update global persistent stats
        if (outcome === 'player1') updateStats('win');
        else if (outcome === 'player2') updateStats('loss');
        else updateStats('draw');

        setHistory((h) => [{ round: rounds + 1, player: choice, cpu, outcome }, ...h.slice(0, 9)]);
        setPhase('result');
      }, 600);
  };

  const getOutcomeForHistory = (outcome) => {
    if (outcome === 'player1') return { text: 'Win', color: '#10b981' };
    if (outcome === 'player2') return { text: 'Loss', color: '#ef4444' };
    return { text: 'Draw', color: '#06b6d4' };
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingTop: '20px',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        <button className="btn btn-secondary btn-sm" onClick={() => setGameScreen('home')}>
          ← Back
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center' }}>
          🤖 vs AI
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Difficulty:</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input"
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
          >
            <option value="easy" style={{ background: '#1a1030' }}>Easy</option>
            <option value="medium" style={{ background: '#1a1030' }}>Medium</option>
            <option value="hard" style={{ background: '#1a1030' }}>Hard (Difficult)</option>
          </select>
        </div>
      </div>

      {/* Scoreboard */}
      <div
        className="glass-card"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '16px',
          alignItems: 'center',
          padding: '24px 32px',
          width: '100%',
          marginBottom: '24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {playerName || 'You'}
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {scores.player}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: 'var(--text-muted)', fontWeight: 300 }}>vs</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Draws: {scores.draws}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Computer
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {scores.cpu}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div
        className="glass-card"
        style={{
          width: '100%',
          padding: '32px',
          marginBottom: '24px',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {phase === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px', animation: 'bounce 1s ease-in-out infinite' }}>🎮</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px' }}>
              Ready to battle the computer?
            </p>
            <button id="start-game-btn" className="btn btn-primary btn-lg" onClick={startRound}>
              ⚡ Start Game
            </button>
          </div>
        )}

        {(phase === 'countdown' || phase === 'choose') && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div className="countdown-text" style={{ marginBottom: '24px' }}>
              {COUNTDOWN_TEXTS[countdownStep]}
            </div>

            {phase === 'choose' && (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>
                  Choose your weapon!
                </p>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {CHOICE_KEYS.map((choice) => (
                    <button
                      key={choice}
                      id={`choice-${choice}`}
                      className={`choice-btn ${choice} ${playerChoice === choice ? 'selected' : ''}`}
                      onClick={() => handleChoice(choice)}
                    >
                      <span className="choice-emoji">{CHOICES[choice].emoji}</span>
                      <span className="choice-label">{CHOICES[choice].label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'revealing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px', animation: 'spin 0.5s linear' }}>⚡</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', fontWeight: 600 }}>
              Revealing...
            </p>
          </div>
        )}

        {phase === 'result' && result && (
          <div style={{ textAlign: 'center', width: '100%', animation: 'fadeInUp 0.5s ease' }}>
            {/* Choices */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '32px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {playerName || 'You'}
                </div>
                <div
                  style={{
                    fontSize: '72px',
                    filter: result === 'player1' ? 'drop-shadow(0 0 20px rgba(16,185,129,0.8))' : result === 'draw' ? 'none' : 'grayscale(0.5)',
                  }}
                >
                  {playerChoice ? CHOICES[playerChoice].emoji : '?'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {playerChoice ? CHOICES[playerChoice].label : ''}
                </div>
              </div>

              <div style={{ fontSize: '40px', color: 'var(--text-muted)' }}>⚔️</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Computer
                </div>
                <div
                  style={{
                    fontSize: '72px',
                    filter: result === 'player2' ? 'drop-shadow(0 0 20px rgba(239,68,68,0.8))' : result === 'draw' ? 'none' : 'grayscale(0.5)',
                  }}
                >
                  {cpuChoice ? CHOICES[cpuChoice].emoji : '?'}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {cpuChoice ? CHOICES[cpuChoice].label : ''}
                </div>
              </div>
            </div>

            {/* Result */}
            <div
              className={`result-winner ${result === 'player1' ? 'result-win' : result === 'player2' ? 'result-lose' : 'result-draw'}`}
              style={{ marginBottom: '24px', fontSize: '40px' }}
            >
              {getResultMessage(result === 'player1' ? 'win' : result === 'draw' ? 'draw' : 'player2', result !== 'player2')}
            </div>

            <button
              id="next-round-btn"
              className="btn btn-primary btn-lg"
              onClick={startRound}
            >
              🔄 Play Again
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card" style={{ width: '100%', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Recent Rounds
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.slice(0, 5).map((h, i) => {
              const o = getOutcomeForHistory(h.outcome);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', width: '30px', fontSize: '12px' }}>R{h.round}</span>
                  <span>{CHOICES[h.player]?.emoji} {CHOICES[h.player]?.label}</span>
                  <span style={{ color: 'var(--text-muted)' }}>vs</span>
                  <span>{CHOICES[h.cpu]?.emoji} {CHOICES[h.cpu]?.label}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: o.color,
                      background: `${o.color}20`,
                      padding: '2px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {o.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
