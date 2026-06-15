import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card as CardType } from './game';
import { RANK_LABEL, SUIT_SYMBOL, isRedSuit } from './deck';
import { colors, radius, shadow } from './theme';

interface Props {
  card?: CardType;            // omit + faceDown for opponents
  faceDown?: boolean;
  selected?: boolean;
  small?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** A single playing card. Memoized — cards rerender a lot in a fan. */
function CardBase({ card, faceDown, selected, small, onPress, style }: Props) {
  const w = small ? 40 : 58;
  const h = small ? 58 : 84;
  const fontMain = small ? 16 : 22;

  if (faceDown || !card) {
    return (
      <View style={[styles.card, { width: w, height: h }, styles.back, style]}>
        <View style={styles.backInner}>
          <Text style={styles.backGlyph}>{'\u2756'}</Text>
        </View>
      </View>
    );
  }

  const red = isRedSuit(card.suit);
  const color = red ? colors.cardRed : colors.cardBlack;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        { width: w, height: h },
        styles.face,
        selected && styles.selected,
        style,
      ]}
    >
      <Text style={[styles.corner, { color, fontSize: fontMain }]}>
        {RANK_LABEL[card.rank]}
      </Text>
      <Text style={[styles.suit, { color, fontSize: fontMain + 4 }]}>
        {SUIT_SYMBOL[card.suit]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  face: {
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 4,
  },
  selected: {
    borderColor: colors.goldBright,
    borderWidth: 2,
    transform: [{ translateY: -14 }],
    ...shadow.gold,
  },
  corner: { position: 'absolute', top: 2, left: 5, fontWeight: '800' },
  suit: { fontWeight: '700' },
  back: {
    backgroundColor: colors.cardBack,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  backInner: {
    flex: 1,
    alignSelf: 'stretch',
    margin: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { color: colors.cardBackPattern, fontSize: 22 },
});

export const Card = React.memo(CardBase);
