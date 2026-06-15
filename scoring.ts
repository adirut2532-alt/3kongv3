/**
 * scoring.ts — arrangement validation + Chinese-poker scoring.
 * Replicates the "3 กอง กาญ" house ruleset from the original web version:
 *   - win a row = 1 point, or the row's เด้ง bonus points if the winning
 *     hand qualifies (front ตอง+5/AA+2, mid RF+16/SF+14/โฟร์+12/AAA+4/ฟูล+2,
 *     back RF+8/SF+7/โฟร์+6/AAA+2)
 *   - ตาลู (scoop all 3 rows vs an opponent) → that matchup ×2
 *   - ดาร์บี้ (scoop every non-foul opponent, ≥2 of them) → that player's matchups ×2 ON TOP of the
 *     scoop ×2, i.e. ดาร์บี้ = ทะลุ ×2 per matchup (scoop 6 pts → ดาร์บี้ 12 pts)
 *   - ไพ่มังกร (13 distinct ranks) → +30×(others), everyone else −30
 *   - ฟาว pays 6 to each non-foul opponent (pairwise, zero-sum)
 *   - points × baseBet × rateMultiplier, rake taken from net winners
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

  if (compareHands(middle, top) < 0) return { valid: false, reason: 'ฟาว: กลางเล็กกว่าบน' };
  if (compareHands(bottom, middle) < 0) return { valid: false, reason: 'ฟาว: ล่างเล็กกว่ากลาง' };
  return { valid: true };
}

export interface BonusResult { pts: number; label: string; }

/** เด้งโบนัส for a made hand in a given row. */
export function rowBonus(v: HandValue, row: RowKey): BonusResult {
  const isAce = v.tiebreak[0] === 14; // pair/trips/quad/FH-trips/straight-high rank
  if (row === 'top') {
    if (v.category === HandCategory.ThreeKind) return { pts: 5, label: 'ตอง +5' };
    if (v.category === HandCategory.Pair && isAce) return { pts: 2, label: 'AA +2' };
  } else if (row === 'middle') {
    if (v.category === HandCategory.StraightFlush)
      return isAce ? { pts: 16, label: 'รอยัล +16' } : { pts: 14, label: 'SF +14' };
    if (v.category === HandCategory.FourKind) return { pts: 12, label: 'โฟร์ +12' };
    if (v.category === HandCategory.FullHouse)
      return isAce ? { pts: 4, label: 'AAA +4' } : { pts: 2, label: 'ฟูล +2' };
  } else {
    if (v.category === HandCategory.StraightFlush)
      return isAce ? { pts: 8, label: 'รอยัล +8' } : { pts: 7, label: 'SF +7' };
    if (v.category === HandCategory.FourKind) return { pts: 6, label: 'โฟร์ +6' };
    if (v.category === HandCategory.FullHouse && isAce) return { pts: 2, label: 'AAA +2' };
  }
  return { pts: 0, label: '' };
}

/** ไพ่มังกร — all 13 cards are distinct ranks. */
export function isDragonHand(a: Arrangement): boolean {
  const all = [...a.top, ...a.middle, ...a.bottom];
  if (all.length !== 13) return false;
  return new Set(all.map((c) => c.rank)).size === 13;
}

/** Compare two arrangements row by row. net is from a's perspective (points). */
export function headToHead(a: Arrangement, b: Arrangement): {
  net: number; aScoop: boolean; bScoop: boolean;
} {
  const rows: RowKey[] = ['top', 'middle', 'bottom'];
  let net = 0, aw = 0, bw = 0;
  for (const row of rows) {
    const va = evaluateRow(a[row]);
    const vb = evaluateRow(b[row]);
    const cmp = compareHands(va, vb);
    if (cmp > 0) { const bn = rowBonus(va, row).pts; net += bn > 0 ? bn : 1; aw++; }
    else if (cmp < 0) { const bn = rowBonus(vb, row).pts; net -= bn > 0 ? bn : 1; bw++; }
  }
  let aScoop = false, bScoop = false;
  if (aw === 3) { net *= 2; aScoop = true; }       // ตาลู
  else if (bw === 3) { net *= 2; bScoop = true; }
  return { net, aScoop, bScoop };
}

