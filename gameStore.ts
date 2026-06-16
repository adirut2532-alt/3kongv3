/**
 * gameStore.ts — single source of truth for the client game state.
 * Built on Zustand. Pure local logic so the UI works fully offline
 * (vs bots); socket.ts syncs the same actions for online play.
 */
import { create } from 'zustand';
import {
  Arrangement,
  Card,
  GamePhase,
  GameState,
  Player,
  RoomConfig,
  RowKey,
  SettlementEntry,
} from './game';
import { deal } from './deck';
import { autoArrange } from './autoArrange';
import { ROW_SIZE, settleTable, validateArrangement } from './scoring';

const DEFAULT_CONFIG: RoomConfig = {
  roomId: 'LOCAL',
  isPrivate: false,
  baseBet: 10,
  rakePercent: 5,
  rateMultiplier: 1,
  maxRounds: 10,
};

interface GameStore extends GameState {
  hand: Card[];                 // my undealt/unplaced cards
  pendingHand: Card[];          // dealt cards held until deal animation finishes
  arrangement: Arrangement;     // my working rows
  selectedCardId: string | null;
  foulReason?: string;
  settlement?: SettlementEntry[];

  // actions
  startRound: () => void;
  finishDealing: () => void;
  selectCard: (id: string | null) => void;
  moveCard: (id: string, target: RowKey | 'fan') => boolean;
  placeCard: (id: string, row: RowKey) => void;
  removeFromRow: (id: string, row: RowKey) => void;
  autoArrangeMe: () => void;
  clearArrangement: () => void;
  setArrangement: (a: Arrangement) => void;
  confirm: () => boolean;       // returns false if foul
  reveal: () => void;
  reset: () => void;
}

const emptyArrangement = (): Arrangement => ({ top: [], middle: [], bottom: [] });

