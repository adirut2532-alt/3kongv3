/**
 * handEvaluator.ts — evaluate 3-card and 5-card poker hands into a
 * comparable HandValue. This is the heart of the game.
 *
 * score encoding: category occupies the high digits, tiebreak ranks
 * are packed below it so a single integer compare is enough.
 */
import { Card, HandCategory, HandValue, Rank } from './game';

const TH_LABEL: Record<HandCategory, [string, string]> = {
  [HandCategory.HighCard]: ['ไพ่สูง', 'High Card'],
  [HandCategory.Pair]: ['คู่', 'Pair'],
  [HandCategory.TwoPair]: ['สองคู่', 'Two Pair'],
  [HandCategory.ThreeKind]: ['ตอง', 'Three of a Kind'],
  [HandCategory.Straight]: ['เรียง', 'Straight'],
  [HandCategory.Flush]: ['สีเดียว', 'Flush'],
  [HandCategory.FullHouse]: ['ฟูลเฮาส์', 'Full House'],
  [HandCategory.FourKind]: ['โฟร์การ์ด', 'Four of a Kind'],
  [HandCategory.StraightFlush]: ['สเตรทฟลัช', 'Straight Flush'],
};

function countByRank(cards: Card[]): Map<Rank, number> {
  const m = new Map<Rank, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return m;
}

/** Ranks present, ordered by (count desc, rank desc) — ideal tiebreak order. */
function rankGroups(cards: Card[]): { rank: Rank; count: number }[] {
  const counts = countByRank(cards);
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit);
}

/** Returns the high card rank of a straight, or null. Handles A-2-3-4-5 wheel. */
function straightHigh(cards: Card[]): Rank | null {
  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b);
  if (ranks.length !== cards.length) return null; // duplicates → not a straight
  // wheel: A,2,3,4,5
  const isWheel =
    cards.length === 5 &&
    ranks.includes(14) &&
    ranks.includes(2) &&
    ranks.includes(3) &&
    ranks.includes(4) &&
    ranks.includes(5);
  if (isWheel) return 5 as Rank;
  const consecutive = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
  return consecutive ? (ranks[ranks.length - 1] as Rank) : null;
}

function pack(category: HandCategory, tiebreak: Rank[]): number {
  // Each tiebreak slot gets 4 bits (ranks max 14). Category sits above 5 slots.
  let score = category * Math.pow(16, 5);
  tiebreak.slice(0, 5).forEach((r, i) => {
    score += r * Math.pow(16, 4 - i);
  });
  return score;
}

function make(category: HandCategory, tiebreak: Rank[]): HandValue {
  const [label, labelEn] = TH_LABEL[category];
  return { category, tiebreak, score: pack(category, tiebreak), label, labelEn };
}

/** Evaluate a 5-card hand. */
export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('evaluate5 needs exactly 5 cards');
  const groups = rankGroups(cards);
  const flush = isFlush(cards);
  const sHigh = straightHigh(cards);
  const tiebreak = groups.map((g) => g.rank);

  if (sHigh && flush) return make(HandCategory.StraightFlush, [sHigh]);
  if (groups[0].count === 4) return make(HandCategory.FourKind, tiebreak);
  if (groups[0].count === 3 && groups[1]?.count === 2)
    return make(HandCategory.FullHouse, tiebreak);
  if (flush) return make(HandCategory.Flush, cards.map((c) => c.rank).sort((a, b) => b - a));
  if (sHigh) return make(HandCategory.Straight, [sHigh]);
  if (groups[0].count === 3) return make(HandCategory.ThreeKind, tiebreak);
  if (groups[0].count === 2 && groups[1]?.count === 2)
    return make(HandCategory.TwoPair, tiebreak);
  if (groups[0].count === 2) return make(HandCategory.Pair, tiebreak);
  return make(HandCategory.HighCard, tiebreak);
}

/** Evaluate a 3-card hand (top row): only high / pair / trips count. */
export function evaluate3(cards: Card[]): HandValue {
  if (cards.length !== 3) throw new Error('evaluate3 needs exactly 3 cards');
  const groups = rankGroups(cards);
  const tiebreak = groups.map((g) => g.rank);
  if (groups[0].count === 3) return make(HandCategory.ThreeKind, tiebreak);
  if (groups[0].count === 2) return make(HandCategory.Pair, tiebreak);
  return make(HandCategory.HighCard, tiebreak);
}

export function evaluateRow(cards: Card[]): HandValue {
  return cards.length === 3 ? evaluate3(cards) : evaluate5(cards);
}

/** -1 a<b, 0 tie, 1 a>b */
export function compareHands(a: HandValue, b: HandValue): number {
  return a.score === b.score ? 0 : a.score < b.score ? -1 : 1;
}
