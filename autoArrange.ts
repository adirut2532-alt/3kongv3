/**
 * autoArrange.ts — AI that splits 13 cards into a strong, valid arrangement.
 *
 * Smarter strategy than naive "stack the back":
 *   - searches the strongest bottom candidates, and for EACH tries every
 *     legal middle, then scores the WHOLE arrangement by total made-hand
 *     strength + เด้ง bonus value. Maximizing the sum naturally rewards
 *     splitting power into multiple made hands (winning 2-3 rows) and
 *     chasing bonus hands, instead of dumping everything in one row.
 *   - validity (bottom ≥ middle ≥ top) is always enforced, so it never fouls.
 */
import { Arrangement, Card } from './game';
import { compareHands, evaluate3, evaluate5 } from './handEvaluator';
import { rowBonus, validateArrangement } from './scoring';

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];
  const recurse = (start: number) => {
    if (combo.length === k) { result.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1);
      combo.pop();
    }
  };
  recurse(0);
  return result;
}

function without(cards: Card[], remove: Card[]): Card[] {
  const ids = new Set(remove.map((c) => c.id));
  return cards.filter((c) => !ids.has(c.id));
}

// 1 bonus point is worth a big chunk of strength so bots chase เด้ง hands.
const BONUS_WEIGHT = 500_000;

/** Returns the strongest legal arrangement found. */
export function autoArrange(cards: Card[], beam = 150): Arrangement {
  if (cards.length !== 13) throw new Error('autoArrange needs 13 cards');

  const bottoms = combinations(cards, 5)
    .map((b) => ({ cards: b, value: evaluate5(b) }))
    .sort((x, y) => y.value.score - x.value.score)
    .slice(0, beam);

  let best: { arr: Arrangement; q: number } | null = null;

  for (const bottom of bottoms) {
    const rest8 = without(cards, bottom.cards);
    const mids = combinations(rest8, 5).map((m) => ({ cards: m, value: evaluate5(m) }));
    for (const middle of mids) {
      if (compareHands(bottom.value, middle.value) < 0) continue; // bottom ≥ middle
      const top = without(rest8, middle.cards);
      const topValue = evaluate3(top);
      if (compareHands(middle.value, topValue) < 0) continue;     // middle ≥ top

      const bonus =
        rowBonus(bottom.value, 'bottom').pts +
        rowBonus(middle.value, 'middle').pts +
        rowBonus(topValue, 'top').pts;

      // total made-hand strength + bonus value → favours balanced, bonus-rich hands
      const q = bottom.value.score + middle.value.score + topValue.score + bonus * BONUS_WEIGHT;
      if (!best || q > best.q) best = { arr: { top, middle: middle.cards, bottom: bottom.cards }, q };
    }
  }

  if (best && validateArrangement(best.arr).valid) return best.arr;

  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
}

/** A few alternative suggestions for the "AI Suggest" button. */
export function suggestArrangements(cards: Card[], n = 3): Arrangement[] {
  const beams = [120, 200, 300];
  const out: Arrangement[] = [];
  const seen = new Set<string>();
  for (const beam of beams) {
    if (out.length >= n) break;
    const a = autoArrange(cards, beam);
    const sig = [a.top, a.middle, a.bottom].map((r) => r.map((c) => c.id).join(',')).join('|');
    if (!seen.has(sig)) { seen.add(sig); out.push(a); }
  }
  return out;
}
