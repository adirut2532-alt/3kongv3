/**
 * game.ts — shared types for the whole game.
 */

export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades, Hearts, Diamonds, Clubs
export type Rank = number;





export interface Card {
  id: string;        // unique e.g. "S14"
  suit: Suit;
  rank: Rank;
}

/** The three rows a player must build. */
export type RowKey = 'top' | 'middle' | 'bottom';

export interface Arrangement {
  top: Card[];     // exactly 3
  middle: Card[];  // exactly 5
  bottom: Card[];  // exactly 5
}

/** Poker hand categories (higher number = stronger). */
export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourKind = 7,
  StraightFlush = 8,
}

/** Result of evaluating a row, with a comparable numeric strength. */
export interface HandValue {
  category: HandCategory;
  /** Tie-break ranks, highest first. */
  tiebreak: Rank[];
  /** Single sortable score for quick comparison. */
  score: number;
  label: string;        // Thai label e.g. "ตอง", "เรียง"
  labelEn: string;
}

export type PlayerStatus =
  | 'waiting'
  | 'arranging'
  | 'ready'
  | 'revealed'
  | 'fouled'
  | 'disconnected';

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  coins: number;
  vipLevel: number;
  seat: number;            // 0..3
  status: PlayerStatus;
  isBot?: boolean;
  isHost?: boolean;
  arrangement?: Arrangement;
  roundScore?: number;
}

export type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'arranging'
  | 'revealing'
  | 'result';

export interface RoomConfig {
  roomId: string;
  isPrivate: boolean;
  baseBet: number;        // เดิมพันต่อแต้ม
  rakePercent: number;    // ค่าน้ำ %
  rateMultiplier: number; // ตัวคูณห้อง
  maxRounds: number;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  pot: number;
  dealerSeat: number;
  config: RoomConfig;
  players: Player[];
  me: string;             // my player id
  turnEndsAt?: number;    // epoch ms for timer
}

/** Per-row comparison outcome between two players. */
export interface RowResult {
  row: RowKey;
  winnerId: string | null; // null = tie
  bonus: number;           // เด้ง multiplier on this row
}

export interface SettlementEntry {
  playerId: string;
  delta: number;           // +/- coins this round
  isMvp?: boolean;
}
