/**
 * Resolve a storage key or external URL to a servable URL.
 * Works on both client and server (pure string logic, no Node imports).
 */
export function resolveFileUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
  return `/api/uploads/${keyOrUrl}`;
}
