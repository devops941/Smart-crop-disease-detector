/**
 * =============================================================================
 * CONFIDENCE PROGRESS BAR
 * =============================================================================
 * Visual confidence indicator with dynamic color mapping based on certainty.
 * =============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';
import { formatConfidence } from '../utils/formatters';

export function ConfidenceBar({ confidence = 0.0, showLabel = true, style }) {
  const percentage = Math.min(Math.max(confidence * 100, 0), 100);

  // Dynamic color coding
  let barColor = THEME.colors.primaryLight;
  if (confidence < 0.60) {
    barColor = THEME.colors.warningOrange;
  } else if (confidence < 0.80) {
    barColor = '#F57C00'; // Amber
  }

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>Certainty</Text>
          <Text style={[styles.percentage, { color: barColor }]}>
            {formatConfidence(confidence)}
          </Text>
        </View>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  percentage: {
    fontSize: 15,
    fontWeight: '800',
  },
  track: {
    height: 10,
    backgroundColor: '#E0EAE0',
    borderRadius: THEME.borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: THEME.borderRadius.pill,
  },
});
