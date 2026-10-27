/**
 * =============================================================================
 * CLIENT-SIDE GEMINI 3.5 FLASH MULTIMODAL VISION AI
 * =============================================================================
 * Advanced Botanical Species Identification & Crop Pathology Diagnosis Engine.
 * =============================================================================
 */

import { Platform } from 'react-native';
import axios from 'axios';


const GEMINI_SYSTEM_PROMPT = `
You are a World-Renowned Senior Botanist, Plant Pathologist, and ICAR/TNAU Agricultural Advisory Specialist.

Analyze this image using strict botanical and pathological protocols:

STAGE 1: Subject Verification
Determine if the image clearly contains a plant leaf, foliage, stem, or plant part.
If the image does NOT contain a plant leaf or part (e.g., human selfie, room, pet/animal, vehicle, electronic device, furniture, cooked food, or completely blurry unrecognizable photo):
Return strictly:
{
  "is_leaf": false,
  "rejection_reason": "Clear explanation of what appears in the photo instead of a plant leaf.",
  "advice": "Please capture a clear, focused close-up photo of a plant leaf in good lighting.",
  "predictions": [],
  "low_confidence": true
}

STAGE 2: High-Precision Plant Species Identification
Carefully examine the anatomical botanical traits:
- Leaf arrangement (alternate, opposite, whorled) & type (simple, pinnately compound, bipinnate, palmate).
- Leaf margins (entire, serrated, dentate, crenate, lobed).
- Venation patterns (pinnate, palmate, parallel, reticulate/net-veined).
- Leaf surface & texture (pubescent/hairy, glabrous/smooth, waxy/glaucous, rugose).
Determine the EXACT species:
- "crop_name": Common English name (e.g., Tomato, Potato, Corn, Wheat, Rice, Cotton, Chilli/Pepper, Mango, Rose, Tulsi, Hibiscus, Banana, Papaya, Brinjal, Guava, Money Plant, Citrus, etc.).
- "scientific_name": Latin binomial name (e.g., "Solanum lycopersicum", "Mangifera indica", "Ocimum sanctum", etc.).
- "botanical_notes": 1 concise sentence describing the key anatomical leaf traits confirming this plant.

STAGE 3: Health & Pathology Diagnosis
Inspect for pathological symptoms:
- Distinguish between:
  * Healthy foliage (vibrant green, absence of lesions/chlorosis).
  * Fungal/Bacterial diseases (concentric rings, target-spots, halos, powdery/downy growth, water-soaked rot).
  * Viral infections (mosaic patterns, severe leaf curl, yellow veins).
  * Pests/Insects (leaf miners, mites, aphids, caterpillar bites).
  * Nutrient deficiency (interveinal chlorosis, margin scorch).
- "condition": Plain name of diagnosis (e.g. "Early Blight", "Healthy Foliage", "Powdery Mildew", "Leaf Curl").
- "severity": "None" (if healthy), "Mild", "Moderate", or "Severe".

STAGE 4: Standardized Output Structure
Format "predictions" array with top 3 possibilities.
The "disease" field MUST ALWAYS be formatted as:
"<Common_Plant_Name>___<Condition_With_Underscores>"
Examples:
- "Tomato___Early_blight"
- "Tomato___healthy"
- "Mango___Anthracnose"
- "Tulsi___healthy"

For each prediction, provide ICAR/TNAU guidance:
- "symptoms": 1-2 sentences on visual lesions or chlorosis observed.
- "treatment": Practical bio-control (organic) and chemical remedies.
- "prevention": Cultural practices (drip irrigation, spacing, sanitation, crop rotation).

Return ONLY raw valid JSON with NO markdown code fences.
`;

/**
 * Converts a local image URI to a base64 string across Web, Android, and iOS.
 */
async function getBase64FromUri(uri) {
  // Web: Use standard Blob & FileReader
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Native: Attempt 1 - Modern Expo SDK 52+ File API
  try {
    const { File: ExpoFile } = require('expo-file-system');
    if (ExpoFile && typeof ExpoFile === 'function') {
      const file = new ExpoFile(uri);
      if (typeof file.base64 === 'function') {
        const result = await file.base64();
        if (result) return result;
      }
    }
  } catch (_) {}

  // Native: Attempt 2 - Official expo-file-system/legacy
  try {
    const LegacyFS = require('expo-file-system/legacy');
    if (LegacyFS?.readAsStringAsync) {
      const result = await LegacyFS.readAsStringAsync(uri, {
        encoding: LegacyFS.EncodingType?.Base64 || 'base64',
      });
      if (result) return result;
    }
  } catch (_) {}

  // Native: Attempt 3 - Universal fetch & FileReader
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    throw new Error('Failed to encode leaf image to base64: ' + err.message);
  }
}


/**
 * Diagnoses a plant leaf using Google Gemini Multimodal Vision AI directly.
 *
 * @param {string} imageUri - Local file URI of the leaf image
 * @param {string} apiKey - Google Gemini API Key
 * @returns {Promise<Object>} Standardized diagnosis JSON matching app schema
 */
export async function analyzeLeafWithGeminiDirect(imageUri, apiKey) {
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Please configure a valid Gemini API key.');
  }

  const base64Image = await getBase64FromUri(imageUri);

  const payload = {
    contents: [
      {
        parts: [
          { text: GEMINI_SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  // Modern Gemini models in order of preferred availability
  const candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash',
  ];

  let lastError = null;
  let response = null;

  for (const modelName of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
    try {
      response = await axios.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      if (response?.data?.candidates?.length) {
        break;
      }
    } catch (err) {
      lastError = err;
      if (err.response?.status !== 404) {
        break;
      }
    }
  }

  if (!response?.data?.candidates?.length) {
    throw lastError || new Error('Gemini AI did not return any diagnostic candidates.');
  }

  const candidates = response.data.candidates;
  let text = candidates[0]?.content?.parts?.[0]?.text?.trim() || '{}';

  // Strip accidental markdown fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(text);
  parsed.ai_engine = 'Gemini 3.5 Flash Multimodal Vision';

  if (!parsed.predictions || !Array.isArray(parsed.predictions)) {
    parsed.predictions = [];
  }

  // Ensure robust schema compatibility for ResultScreen and DiseaseDetailsScreen
  const cropName = parsed.crop_name || 'Plant';
  parsed.predictions.forEach((p) => {
    // Standardize disease field with crop prefix if missing
    if (p.disease && !p.disease.includes('___')) {
      const sanitizedCrop = cropName.replace(/\s+/g, '_');
      const sanitizedDisease = p.disease.replace(/\s+/g, '_');
      p.disease = `${sanitizedCrop}___${sanitizedDisease}`;
    }

    // Guarantee info object with symptoms, treatment, prevention
    if (!p.info) {
      p.info = {
        symptoms: p.symptoms || '',
        treatment: p.treatment || '',
        prevention: p.prevention || '',
      };
    } else {
      p.info.symptoms = p.info.symptoms || p.symptoms || '';
      p.info.treatment = p.info.treatment || p.treatment || '';
      p.info.prevention = p.info.prevention || p.prevention || '';
    }
  });

  if (parsed.is_leaf === false) {
    parsed.low_confidence = true;
  } else if (parsed.low_confidence === undefined) {
    const topConf = parsed.predictions[0]?.confidence || 0;
    parsed.low_confidence = topConf < 0.60;
  }

  return parsed;
}
