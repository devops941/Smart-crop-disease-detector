/**
 * =============================================================================
 * DISEASE DETAILS SCREEN
 * =============================================================================
 * In-depth agricultural guidance for a single disease classification, including
 * symptoms, ICAR/TNAU management guidelines, and prevention practices.
 * =============================================================================
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { THEME } from '../theme';
import { STRINGS } from '../strings';
import { Button } from '../components/Button';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { formatDiseaseName, isHealthy } from '../utils/formatters';

export function DiseaseDetailsScreen({ route, navigation }) {
  const { prediction, imageUri } = route.params || {};

  if (!prediction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No disease details available.</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const diseaseFormatted = formatDiseaseName(prediction.disease);
  const healthy = isHealthy(prediction.disease);
  const info = prediction.info || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Optional Image Header */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.leafImage} resizeMode="cover" />
        ) : null}

        {/* Title Header Card */}
        <View style={[styles.titleCard, healthy ? styles.healthyCard : styles.diseaseCard]}>
          <Text style={styles.statusBadge}>
            {healthy ? '🌱 Healthy Crop Condition' : '⚠ Plant Disease Identified'}
          </Text>
          <Text style={styles.diseaseTitle}>{diseaseFormatted}</Text>

          <View style={styles.confContainer}>
            <ConfidenceBar confidence={prediction.confidence} />
          </View>
        </View>

        {/* 1. Symptoms Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🔍</Text>
            <Text style={styles.sectionTitle}>{STRINGS.symptomsTitle}</Text>
          </View>
          <Text style={styles.sectionBody}>
            {info.symptoms || 'No specific visual symptoms listed for this condition.'}
          </Text>
        </View>

        {/* 2. Treatment & Management Section */}
        <View style={[styles.card, styles.treatmentCard]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>💊</Text>
            <Text style={styles.sectionTitle}>{STRINGS.treatmentTitle}</Text>
          </View>
          <Text style={styles.sectionBody}>
            {info.treatment || 'No specific treatment required. Maintain balanced nutrition.'}
          </Text>
        </View>

        {/* 3. Prevention & Cultural Control Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🛡️</Text>
            <Text style={styles.sectionTitle}>{STRINGS.preventionTitle}</Text>
          </View>
          <Text style={styles.sectionBody}>
            {info.prevention || 'Maintain sanitary field conditions and inspect crops regularly.'}
          </Text>
        </View>

        {/* Official Advisory Notice Box */}
        <View style={styles.advisoryNoticeCard}>
          <Text style={styles.advisoryNoticeTitle}>📋 {STRINGS.expertAdvisoryNotice}</Text>
          <Text style={styles.advisoryNoticeText}>{STRINGS.advisoryNote}</Text>
        </View>

        <Button
          title="← Back to Scan Results"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backBtn}
        />

        <DisclaimerBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    padding: THEME.spacing.md,
  },
  leafImage: {
    width: '100%',
    height: 200,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
  },
  titleCard: {
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 2,
    ...THEME.shadows.card,
  },
  healthyCard: {
    backgroundColor: THEME.colors.healthyBg,
    borderColor: THEME.colors.healthyGreen,
  },
  diseaseCard: {
    backgroundColor: '#FFF5F5',
    borderColor: THEME.colors.diseaseRed,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  diseaseTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginVertical: 6,
  },
  confContainer: {
    marginTop: THEME.spacing.xs,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  treatmentCard: {
    backgroundColor: THEME.colors.primarySurface,
    borderColor: '#C8E6C9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionBody: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },
  advisoryNoticeCard: {
    backgroundColor: '#ECEFF1',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#607D8B',
  },
  advisoryNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 4,
  },
  advisoryNoticeText: {
    fontSize: 12,
    color: '#455A64',
    lineHeight: 18,
  },
  backBtn: {
    marginVertical: THEME.spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
});
