import React, { useCallback, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../components/TopBar';
import { PokerTable } from '../components/PokerTable';
import { HandRow } from '../components/HandRow';
import { DraggableFan } from '../components/DraggableFan';
import { Zone } from '../components/DraggableCard';
import { DealAnimation, Pt } from '../components/DealAnimation';
import { PrimaryButton } from '../components/PrimaryButton';
import { Timer } from '../components/Timer';
import { suggestArrangements } from '../game/autoArrange';
import { RowKey } from '../types/game';
import { colors, gradients, radius, spacing } from '../theme/theme';

const ROW_LABEL = { top: 'กองบน (3)', middle: 'กองกลาง (5)', bottom: 'กองล่าง (5)' } as const;

/** A view that reports its window rect into the shared zones list. */
function Measured({
  zoneKey, setZone, style, children,
}: {
  zoneKey: string;
  setZone: (z: Zone) => void;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
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

  const [table, setTable] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const tableRef = useRef<View>(null);
  const onTableLayout = useCallback(() => {
    requestAnimationFrame(() =>
      tableRef.current?.measureInWindow((x, y, w, h) => setTable({ x, y, w, h }))
    );
  }, []);

  const allPlaced = s.hand.length === 0;

  // commit handler for drag-and-drop
  const onDrop = useCallback((id: string, target: string) => {
    return useGameStore.getState().moveCard(id, target as RowKey | 'fan');
  }, []);

  const onConfirm = () => {
    const ok = s.confirm();
    if (!ok) {
      Alert.alert('หลังฟาวล์ \u26A0\uFE0F', s.foulReason ?? 'การจัดไพ่ไม่ถูกต้อง');
      return;
    }
    setTimeout(() => s.reveal(), 400);
  };

  const onSuggest = () => {
    const all = [...s.hand, ...s.arrangement.top, ...s.arrangement.middle, ...s.arrangement.bottom];
    if (all.length !== 13) return;
    const [best] = suggestArrangements(all, 1);
    if (best) s.setArrangement(best);
  };

  // Compute deck origin + per-seat targets from the measured table rect.
  const dealGeometry = (): { origin: Pt; targets: Pt[] } | null => {
    if (!table) return null;
    const cx = table.x + table.w / 2;
    const cy = table.y + table.h / 2;
    const origin = { x: cx, y: cy };
    const targets: Pt[] = [
      { x: cx, y: table.y + table.h - 10 }, // seat 0 — me (bottom)
      { x: table.x + 30, y: cy },           // seat 1 — left
      { x: cx, y: table.y + 26 },           // seat 2 — top
      { x: table.x + table.w - 30, y: cy }, // seat 3 — right
    ].slice(0, s.players.length);
    return { origin, targets };
  };
  const geo = dealGeometry();

  return (
    <LinearGradient colors={gradients.panel as unknown as string[]} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <TopBar name={me.name} coins={me.coins} vipLevel={me.vipLevel} />

        <View ref={tableRef} collapsable={false} onLayout={onTableLayout} style={styles.tableArea}>
          <PokerTable
            players={s.players}
            meId="me"
            dealerSeat={s.dealerSeat}
            pot={s.pot}
            round={s.round}
            maxRounds={s.config.maxRounds}
          />
          {s.phase === 'arranging' && (
            <View style={styles.timer}>
              <Timer endsAt={s.turnEndsAt} onExpire={() => s.autoArrangeMe()} />
            </View>
          )}
        </View>

        {s.phase === 'lobby' && (
          <View style={styles.lobby}>
            <Text style={styles.lobbyTitle}>3 กอง กาญ</Text>
            <Text style={styles.lobbySub}>โต๊ะหรู • 4 ผู้เล่น • {s.config.baseBet} ต่อแต้ม</Text>
            <PrimaryButton
              label="เริ่มเกม"
              icon={'\u2660'}
              onPress={s.startRound}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        )}

        {s.phase === 'dealing' && (
          <View style={styles.dealing}>
            <Text style={styles.dealingText}>กำลังแจกไพ่…</Text>
          </View>
        )}

        {s.phase === 'arranging' && (
          <View style={styles.panel}>
            <Measured zoneKey="bottom" setZone={setZone}>
              <HandRow
                row="bottom" label={ROW_LABEL.bottom} cards={s.arrangement.bottom}
                highlight={!!s.selectedCardId}
                onPlace={(r) => s.selectedCardId && s.moveCard(s.selectedCardId, r)}
                onRemove={(id) => s.moveCard(id, 'fan')}
              />
            </Measured>
            <Measured zoneKey="middle" setZone={setZone}>
              <HandRow
                row="middle" label={ROW_LABEL.middle} cards={s.arrangement.middle}
                highlight={!!s.selectedCardId}
                onPlace={(r) => s.selectedCardId && s.moveCard(s.selectedCardId, r)}
                onRemove={(id) => s.moveCard(id, 'fan')}
              />
            </Measured>
            <Measured zoneKey="top" setZone={setZone}>
              <HandRow
                row="top" label={ROW_LABEL.top} cards={s.arrangement.top}
                highlight={!!s.selectedCardId}
                onPlace={(r) => s.selectedCardId && s.moveCard(s.selectedCardId, r)}
                onRemove={(id) => s.moveCard(id, 'fan')}
              />
            </Measured>

            <Text style={styles.hint}>ลากไพ่ขึ้นไปวางในกอง • หรือลากกลับลงมาที่มือ</Text>

            {s.hand.length > 0 && (
              <Measured zoneKey="fan" setZone={setZone} style={styles.fanWrap}>
                <DraggableFan cards={s.hand} zones={zones} onDrop={onDrop} />
              </Measured>
            )}

            <View style={styles.actions}>
              <PrimaryButton label="จัดอัตโนมัติ" variant="emerald" icon={'\u21BB'} onPress={s.autoArrangeMe} style={{ flex: 1 }} />
              <PrimaryButton label="AI แนะนำ" variant="ghost" icon={'\u2728'} onPress={onSuggest} style={{ flex: 1 }} />
            </View>
            <PrimaryButton
              label={allPlaced ? 'ยืนยันไพ่' : `วางครบก่อน (เหลือ ${s.hand.length})`}
              onPress={onConfirm}
              disabled={!allPlaced}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      </SafeAreaView>

      {/* Deal animation overlays the whole screen in window coordinates */}
      {s.phase === 'dealing' && geo && (
        <DealAnimation
          origin={geo.origin}
          targets={geo.targets}
          total={13 * s.players.length}
          intervalMs={45}
          onDone={s.finishDealing}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  tableArea: { height: '34%', position: 'relative' },
  timer: { position: 'absolute', top: 8, right: 16 },
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
    paddingTop: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginVertical: 6 },
  fanWrap: { flexShrink: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
