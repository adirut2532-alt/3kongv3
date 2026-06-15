import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadow, spacing } from '../theme/theme';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'gold' | 'emerald' | 'ghost';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label, onPress, variant = 'gold', icon, loading, disabled, style,
}: Props) {
  const grad = variant === 'emerald' ? gradients.emerald : gradients.gold;
  const textColor = variant === 'gold' ? colors.black : colors.ivory;

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.btn, styles.ghost, disabled && styles.disabled, style]}
      >
        <Text style={[styles.label, { color: colors.goldText }]}>
          {icon ? `${icon}  ` : ''}{label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[style, disabled && styles.disabled]}>
      <LinearGradient
        colors={grad as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, shadow.gold]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>
            {icon ? `${icon}  ` : ''}{label}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  label: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  disabled: { opacity: 0.45 },
});