function makeBots(): Player[] {
  const names = ['คุณ', 'น้องเฟิร์น', 'พี่โอ๊ต', 'เสี่ยหมู'];
  return names.map((name, seat) => ({
    id: seat === 0 ? 'me' : `bot${seat}`,
    name,
    coins: 5000,
    vipLevel: seat === 0 ? 3 : 1,
    seat,
    status: 'waiting',
    isBot: seat !== 0,
    isHost: seat === 0,
  }));
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'lobby',
  round: 0,
  pot: 0,
  dealerSeat: 0,
  config: DEFAULT_CONFIG,
  players: makeBots(),
  me: 'me',
  hand: [],
  pendingHand: [],
  arrangement: emptyArrangement(),
  selectedCardId: null,

  startRound: () => {
    const players = get().players;
    const hands = deal(players.length);
    const updated: Player[] = players.map((p) => ({
      ...p,
      status: 'waiting' as const,
      arrangement: undefined as Arrangement | undefined,
      roundScore: undefined as number | undefined,
    }));
    // Bots arrange immediately (hidden until reveal).
    updated.forEach((p, i) => {
      if (p.isBot) p.arrangement = autoArrange(hands[i]);
    });
    set({
      phase: 'dealing',              // deal animation runs first
      round: get().round + 1,
      players: updated,
      hand: [],                      // fan stays empty during dealing
      pendingHand: hands[0],         // revealed when dealing finishes
      arrangement: emptyArrangement(),
      selectedCardId: null,
      foulReason: undefined,
      settlement: undefined,
      turnEndsAt: undefined,
    });
  },

  // Called by the deal animation when the last card has landed.
  finishDealing: () => {
    const { pendingHand, players } = get();
    set({
      phase: 'arranging',
      hand: pendingHand,
      pendingHand: [],
      players: players.map((p) => ({ ...p, status: 'arranging' as const })),
      turnEndsAt: Date.now() + 60_000,
    });
  },

  selectCard: (id) => set({ selectedCardId: id }),

  /**
   * Move a card from wherever it currently lives (fan or a row) to `target`.
   * Returns true only if something actually changed — the drag layer uses
   * this to decide between "committed" (unmount) and "snap back".
   */
  moveCard: (id, target) => {
    const { hand, arrangement } = get();

    // locate source
    let card: Card | undefined = hand.find((c) => c.id === id);
    let source: RowKey | 'fan' = 'fan';
    if (!card) {
      for (const r of ['top', 'middle', 'bottom'] as RowKey[]) {
        const found = arrangement[r].find((c) => c.id === id);
        if (found) { card = found; source = r; break; }
      }
    }
    if (!card || source === target) return false;

    // reject if target row already full
    if (target !== 'fan' && arrangement[target].length >= ROW_SIZE[target]) return false;

    let newHand = hand;
    const newArr: Arrangement = {
      top: [...arrangement.top],
      middle: [...arrangement.middle],
      bottom: [...arrangement.bottom],
    };

    if (source === 'fan') newHand = hand.filter((c) => c.id !== id);
    else newArr[source] = newArr[source].filter((c) => c.id !== id);

    if (target === 'fan') newHand = [...newHand, card].sort((a, b) => b.rank - a.rank);
    else newArr[target] = [...newArr[target], card];

    set({ hand: newHand, arrangement: newArr, selectedCardId: null, foulReason: undefined });
    return true;
  },

  placeCard: (id, row) => {
    const { hand, arrangement } = get();
    if (arrangement[row].length >= ROW_SIZE[row]) return;
    const card = hand.find((c) => c.id === id);
    if (!card) return;
    set({
      hand: hand.filter((c) => c.id !== id),
      arrangement: { ...arrangement, [row]: [...arrangement[row], card] },
      selectedCardId: null,
    });
  },

  removeFromRow: (id, row) => {
    const { hand, arrangement } = get();
    const card = arrangement[row].find((c) => c.id === id);
    if (!card) return;
    set({
      hand: [...hand, card].sort((a, b) => b.rank - a.rank),
      arrangement: { ...arrangement, [row]: arrangement[row].filter((c) => c.id !== id) },
    });
  },

  autoArrangeMe: () => {
    const { hand, arrangement } = get();
    const all = [...hand, ...arrangement.top, ...arrangement.middle, ...arrangement.bottom];
    if (all.length !== 13) return;
    set({ arrangement: autoArrange(all), hand: [], selectedCardId: null, foulReason: undefined });
  },

  setArrangement: (a) => set({ arrangement: a, hand: [], selectedCardId: null, foulReason: undefined }),

  clearArrangement: () => {
    const { hand, arrangement } = get();
    const all = [...hand, ...arrangement.top, ...arrangement.middle, ...arrangement.bottom]
      .sort((a, b) => b.rank - a.rank);
    set({ hand: all, arrangement: emptyArrangement(), selectedCardId: null, foulReason: undefined });
  },

  confirm: () => {
    const { arrangement, players } = get();
    const check = validateArrangement(arrangement);
    if (!check.valid) {
      set({ foulReason: check.reason });
      return false;
    }
    const updated = players.map((p) =>
      p.id === 'me' ? { ...p, arrangement, status: 'ready' as const } : p
    );
    set({ players: updated, foulReason: undefined });
    return true;
  },

  reveal: () => {
    const { players, config } = get();
    const settlement = settleTable(players, config);
    const byId = new Map(settlement.map((s) => [s.playerId, s]));
    const updated = players.map((p) => ({
      ...p,
      status: 'revealed' as const,
      coins: p.coins + (byId.get(p.id)?.delta ?? 0),
      roundScore: byId.get(p.id)?.delta ?? 0,
    }));
    set({ phase: 'result', players: updated, settlement });
  },

  updateConfig: (partial: Partial<RoomConfig>) => {
    const { config } = get();
    set({ config: { ...config, ...partial } });
  },

  reset: () =>
    set({
      phase: 'lobby',
      arrangement: emptyArrangement(),
      hand: [],
      selectedCardId: null,
      foulReason: undefined,
      settlement: undefined,
    }),
}));
