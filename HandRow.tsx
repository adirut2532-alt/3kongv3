import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { DraggableCard, Zone } from './DraggableCard';
import { Card as CardType, RowKey } from './game';
import { evaluateRow } from './handEvaluator';
import { ROW_SIZE, rowBonus } from './scoring';
import { card as cardSize, colors, radius, spacing } from './theme';

interface Props {
  row: RowKey;
  cards: CardType[];
  label: string;
  zones: SharedValue<Zone[]>;
  onDrop: (id: string, target: string) => boolean;
  onLiftStart?: (zone: string) => void;
  onLiftEnd?: () => void;
  highlight?: boolean;   // a card is being dragged → glow the drop target
}

/** A row (กอง). Placed cards are draggable so you can swap between rows. */
export function HandRow({ row, cards, label, zones, onDrop, onLiftStart, onLiftEnd, highlight }: Props) {
  const size = ROW_SIZE[row];
  const full = cards.length === size;
  const value = full ? evaluateRow(cards) : null;
  const bonus = value ? rowBonus(value, row) : null;
  const empties = size - cards.length;

  return (
    <View style={[styles.row, highlight && !full && styles.rowActive]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{cards.length}/{size}</Text>
      </View>

      <View style={styles.slots}>
        {cards.map((c) => (
          <DraggableCard
            key={c.id}
            card={c}
            homeZone={row}
            zones={zones}
            onDrop={onDrop}
            onLiftStart={onLiftStart}
            onLiftEnd={onLiftEnd}
          />
        ))}
        {Array.from({ length: empties }).map((_, i) => (
          <View key={`e${i}`} style={styles.empty} />
        ))}
      </View>

      {value && (
        <Text style={styles.strength}>
          {value.label}{bonus && bonus.pts > 0 ? `  ⭐ ${bonus.label}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
    paddingBottom: 6,
    marginBottom: 6,
  },
  rowActive: { borderColor: colors.goldBright, backgroundColor: 'rgba(212,175,55,0.12)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: colors.goldText, fontWeight: '700', fontSize: 13 },
  count: { color: colors.textMuted, fontSize: 12 },
  slots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', minHeight: cardSize.sm.h },
  empty: {
    width: cardSize.sm.w, height: cardSize.sm.h, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.3)',
    borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  strength: { color: colors.emeraldGlow, fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'right' },
});
