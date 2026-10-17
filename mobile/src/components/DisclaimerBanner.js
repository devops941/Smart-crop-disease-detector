/**
 * =============================================================================
 * AGRICULTURAL ADVISORY DISCLAIMER BANNER
 * =============================================================================
 * Always visible at the bottom of key screens to prevent misuse of AI advice.
 * =============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';
import { STRINGS } from '../strings';

export function DisclaimerBanner({ style }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{STRINGS.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1', // Warm subtle amber note
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    marginVertical: THEME.spacing.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
    lineHeight: 16,
    textAlign: 'center',
  },
});
