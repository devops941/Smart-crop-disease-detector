/**
 * =============================================================================
 * RESULT SCREEN - CROP DISEASE DIAGNOSIS
 * =============================================================================
 * Displays leaf image, model predictions, confidence bars, ICAR guidance,
 * and low-confidence warning banners.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { THEME } from '../theme';
import { STRINGS } from '../strings';
import { Button } from '../components/Button';
import { PredictionCard } from '../components/PredictionCard';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { uploadLeaf } from '../api';
import { saveScanToHistory } from '../utils/storage';
import { formatDiseaseName, isHealthy } from '../utils/formatters';
import { CONFIG } from '../config';

export function ResultScreen({ route, navigation }) {
  const { imageUri, existingScan } = route.params || {};

  const [loading, setLoading] = useState(!existingScan);
  const [data, setData] = useState(existingScan || null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showDemoFallback, setShowDemoFallback] = useState(false);

  useEffect(() => {
    let timer;
    if (loading && !existingScan) {
      timer = setTimeout(() => {
        setShowDemoFallback(true);
      }, 3500);
    }
    return () => clearTimeout(timer);
  }, [loading, existingScan]);

  useEffect(() => {
    // If opened from History, we already have data
    if (existingScan) {
      setData(existingScan);
      setLoading(false);
      return;
    }

    // Otherwise, trigger upload and inference
    performDiagnosis();
  }, [imageUri]);

  const handleSwitchToDemo = async () => {
    CONFIG.USE_MOCK_API = true;
    setShowDemoFallback(false);
    await performDiagnosis();
  };

  const performDiagnosis = async () => {
    if (!imageUri) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await uploadLeaf(imageUri);
      setData(response);

      // Auto-save successful scan to device history
      await saveScanToHistory({
        imageUri,
        predictions: response.predictions,
        low_confidence: response.low_confidence,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Diagnosis failed:', err);
      setErrorMessage(err.message || STRINGS.errors.unknownError);
    } finally {
      setLoading(false);
    }
  };

  const predictions = data?.predictions || [];
  const primaryPrediction = predictions[0] || null;
  const isLowConfidence = !!data?.low_confidence;
  const healthy = primaryPrediction ? isHealthy(primaryPrediction.disease) : false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Leaf Image Preview */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.leafImage} resizeMode="cover" />
            {data && (
              <View style={[styles.imageBadge, healthy ? styles.healthyBadge : styles.diseaseBadge]}>
                <Text style={styles.imageBadgeText}>
                  {healthy ? '✓ Healthy Leaf' : '⚠ Issue Detected'}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ------------------------------------------------------------------ */}
        {/* LOADING STATE */}
        {/* ------------------------------------------------------------------ */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingTitle}>{STRINGS.analyzingTitle}</Text>
            <Text style={styles.loadingSubtitle}>{STRINGS.analyzingSubtitle}</Text>
            <Text style={styles.targetServerText}>Connecting to: {CONFIG.API_URL}</Text>

            {showDemoFallback && (
              <View style={styles.demoFallbackBox}>
                <Text style={styles.demoFallbackHint}>
                  Taking a while? Your mobile device may be on a different network than your PC.
                </Text>
                <Button
                  title="⚡ View Instant Demo Results"
                  onPress={handleSwitchToDemo}
                  variant="outline"
                  style={styles.demoFallbackBtn}
                />
              </View>
            )}
          </View>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ERROR STATE */}
        {/* ------------------------------------------------------------------ */}
        {!loading && errorMessage && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Could Not Complete Diagnosis</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <Button
              title="🔄 Try Again"
              onPress={performDiagnosis}
              style={styles.retryButton}
            />
            <Button
              title={STRINGS.btnScanAnother}
              onPress={() => navigation.navigate('Home')}
              variant="outline"
            />
          </View>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* DIAGNOSIS RESULTS */}
        {/* ------------------------------------------------------------------ */}
        {!loading && data && primaryPrediction && (
          <View>
            {/* Low Confidence Warning Banner */}
            {isLowConfidence && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>{STRINGS.lowConfidenceTitle}</Text>
                <Text style={styles.warningMessage}>{STRINGS.lowConfidenceMessage}</Text>
              </View>
            )}

            {/* Primary Result Headline Card */}
            <View style={[styles.primaryCard, healthy ? styles.primaryHealthy : styles.primaryDisease]}>
              <Text style={styles.primaryLabel}>{STRINGS.topDiagnosis}</Text>
              <Text style={styles.primaryTitle}>
                {formatDiseaseName(primaryPrediction.disease)}
              </Text>

              {/* Confidence Badge */}
              <View style={styles.primaryConfRow}>
                <Text style={styles.confLabel}>{STRINGS.confidenceScore}:</Text>
                <Text style={styles.confValue}>
                  {(primaryPrediction.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Treatment, Symptoms & Prevention Quick Accordions */}
            {primaryPrediction.info && (
              <View style={styles.advisoryCard}>
                {/* Symptoms */}
                {primaryPrediction.info.symptoms ? (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeader}>{STRINGS.symptomsTitle}</Text>
                    <Text style={styles.sectionContent}>
                      {primaryPrediction.info.symptoms}
                    </Text>
                  </View>
                ) : null}

                {/* Treatment */}
                {primaryPrediction.info.treatment ? (
                  <View style={[styles.sectionBlock, styles.highlightBlock]}>
                    <Text style={styles.sectionHeader}>{STRINGS.treatmentTitle}</Text>
                    <Text style={styles.sectionContent}>
                      {primaryPrediction.info.treatment}
                    </Text>
                  </View>
                ) : null}

                {/* Prevention */}
                {primaryPrediction.info.prevention ? (
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeader}>{STRINGS.preventionTitle}</Text>
                    <Text style={styles.sectionContent}>
                      {primaryPrediction.info.prevention}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Alternative Predictions List (Top 3) */}
            {predictions.length > 1 && (
              <View style={styles.alternativesSection}>
                <Text style={styles.alternativesHeading}>
                  {STRINGS.otherPossibilities} ({predictions.length})
                </Text>
                {predictions.map((item, idx) => (
                  <PredictionCard
                    key={idx}
                    prediction={item}
                    rank={idx + 1}
                    isPrimary={idx === 0}
                    onPress={() =>
                      navigation.navigate('DiseaseDetails', {
                        prediction: item,
                        imageUri,
                      })
                    }
                  />
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <Button
                title={STRINGS.btnViewFullDetails}
                onPress={() =>
                  navigation.navigate('DiseaseDetails', {
                    prediction: primaryPrediction,
                    imageUri,
                  })
                }
                style={styles.detailBtn}
              />

              <Button
                title={STRINGS.btnScanAnother}
                onPress={() => navigation.navigate('Home')}
                variant="outline"
              />
            </View>
          </View>
        )}

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
  imageContainer: {
    position: 'relative',
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.card,
  },
  leafImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#D7E2D5',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.pill,
  },
  healthyBadge: {
    backgroundColor: THEME.colors.healthyGreen,
  },
  diseaseBadge: {
    backgroundColor: THEME.colors.diseaseRed,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: THEME.spacing.md,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  targetServerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  demoFallbackBox: {
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    alignItems: 'center',
    width: '100%',
  },
  demoFallbackHint: {
    fontSize: 12,
    color: THEME.colors.warning,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
    lineHeight: 16,
  },
  demoFallbackBtn: {
    width: '100%',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginVertical: THEME.spacing.md,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.diseaseRed,
    marginBottom: 6,
  },
  errorBody: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.spacing.md,
  },
  retryButton: {
    width: '100%',
    marginBottom: THEME.spacing.xs,
  },
  warningCard: {
    backgroundColor: THEME.colors.warningBg,
    borderWidth: 2,
    borderColor: THEME.colors.warningBorder,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.warningOrange,
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  primaryCard: {
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 2,
    ...THEME.shadows.card,
  },
  primaryHealthy: {
    backgroundColor: THEME.colors.healthyBg,
    borderColor: THEME.colors.healthyGreen,
  },
  primaryDisease: {
    backgroundColor: '#FFF5F5',
    borderColor: THEME.colors.diseaseRed,
  },
  primaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
  },
  primaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginVertical: 4,
  },
  primaryConfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  confLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginRight: 6,
  },
  confValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  advisoryCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionBlock: {
    marginBottom: THEME.spacing.md,
  },
  highlightBlock: {
    backgroundColor: THEME.colors.primarySurface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  alternativesSection: {
    marginVertical: THEME.spacing.sm,
  },
  alternativesHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
  },
  buttonGroup: {
    marginVertical: THEME.spacing.md,
  },
  detailBtn: {
    marginBottom: THEME.spacing.sm,
  },
});
