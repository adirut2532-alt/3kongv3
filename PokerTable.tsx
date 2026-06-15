import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Player } from './game';
import { Card } from './Card';
import { colors, gradients, radius, shadow, spacing } from './theme';

interface Props {
  players: Player[];
  meId: string;
  dealerSeat: number;
  pot: number;
  round: number;
  maxRounds: number;
}

/** Seat layout around an oval felt table (portrait). Seat 0 = me, bottom. */
const SEAT_POS = [
  { bottom: 4, alignSelf: 'center' as const },     // me
  { left: 6, top: '38%' as const },                 // left
  { top: 4, alignSelf: 'center' as const },         // top
  { right: 6, top: '38%' as const },                // right
];

export function PokerTable({ players, meId, dealerSeat, pot, round, maxRounds }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradients.table as unknown as string[]} style={styles.felt}>
        <View style={styles.feltInner}>
          <Text style={styles.pot}>{'\u25C9'} {pot.toLocaleString('th-TH')}</Text>
          <Text style={styles.round}>รอบ {round}/{maxRounds}</Text>
        </View>
      </LinearGradient>

      {players.map((p) => {
        const pos = SEAT_POS[p.seat] ?? SEAT_POS[0];
        const isMe = p.id === meId;
        return (
          <View key={p.id} style={[styles.seat, pos as any]}>
            <Seat player={p} isMe={isMe} isDealer={p.seat === dealerSeat} />
          </View>
        );
      })}
    </View>
  );
}

function Seat({ player, isMe, isDealer }: { player: Player; isMe: boolean; isDealer: boolean }) {
  const ready = player.status === 'ready' || player.status === 'revealed';
  return (
    <View style={styles.seatBox}>
      {!isMe && (
        <View style={styles.miniCards}>
          {[0, 1, 2].map((i) => (
            <Card key={i} faceDown small style={{ marginLeft: i ? -26 : 0 }} />
          ))}
        </View>
      )}
      <View style={[styles.nameTag, ready && styles.nameTagReady]}>
        <LinearGradient colors={[colors.goldBright, colors.goldDeep]} style={styles.seatAvatar}>
          <Text style={styles.seatAvatarText}>{player.name.slice(0, 1)}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.seatName} numberOfLines={1}>{player.name}</Text>
          <Text style={styles.seatCoins}>{player.coins.toLocaleString('th-TH')}</Text>
        </View>
        {isDealer && <View style={styles.dealer}><Text style={styles.dealerText}>D</Text></View>}
      </View>
      {ready && !isMe && <Text style={styles.readyTag}>พร้อม</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative', justifyContent: 'center' },
  felt: {
    position: 'absolute', top: '14%', bottom: '14%', left: '8%', right: '8%',
    borderRadius: 999, borderWidth: 6, borderColor: colors.woodLight,
    alignItems: 'center', justifyContent: 'center', ...shadow.card,
  },
  feltInner: {
    width: '70%', height: '46%', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  pot: { color: colors.goldText, fontWeight: '800', fontSize: 20 },
  round: { color: colors.parchment, fontSize: 12 },
  seat: { position: 'absolute' },
  seatBox: { alignItems: 'center', gap: 4 },
  miniCards: { flexDirection: 'row' },
  nameTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.pill,
    paddingLeft: 3, paddingRight: 12, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.line,
  },
  nameTagReady: { borderColor: colors.emeraldGlow },
  seatAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  seatAvatarText: { color: colors.black, fontWeight: '800' },
  seatName: { color: colors.ivory, fontSize: 11, fontWeight: '700', maxWidth: 70 },
  seatCoins: { color: colors.goldText, fontSize: 10 },
  dealer: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },
  dealerText: { color: colors.black, fontSize: 10, fontWeight: '800' },
  readyTag: { color: colors.emeraldGlow, fontSize: 10, fontWeight: '700' },
});
