/**
 * theme.ts
 * Luxury Thai-casino design tokens.
 * Gold / emerald green / black / dark wood palette.
 * Use these everywhere instead of hardcoding colors so the whole app stays consistent.
 */

export const colors = {
  // Core surfaces
  black: '#0A0A0B',
  obsidian: '#121316',
  wood: '#2A1B12',
  woodLight: '#3E2A1B',
  felt: '#0B3D2E', // emerald table felt
  feltDeep: '#072A20',

  // Emerald
  emerald: '#1F8A5B',
  emeraldDark: '#0E5A3A',
  emeraldGlow: '#34D399',

  // Gold
  gold: '#D4AF37',
  goldBright: '#F4D03F',
  goldDeep: '#A8861E',
  goldText: '#F8E7A1',

  // Neutrals / text
  ivory: '#F5EFE0',
  parchment: '#E8DFC8',
  textMuted: '#9A917C',
  line: 'rgba(212,175,55,0.25)',

  // Card faces
  cardFace: '#FBF7EC',
  cardRed: '#C0392B',
  cardBlack: '#1A1A1A',
  cardBack: '#5A1212',
  cardBackPattern: '#D4AF37',

  // States
  danger: '#E74C3C',
  success: '#2ECC71',
  warning: '#E67E22',

  overlay: 'rgba(5,5,6,0.72)',
} as const;

export const gradients = {
  gold: ['#F4D03F', '#D4AF37', '#A8861E'],
  emerald: ['#1F8A5B', '#0E5A3A'],
  table: ['#0E5A3A', '#072A20'],
  panel: ['#1B1410', '#0A0A0B'],
  reward: ['#F4D03F', '#D4AF37', '#FBF7EC'],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
  card: 10,
} as const;

export const font = {
  // Swap these for a real Thai display font (e.g. "Kanit", "Prompt") via expo-font.
  display: 'System',
  body: 'System',
  weightBold: '800' as const,
  weightSemi: '600' as const,
  weightReg: '400' as const,
};

export const shadow = {
  gold: {
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
};

export const theme = { colors, gradients, spacing, radius, font, shadow };
export type Theme = typeof theme;
