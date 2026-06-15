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
const PLACE_ORDER: RowKey[] = ['bottom', 'middle', 'top'];

export function GameScreen() {
  const s = useGameStore();
  const me = s.players.find((p) => p.id === 'me')!;

  const [table, setTable] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tableRef = React.useRef<View>(null);
  const onTableLayout = () => {
    requestAnimationFrame(() =>
      tableRef.current?.measureInWindow((x, y, w, h) => setTable({ x, y, w, h }))
    );
  };

  // tap card in hand → auto-place to first available row (bottom→mid→top)
  const tapHandCard = (id: string) => {
    const st = useGameStore.getState();
    for (const row of PLACE_ORDER) {
      if (st.arrangement[row].length < ROW_MAX[row]) {
        st.moveCard(id, row);
        return;
      }
    }
  };

  // tap card in row → return to hand
  const tapRowCard = (id: string, row: RowKey) => {
    useGameStore.getState().removeFromRow(id, row);
  };

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

  const handLabel = (row: RowKey, cards: CardType[]) => {
    const cnt = row === 'top' ? 3 : 5;
    if (cards.length < cnt) return '';
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
              const lbl = handLabel(row, cards);
              return (
                <View key={row} style={styles.rowZone}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowLabel}>
                      {ROW_LABEL[row]}  <Text style={styles.rowCount}>{cards.length}/{ROW_MAX[row]}</Text>
                    </Text>
                    {lbl ? <Text style={styles.rowHandLabel}>{lbl}</Text> : null}
                  </View>
                  <View style={styles.rowCards}>
                    {cards.map((c) => (
                      <TouchableOpacity key={c.id} activeOpacity={0.6}
                        onPress={() => tapRowCard(c.id, row)} style={styles.rowCardWrap}>
                        <Card card={c} small />
                        <View style={styles.xBadge}><Text style={styles.xTxt}>✕</Text></View>
                      </TouchableOpacity>
                    ))}
                    {cards.length === 0 && (
                      <Text style={styles.rowEmpty}>แตะไพ่ในมือเพื่อวาง</Text>
                    )}
                  </View>
                </View>
              );
            })}

            <Text style={styles.hint}>แตะไพ่ในมือ = วางลงกอง • แตะไพ่ในกอง = เอาออก</Text>

            {/* === hand === */}
            {s.hand.length > 0 && (
              <View style={styles.handSection}>
                <Text style={styles.handTitle}>มือ ({s.hand.length})</Text>
                <View style={styles.handCards}>
                  {s.hand.map((c) => (
                    <TouchableOpacity key={c.id} activeOpacity={0.6}
                      onPress={() => tapHandCard(c.id)} style={styles.handCardWrap}>
                      <Card card={c} small />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* === buttons === */}
            <View style={styles.actions}>
              <PrimaryButton label="จัดอัตโนมัติ" variant="emerald" icon={'\u21BB'} onPress={() => s.autoArrangeMe()} style={{ flex: 1 }} />
              <PrimaryButton label="AI แนะนำ" variant="ghost" icon={'\u2728'} onPress={onSuggest} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="จัดใหม่" variant="ghost" icon={'\u232B'} onPress={() => s.clearArrangement()} style={{ flex: 1 }} />
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
    paddingBottom: 40,
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
  rowHandLabel: { color: colors.goldText, fontSize: 11, fontWeight: '600' },
  rowCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 44, alignItems: 'center' },
  rowEmpty: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  rowCardWrap: { alignItems: 'center' },
  xBadge: {
    marginTop: 2,
    backgroundColor: 'rgba(255,80,80,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 1,
  },
  xTxt: { color: '#ff6b6b', fontSize: 11, fontWeight: '700' },
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
  handCardWrap: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.4)',
  },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
