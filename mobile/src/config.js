/**
 * =============================================================================
 * SMART CROP DISEASE DETECTOR - APP CONFIGURATION
 * =============================================================================
 *
 * HOW TO CONNECT TO YOUR BACKEND SERVER:
 * -----------------------------------------------------------------------------
 * 1. Find your laptop's local IPv4 address:
 *    - Windows: Open PowerShell and run `ipconfig`.
 *      Look for "Wireless LAN adapter Wi-Fi" -> "IPv4 Address" (e.g. 192.168.1.15).
 *    - macOS/Linux: Run `ifconfig` or `ip a` (e.g. 192.168.1.15).
 *
 * 2. Update `API_URL` below with your laptop's IP address:
 *    Example: 'http://192.168.1.15:8000'
 *    (Do NOT use 'localhost' or '127.0.0.1' on a real phone, because 'localhost'
 *    on a phone refers to the phone itself!)
 *
 * 3. MOCK MODE:
 *    Set `USE_MOCK_API = true` to test all screens with realistic sample
 *    data without needing the Python backend running.
 * =============================================================================
 */

import { Platform } from 'react-native';

const getBackendUrl = () => {
  // If running in a web browser, use the current hostname (e.g. localhost or current IP)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:8000`;
  }
  // Mobile devices (Android / iOS) connect to your laptop's local IP address
  return 'http://192.168.1.10:8000';
};

export const CONFIG = {
  // Configured with dynamic detection for Web and LAN IP for Mobile:
  API_URL: getBackendUrl(),

  // Set to true to test the entire app offline with instant simulated backend responses
  USE_MOCK_API: false,

  // Request timeout in milliseconds (10 seconds for responsive error feedback)
  TIMEOUT_MS: 10000,

  // Confidence threshold below which the app warns the user to retake the photo
  CONFIDENCE_THRESHOLD: 0.60,

  // Storage key for scan history
  HISTORY_STORAGE_KEY: '@crop_disease_scans_v1',
};
