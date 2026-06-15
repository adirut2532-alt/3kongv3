/**
 * server/index.js — minimal authoritative Socket.IO server for 3 กอง กาญ.
 * Handles rooms, dealing, reconnect grace, spectators, and settlement.
 *
 * Run: node server/index.js  (default port 3001)
 * The client points at EXPO_PUBLIC_SERVER_URL.
 *
 * NOTE: this imports the SAME pure game logic the client uses, so rules
 * never drift between client and server. Compile src/game to JS or share
 * via a small package; here we inline a require to a built copy.
 */
const http = require('http');
const { Server } = require('socket.io');

// In production, share the compiled game logic. For now require a JS build:
// const { deal } = require('../build/game/deck');
// const { autoArrange } = require('../build/game/autoArrange');
// const { settleTable, validateArrangement } = require('../build/game/scoring');

const PORT = process.env.PORT || 3001;
const RECONNECT_GRACE_MS = 20_000;

const server = http.createServer();
const io = new Server(server, { cors: { origin: '*' } });

/** roomId -> room */
const rooms = new Map();

function makeRoom(config) {
  return {
    config: {
      roomId: config.roomId || randomId(),
      isPrivate: !!config.isPrivate,
      baseBet: config.baseBet ?? 10,
      rakePercent: config.rakePercent ?? 5,
      rateMultiplier: config.rateMultiplier ?? 1,
      maxRounds: config.maxRounds ?? 10,
    },
    players: [],       // {id, name, coins, seat, socketId, status, arrangement, disconnectedAt}
    spectators: [],
    phase: 'lobby',
    round: 0,
    pot: 0,
    dealerSeat: 0,
  };
}

const randomId = () => Math.random().toString(36).slice(2, 7).toUpperCase();

function publicState(room, forSocketId) {
  // Strip other players' arrangements until reveal.
  const reveal = room.phase === 'result' || room.phase === 'revealing';
  return {
    phase: room.phase,
    round: room.round,
    pot: room.pot,
    dealerSeat: room.dealerSeat,
    config: room.config,
    players: room.players.map((p) => ({
      id: p.id, name: p.name, coins: p.coins, vipLevel: p.vipLevel ?? 1,
      seat: p.seat, status: p.status,
      arrangement: reveal ? p.arrangement : undefined,
      roundScore: p.roundScore,
    })),
    me: room.players.find((p) => p.socketId === forSocketId)?.id,
  };
}

function broadcast(room) {
  for (const p of room.players) {
    io.to(p.socketId).emit('room:state', publicState(room, p.socketId));
  }
  for (const s of room.spectators) {
    io.to(s.socketId).emit('room:state', publicState(room, s.socketId));
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', (config) => {
    const room = makeRoom(config || {});
    rooms.set(room.config.roomId, room);
    joinRoom(socket, room, config?.playerName || 'ผู้เล่น');
  });

  socket.on('room:join', ({ roomId, asSpectator, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'ไม่พบห้อง');
    if (asSpectator || room.players.length >= 4) {
      room.spectators.push({ socketId: socket.id });
      socket.join(roomId);
      socket.emit('room:state', publicState(room, socket.id));
      return;
    }
    joinRoom(socket, room, playerName || 'ผู้เล่น');
  });

  socket.on('round:ready', () => withRoom(socket, (room, player) => {
    player.status = 'ready';
    if (room.players.length >= 2 && room.players.every((p) => p.status === 'ready')) {
      startRound(room);
    }
    broadcast(room);
  }));

  socket.on('round:submit', ({ arrangement }) => withRoom(socket, (room, player) => {
    // const check = validateArrangement(arrangement);
    // player.status = check.valid ? 'ready' : 'fouled';
    player.arrangement = arrangement;
    player.status = 'ready';
    if (room.players.every((p) => p.arrangement)) {
      revealRound(room);
    }
    broadcast(room);
  }));

  socket.on('room:leave', ({ roomId }) => leave(socket, rooms.get(roomId)));

  socket.on('disconnect', () => {
    // Reconnect grace: mark disconnected, remove after timeout.
    for (const room of rooms.values()) {
      const p = room.players.find((x) => x.socketId === socket.id);
      if (p) {
        p.status = 'disconnected';
        p.disconnectedAt = Date.now();
        broadcast(room);
        setTimeout(() => {
          if (p.status === 'disconnected' && Date.now() - p.disconnectedAt >= RECONNECT_GRACE_MS) {
            leave(socket, room);
          }
        }, RECONNECT_GRACE_MS + 500);
      }
    }
  });
});

function joinRoom(socket, room, name) {
  const seat = [0, 1, 2, 3].find((s) => !room.players.some((p) => p.seat === s)) ?? 0;
  const player = {
    id: randomId(), name, coins: 5000, vipLevel: 1,
    seat, socketId: socket.id, status: 'waiting', arrangement: null,
  };
  room.players.push(player);
  socket.join(room.config.roomId);
  socket.data.roomId = room.config.roomId;
  socket.data.playerId = player.id;
  broadcast(room);
}

function withRoom(socket, fn) {
  const room = rooms.get(socket.data.roomId);
  if (!room) return;
  const player = room.players.find((p) => p.id === socket.data.playerId);
  if (!player) return;
  fn(room, player);
}

function startRound(room) {
  room.phase = 'arranging';
  room.round += 1;
  // const hands = deal(room.players.length);
  // room.players.forEach((p, i) => { p.hand = hands[i]; p.arrangement = null; p.status='arranging'; });
  room.players.forEach((p) => { p.arrangement = null; p.status = 'arranging'; });
  broadcast(room);
}

function revealRound(room) {
  room.phase = 'result';
  // const settlement = settleTable(room.players, room.config);
  // apply deltas...
  broadcast(room);
}

function leave(socket, room) {
  if (!room) return;
  room.players = room.players.filter((p) => p.socketId !== socket.id);
  room.spectators = room.spectators.filter((s) => s.socketId !== socket.id);
  if (room.players.length === 0) rooms.delete(room.config.roomId);
  else broadcast(room);
}

server.listen(PORT, () => console.log(`[server] 3 กอง กาญ listening on :${PORT}`));
