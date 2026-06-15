import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { Card as CardType, RowKey } from './game';
import { evaluateRow } from './handEvaluator';
import { ROW_SIZE } from './scoring';
import { colors, radius, spacing } from './theme';

interface Props {
  row: RowKey;
  cards: CardType[];
  label: string;          // Thai row name
  /** when a card is selected in the fan, tapping the row places it */
  onPlace?: (row: RowKey) => void;
  onRemove?: (id: string, row: RowKey) => void;
  highlight?: boolean;    // selected card waiting to be placed
}

export function HandRow({ row, cards, label, onPlace, onRemove, highlight }: Props) {
  const size = ROW_SIZE[row];
  const full = cards.length === size;
  const value = full ? evaluateRow(cards) : null;
  const empties = size - cards.length;

  return (
    <Pressable
      onPress={() => !full && onPlace?.(row)}
      style={[styles.row, highlight && !full && styles.rowActive]}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{cards.length}/{size}</Text>
      </View>

      <View style={styles.slots}>
        {cards.map((c) => (
          <Card key={c.id} card={c} small onPress={() => onRemove?.(c.id, row)} />
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <View key={`e${i}`} style={styles.empty} />
        ))}
      </View>

      {value && (
        <Text style={styles.strength}>{value.label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.goldBright, backgroundColor: 'rgba(212,175,55,0.12)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: colors.goldText, fontWeight: '700', fontSize: 13 },
  count: { color: colors.textMuted, fontSize: 12 },
  slots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  empty: {
    width: 40, height: 58, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.3)',
    borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  strength: {
    color: colors.emeraldGlow, fontSize: 12, fontWeight: '700',
    marginTop: 6, textAlign: 'right',
  },
});
