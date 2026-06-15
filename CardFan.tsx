import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Card as CardType } from './game';
import { spacing } from './theme';

interface Props {
  cards: CardType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Horizontal fan of the player's unplaced cards.
 * Overlaps cards slightly; selected card lifts up (handled in Card).
 * Scrolls horizontally so all 13 stay reachable on narrow phones.
 */
export function CardFan({ cards, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {cards.map((c, i) => (
        <View key={c.id} style={[styles.slot, i > 0 && styles.overlap]}>
          <Card
            card={c}
            selected={selectedId === c.id}
            onPress={() => onSelect(c.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, alignItems: 'flex-end' },
  slot: {},
  overlap: { marginLeft: -18 },
});
