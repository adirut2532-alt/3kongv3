import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from './gameStore';
import { TopBar } from './TopBar';
import { PokerTable } from './PokerTable';
import { Card } from './Card';
import { DealAnimation, Pt } from './DealAnimation';
import { PrimaryButton } from './PrimaryButton';
import { Timer } from './Timer';
import { suggestArrangements } from './autoArrange';
import { RowKey, Card as CardType } from './game';
import { evaluateRow } from './handEvaluator';
import { rowBonus } from './scoring';
import { colors, gradients, radius, spacing } from './theme';

const ROW_LABEL: Record<RowKey, string> = { top: 'กองบน (3)', middle: 'กองกลาง (5)', bottom: 'กองล่าง (5)' };
const ROW_MAX: Record<RowKey, number> = { top: 3, middle: 5, bottom: 5 };
const ROW_ORDER: RowKey[] = ['top', 'middle', 'bottom'];

export function GameScreen() {
  const s = useGameStore();
  const me = s.players.find((p) => p.id === 'me')!;
  // selected card id + where it lives
  const [selected, setSelected] = useState<{ id: string; from: RowKey | 'hand' } | null>(null);

  const [table, setTable] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tableRef = React.useRef<View>(null);
  const onTableLayout = () => {
    requestAnimationFrame(() =>
      tableRef.current?.measureInWindow((x, y, w, h) => setTable({ x, y, w, h }))
    );
  };

  // --- tap a card in hand ---
  const tapHandCard = (id: string) => {
    if (selected && selected.id === id) { setSelected(null); return; }
    setSelected({ id, from: 'hand' });
  };

  // --- tap a card sitting in a row ---
  const tapRowCard = (id: string, row: RowKey) => {
    // if this card is already selected → deselect
    if (selected && selected.id === id) { setSelected(null); return; }
    // if another card is selected → try move that card into this row
    if (selected) {
      const ok = useGameStore.getState().moveCard(selected.id, row);
      if (ok) { setSelected(null); return; }
    }
    // otherwise select this row-card (so user can tap another row to move it there)
    setSelected({ id, from: row });
  };

  // --- tap the "วาง" (place) button on a row ---
  const tapPlaceHere = (row: RowKey) => {
    if (!selected) return;
    const ok = useGameStore.getState().moveCard(selected.id, row);
    if (ok) setSelected(null);
  };

  // --- tap "เอาออก" to return card to hand ---
  const tapReturnToHand = (id: string, row: RowKey) => {
    useGameStore.getState().removeFromRow(id, row);
    if (selected && selected.id === id) setSelected(null);
  };

  // --- helpers ---
  const allPlaced = s.hand.length === 0;
  const arranging = s.phase === 'arranging';

  const onConfirm = () => {
    const ok = s.confirm();
    if (!ok) { Alert.alert('ฟาว ⚠️', s.foulReason ?? 'การจัดไพ่ไม่ถูกต้อง'); return; }
    setTimeout(() => s.reveal(), 400);
  };

  const onSuggest = () => {
    const all = [...s.hand, ...s.arrangement.top, ...s.arrangement.middle, ...s.arrangement.bottom];
    if (all.length !== 13) return;
    const [best] = suggestArrangements(all, 1);
    if (best) { s.setArrangement(best); setSelected(null); }
  };

  const onAutoArrange = () => { s.autoArrangeMe(); setSelected(null); };
  const onClear = () => { s.clearArrangement(); setSelected(null); };

  const dealGeometry = (): { origin: Pt; targets: Pt[] } | null => {
    if (!table) return null;
    const cx = table.x + table.w / 2;
    const cy = table.y + table.h / 2;
    const targets: Pt[] = [
      { x: cx, y: table.y + table.h - 10 },
      { x: table.x + 30, y: cy },
      { x: cx, y: table.y + 26 },
      { x: table.x + table.w - 30, y: cy },
    ].slice(0, s.players.length);
    return { origin: { x: cx, y: cy }, targets };
  };
  const geo = dealGeometry();

  const handLabel = (row: RowKey, cards: CardType[]) => {
    const cnt = row === 'top' ? 3 : 5;
    if (cards.length < cnt) return '';
    const v = evaluateRow(cards);
    const b = rowBonus(v, row);
    return v.label + (b.pts > 0 ? ` ⭐${b.pts}` : '');
  };

  return (
    <LinearGradient colors={gradients.panel as unknown as string[]} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <TopBar name={me.name} coins={me.coins} vipLevel={me.vipLevel} />

        <View ref={tableRef} collapsable={false} onLayout={onTableLayout}
          style={[styles.tableArea, arranging && styles.tableAreaSmall]}>
          <PokerTable players={s.players} meId="me" dealerSeat={s.dealerSeat}
            pot={s.pot} round={s.round} maxRounds={s.config.maxRounds} />
          {arranging && (
            <View style={styles.timer}>
              <Timer endsAt={s.turnEndsAt} onExpire={onAutoArrange} />
            </View>
          )}
        </View>

        {s.phase === 'lobby' && (
          <View style={styles.lobby}>
            <Text style={styles.lobbyTitle}>3 กอง กาญ</Text>
            <Text style={styles.lobbySub}>โต๊ะหรู • 4 ผู้เล่น • {s.config.baseBet} ต่อแต้ม</Text>
            <PrimaryButton label="เริ่มเกม" icon={'\u2660'} onPress={s.startRound}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
          </View>
        )}

        {s.phase === 'dealing' && (
          <View style={styles.dealing}><Text style={styles.dealingText}>กำลังแจกไพ่…</Text></View>
        )}

        {arranging && (
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} bounces={false}>
            {/* === 3 rows === */}
            {ROW_ORDER.map((row) => {
              const cards = s.arrangement[row];
              const isFull = cards.length >= ROW_MAX[row];
              const canDrop = !!selected && !isFull;
              const lbl = handLabel(row, cards);
              return (
                <View key={row} style={styles.rowZone}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>{ROW_LABEL[row]}  <Text style={styles.rowCount}>{cards.length}/{ROW_MAX[row]}</Text></Text>
                    {lbl ? <Text style={styles.rowHandLabel}>{lbl}</Text> : null}
                  </View>
                  <View style={styles.rowCards}>
                    {cards.map((c) => {
                      const isSel = selected?.id === c.id;
                      return (
                        <View key={c.id} style={styles.cardCol}>
                          <Pressable onPress={() => tapRowCard(c.id, row)}
                            style={[styles.cardWrap, isSel && styles.cardSelected]}>
                            <Card card={c} small />
                          </Pressable>
                          <Pressable onPress={() => tapReturnToHand(c.id, row)} style={styles.returnBtn}>
                            <Text style={styles.returnTxt}>✕</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                    {/* place-here button when a card is selected */}
                    {canDrop && (
                      <Pressable onPress={() => tapPlaceHere(row)} style={styles.placeBtn}>
                        <Text style={styles.placeTxt}>＋ วาง</Text>
                      </Pressable>
                    )}
                    {cards.length === 0 && !canDrop && (
                      <Text style={styles.rowEmpty}>ว่าง</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {/* === instruction === */}
            <Text style={styles.hint}>
              {selected
                ? '👆 กด "＋ วาง" ที่กองที่ต้องการ • กด ✕ เอาไพ่ออก'
                : 'แตะไพ่เพื่อเลือก → แล้วกดวางที่กอง • กด ✕ เอาไพ่ออกจากกอง'}
            </Text>

            {/* === hand === */}
            {s.hand.length > 0 && (
              <View style={styles.handSection}>
                <Text style={styles.handTitle}>มือ ({s.hand.length})</Text>
                <View style={styles.handCards}>
                  {s.hand.map((c) => {
                    const isSel = selected?.id === c.id;
                    return (
                      <Pressable key={c.id} onPress={() => tapHandCard(c.id)}
                        style={[styles.cardWrap, isSel && styles.cardSelected]}>
                        <Card card={c} small />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* === action buttons === */}
            <View style={styles.actions}>
              <PrimaryButton label="จัดอัตโนมัติ" variant="emerald" icon={'\u21BB'} onPress={onAutoArrange} style={{ flex: 1 }} />
              <PrimaryButton label="AI แนะนำ" variant="ghost" icon={'\u2728'} onPress={onSuggest} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="จัดใหม่" variant="ghost" icon={'\u232B'} onPress={onClear} style={{ flex: 1 }} />
              <PrimaryButton
                label={allPlaced ? 'ยืนยันไพ่' : `เหลือ ${s.hand.length} ใบ`}
                onPress={onConfirm}
                disabled={!allPlaced}
                style={{ flex: 1.4 }}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {s.phase === 'dealing' && geo && (
        <DealAnimation origin={geo.origin} targets={geo.targets}
          total={13 * s.players.length} intervalMs={45} onDone={s.finishDealing} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  tableArea: { height: '34%', position: 'relative' },
  tableAreaSmall: { height: '22%' },
  timer: { position: 'absolute', top: 6, right: 14 },
  lobby: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  lobbyTitle: { color: colors.goldText, fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  lobbySub: { color: colors.parchment, marginTop: 6 },
  dealing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dealingText: { color: colors.goldText, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  panel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  panelContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  rowZone: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: 6,
    marginBottom: 6,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowLabel: { color: colors.parchment, fontSize: 12, fontWeight: '600' },
  rowCount: { color: colors.textMuted, fontSize: 11 },
  rowHandLabel: { color: colors.goldText, fontSize: 11 },
  rowCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 44, alignItems: 'flex-start' },
  rowEmpty: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', alignSelf: 'center' },
  // card in row: card + ✕ button stacked
  cardCol: { alignItems: 'center' },
  returnBtn: {
    marginTop: 2,
    backgroundColor: 'rgba(255,80,80,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  returnTxt: { color: '#ff6b6b', fontSize: 11, fontWeight: '700' },
  // "+ วาง" drop target
  placeBtn: {
    borderWidth: 2,
    borderColor: colors.goldText,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
  },
  placeTxt: { color: colors.goldText, fontSize: 13, fontWeight: '700' },
  // hand
  handSection: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: 6,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  handTitle: { color: colors.parchment, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  handCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  // card selection
  cardWrap: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255,215,0,0.15)',
    transform: [{ translateY: -4 }],
  },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
