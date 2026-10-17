/**
 * =============================================================================
 * ASYNCSTORAGE SCAN HISTORY MANAGER
 * =============================================================================
 * Persists previous disease diagnosis scans locally on the user's device so
 * farmers can review past scans even when offline.
 * =============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const STORAGE_KEY = CONFIG.HISTORY_STORAGE_KEY;
const MAX_HISTORY_ITEMS = 50; // Retain up to 50 most recent scans

/**
 * Saves a new scan to the top of the history list
 */
export async function saveScanToHistory(scan) {
  try {
    const existing = await getScanHistory();

    const newEntry = {
      id: scan.id || Date.now().toString(),
      imageUri: scan.imageUri,
      predictions: scan.predictions || [],
      topDisease: scan.predictions?.[0]?.disease || 'Unknown',
      topConfidence: scan.predictions?.[0]?.confidence || 0.0,
      lowConfidence: !!scan.low_confidence,
      timestamp: scan.timestamp || Date.now(),
    };

    // Prepend new scan, prevent duplicate ID, and limit length
    const updated = [newEntry, ...existing.filter((item) => item.id !== newEntry.id)].slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (error) {
    console.warn('Failed to save scan to AsyncStorage:', error?.message);
    return null;
  }
}

/**
 * Retrieves all saved scans sorted from newest to oldest
 */
export async function getScanHistory() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load scan history:', error?.message);
    return [];
  }
}

/**
 * Clears all scan history from the device
 */
export async function clearScanHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('Failed to clear scan history:', error?.message);
    return false;
  }
}

/**
 * Removes a single scan entry by ID
 */
export async function deleteScanById(id) {
  try {
    const existing = await getScanHistory();
    const updated = existing.filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('Failed to delete scan entry:', error?.message);
    return null;
  }
}
