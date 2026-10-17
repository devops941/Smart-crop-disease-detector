/**
 * =============================================================================
 * PREDICTION RESULT CARD
 * =============================================================================
 * Displays one predicted crop condition with its confidence score and a
 * tap target to view full symptom/treatment advisory.
 * =============================================================================
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';
import { ConfidenceBar } from './ConfidenceBar';
import { formatDiseaseName, isHealthy } from '../utils/formatters';

export function PredictionCard({ prediction, rank = 1, isPrimary = false, onPress }) {
  if (!prediction) return null;

  const diseaseFormatted = formatDiseaseName(prediction.disease);
  const healthy = isHealthy(prediction.disease);
  const confidence = prediction.confidence || 0.0;
  const symptomsSnippet = prediction.info?.symptoms || 'Visual confirmation advisory available.';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        isPrimary && styles.primaryCard,
        healthy && styles.healthyCard,
        THEME.shadows.card,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.rankBadge, isPrimary && styles.primaryBadge]}>
          <Text style={[styles.rankText, isPrimary && styles.primaryRankText]}>
            #{rank}
          </Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.diseaseTitle}>{diseaseFormatted}</Text>
          <Text style={[styles.statusTag, { color: healthy ? THEME.colors.healthyGreen : THEME.colors.diseaseRed }]}>
            {healthy ? '● No Disease Detected' : '● Action Required'}
          </Text>
        </View>
      </View>

      <ConfidenceBar confidence={confidence} />

      {prediction.info?.symptoms ? (
        <Text style={styles.snippet} numberOfLines={2}>
          {symptomsSnippet}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.detailLink}>Tap to view treatment & prevention →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  primaryCard: {
    borderColor: THEME.colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  healthyCard: {
    borderColor: '#A5D6A7',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.sm,
  },
  primaryBadge: {
    backgroundColor: THEME.colors.primary,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
  },
  primaryRankText: {
    color: THEME.colors.textLight,
  },
  titleContainer: {
    flex: 1,
  },
  diseaseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  snippet: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  footerRow: {
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryLight,
  },
});
