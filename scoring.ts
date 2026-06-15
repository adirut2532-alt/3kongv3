/**
 * scoring.ts — arrangement validation + Chinese-poker scoring.
 *
 * Scoring is intentionally modular: tweak BONUS to match the exact
 * "3 กอง กาญ" house ruleset (เด้ง, ตอง, ไหล, จับ, etc.) without touching
 * the comparison engine.
 */
import {
  Arrangement,
  HandCategory,
  HandValue,
  Player,
  RoomConfig,
  RowKey,
  SettlementEntry,
} from './game';
import { compareHands, evaluateRow } from './handEvaluator';

export const ROW_SIZE: Record<RowKey, number> = { top: 3, middle: 5, bottom: 5 };

/** A valid arrangement: bottom >= middle >= top, correct sizes, no dup cards. */
export function validateArrangement(a: Arrangement): { valid: boolean; reason?: string } {
  if (a.top.length !== 3) return { valid: false, reason: 'กองบนต้องมี 3 ใบ' };
  if (a.middle.length !== 5) return { valid: false, reason: 'กองกลางต้องมี 5 ใบ' };
  if (a.bottom.length !== 5) return { valid: false, reason: 'กองล่างต้องมี 5 ใบ' };

  const all = [...a.top, ...a.middle, ...a.bottom];
  if (new Set(all.map((c) => c.id)).size !== 13)
    return { valid: false, reason: 'ไพ่ซ้ำหรือไม่ครบ 13 ใบ' };

  const top = evaluateRow(a.top);
  const middle = evaluateRow(a.middle);
  const bottom = evaluateRow(a.bottom);

  if (compareHands(middle, top) < 0)
    return { valid: false, reason: 'หลังฟาวล์: กลางเล็กกว่าบน' };
  if (compareHands(bottom, middle) < 0)
    return { valid: false, reason: 'หลังฟาวล์: ล่างเล็กกว่ากลาง' };

  return { valid: true };
}

/**
 * BONUS (เด้ง): extra multiplier when a row hits a strong hand.
 * Bottom rewards bigger because it's harder. Adjust to taste.
 */
const BONUS: Partial<Record<RowKey, Partial<Record<HandCategory, number>>>> = {
  top: { [HandCategory.ThreeKind]: 3 },             // ตองหัว
  middle: { [HandCategory.FullHouse]: 2, [HandCategory.FourKind]: 8, [HandCategory.StraightFlush]: 10 },
  bottom: { [HandCategory.FourKind]: 4, [HandCategory.StraightFlush]: 5 },
};

function rowBonus(row: RowKey, v: HandValue): number {
  return BONUS[row]?.[v.category] ?? 1;
}

export interface HeadToHead {
  byRow: Record<RowKey, { winner: 'a' | 'b' | 'tie'; points: number }>;
  /** net points from a's perspective (positive = a wins) */
  net: number;
  scoopA: boolean; // a won all 3 rows (จับได้ทั้งกอง → x2)
  scoopB: boolean;
}

/** Compare two arrangements row by row. base = points per row won. */
export function headToHead(a: Arrangement, b: Arrangement, base = 1): HeadToHead {
  const rows: RowKey[] = ['top', 'middle', 'bottom'];
  const byRow = {} as HeadToHead['byRow'];
  let net = 0;
  let aWins = 0;
  let bWins = 0;

  for (const row of rows) {
    const va = evaluateRow(a[row]);
    const vb = evaluateRow(b[row]);
    const cmp = compareHands(va, vb);
    if (cmp === 0) {
      byRow[row] = { winner: 'tie', points: 0 };
      continue;
    }
    const winner = cmp > 0 ? 'a' : 'b';
    const bonus = rowBonus(row, cmp > 0 ? va : vb);
    const pts = base * bonus;
    byRow[row] = { winner, points: pts };
    if (winner === 'a') { net += pts; aWins++; } else { net -= pts; bWins++; }
  }

  const scoopA = aWins === 3;
  const scoopB = bWins === 3;
  if (scoopA) net *= 2; // จับ x2
  if (scoopB) net *= 2;

  return { byRow, net, scoopA, scoopB };
}

/**
 * Settle a whole table. Each player faces every other player.
 * Applies room rate multiplier and rake on net winners.
 */
export function settleTable(players: Player[], config: RoomConfig): SettlementEntry[] {
  const active = players.filter((p) => p.arrangement);
  const totals = new Map<string, number>();
  active.forEach((p) => totals.set(p.id, 0));

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const aFoul = !validateArrangement(a.arrangement!).valid;
      const bFoul = !validateArrangement(b.arrangement!).valid;

      let net: number; // from a's perspective
      if (aFoul && bFoul) net = 0;
      else if (aFoul) net = -6 * config.baseBet;      // ฟาวล์เสียยกกอง
      else if (bFoul) net = 6 * config.baseBet;
      else net = headToHead(a.arrangement!, b.arrangement!, config.baseBet).net;

      net *= config.rateMultiplier;
      totals.set(a.id, totals.get(a.id)! + net);
      totals.set(b.id, totals.get(b.id)! - net);
    }
  }

  // Rake: take a cut from each net-positive player.
  const entries: SettlementEntry[] = [];
  let best = -Infinity;
  let mvp: string | null = null;
  for (const [playerId, raw] of totals) {
    let delta = raw;
    if (delta > 0 && config.rakePercent > 0) {
      delta = Math.round(delta * (1 - config.rakePercent / 100));
    }
    if (delta > best) { best = delta; mvp = playerId; }
    entries.push({ playerId, delta });
  }
  return entries.map((e) => ({ ...e, isMvp: e.playerId === mvp && best > 0 }));
}
