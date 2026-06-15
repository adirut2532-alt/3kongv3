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
  onLiftStart?: (zone: string) => void;
  onLiftEnd?: () => void;
}

/** The player's hand. No ScrollView (it fights the pan gesture); cards wrap. */
export function DraggableFan({ cards, zones, onDrop, onLiftStart, onLiftEnd }: Props) {
  return (
    <View style={styles.wrap}>
      {cards.map((c) => (
        <DraggableCard
          key={c.id}
          card={c}
          homeZone="fan"
          zones={zones}
          onDrop={onDrop}
          onLiftStart={onLiftStart}
          onLiftEnd={onLiftEnd}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line,
  },
});
