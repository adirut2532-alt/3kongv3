import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Card } from './Card';
import { Card as CardType } from './game';
import { card as cardSize } from './theme';

export interface Zone { key: string; x: number; y: number; w: number; h: number; }

interface Props {
  card: CardType;
  homeZone: string;                 // where this card currently lives
  zones: SharedValue<Zone[]>;
  onDrop: (id: string, target: string) => boolean;
  onLiftStart?: (zone: string) => void;
  onLiftEnd?: () => void;
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

/**
 * A card you can drag into any registered drop zone (rows or hand).
 * Works from the hand AND from a row, so cards can be swapped between rows.
 */
function DraggableCardBase({ card, homeZone, zones, onDrop, onLiftStart, onLiftEnd }: Props) {
  const w = cardSize.sm.w;
  const h = cardSize.sm.h;
  const viewRef = useRef<View>(null);
  const homeX = useSharedValue(0);
  const homeY = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const lifted = useSharedValue(0);

  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y) => { homeX.value = x; homeY.value = y; });
  }, []);

  const commit = useCallback((target: string | null) => {
    const changed = target ? onDrop(card.id, target) : false;
    if (!changed) { tx.value = withSpring(0, SPRING); ty.value = withSpring(0, SPRING); }
    onLiftEnd?.();
  }, [card.id, onDrop, onLiftEnd]);

  const beginLift = useCallback(() => { onLiftStart?.(homeZone); }, [homeZone, onLiftStart]);

  const pan = Gesture.Pan()
    .activateAfterLongPress(0)
    .onBegin(() => { scale.value = withSpring(1.22, SPRING); lifted.value = 1; runOnJS(beginLift)(); })
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY; })
    .onEnd(() => {
      const cx = homeX.value + tx.value + w / 2;
      const cy = homeY.value + ty.value + h / 2;
      let target: string | null = null;
      const list = zones.value;
      for (let i = 0; i < list.length; i++) {
        const z = list[i];
        if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) { target = z.key; break; }
      }
      runOnJS(commit)(target);
    })
    .onFinalize(() => { scale.value = withSpring(1, SPRING); lifted.value = 0; });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: lifted.value ? 999 : 0,
    elevation: lifted.value ? 999 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View ref={viewRef} onLayout={measure} style={[{ width: w, height: h }, style]}>
        <Card card={card} small />
      </Animated.View>
    </GestureDetector>
  );
}

export const DraggableCard = React.memo(DraggableCardBase);
