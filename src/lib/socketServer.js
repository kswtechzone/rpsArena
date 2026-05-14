import { Server } from 'socket.io';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  setReady,
  updateSettings,
  startRound,
  submitChoice,
  addChat,
  getRoom,
  getPlayerRoom,
  nextRound,
} from './roomManager.js';

const COUNTDOWN_STEPS = ['Rock...', 'Paper...', 'Scissors...', 'SHOOT! 🎯'];

let io;

export function getIO() {
  return io;
}

export function initSocket(server) {
  if (io) return io;

  io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    addTrailingSlash: false,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ─── Room Management ───────────────────────────────────────────

    socket.on('create_room', ({ playerName, settings }) => {
      const room = createRoom(socket.id, playerName, settings);
      socket.join(room.code);
      socket.emit('room_created', { room });
    });

    socket.on('join_room', ({ code, playerName }) => {
      const result = joinRoom(code.toUpperCase(), socket.id, playerName);
      if (result.error) {
        socket.emit('join_error', { message: result.error });
        return;
      }
      socket.join(code.toUpperCase());
      socket.emit('room_joined', { room: result.room });
      io.to(code.toUpperCase()).emit('player_joined', {
        room: result.room,
        playerName,
      });
    });

    socket.on('leave_room', () => {
      handleLeave(socket);
    });

    socket.on('update_settings', ({ settings }) => {
      const room = updateSettings(socket.id, settings);
      if (room) {
        io.to(room.code).emit('settings_updated', { room });
      }
    });

    socket.on('set_ready', ({ isReady }) => {
      const room = setReady(socket.id, isReady);
      if (room) {
        io.to(room.code).emit('player_ready', { room });
      }
    });

    // ─── Game Flow ─────────────────────────────────────────────────

    socket.on('start_game', () => {
      const room = getPlayerRoom(socket.id);
      if (!room || room.hostId !== socket.id) return;
      if (room.players.length < 2) {
        socket.emit('start_error', { message: 'Need at least 2 players' });
        return;
      }

      room.state = 'countdown';
      io.to(room.code).emit('game_started', { room });

      // Synchronized countdown
      let step = 0;
      const countdownInterval = setInterval(() => {
        io.to(room.code).emit('countdown_tick', {
          step,
          text: COUNTDOWN_STEPS[step],
        });
        step++;
        if (step >= COUNTDOWN_STEPS.length) {
          clearInterval(countdownInterval);
          const updatedRoom = startRound(room.code);
          io.to(room.code).emit('round_started', { room: updatedRoom });
        }
      }, 1000);
    });

    socket.on('submit_choice', ({ choice }) => {
      const result = submitChoice(socket.id, choice);
      if (!result) return;

      const room = result.room;
      // Notify how many have chosen (without revealing choices)
      const chosenCount = room.players.filter((p) => p.choice !== null).length;
      io.to(room.code).emit('choice_submitted', {
        playerId: socket.id,
        chosenCount,
        totalPlayers: room.players.length,
      });

      if (result.allChosen) {
        // Brief delay before reveal for dramatic effect
        setTimeout(() => {
          io.to(room.code).emit('round_result', {
            room: result.room,
            roundResult: result.roundResult,
          });
        }, 800);
      }
    });

    socket.on('next_round', () => {
      const currentRoom = getPlayerRoom(socket.id);
      if (!currentRoom || currentRoom.hostId !== socket.id) return;
      const room = nextRound(currentRoom.code);
      if (room) {
        io.to(room.code).emit('next_round_started', { room });
      }
    });

    socket.on('start_countdown', () => {
      const room = getPlayerRoom(socket.id);
      if (!room || room.hostId !== socket.id) return;

      room.state = 'countdown';
      io.to(room.code).emit('round_countdown_started', { room });

      let step = 0;
      const countdownInterval = setInterval(() => {
        io.to(room.code).emit('countdown_tick', {
          step,
          text: COUNTDOWN_STEPS[step],
        });
        step++;
        if (step >= COUNTDOWN_STEPS.length) {
          clearInterval(countdownInterval);
          const updatedRoom = startRound(room.code);
          io.to(room.code).emit('round_started', { room: updatedRoom });
        }
      }, 1000);
    });

    // ─── Chat ──────────────────────────────────────────────────────

    socket.on('send_chat', ({ message }) => {
      if (!message?.trim()) return;
      const result = addChat(socket.id, message.trim());
      if (result) {
        io.to(result.room.code).emit('chat_message', {
          chatMsg: result.chatMsg,
        });
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      handleLeave(socket);
    });
  });

  return io;
}

function handleLeave(socket) {
  const result = leaveRoom(socket.id);
  if (!result) return;

  if (result.deleted) {
    console.log(`[Socket] Room ${result.code} deleted (empty)`);
    return;
  }

  socket.to(result.code).emit('player_left', { room: result.room });
  socket.leave(result.code);
}
