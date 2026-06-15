/**
 * autoArrange.ts — AI that splits 13 cards into a strong, valid arrangement.
 *
 * Strategy: generate candidate bottom (5) and middle (5) hands, keep the
 * best-scoring split where bottom >= middle >= top. Exhaustive search over
 * C(13,5)*C(8,5) is ~360k combos — fine for a one-off compute, and we cap
 * with a beam to stay snappy. Used for both "Auto Arrange" and bot turns.
 */
import { Arrangement, Card } from '../types/game';
import { compareHands, evaluate3, evaluate5 } from './handEvaluator';
import { validateArrangement } from './scoring';

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

/**
 * Returns the strongest legal arrangement found.
 * `beam` limits how many top bottom-candidates we expand (perf vs quality).
 */
export function autoArrange(cards: Card[], beam = 60): Arrangement {
  if (cards.length !== 13) throw new Error('autoArrange needs 13 cards');

  // Rank all 5-card bottoms, strongest first.
  const bottomCandidates = combinations(cards, 5)
    .map((b) => ({ cards: b, value: evaluate5(b) }))
    .sort((x, y) => y.value.score - x.value.score)
    .slice(0, beam);

  let best: { arr: Arrangement; key: number } | null = null;

  for (const bottom of bottomCandidates) {
    const rest8 = without(cards, bottom.cards);
    const middleCandidates = combinations(rest8, 5)
      .map((m) => ({ cards: m, value: evaluate5(m) }))
      .sort((x, y) => y.value.score - x.value.score);

    for (const middle of middleCandidates) {
      // bottom must be >= middle
      if (compareHands(bottom.value, middle.value) < 0) continue;
      const top = without(rest8, middle.cards); // remaining 3
      const topValue = evaluate3(top);
      // middle must be >= top
      if (compareHands(middle.value, topValue) < 0) continue;

      const arr: Arrangement = { top, middle: middle.cards, bottom: bottom.cards };
      // weighted quality: bottom matters most, then middle, then top.
      const key = bottom.value.score * 4 + middle.value.score * 2 + topValue.score;
      if (!best || key > best.key) best = { arr, key };
      break; // best middle for this bottom found; move on
    }
  }

  if (best && validateArrangement(best.arr).valid) return best.arr;

  // Fallback: naive high→low split (always legal-ish, validated by caller).
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  return { top: sorted.slice(0, 3), middle: sorted.slice(3, 8), bottom: sorted.slice(8, 13) };
}

/** A few alternative suggestions for the "AI Suggest" button. */
export function suggestArrangements(cards: Card[], n = 3): Arrangement[] {
  const beams = [40, 80, 140];
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
