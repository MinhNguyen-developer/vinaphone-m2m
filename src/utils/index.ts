/**
 * Format MB to human-readable string
 */
export function formatMB(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Get percentage of used vs threshold
 */
export function getUsagePercent(usedMB: number, thresholdMB: number): number {
  if (thresholdMB === 0) return 0;
  return Math.min(Math.round((usedMB / thresholdMB) * 100), 100);
}

/**
 * Get color based on usage percentage
 */
export function getUsageColor(percent: number): string {
  if (percent >= 90) return '#ff4d4f';
  if (percent >= 70) return '#faad14';
  return '#52c41a';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format bytes to MB
 */
export function bytesToMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
