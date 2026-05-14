// Rock Paper Scissors Core Game Logic

export const CHOICES = {
  rock: { emoji: '🪨', beats: 'scissors', label: 'Rock', color: '#ef4444' },
  paper: { emoji: '📄', beats: 'rock', label: 'Paper', color: '#3b82f6' },
  scissors: { emoji: '✂️', beats: 'paper', label: 'Scissors', color: '#10b981' },
};

export const CHOICE_KEYS = ['rock', 'paper', 'scissors'];

/**
 * Determine winner for 2-player game
 */
export function determineWinner(choice1, choice2) {
  if (choice1 === choice2) return 'draw';
  if (CHOICES[choice1].beats === choice2) return 'player1';
  return 'player2';
}

/**
 * Determine winners/losers for multiplayer game.
 *
 * Rules:
 * - All same choice           → everyone draws
 * - All 3 choices present     → everyone draws (no dominant hand)
 * - Exactly 2 choices present → winning-choice players WIN, losing-choice players LOSE
 *
 * Returns { result: 'draw'|'win', winners, losers, draws, winningChoice }
 */
export function determineMultiplayerWinner(playerChoices) {
  const choicesPresent = [...new Set(playerChoices.map((p) => p.choice))];

  // All same → draw
  if (choicesPresent.length === 1) {
    return {
      result: 'draw',
      winners: [],
      losers: [],
      draws: playerChoices.map((p) => p.playerId),
      winningChoice: null,
    };
  }

  // All 3 different → draw (no dominant hand)
  if (choicesPresent.length === 3) {
    return {
      result: 'draw',
      winners: [],
      losers: [],
      draws: playerChoices.map((p) => p.playerId),
      winningChoice: null,
    };
  }

  // Exactly 2 choices → determine winner and loser
  const [choiceA, choiceB] = choicesPresent;
  const winningChoice = CHOICES[choiceA].beats === choiceB ? choiceA : choiceB;

  const winners = playerChoices
    .filter((p) => p.choice === winningChoice)
    .map((p) => p.playerId);
  const losers = playerChoices
    .filter((p) => p.choice !== winningChoice)
    .map((p) => p.playerId);

  return { result: 'win', winners, losers, draws: [], winningChoice };
}

/**
 * Generate a computer choice based on difficulty.
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {string|null} playerLastChoice - The player's most recent choice (used in hard mode)
 */
export function getComputerChoice(difficulty = 'medium', playerLastChoice = null) {
  if (difficulty === 'easy') {
    // Easy: biased to pick a losing hand ~40% of the time
    const weights = { rock: 0.2, paper: 0.4, scissors: 0.4 };
    const rand = Math.random();
    if (rand < weights.rock) return 'rock';
    if (rand < weights.rock + weights.paper) return 'paper';
    return 'scissors';
  }

  if (difficulty === 'hard' && playerLastChoice) {
    // Hard: counter the player's last move with 70% probability
    if (Math.random() < 0.70) {
      // Find what beats the player's last choice
      const counter = CHOICE_KEYS.find(
        (c) => CHOICES[c].beats === playerLastChoice
      );
      return counter || CHOICE_KEYS[Math.floor(Math.random() * 3)];
    }
    // 30% random to avoid being perfectly predictable
    return CHOICE_KEYS[Math.floor(Math.random() * 3)];
  }

  // Medium: fully random
  return CHOICE_KEYS[Math.floor(Math.random() * 3)];
}

/**
 * Generate a unique room code
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Get result message for display
 */
export function getResultMessage(result, isPlayer = true) {
  if (result === 'draw') return "It's a Draw! 🤝";
  if (result === 'win') return isPlayer ? 'You Win! 🏆' : 'Computer Wins! 🤖';
  return isPlayer ? 'You Lose! 😢' : 'Computer Wins! 🤖';
}
