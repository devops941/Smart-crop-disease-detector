/**
 * =============================================================================
 * FORMATTING HELPERS
 * =============================================================================
 */

/**
 * Converts raw machine learning label strings into clean, farmer-readable names.
 * Examples:
 *   "Tomato___Early_blight" -> "Tomato — Early Blight"
 *   "Potato___Late_blight"  -> "Potato — Late Blight"
 *   "Potato___healthy"      -> "Potato — Healthy Leaf"
 *   "Tomato_healthy"        -> "Tomato — Healthy Leaf"
 */
export function formatDiseaseName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return 'Unknown Condition';
  }

  // Split by triple or single underscores
  let parts = [];
  if (rawName.includes('___')) {
    parts = rawName.split('___');
  } else if (rawName.includes('_')) {
    // If e.g. "Tomato_healthy", split on first underscore
    const firstIdx = rawName.indexOf('_');
    parts = [rawName.slice(0, firstIdx), rawName.slice(firstIdx + 1)];
  } else {
    parts = [rawName];
  }

  const crop = parts[0] || '';
  let condition = parts[1] || '';

  // Clean condition underscores
  condition = condition.replace(/_/g, ' ').trim();

  // Special title for healthy leaves
  if (condition.toLowerCase() === 'healthy') {
    condition = 'Healthy Leaf';
  }

  // Capitalize words
  const capitalize = (str) =>
    str
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  if (!condition) {
    return capitalize(crop);
  }

  return `${capitalize(crop)} — ${capitalize(condition)}`;
}

/**
 * Formats float confidence (0.0 to 1.0) into percentage string (e.g. "99.9%")
 */
export function formatConfidence(conf) {
  if (typeof conf !== 'number' || isNaN(conf)) {
    return '0.0%';
  }
  return `${(conf * 100).toFixed(1)}%`;
}

/**
 * Returns true if the diagnosis indicates a disease-free healthy plant
 */
export function isHealthy(diseaseName) {
  if (!diseaseName) return false;
  return diseaseName.toLowerCase().includes('healthy');
}

/**
 * Formats timestamp into readable local date and time
 */
export function formatScanDate(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;

    return `${day} ${month}, ${displayHour}:${minutes} ${ampm}`;
  } catch {
    return 'Recently';
  }
}
