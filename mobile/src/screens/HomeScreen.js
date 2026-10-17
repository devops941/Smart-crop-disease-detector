/**
 * =============================================================================
 * HOME SCREEN - SMART CROP DOCTOR
 * =============================================================================
 * Large touch-friendly camera and gallery controls designed for farmers.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../theme';
import { STRINGS } from '../strings';
import { Button } from '../components/Button';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { optimizeLeafImage } from '../utils/imageUtils';
import { checkServerHealth } from '../api';
import { CONFIG } from '../config';

export function HomeScreen({ navigation }) {
  const [processing, setProcessing] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);
  const [usingMock, setUsingMock] = useState(CONFIG.USE_MOCK_API);

  const verifyServer = async () => {
    if (CONFIG.USE_MOCK_API) {
      setServerOnline(true);
      return;
    }
    const res = await checkServerHealth();
    setServerOnline(res && res.status === 'ok');
  };

  useEffect(() => {
    verifyServer();
  }, []);

  const toggleMockMode = () => {
    CONFIG.USE_MOCK_API = !CONFIG.USE_MOCK_API;
    setUsingMock(CONFIG.USE_MOCK_API);
    if (CONFIG.USE_MOCK_API) {
      setServerOnline(true);
      Alert.alert(
        'Offline Demo Mode Active',
        'Simulated crop diagnoses enabled. All scans will generate instant responses without requiring the Python backend server.'
      );
    } else {
      verifyServer();
      Alert.alert(
        'Live Server Mode Active',
        `Connecting live to backend at: ${CONFIG.API_URL}`
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Camera Flow
  // ---------------------------------------------------------------------------
  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', STRINGS.errors.permissionCamera);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndNavigate(result.assets[0]);
      }
    } catch (error) {
      console.warn('Camera error:', error);
      Alert.alert('Error', 'Could not open camera. Please try selecting from the gallery.');
    }
  };

  // ---------------------------------------------------------------------------
  // Gallery Flow
  // ---------------------------------------------------------------------------
  const handleChooseGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', STRINGS.errors.permissionGallery);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAndNavigate(result.assets[0]);
      }
    } catch (error) {
      console.warn('Gallery error:', error);
      Alert.alert('Error', 'Could not access gallery.');
    }
  };

  // ---------------------------------------------------------------------------
  // Resize & Navigate to Result Screen
  // ---------------------------------------------------------------------------
  const processAndNavigate = async (asset) => {
    setProcessing(true);
    try {
      // Compress and resize client-side to keep uploads small on mobile connections
      const optimizedUri = await optimizeLeafImage(asset.uri, asset.width, asset.height);

      navigation.navigate('Result', {
        imageUri: optimizedUri,
      });
    } catch (error) {
      console.warn('Processing error:', error);
      // Fallback with original URI
      navigation.navigate('Result', {
        imageUri: asset.uri,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.primary} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.appBadge}>🌱 AI Crop Health Assistant</Text>
          <Text style={styles.appTitle}>{STRINGS.appName}</Text>
          <Text style={styles.appTagline}>{STRINGS.homeSubheading}</Text>
        </View>

        {/* Server Connection Status Pill */}
        <TouchableOpacity
          style={[
            styles.statusPill,
            usingMock
              ? styles.statusPillMock
              : serverOnline
              ? styles.statusPillOnline
              : styles.statusPillOffline,
          ]}
          onPress={toggleMockMode}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.statusPillText,
              usingMock
                ? styles.statusPillTextMock
                : serverOnline
                ? styles.statusPillTextOnline
                : styles.statusPillTextOffline,
            ]}
          >
            {usingMock
              ? '⚡ Offline Demo Mode Active (Tap to switch to Live Server)'
              : serverOnline === null
              ? '🔄 Checking Diagnostic Server connection...'
              : serverOnline
              ? `🟢 API Connected (${CONFIG.API_URL.replace('http://', '')})`
              : `🔴 Server Unreachable (Tap for Offline Demo)`}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons (Large Touch Targets) */}
        <View style={styles.actionsCard}>
          <Button
            title={STRINGS.btnTakePhoto}
            onPress={handleTakePhoto}
            loading={processing}
            style={styles.primaryActionBtn}
          />

          <Button
            title={STRINGS.btnChooseGallery}
            onPress={handleChooseGallery}
            variant="outline"
            disabled={processing}
          />

          <Button
            title={STRINGS.btnViewHistory}
            onPress={() => navigation.navigate('History')}
            variant="secondary"
            disabled={processing}
            style={styles.historyBtn}
          />
        </View>

        {/* Practical Field Photography Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{STRINGS.photoTipTitle}</Text>
          {STRINGS.photoTips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Visible Agricultural Disclaimer */}
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
  heroCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.card,
  },
  appBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5D6A7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.textLight,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 14,
    color: '#E8F5E9',
    lineHeight: 20,
  },
  statusPill: {
    borderRadius: THEME.borderRadius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'center',
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
  },
  statusPillOnline: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  statusPillOffline: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  statusPillMock: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPillTextOnline: {
    color: '#2E7D32',
  },
  statusPillTextOffline: {
    color: '#C62828',
  },
  statusPillTextMock: {
    color: '#F57F17',
  },
  actionsCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  primaryActionBtn: {
    minHeight: 60,
    marginBottom: THEME.spacing.sm,
  },
  historyBtn: {
    marginTop: THEME.spacing.sm,
  },
  tipsCard: {
    backgroundColor: THEME.colors.surfaceAlt,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primaryLight,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 16,
    color: THEME.colors.primaryLight,
    marginRight: 6,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
});
