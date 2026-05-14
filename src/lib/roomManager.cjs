// CJS version of roomManager for use in custom server
const { generateRoomCode, determineMultiplayerWinner } = require('./gameLogic.cjs');

const rooms = new Map();
const playerToRoom = new Map();

function createRoom(hostId, hostName, settings = {}) {
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
      mode: settings.mode || 'ffa',
      timer: settings.timer || 15,
      roundTimer: settings.roundTimer || 15,
    },
    state: 'waiting',
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

function joinRoom(code, playerId, playerName) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.state !== 'waiting') return { error: 'Game already in progress' };
  if (room.players.length >= room.settings.maxPlayers) return { error: 'Room is full' };
  if (room.players.find((p) => p.id === playerId)) return { error: 'Already in room' };

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

function leaveRoom(playerId) {
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

  if (room.hostId === playerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  return { room, code };
}

function setReady(playerId, isReady) {
  const code = playerToRoom.get(playerId);
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.isReady = isReady;
  return room;
}

function updateSettings(hostId, settings) {
  const code = playerToRoom.get(hostId);
  const room = rooms.get(code);
  if (!room || room.hostId !== hostId) return null;
  room.settings = { ...room.settings, ...settings };
  return room;
}

function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.state = 'playing';
  room.currentRound++;
  room.players.forEach((p) => (p.choice = null));
  return room;
}

function submitChoice(playerId, choice) {
  const code = playerToRoom.get(playerId);
  const room = rooms.get(code);
  if (!room || room.state !== 'playing') return null;
  const player = room.players.find((p) => p.id === playerId);
  if (player) player.choice = choice;

  const allChosen = room.players.every((p) => p.choice !== null);
  if (allChosen) {
    room.state = 'revealing';
    const roundResult = resolveRound(room);
    return { room, roundResult, allChosen: true };
  }
  return { room, allChosen: false };
}

function resolveRound(room) {
  const playerChoices = room.players.map((p) => ({ playerId: p.id, choice: p.choice }));
  const result = determineMultiplayerWinner(playerChoices);

  // Update wins and scores for winners
  result.winners.forEach((winnerId) => {
    const player = room.players.find((p) => p.id === winnerId);
    if (player) {
      player.score++;
      player.wins++;
    }
  });

  // Update losses for losers
  result.losers.forEach((loserId) => {
    const player = room.players.find((p) => p.id === loserId);
    if (player) {
      player.losses++;
    }
  });

  const roundRecord = { round: room.currentRound, choices: playerChoices, result, timestamp: Date.now() };
  room.roundHistory.push(roundRecord);

  if (room.currentRound >= room.settings.rounds) {
    room.state = 'finished';
  } else {
    room.state = 'results';
  }

  return roundRecord;
}

function addChat(playerId, message) {
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

function getRoom(code) { return rooms.get(code); }
function getPlayerRoom(playerId) {
  const code = playerToRoom.get(playerId);
  return code ? rooms.get(code) : null;
}

function nextRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.state = 'waiting';
  room.players.forEach((p) => { p.choice = null; p.isReady = false; });
  return room;
}

function resetRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  room.state = 'waiting';
  room.currentRound = 0;
  room.roundHistory = [];
  room.players.forEach((p) => {
    p.choice = null;
    p.isReady = false;
    p.score = 0;
    p.wins = 0;
    p.losses = 0;
  });
  return room;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🦄', '🐸', '🐺', '🦅', '🐉', '🦋'];
let avatarIndex = 0;
function getRandomAvatar() { return AVATARS[avatarIndex++ % AVATARS.length]; }

module.exports = {
  createRoom, joinRoom, leaveRoom, setReady, updateSettings,
  startRound, submitChoice, addChat, getRoom, getPlayerRoom, nextRound, resetRoom,
};
