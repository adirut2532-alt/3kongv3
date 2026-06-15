import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

interface Props {
  endsAt?: number;        // epoch ms
  total?: number;         // seconds, for color thresholds
  onExpire?: () => void;
}

/** Lightweight numeric countdown. Swap for an SVG ring if you want the arc. */
export function Timer({ endsAt, total = 60, onExpire }: Props) {
  const [left, setLeft] = useState(total);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const danger = left <= 10;
  return (
    <View style={[styles.ring, danger && styles.ringDanger]}>
      <Text style={[styles.text, danger && styles.textDanger]}>{left}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 3, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ringDanger: { borderColor: colors.danger },
  text: { color: colors.goldText, fontWeight: '800', fontSize: 18 },
  textDanger: { color: colors.danger },
});
