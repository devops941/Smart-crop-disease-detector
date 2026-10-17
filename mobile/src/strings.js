/**
 * =============================================================================
 * SMART CROP DISEASE DETECTOR - CENTRALIZED LOCALIZATION STRINGS
 * =============================================================================
 * All user-facing text is placed in this file to make translating to regional
 * languages (like Tamil, Telugu, Hindi) straightforward.
 * =============================================================================
 */

export const STRINGS = {
  // App Header & Branding
  appName: 'Smart Crop Doctor',
  appTagline: 'Instant AI Plant Disease Diagnosis',

  // Home Screen
  homeHeading: 'Diagnose Your Crop',
  homeSubheading: 'Take a clear photo of an infected or healthy leaf to get instant disease detection and management advice.',
  btnTakePhoto: '📷 Take Photo',
  btnChooseGallery: '🖼️ Choose from Gallery',
  btnViewHistory: '📜 View Scan History',
  photoTipTitle: '💡 Photography Tips for Accurate Diagnosis',
  photoTips: [
    'Photograph ONE leaf at a time.',
    'Hold camera steady in good natural daylight.',
    'Focus closely on the spots or affected area.',
    'Avoid extreme shadows or blurry angles.'
  ],

  // Result Screen
  resultTitle: 'Diagnosis Results',
  analyzingTitle: 'Analyzing Leaf...',
  analyzingSubtitle: 'Running neural network to detect crop disease patterns',
  topDiagnosis: 'Primary Diagnosis',
  confidenceScore: 'Confidence',
  otherPossibilities: 'Other Possibilities',
  symptomsTitle: '🔍 Symptoms & Field Signs',
  treatmentTitle: '💊 Recommended Management',
  preventionTitle: '🛡️ Prevention & Sanitation',
  btnScanAnother: '🔄 Scan Another Leaf',
  btnViewFullDetails: '📖 View Detailed Treatment Guide',
  savedToHistory: '✓ Saved to your scan history',

  // Low Confidence Warning
  lowConfidenceTitle: '⚠️ Uncertain Result (Low Confidence)',
  lowConfidenceMessage:
    'The AI model could not identify the disease with high certainty. Please retake the photo in bright, direct lighting closer to the leaf, or consult your nearest Krishi Vigyan Kendra / Agricultural Extension Officer.',

  // Disease Details Screen
  detailsTitle: 'Disease Information',
  expertAdvisoryNotice: 'Official Guidance Note',
  advisoryNote:
    'Management practices shown are based on ICAR and state agricultural university recommendations. Always follow local agricultural officer recommendations before spraying.',

  // History Screen
  historyTitle: 'Scan History',
  historyEmpty: 'No previous scans found. Start by taking a leaf photo on the home screen!',
  btnClearHistory: '🗑️ Clear History',
  clearHistoryConfirmTitle: 'Clear History',
  clearHistoryConfirmMessage: 'Are you sure you want to delete all saved scans? This cannot be undone.',
  btnClear: 'Delete All',
  btnCancel: 'Cancel',
  historyCardTapHint: 'Tap to view diagnosis details',

  // Error Messages
  errors: {
    permissionCamera: 'Camera permission is required to take leaf photos.',
    permissionGallery: 'Gallery permission is required to select photos.',
    networkError: 'Cannot reach the diagnosis server. Please check your internet connection or Wi-Fi settings.',
    timeoutError: 'The request timed out. The server took too long to respond. Please try again.',
    serverError: 'The server encountered an error while processing the image. Please try again.',
    invalidImage: 'The selected file could not be recognized as a valid image. Please select another photo.',
    unknownError: 'An unexpected error occurred. Please try again.',
  },

  // Disclaimer
  disclaimer:
    '⚠️ Advisory Notice: This AI detector is a decision support tool only. For serious infestations or pesticide selection, always consult your local Agricultural Extension Officer or Krishi Vigyan Kendra (KVK).',
};
