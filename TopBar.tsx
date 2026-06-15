import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from './theme';

interface Props {
  name: string;
  coins: number;
  vipLevel: number;
  onSettings?: () => void;
  onRanking?: () => void;
  onRewards?: () => void;
}

const fmt = (n: number) => n.toLocaleString('th-TH');

export function TopBar({ name, coins, vipLevel, onSettings, onRanking, onRewards }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.profile}>
        <LinearGradient colors={[colors.goldBright, colors.goldDeep]} style={styles.avatar}>
          <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.vipPill}>
            <Text style={styles.vipText}>VIP {vipLevel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.coinsBox}>
        <Text style={styles.coinIcon}>{'\u25C9'}</Text>
        <Text style={styles.coins}>{fmt(coins)}</Text>
        <Pressable style={styles.plus}><Text style={styles.plusText}>+</Text></Pressable>
      </View>

      <View style={styles.actions}>
        <IconBtn glyph={'\u2691'} onPress={onRewards} />
        <IconBtn glyph={'\u265B'} onPress={onRanking} />
        <IconBtn glyph={'\u2699'} onPress={onSettings} />
      </View>
    </View>
  );
}

function IconBtn({ glyph, onPress }: { glyph: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn}>
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.goldText,
  },
  avatarText: { color: colors.black, fontWeight: '800', fontSize: 18 },
  name: { color: colors.ivory, fontWeight: '700', fontSize: 13, maxWidth: 90 },
  vipPill: {
    backgroundColor: colors.emeraldDark, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 1, marginTop: 2, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.gold,
  },
  vipText: { color: colors.goldText, fontSize: 10, fontWeight: '700' },
  coinsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.pill,
    paddingLeft: 10, paddingRight: 4, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.line,
  },
  coinIcon: { color: colors.goldBright, fontSize: 14 },
  coins: { color: colors.goldText, fontWeight: '800', fontSize: 14 },
  plus: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.emerald,
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { color: colors.ivory, fontWeight: '800', fontSize: 16, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line,
  },
  iconGlyph: { color: colors.goldText, fontSize: 16 },
});
