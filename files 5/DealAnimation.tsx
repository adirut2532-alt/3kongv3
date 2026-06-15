import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Card } from './Card';

export interface Pt { x: number; y: number; }

interface Props {
  origin: Pt;            // deck position (window coords) — center
  targets: Pt[];         // seat positions (window coords) — one per player, center
  total?: number;        // total cards to deal (default 52)
  intervalMs?: number;   // gap between launches (smaller = faster)
  flightMs?: number;     // per-card flight time
  onDone: () => void;
}

const CARD_W = 40;
const CARD_H = 58;

let SPRITE_ID = 0;

/**
 * Deals `total` cards one-by-one, cycling through `targets` (player seats).
 * Each card flies from the deck origin to a seat with a slight spin, then
 * disappears. When the last card lands, onDone fires (→ reveal the hand).
 *
 * Tuned fast by default: 45ms launch gap → ~2.3s for a full 52-card deal.
 */
export function DealAnimation({
  origin,
  targets,
  total = 52,
  intervalMs = 45,
  flightMs = 240,
  onDone,
}: Props) {
  const [sprites, setSprites] = useState<{ id: number; target: Pt }[]>([]);
  const launched = useRef(0);
  const landed = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    if (!targets.length) return;
    const timer = setInterval(() => {
      if (launched.current >= total) {
        clearInterval(timer);
        return;
      }
      const seat = launched.current % targets.length;
      const id = ++SPRITE_ID;
      const target = targets[seat];
      setSprites((s) => [...s, { id, target }]);
      launched.current += 1;
    }, intervalMs);
    return () => clearInterval(timer);
  }, [targets, total, intervalMs]);

  const remove = (id: number) => {
    setSprites((s) => s.filter((x) => x.id !== id));
    landed.current += 1;
    if (landed.current >= total && !done.current) {
      done.current = true;
      onDone();
    }
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {sprites.map((sp) => (
        <Sprite
          key={sp.id}
          origin={origin}
          target={sp.target}
          flightMs={flightMs}
          onLand={() => remove(sp.id)}
        />
      ))}
    </View>
  );
}

function Sprite({
  origin,
  target,
  flightMs,
  onLand,
}: {
  origin: Pt;
  target: Pt;
  flightMs: number;
  onLand: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: flightMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onLand());
  }, []);

  // interpolate top-left corner so the card centers on origin/target
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [origin.x - CARD_W / 2, target.x - CARD_W / 2],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [origin.y - CARD_H / 2, target.y - CARD_H / 2],
  });
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '4deg'],
  });
  const scale = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1.05, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.sprite,
        { transform: [{ translateX }, { translateY }, { rotate }, { scale }] },
      ]}
    >
      <Card faceDown small />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sprite: { position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H },
});
