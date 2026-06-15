import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './src/screens/GameScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { useGameStore } from './src/store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      {phase === 'result' ? <ResultScreen /> : <GameScreen />}
    </GestureHandlerRootView>
  );
}