/** Settle a whole table into per-player coin deltas. */
export function settleTable(players: Player[], config: RoomConfig): SettlementEntry[] {
  const active = players.filter((p) => p.arrangement);
  const n = active.length;
  const pts = new Map<string, number>();
  const foul = new Map<string, boolean>();
  const label = new Map<string, string>();
  active.forEach((p) => { pts.set(p.id, 0); foul.set(p.id, !validateArrangement(p.arrangement!).valid); });

  const dragonP = active.find((p) => isDragonHand(p.arrangement!));
  if (dragonP) {
    active.forEach((p) => pts.set(p.id, p.id === dragonP.id ? 30 * (n - 1) : -30));
    label.set(dragonP.id, '🐉 ไพ่มังกร');
  } else {
    const scoops = new Map<string, number>();
    active.forEach((p) => scoops.set(p.id, 0));
    // collect each pairwise result first (net is already ×2 on a ตาลู/scoop)
    const pairs: { a: string; b: string; net: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = active[i], b = active[j];
        if (foul.get(a.id) || foul.get(b.id)) continue;
        const { net, aScoop, bScoop } = headToHead(a.arrangement!, b.arrangement!);
        pairs.push({ a: a.id, b: b.id, net });
        if (aScoop) scoops.set(a.id, scoops.get(a.id)! + 1);
        if (bScoop) scoops.set(b.id, scoops.get(b.id)! + 1);
      }
    }
    // ดาร์บี้: ทะลุ (scoop) คู่ต่อสู้ที่ไม่ฟาวครบทุกคน (ต้อง ≥2 คน)
    // → คูณสองเท่า "จากทะลุ" เฉพาะคู่ของคนที่ดาร์บี้: ตาลู ×2 กลายเป็น ×4
    const darby = new Set<string>();
    active.forEach((p) => {
      if (foul.get(p.id)) return;
      const opps = active.filter((o) => o.id !== p.id && !foul.get(o.id));
      if (opps.length >= 2 && scoops.get(p.id) === opps.length) {
        darby.add(p.id);
        label.set(p.id, '🏆 ดาร์บี้');
      }
    });
    // ลงคะแนนแต่ละคู่ — คู่ใดมีผู้เล่นที่ดาร์บี้ ให้คูณอีกเท่าตัว (×2 → ×4)
    for (const pr of pairs) {
      const net = (darby.has(pr.a) || darby.has(pr.b)) ? pr.net * 2 : pr.net;
      pts.set(pr.a, pts.get(pr.a)! + net);
      pts.set(pr.b, pts.get(pr.b)! - net);
    }
    // ฟาว: pay 6 to each non-foul opponent (pairwise)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = active[i], b = active[j];
        const fa = foul.get(a.id), fb = foul.get(b.id);
        if (fa && fb) continue;
        if (fa) { pts.set(a.id, pts.get(a.id)! - 6); pts.set(b.id, pts.get(b.id)! + 6); }
        else if (fb) { pts.set(b.id, pts.get(b.id)! - 6); pts.set(a.id, pts.get(a.id)! + 6); }
      }
    }
    active.forEach((p) => { if (foul.get(p.id)) label.set(p.id, '⚠️ ฟาว'); });
  }

  // points → coins (× baseBet × room rate, rake from winners)
  let best = -Infinity, mvp: string | null = null;
  const entries: SettlementEntry[] = active.map((p) => {
    let delta = pts.get(p.id)! * config.baseBet * config.rateMultiplier;
    delta = delta > 0 && config.rakePercent > 0
      ? Math.round(delta * (1 - config.rakePercent / 100))
      : Math.round(delta);
    if (delta > best) { best = delta; mvp = p.id; }
    return { playerId: p.id, delta, label: label.get(p.id) || undefined };
  });
  return entries.map((e) => ({ ...e, isMvp: e.playerId === mvp && best > 0 }));
}
