/**
 * =============================================================================
 * SMART CROP DISEASE DETECTOR - THEME & DESIGN TOKENS
 * =============================================================================
 * Earth & Agriculture high-contrast palette optimized for outdoor sunlight
 * and small Android screens.
 * =============================================================================
 */

export const THEME = {
  colors: {
    // Primary Agriculture Greens
    primary: '#1B5E20',       // Dark forest green (maximum contrast)
    primaryLight: '#2E7D32',  // Vibrant field green
    primaryAccent: '#43A047', // Leaf green for badges/highlights
    primarySurface: '#E8F5E9',// Soft pastel green for card highlights

    // Earth & Neutral Accents
    earthBrown: '#5D4037',    // Soil brown
    earthMuted: '#8D6E63',    // Light bark brown
    background: '#F5F7F4',    // Clean natural off-white (easy on eyes outdoors)
    surface: '#FFFFFF',       // Card white
    surfaceAlt: '#F0F4EF',    // Secondary card background

    // High Contrast Typography
    textPrimary: '#141E15',   // Deep green-black for crystal-clear readability
    textSecondary: '#4A5B4D', // Medium slate-green
    textMuted: '#6D7F70',     // Subtle text
    textLight: '#FFFFFF',     // Inverted white text

    // Status Colors
    healthyGreen: '#2E7D32',
    healthyBg: '#E8F5E9',
    diseaseRed: '#C62828',
    diseaseBg: '#FFEBEE',
    warningOrange: '#D84315',
    warningBg: '#FFF3E0',
    warningBorder: '#FFE082',

    // Borders & Shadows
    border: '#D8E2D7',
    borderLight: '#E8EFE7',
    shadow: '#000000',
  },

  typography: {
    titleLarge: {
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
    titleMedium: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 26,
    },
    titleSmall: {
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 22,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3, // Android shadow
    },
    button: {
      shadowColor: '#1B5E20',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 4,
    },
  },
};
