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

  const capitalize = (str) =>
    str
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  // Split strictly by triple underscores if present
  if (rawName.includes('___')) {
    const parts = rawName.split('___');
    const crop = parts[0].replace(/_/g, ' ').trim();
    let condition = (parts[1] || '').replace(/_/g, ' ').trim();
    if (condition.toLowerCase() === 'healthy') {
      condition = 'Healthy Leaf';
    }
    return condition ? `${capitalize(crop)} — ${capitalize(condition)}` : capitalize(crop);
  }

  // If already separated by dash / em-dash
  if (rawName.includes(' — ') || rawName.includes(' - ')) {
    const sep = rawName.includes(' — ') ? ' — ' : ' - ';
    const parts = rawName.split(sep);
    return `${capitalize(parts[0].trim())} — ${capitalize(parts[1].trim())}`;
  }

  // Replace any remaining underscores with spaces cleanly
  const cleaned = rawName.replace(/_/g, ' ').trim();
  return capitalize(cleaned);
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
