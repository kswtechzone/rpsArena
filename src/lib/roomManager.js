// Socket.IO server-side room management
import { generateRoomCode, determineMultiplayerWinner } from './gameLogic.js';

// In-memory store (replace with Redis in production)
const rooms = new Map();
const playerToRoom = new Map();

export function createRoom(hostId, hostName, settings = {}) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        avatar: getRandomAvatar(),
        isHost: true,
        isReady: false,
        score: 0,
        wins: 0,
        losses: 0,
        choice: null,
        status: 'online',
      },
    ],
    settings: {
      maxPlayers: settings.maxPlayers || 4,
      rounds: settings.rounds || 3,
      mode: settings.mode || 'ffa', // ffa, team, tournament, knockout
      timer: settings.timer || 15,
      roundTimer: settings.roundTimer || 15,
    },
    state: 'waiting', // waiting, countdown, playing, revealing, results, finished
    currentRound: 0,
    roundHistory: [],
    chat: [],
    countdown: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  playerToRoom.set(hostId, code);
  return room;
}

export function joinRoom(code, playerId, playerName) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };
  if (room.players.length >= room.settings.maxPlayers)
    return { error: 'Room is full' };
  if (room.players.find((p) => p.id === playerId))
    return { error: 'Already in room' };

  const player = {
    id: playerId,
    name: playerName,
    avatar: getRandomAvatar(),
    isHost: false,
    isReady: false,
    score: 0,
    wins: 0,
    losses: 0,
    choice: null,
    status: 'online',
  };
  room.players.push(player);
  playerToRoom.set(playerId, code);
  return { room };
}

export function leaveRoom(playerId) {
  const code = playerToRoom.get(playerId);
  if (!code) return null;
  const room = rooms.get(code);
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== playerId);
  playerToRoom.delete(playerId);

  if (room.players.length === 0) {
    rooms.delete(code);
    return { deleted: true, code };
  }

  // Transfer host if host left
  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  return { room, code };
}

export function setReady(playerId, isReady) {
  const code = playerToRoom.get(playerId);
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.isReady = isReady;
  return room;
}

export function updateSettings(hostId, settings) {
  const code = playerToRoom.get(hostId);
  const room = rooms.get(code);
  if (!room || room.hostId !== hostId) return null;
  room.settings = { ...room.settings, ...settings };
  return room;
}

export function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.state = 'playing';
  room.currentRound++;
  room.players.forEach((p) => (p.choice = null));
  return room;
}

export function submitChoice(playerId, choice) {
  const code = playerToRoom.get(playerId);
  const room = rooms.get(code);
  if (!room || room.state !== 'playing') return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.choice = choice;

  // Check if all players have chosen
  const allChosen = room.players.every((p) => p.choice !== null);
  if (allChosen) {
    room.state = 'revealing';
    const roundResult = resolveRound(room);
    return { room, roundResult, allChosen: true };
  }
  return { room, allChosen: false };
}

function resolveRound(room) {
  const playerChoices = room.players.map((p) => ({
    playerId: p.id,
    choice: p.choice,
  }));
  const result = determineMultiplayerWinner(playerChoices);

  // Update scores
  result.winners.forEach((winnerId) => {
    const player = room.players.find((p) => p.id === winnerId);
    if (player) {
      player.score++;
      player.wins++;
    }
  });
  result.losers.forEach((loserId) => {
    const player = room.players.find((p) => p.id === loserId);
    if (player) player.losses++;
  });

  const roundRecord = {
    round: room.currentRound,
    choices: playerChoices,
    result,
    timestamp: Date.now(),
  };
  room.roundHistory.push(roundRecord);

  // Check if game over
  if (room.currentRound >= room.settings.rounds) {
    room.state = 'finished';
  } else {
    room.state = 'results';
  }

  return roundRecord;
}

export function addChat(playerId, message) {
  const code = playerToRoom.get(playerId);
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  const chatMsg = {
    playerId,
    playerName: player?.name || 'Unknown',
    avatar: player?.avatar,
    message: message.slice(0, 200),
    timestamp: Date.now(),
  };
  room.chat.push(chatMsg);
  if (room.chat.length > 50) room.chat.shift();
  return { room, chatMsg };
}

export function getRoom(code) {
  return rooms.get(code);
}

export function getPlayerRoom(playerId) {
  const code = playerToRoom.get(playerId);
  return code ? rooms.get(code) : null;
}

export function nextRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.state = 'waiting';
  room.players.forEach((p) => {
    p.choice = null;
    p.isReady = false;
  });
  return room;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🦄', '🐸', '🐺', '🦅', '🐉', '🦋'];
let avatarIndex = 0;
function getRandomAvatar() {
  return AVATARS[avatarIndex++ % AVATARS.length];
}
