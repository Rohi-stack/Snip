const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validates URL shape after normalization.
 * Rejects dangerous schemes (javascript:, file:, etc.).
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return false;
    }

    if (!parsed.hostname) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
