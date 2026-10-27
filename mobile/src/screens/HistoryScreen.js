/**
 * =============================================================================
 * HISTORY SCREEN - PAST SCANS LIST
 * =============================================================================
 * Allows farmers to review historical diagnoses offline, view past treatments,
 * and clear scan history.
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';
import { THEME } from '../theme';
import { STRINGS } from '../strings';
import { Button } from '../components/Button';
import { getScanHistory, clearScanHistory } from '../utils/storage';
import { formatDiseaseName, formatConfidence, formatScanDate, isHealthy } from '../utils/formatters';

export function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reload history whenever user focuses this screen
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    setLoading(true);
    const scans = await getScanHistory();
    setHistory(scans);
    setLoading(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      STRINGS.clearHistoryConfirmTitle,
      STRINGS.clearHistoryConfirmMessage,
      [
        { text: STRINGS.btnCancel, style: 'cancel' },
        {
          text: STRINGS.btnClear,
          style: 'destructive',
          onPress: async () => {
            await clearScanHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const formattedTitle = formatDiseaseName(item.topDisease);
    const formattedConf = formatConfidence(item.topConfidence);
    const healthy = isHealthy(item.topDisease);
    const scanDate = formatScanDate(item.timestamp);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.historyCard, THEME.shadows.card]}
        onPress={() =>
          navigation.navigate('Result', {
            existingScan: item,
            imageUri: item.imageUri,
          })
        }
      >
        {/* Leaf Thumbnail */}
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <Text style={styles.placeholderIcon}>🌿</Text>
          </View>
        )}

        {/* Scan Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.diseaseTitle} numberOfLines={1}>
            {formattedTitle}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.badge, healthy ? styles.healthyBadge : styles.diseaseBadge]}>
              <Text style={[styles.badgeText, healthy ? styles.healthyBadgeText : styles.diseaseBadgeText]}>
                {formattedConf}
              </Text>
            </View>

            <Text style={styles.dateText}>{scanDate}</Text>
          </View>

          {item.lowConfidence && (
            <Text style={styles.lowConfNotice}>⚠️ Low Confidence</Text>
          )}
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Empty State */}
        {!loading && history.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No Previous Scans</Text>
            <Text style={styles.emptySubtitle}>{STRINGS.historyEmpty}</Text>
            <Button
              title="📷 Scan a Leaf Now"
              onPress={() => navigation.navigate('Home')}
              style={styles.emptyBtn}
            />
          </View>
        )}

        {/* Scans List */}
        {history.length > 0 && (
          <>
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />

            <View style={styles.footerContainer}>
              <Button
                title={STRINGS.btnClearHistory}
                onPress={handleClearHistory}
                variant="outline"
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#D7E2D5',
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    marginRight: THEME.spacing.sm,
  },
  diseaseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: THEME.borderRadius.pill,
    marginRight: THEME.spacing.sm,
  },
  healthyBadge: {
    backgroundColor: THEME.colors.healthyBg,
  },
  diseaseBadge: {
    backgroundColor: THEME.colors.diseaseBg,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  healthyBadgeText: {
    color: THEME.colors.healthyGreen,
  },
  diseaseBadgeText: {
    color: THEME.colors.diseaseRed,
  },
  dateText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  lowConfNotice: {
    fontSize: 11,
    color: THEME.colors.warningOrange,
    fontWeight: '700',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: THEME.colors.textMuted,
    fontWeight: '300',
  },
  footerContainer: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.spacing.lg,
  },
  emptyBtn: {
    width: '100%',
  },
});
