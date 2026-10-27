/**
 * =============================================================================
 * API CLIENT FOR CROP DISEASE DIAGNOSIS
 * =============================================================================
 * Handles image multipart uploads to the FastAPI backend with:
 * - Configurable timeout (15s).
 * - Offline Mock Mode for rapid UI development and serverless testing.
 * - Human-readable error translations (no internet, timeout, 400/500).
 * =============================================================================
 */

import { Platform } from 'react-native';
import axios from 'axios';
import { CONFIG } from './config';
import { STRINGS } from './strings';
import { analyzeLeafWithGeminiDirect } from './geminiClient';


/**
 * Uploads a leaf photo to the backend server and returns predictions.
 *
 * @param {string} imageUri - Local file URI of the optimized leaf image.
 * @returns {Promise<Object>} Backend response JSON matching contract.
 */
export async function uploadLeaf(imageUri) {
  if (!imageUri) {
    throw new Error('No image URI provided.');
  }

  // ---------------------------------------------------------------------------
  // 1. OFFLINE MOCK MODE (For testing without backend server)
  // ---------------------------------------------------------------------------
  if (CONFIG.USE_MOCK_API) {
    console.log('[API MOCK] Simulating diagnosis network call for:', imageUri);
    // Simulate realistic mobile network delay (750ms)
    await new Promise((resolve) => setTimeout(resolve, 750));

    // Return realistic mock response matching exact contract
    return {
      predictions: [
        {
          disease: 'Tomato___Early_blight',
          confidence: 0.942,
          info: {
            symptoms:
              '[TO BE VERIFIED from TNAU/ICAR] Concentric dark brown-to-black ring spots with target-board appearance on older foliage, followed by leaf yellowing.',
            treatment:
              '[TO BE VERIFIED from TNAU/ICAR] Remove severely affected lower leaves. Apply approved protective bio-fungicide or university-recommended spray as per local extension guide.',
            prevention:
              '[TO BE VERIFIED from TNAU/ICAR] Mulch soil surface to prevent soil splash onto foliage, stake vines off ground, and practice 3-year crop rotation.',
          },
        },
        {
          disease: 'Tomato___healthy',
          confidence: 0.045,
          info: {
            symptoms: 'Healthy foliage with vibrant green color and absence of lesions or spotting.',
            treatment: 'No disease treatment required. Continue standard balanced crop management.',
            prevention: 'Maintain weekly inspection and ensure adequate spacing between plants.',
          },
        },
        {
          disease: 'Potato___Late_blight',
          confidence: 0.013,
          info: {
            symptoms: '[TO BE VERIFIED from TNAU/ICAR] Dark water-soaked lesions expanding rapidly into black necrotic spots.',
            treatment: '[TO BE VERIFIED from TNAU/ICAR] Remove infected plants promptly and consult local extension office.',
            prevention: '[TO BE VERIFIED from TNAU/ICAR] Avoid overhead irrigation and ensure good aeration.',
          },
        },
      ],
      low_confidence: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 1.5 DIRECT CLIENT-SIDE GEMINI VISION AI (If configured in config.js)
  // ---------------------------------------------------------------------------
  if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY.trim().length > 10) {
    try {
      console.log('[API] Running direct client-side Gemini 1.5 Flash Vision diagnosis...');
      return await analyzeLeafWithGeminiDirect(imageUri, CONFIG.GEMINI_API_KEY);
    } catch (geminiErr) {
      console.warn('[Gemini Client Error]:', geminiErr.message, '-> falling back to server...');
    }
  }

  // ---------------------------------------------------------------------------
  // 2. LIVE PRODUCTION HTTP CALL
  // ---------------------------------------------------------------------------
  const url = `${CONFIG.API_URL}/predict`;


  // Create multipart/form-data payload
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // In web browsers, FormData requires a genuine Blob or File object
    try {
      const imgFetch = await fetch(imageUri);
      const rawBlob = await imgFetch.blob();
      const mimeType = rawBlob.type && rawBlob.type.startsWith('image/') ? rawBlob.type : 'image/jpeg';
      const file = typeof File !== 'undefined'
        ? new File([rawBlob], 'leaf_photo.jpg', { type: mimeType })
        : rawBlob;
      formData.append('file', file, 'leaf_photo.jpg');
    } catch (e) {
      console.warn('Blob conversion failed, attempting direct append:', e);
      formData.append('file', {
        uri: imageUri,
        name: 'leaf_photo.jpg',
        type: 'image/jpeg',
      });
    }
  } else {
    // React Native on Android / iOS
    formData.append('file', {
      uri: imageUri,
      name: 'leaf_photo.jpg',
      type: 'image/jpeg',
    });
  }

  try {
    const response = await axios.post(url, formData, {
      headers: {
        Accept: 'application/json',
      },
      // Let the browser or React Native automatically attach 'multipart/form-data; boundary=...'
      transformRequest: (data) => data,
      timeout: CONFIG.TIMEOUT_MS,
    });

    return response.data;
  } catch (error) {
    // -------------------------------------------------------------------------
    // 3. HUMAN-FRIENDLY ERROR CLASSIFICATION
    // -------------------------------------------------------------------------
    console.warn('[API Error]:', error?.message);

    // Timeout
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      const err = new Error(STRINGS.errors.timeoutError);
      err.type = 'TIMEOUT';
      throw err;
    }

    // No internet connection / Network failure / Host unreachable
    if (!error.response) {
      const err = new Error(
        `${STRINGS.errors.networkError}\n\nTarget server: ${CONFIG.API_URL}`
      );
      err.type = 'NETWORK';
      throw err;
    }

    // Server-side response errors
    const status = error.response.status;

    // Extract clean human-readable error text (avoid [object Object] from FastAPI 422 lists)
    let serverMessage = error.response.data?.error;
    if (!serverMessage && error.response.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        serverMessage = detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof detail === 'object') {
        serverMessage = JSON.stringify(detail);
      } else {
        serverMessage = String(detail);
      }
    }

    if (status === 400 || status === 422) {
      const err = new Error(serverMessage || STRINGS.errors.invalidImage);
      err.type = 'BAD_REQUEST';
      throw err;
    }

    if (status >= 500) {
      const err = new Error(serverMessage || STRINGS.errors.serverError);
      err.type = 'SERVER_ERROR';
      throw err;
    }

    const err = new Error(serverMessage || STRINGS.errors.unknownError);
    err.type = 'GENERIC';
    throw err;
  }
}

/**
 * Checks server health and returns connectivity status
 */
export async function checkServerHealth() {
  if (CONFIG.USE_MOCK_API) {
    return { status: 'ok', mock: true, classes: 4 };
  }

  try {
    const response = await axios.get(`${CONFIG.API_URL}/health`, {
      timeout: 15000,
    });
    return response.data;
  } catch (error) {
    // If first check times out due to Render waking up from sleep, retry once
    try {
      const retryResponse = await axios.get(`${CONFIG.API_URL}/health`, {
        timeout: 15000,
      });
      return retryResponse.data;
    } catch (retryErr) {
      return { status: 'error', error: retryErr?.message };
    }
  }
}
