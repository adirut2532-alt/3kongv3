import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './GameScreen';
import { ResultScreen } from './ResultScreen';
import { useGameStore } from './gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {phase === 'result' ? <ResultScreen /> : <GameScreen />}
    </GestureHandlerRootView>
  );
}
