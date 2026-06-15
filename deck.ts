/**
 * deck.ts — build, shuffle and deal a 52-card deck.
 */
import { Card, Rank, Suit } from './game';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const RANK_LABEL: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '\u2660', // ♠
  H: '\u2665', // ♥
  D: '\u2666', // ♦
  C: '\u2663', // ♣
};

export const isRedSuit = (s: Suit) => s === 'H' || s === 'D';

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}${rank}`, suit, rank });
    }
  }
  return deck;
}

/** Fisher–Yates shuffle (pure, returns a new array). */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal 13 cards to each of `playerCount` players. */
export function deal(playerCount: number, rng?: () => number): Card[][] {
  const deck = shuffle(buildDeck(), rng);
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < 13 * playerCount; i++) {
    hands[i % playerCount].push(deck[i]);
  }
  // Sort each hand high→low for a tidy fan.
  return hands.map((h) => h.sort((a, b) => b.rank - a.rank));
}
