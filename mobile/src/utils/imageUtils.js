/**
 * =============================================================================
 * IMAGE OPTIMIZATION FOR 2G / 3G RURAL MOBILE NETWORKS
 * =============================================================================
 * Resizes and compresses leaf photos on-device before uploading to the server:
 * - Constrains maximum dimension to ~1024px.
 * - Compresses with JPEG quality 0.75.
 * - Reduces file sizes from ~4-8 MB down to ~150-300 KB without losing disease patterns.
 * =============================================================================
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export async function optimizeLeafImage(imageUri, originalWidth = 0, originalHeight = 0) {
  if (!imageUri) {
    throw new Error('Image URI is required for optimization.');
  }

  // On web, direct file/blob upload is instant; skip canvas manipulation
  if (Platform.OS === 'web') {
    return imageUri;
  }

  try {
    const MAX_SIDE = 1024;
    const actions = [];

    // Scale down proportionally if either side exceeds 1024 px
    if (originalWidth > 0 && originalHeight > 0) {
      if (originalWidth > MAX_SIDE || originalHeight > MAX_SIDE) {
        if (originalWidth >= originalHeight) {
          actions.push({ resize: { width: MAX_SIDE } });
        } else {
          actions.push({ resize: { height: MAX_SIDE } });
        }
      }
    } else {
      // Default constraint if width/height are unknown
      actions.push({ resize: { width: MAX_SIDE } });
    }

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    // If manipulation fails for any reason, fall back gracefully to the original URI
    console.warn('Image manipulation fallback to original:', error?.message);
    return imageUri;
  }
}
