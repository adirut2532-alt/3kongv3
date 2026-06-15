import React, { useCallback, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useGameStore } from './gameStore';
import { TopBar } from './TopBar';
import { PokerTable } from './PokerTable';
import { HandRow } from './HandRow';
import { DraggableFan } from './DraggableFan';
import { Zone } from './DraggableCard';
import { DealAnimation, Pt } from './DealAnimation';
import { PrimaryButton } from './PrimaryButton';
import { Timer } from './Timer';
import { suggestArrangements } from './autoArrange';
import { RowKey } from './game';
import { colors, gradients, radius, spacing } from './theme';

const ROW_LABEL = { top: 'กองบน (3)', middle: 'กองกลาง (5)', bottom: 'กองล่าง (5)' } as const;
// Top row (3 cards) sits at the TOP, like a real pusoy layout.
const ROW_ORDER: RowKey[] = ['top', 'middle', 'bottom'];

function Measured({
  zoneKey, setZone, style, children,
}: { zoneKey: string; setZone: (z: Zone) => void; style?: ViewStyle; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const onLayout = useCallback(() => {
    requestAnimationFrame(() =>
      ref.current?.measureInWindow((x, y, w, h) => setZone({ key: zoneKey, x, y, w, h }))
    );
  }, [zoneKey, setZone]);
  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={style}>
      {children}
    </View>
  );
}

export function GameScreen() {
  const s = useGameStore();
  const me = s.players.find((p) => p.id === 'me')!;

  const zones = useSharedValue<Zone[]>([]);
  const setZone = useCallback((z: Zone) => {
    const others = zones.value.filter((o) => o.key !== z.key);
    zones.value = [...others, z];
  }, []);

  // which container is currently lifting a card → raise its zIndex so the
  // dragged card floats above the other rows / hand
  const [lift, setLift] = useState<string | null>(null);
  const onLiftStart = useCallback((zone: string) => setLift(zone), []);
  const onLiftEnd = useCallback(() => setLift(null), []);

  const [table, setTable] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tableRef = useRef<View>(null);
  const onTableLayout = useCallback(() => {
    requestAnimationFrame(() =>
      tableRef.current?.measureInWindow((x, y, w, h) => setTable({ x, y, w, h }))
    );
  }, []);

  const allPlaced = s.hand.length === 0;

  const onDrop = useCallback(
    (id: string, target: string) => useGameStore.getState().moveCard(id, target as RowKey | 'fan'),
    []
  );

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

  const arranging = s.phase === 'arranging';

  return (
    <LinearGradient colors={gradients.panel as unknown as string[]} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <TopBar name={me.name} coins={me.coins} vipLevel={me.vipLevel} />

        {/* Table shrinks during arranging to give the cards more room */}
        <View
          ref={tableRef}
          collapsable={false}
          onLayout={onTableLayout}
          style={[styles.tableArea, arranging && styles.tableAreaSmall]}
        >
          <PokerTable
            players={s.players}
            meId="me"
            dealerSeat={s.dealerSeat}
            pot={s.pot}
            round={s.round}
            maxRounds={s.config.maxRounds}
          />
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
          <View style={styles.panel}>
            {ROW_ORDER.map((row) => (
              <Measured
                key={row}
                zoneKey={row}
                setZone={setZone}
                style={{ zIndex: lift === row ? 100 : 1, elevation: lift === row ? 100 : 1 }}
              >
                <HandRow
                  row={row}
                  label={ROW_LABEL[row]}
                  cards={s.arrangement[row]}
                  zones={zones}
                  onDrop={onDrop}
                  onLiftStart={onLiftStart}
                  onLiftEnd={onLiftEnd}
                  highlight={!!lift}
                />
              </Measured>
            ))}

            <Text style={styles.hint}>ลากไพ่ขึ้นไปวางในกอง • ลากสลับกองได้ • ลากกลับลงมาที่มือ</Text>

            {s.hand.length > 0 && (
              <Measured
                zoneKey="fan"
                setZone={setZone}
                style={{ zIndex: lift === 'fan' ? 100 : 5, elevation: lift === 'fan' ? 100 : 5 }}
              >
                <DraggableFan cards={s.hand} zones={zones} onDrop={onDrop}
                  onLiftStart={onLiftStart} onLiftEnd={onLiftEnd} />
              </Measured>
            )}

            <View style={styles.actions}>
              <PrimaryButton label="จัดอัตโนมัติ" variant="emerald" icon={'\u21BB'} onPress={s.autoArrangeMe} style={{ flex: 1 }} />
              <PrimaryButton label="AI แนะนำ" variant="ghost" icon={'\u2728'} onPress={onSuggest} style={{ flex: 1 }} />
            </View>
            <View style={styles.actions}>
              <PrimaryButton label="จัดใหม่" variant="ghost" icon={'\u232B'} onPress={s.clearArrangement} style={{ flex: 1 }} />
              <PrimaryButton
                label={allPlaced ? 'ยืนยันไพ่' : `เหลือ ${s.hand.length} ใบ`}
                onPress={onConfirm}
                disabled={!allPlaced}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
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
  tableAreaSmall: { height: '24%' },
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 5 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
