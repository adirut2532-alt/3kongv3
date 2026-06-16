import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [baseBet, setBaseBet] = useState(1);
  const [rakePercent, setRakePercent] = useState(0);
  const [selectingCard, setSelectingCard] = useState<string | null>(null);

  const [table, setTable] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tableRef = React.useRef<View>(null);

  const onTableLayout = () => {
    requestAnimationFrame(() =>
      tableRef.current?.measureInWindow((x, y, w, h) => setTable({ x, y, w, h }))
    );
  };

  const startGame = () => {
    useGameStore.getState().updateConfig({ baseBet, rakePercent, rateMultiplier: 1 });
    s.startRound();
  };

  // แตะไพ่ในมือ → เลือก + ขึ้นกรอบเพื่อเลือกกอง
  // ถ้าเหลือ 1 ใบและมีแค่ 1 กองว่าง → วางอัตโนมัติ
  const selectHandCard = (id: string) => {
    // หากองว่าง
    const emptyRows = ROW_ORDER.filter((row) => s.arrangement[row].length < ROW_MAX[row]);
    
    // ถ้าเหลือ 1 ใบและมีแค่ 1 กองว่าง → วางเลย
    if (s.hand.length === 1 && emptyRows.length === 1) {
      useGameStore.getState().moveCard(id, emptyRows[0]);
      setSelectingCard(null);
      return;
    }

    setSelectingCard(id);
  };

  // เลือกกองที่จะวาง
  const placeInRow = (row: RowKey) => {
    if (!selectingCard) return;
    if (s.arrangement[row].length >= ROW_MAX[row]) return;
    useGameStore.getState().moveCard(selectingCard, row);
    setSelectingCard(null);
  };

  // แตะไพ่ในกอง → เอาออก
  const removeFromRow = (id: string, row: RowKey) => {
    useGameStore.getState().removeFromRow(id, row);
  };

  const allPlaced = s.hand.length === 0;
  const arranging = s.phase === 'arranging';

  const onConfirm = () => {
    const ok = s.confirm();
    if (!ok) { Alert.alert('ฟาว', s.foulReason || 'จัดไพ่ไม่ถูกต้อง'); return; }
    setTimeout(() => s.reveal(), 400);
  };

  const onSuggest = () => {
    const all = [...s.hand, ...s.arrangement.top, ...s.arrangement.middle, ...s.arrangement.bottom];
    if (all.length !== 13) return;
    const [best] = suggestArrangements(all, 1);
    if (best) s.setArrangement(best);
  };

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

  const getHandLabel = (row: RowKey, cards: CardType[]) => {
    const need = row === 'top' ? 3 : 5;
    if (cards.length < need) return '';
    const v = evaluateRow(cards);
    const b = rowBonus(v, row);
    return v.label + (b.pts > 0 ? ' \u2B50' + b.pts : '');
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
              <Timer endsAt={s.turnEndsAt} onExpire={() => s.autoArrangeMe()} />
            </View>
          )}
        </View>

        {s.phase === 'lobby' && (
          <View style={styles.lobby}>
            <Text style={styles.lobbyTitle}>3 กอง กาญ</Text>
            <Text style={styles.lobbySub}>โต๊ะหรู • 4 ผู้เล่น</Text>

            <View style={styles.configBox}>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>เม็ดละ (Base Bet):</Text>
                <View style={styles.buttonRow}>
                  {[1, 2, 4, 5, 10].map((b) => (
                    <PrimaryButton
                      key={b}
                      label={b.toString()}
                      onPress={() => setBaseBet(b)}
                      variant={baseBet === b ? 'emerald' : 'ghost'}
                      style={{ flex: 0.9, minHeight: 40 }}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.configRow}>
                <Text style={styles.configLabel}>เก็บต๋ง (%):</Text>
                <View style={styles.buttonRow}>
                  {[0, 5, 10].map((r) => (
                    <PrimaryButton
                      key={r}
                      label={r.toString()}
                      onPress={() => setRakePercent(r)}
                      variant={rakePercent === r ? 'emerald' : 'ghost'}
                      style={{ flex: 1, minHeight: 40 }}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.configSummary}>
                รอบนี้: เม็ดละ <Text style={styles.bold}>{baseBet}</Text> บาท • เก็บต๋ง <Text style={styles.bold}>{rakePercent}%</Text>
              </Text>
            </View>

            <PrimaryButton label="เริ่มเกม" icon={'\u2660'} onPress={startGame}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
          </View>
        )}

        {s.phase === 'dealing' && (
          <View style={styles.dealing}><Text style={styles.dealingText}>กำลังแจกไพ่…</Text></View>
        )}

        {arranging && (
          <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent} bounces={false}>
            {/* 3 ROWS */}
            {ROW_ORDER.map((row) => {
              const cards = s.arrangement[row];
              const lbl = getHandLabel(row, cards);
              const isFull = cards.length >= ROW_MAX[row];
              const isHighlighted = selectingCard !== null && !isFull;

              return (
                <View key={row} style={[styles.rowZone, isHighlighted && styles.rowZoneHighlight]}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>
                      {ROW_LABEL[row]} {cards.length}/{ROW_MAX[row]}
                    </Text>
                    {lbl ? <Text style={styles.handLbl}>{lbl}</Text> : null}
                  </View>

                  {/* Row Cards */}
                  <View style={styles.rowCards}>
                    {cards.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.7}
                        onPress={() => removeFromRow(c.id, row)}
                        style={styles.rowCardWrapper}
                      >
                        <Card card={c} small />
                        <View style={styles.removeIndicator}>
                          <Text style={styles.removeText}>✕</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Place Button (shows when card selected and space available) */}
                  {selectingCard && !isFull && (
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => placeInRow(row)}
                      style={styles.placeButton}
                    >
                      <Text style={styles.placeButtonText}>วาง {ROW_LABEL[row]}</Text>
                    </TouchableOpacity>
                  )}

                  {isFull && selectingCard && (
                    <Text style={styles.fullText}>เต็มแล้ว</Text>
                  )}

                  {cards.length === 0 && !selectingCard && (
                    <Text style={styles.emptyText}>ว่าง</Text>
                  )}
                </View>
              );
            })}

            <Text style={styles.hint}>
              {selectingCard ? '👆 เลือกกองที่ต้องการวาง' : '1️⃣ แตะไพ่ในมือ → เลือกกอง → 2️⃣ แตะไพ่ในกอง → เอาออก'}
            </Text>

            {/* HAND */}
            {s.hand.length > 0 && (
              <View style={styles.handBox}>
                <Text style={styles.handTitle}>มือ ({s.hand.length})</Text>
                <View style={styles.handCards}>
                  {s.hand.map((c) => {
                    const isSelected = selectingCard === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.6}
                        onPress={() => selectHandCard(c.id)}
                        style={[styles.handCardWrapper, isSelected && styles.handCardSelected]}
                      >
                        <Card card={c} small />
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* BUTTONS */}
            <View style={styles.actions}>
              <PrimaryButton label="จัดอัตโนมัติ" variant="emerald" icon={'\u21BB'} onPress={() => s.autoArrangeMe()} style={{ flex: 1 }} />
              <PrimaryButton label="AI แนะนำ" variant="ghost" icon={'\u2728'} onPress={onSuggest} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="จัดใหม่" variant="ghost" icon={'\u232B'} onPress={() => { s.clearArrangement(); setSelectingCard(null); }} style={{ flex: 1 }} />
              <PrimaryButton
                label={allPlaced ? 'ยืนยันไพ่' : 'เหลือ ' + s.hand.length + ' ใบ'}
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
  lobbySub: { color: colors.parchment, marginTop: 6, marginBottom: spacing.lg },
  configBox: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: '100%',
  },
  configRow: { marginBottom: spacing.md },
  configLabel: { color: colors.parchment, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: spacing.xs },
  configSummary: { color: colors.goldText, fontSize: 12, textAlign: 'center', marginTop: 8 },
  bold: { fontWeight: '700' },
  dealing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dealingText: { color: colors.goldText, fontSize: 18, fontWeight: '700' },
  panel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  panelContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 40 },
  rowZone: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  rowZoneHighlight: { borderColor: colors.goldText, borderWidth: 2, backgroundColor: 'rgba(212,175,55,0.15)' },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rowLabel: { color: colors.parchment, fontSize: 13, fontWeight: '700' },
  handLbl: { color: colors.goldText, fontSize: 12, fontWeight: '600' },
  rowCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 48, alignItems: 'center' },
  rowCardWrapper: { position: 'relative' },
  removeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  placeButton: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: radius.sm,
  },
  placeButtonText: { color: '#4CAF50', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  fullText: { marginTop: 6, color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  emptyText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  handBox: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 8, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
  handTitle: { color: colors.parchment, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  handCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  handCardWrapper: { position: 'relative', borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
  handCardSelected: { borderColor: colors.goldText, backgroundColor: 'rgba(212,175,55,0.2)' },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.goldText,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: { color: '#1a1a1a', fontSize: 14, fontWeight: '900' },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 8, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
