import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from './gameStore';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';
import { evaluateRow } from './handEvaluator';
import { rowBonus } from './scoring';
import { RowKey } from './game';
import { colors, gradients, radius, spacing, shadow } from './theme';

const ROWS: RowKey[] = ['top', 'middle', 'bottom'];
const ROW_TH = { top: 'บน', middle: 'กลาง', bottom: 'ล่าง' };

export function ResultScreen() {
  const s = useGameStore();
  const settlement = s.settlement ?? [];
  const byId = new Map(settlement.map((e) => [e.playerId, e]));
  const mvp = settlement.find((e) => e.isMvp);
  const special = settlement.find((e) => e.label && (e.label.includes('ดาร์บี้') || e.label.includes('มังกร')));

  return (
    <LinearGradient colors={gradients.panel as unknown as string[]} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>ผลการแข่งขัน</Text>

        {special && (
          <LinearGradient colors={gradients.reward as unknown as string[]} style={styles.special}>
            <Text style={styles.specialText}>
              {special.label}! {s.players.find((p) => p.id === special.playerId)?.name} กินรวดทุกคน
            </Text>
          </LinearGradient>
        )}
        {!special && mvp && (
          <LinearGradient colors={gradients.reward as unknown as string[]} style={styles.special}>
            <Text style={styles.specialText}>
              ⭐ MVP: {s.players.find((p) => p.id === mvp.playerId)?.name}  (+{mvp.delta.toLocaleString('th-TH')})
            </Text>
          </LinearGradient>
        )}

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          {s.players.map((p) => {
            const entry = byId.get(p.id);
            const delta = entry?.delta ?? 0;
            return (
              <View key={p.id} style={[styles.playerCard, entry?.isMvp && styles.mvpCard]}>
                <View style={styles.playerHead}>
                  <Text style={styles.playerName}>
                    {p.name}{entry?.label ? `  ${entry.label}` : ''}
                  </Text>
                  <Text style={[styles.delta, { color: delta >= 0 ? colors.success : colors.danger }]}>
                    {delta >= 0 ? '+' : ''}{delta.toLocaleString('th-TH')}
                  </Text>
                </View>
                {p.arrangement &&
                  ROWS.map((row) => {
                    const cards = p.arrangement![row];
                    const v = evaluateRow(cards);
                    const bn = rowBonus(v, row);
                    return (
                      <View key={row} style={styles.rowLine}>
                        <Text style={styles.rowTag}>{ROW_TH[row]}</Text>
                        <View style={styles.rowCards}>
                          {cards.map((c) => (
                            <Card key={c.id} card={c} small style={{ marginRight: 3 }} />
                          ))}
                        </View>
                        <Text style={styles.rowVal}>
                          {v.label}{bn.pts > 0 ? ` ⭐${bn.pts}` : ''}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={s.round >= s.config.maxRounds ? 'จบเกม' : 'รอบต่อไป'}
            onPress={s.round >= s.config.maxRounds ? s.reset : s.startRound}
            style={{ flex: 1 }}
          />
          <PrimaryButton label="ออก" variant="ghost" onPress={s.reset} style={{ flex: 1 }} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.md },
  title: { color: colors.goldText, fontSize: 24, fontWeight: '800', textAlign: 'center', marginVertical: spacing.sm },
  special: { borderRadius: radius.pill, paddingVertical: 9, marginBottom: spacing.sm, ...shadow.gold },
  specialText: { color: colors.black, fontWeight: '800', textAlign: 'center', fontSize: 14 },
  playerCard: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: spacing.sm, marginBottom: spacing.sm,
  },
  mvpCard: { borderColor: colors.goldBright },
  playerHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  playerName: { color: colors.ivory, fontWeight: '700', fontSize: 15 },
  delta: { fontWeight: '800', fontSize: 17 },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  rowTag: { color: colors.goldText, width: 34, fontSize: 12, fontWeight: '700' },
  rowCards: { flexDirection: 'row', flex: 1, flexWrap: 'wrap', gap: 2 },
  rowVal: { color: colors.emeraldGlow, fontSize: 11, fontWeight: '700', width: 78, textAlign: 'right' },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
});
