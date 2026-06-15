/**
 * socket.ts — thin Socket.IO client wrapper for real-time multiplayer.
 * Handles connection, reconnect, room join, and the core game events.
 * The event names here mirror server/index.js.
 */
import { io, Socket } from 'socket.io-client';
import { Arrangement, GameState, Player, RoomConfig } from '../types/game';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

export type ServerEvents = {
  'room:state': (state: GameState) => void;
  'round:deal': (payload: { hand: Arrangement extends never ? never : any }) => void;
  'player:joined': (p: Player) => void;
  'player:left': (id: string) => void;
  'round:reveal': (payload: { players: Player[] }) => void;
  'error': (msg: string) => void;
};

class GameSocket {
  private socket: Socket | null = null;

  connect(token?: string) {
    if (this.socket?.connected) return this.socket;
    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });

    this.socket.on('connect', () => console.log('[socket] connected', this.socket?.id));
    this.socket.on('disconnect', (r) => console.log('[socket] disconnected', r));
    this.socket.io.on('reconnect', (n) => console.log('[socket] reconnected after', n));
    return this.socket;
  }

  on<E extends keyof ServerEvents>(event: E, cb: ServerEvents[E]) {
    this.socket?.on(event as string, cb as any);
  }
  off<E extends keyof ServerEvents>(event: E, cb?: ServerEvents[E]) {
    this.socket?.off(event as string, cb as any);
  }

  // ---- client → server ----
  createRoom(config: Partial<RoomConfig>) {
    this.socket?.emit('room:create', config);
  }
  joinRoom(roomId: string, asSpectator = false) {
    this.socket?.emit('room:join', { roomId, asSpectator });
  }
  leaveRoom(roomId: string) {
    this.socket?.emit('room:leave', { roomId });
  }
  ready() {
    this.socket?.emit('round:ready');
  }
  submitArrangement(arrangement: Arrangement) {
    this.socket?.emit('round:submit', { arrangement });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const gameSocket = new GameSocket();
