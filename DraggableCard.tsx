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

export interface Zone {
  key: string; // 'top' | 'middle' | 'bottom' | 'fan'
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  card: CardType;
  zones: SharedValue<Zone[]>;
  /** returns true if the move committed (card left here), false → snap back */
  onDrop: (id: string, target: string) => boolean;
  width?: number;
  height?: number;
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 };

/**
 * A card you can drag into any registered drop zone.
 * - position is driven on the UI thread (smooth, no JS-thread jank)
 * - hit-testing happens in the onEnd worklet against measured window rects
 * - commit/snap-back decided by the store via onDrop
 */
function DraggableCardBase({ card, zones, onDrop, width = 40, height = 58 }: Props) {
  const viewRef = useRef<View>(null);
  const homeX = useSharedValue(0);
  const homeY = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const lifted = useSharedValue(0);

  // Re-measure window position whenever layout settles (cards reflow as the
  // hand empties / fills). Keeps hit-testing accurate.
  const measure = useCallback(() => {
    viewRef.current?.measureInWindow((x, y) => {
      homeX.value = x;
      homeY.value = y;
    });
  }, []);

  const commit = useCallback(
    (target: string | null) => {
      const changed = target ? onDrop(card.id, target) : false;
      if (!changed) {
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
      }
      // if changed, this card unmounts as the store moves it elsewhere
    },
    [card.id, onDrop]
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(0)
    .onBegin(() => {
      scale.value = withSpring(1.18, SPRING);
      lifted.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      const cx = homeX.value + tx.value + width / 2;
      const cy = homeY.value + ty.value + height / 2;
      let target: string | null = null;
      const list = zones.value;
      for (let i = 0; i < list.length; i++) {
        const z = list[i];
        if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) {
          target = z.key;
          break;
        }
      }
      runOnJS(commit)(target);
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING);
      lifted.value = 0;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: lifted.value ? 999 : 0,
    elevation: lifted.value ? 999 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View ref={viewRef} onLayout={measure} style={[{ width, height }, style]}>
        <Card card={card} small />
      </Animated.View>
    </GestureDetector>
  );
}

export const DraggableCard = React.memo(DraggableCardBase);
