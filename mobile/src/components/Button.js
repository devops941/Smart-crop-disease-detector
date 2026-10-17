/**
 * =============================================================================
 * ACCESSIBLE HIGH-CONTRAST TOUCH BUTTON
 * =============================================================================
 * Designed for outdoor visibility and one-handed thumb use on small devices.
 * =============================================================================
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { THEME } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  let buttonBg = THEME.colors.primary;
  let textColor = THEME.colors.textLight;

  if (isOutline) {
    buttonBg = 'transparent';
    textColor = THEME.colors.primary;
  } else if (isSecondary) {
    buttonBg = THEME.colors.earthBrown;
    textColor = THEME.colors.textLight;
  } else if (isDanger) {
    buttonBg = THEME.colors.diseaseRed;
    textColor = THEME.colors.textLight;
  }

  if (disabled || loading) {
    buttonBg = isOutline ? 'transparent' : '#A5B5A5';
    textColor = isOutline ? '#A5B5A5' : '#FFFFFF';
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: buttonBg },
        isOutline && styles.outlineBorder,
        !isOutline && THEME.shadows.button,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.xs,
  },
  outlineBorder: {
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
