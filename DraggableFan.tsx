import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { DraggableCard, Zone } from './DraggableCard';
import { Card as CardType } from './game';
import { colors, radius, spacing } from './theme';

interface Props {
  cards: CardType[];
  zones: SharedValue<Zone[]>;
  onDrop: (id: string, target: string) => boolean;
}

/**
 * The player's hand. Deliberately NOT a horizontal ScrollView — a scroll
 * view fights the pan gesture and is the usual source of drag jank. Instead
 * cards wrap onto two rows so all 13 stay reachable and each is independently
 * draggable. Higher zIndex so a lifted card renders above the hand rows above.
 */
export function DraggableFan({ cards, zones, onDrop }: Props) {
  return (
    <View style={styles.wrap}>
      {cards.map((c) => (
        <View key={c.id} style={styles.slot}>
          <DraggableCard card={c} zones={zones} onDrop={onDrop} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    zIndex: 5,        // lifted cards from here float above the rows
    elevation: 5,
  },
  slot: {},
});
