import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card as CardType } from './game';
import { RANK_LABEL, SUIT_SYMBOL, isRedSuit } from './deck';
import { card as cardSize, colors, radius, shadow } from './theme';

interface Props {
  card?: CardType;
  faceDown?: boolean;
  selected?: boolean;
  small?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** A single playing card. Bigger rank + suit for phone readability. */
function CardBase({ card, faceDown, selected, small, onPress, style }: Props) {
  const sz = small ? cardSize.sm : cardSize.lg;

  if (faceDown || !card) {
    return (
      <View style={[styles.card, { width: sz.w, height: sz.h }, styles.back, style]}>
        <View style={styles.backInner}>
          <Text style={[styles.backGlyph, { fontSize: sz.suit }]}>{'\u2756'}</Text>
        </View>
      </View>
    );
  }

  const red = isRedSuit(card.suit);
  const color = red ? colors.cardRed : colors.cardBlack;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { width: sz.w, height: sz.h }, styles.face, selected && styles.selected, style]}
    >
      <Text style={[styles.rank, { color, fontSize: sz.rank }]}>{RANK_LABEL[card.rank]}</Text>
      <Text style={[styles.suit, { color, fontSize: sz.suit }]}>{SUIT_SYMBOL[card.suit]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  face: {
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    paddingTop: 3,
  },
  selected: {
    borderColor: colors.goldBright,
    borderWidth: 2.5,
    transform: [{ translateY: -14 }],
    ...shadow.gold,
  },
  rank: { position: 'absolute', top: 1, left: 5, fontWeight: '900', letterSpacing: -0.5 },
  suit: { fontWeight: '800', marginTop: 6 },
  back: { backgroundColor: colors.cardBack, borderWidth: 2, borderColor: colors.gold },
  backInner: {
    flex: 1, alignSelf: 'stretch', margin: 4, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  backGlyph: { color: colors.cardBackPattern },
});

export const Card = React.memo(CardBase);
