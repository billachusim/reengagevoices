// Accept only object paths or signed audio URLs on the configured Cloud origin.
export function audioObjectPath(value: string, storageOrigin?: string): string | null {
  let path = value;
  if (/^https?:/i.test(value)) {
    if (!storageOrigin) return null;
    try {
      const url = new URL(value);
      if (url.origin !== new URL(storageOrigin).origin || url.username || url.password) return null;
      const prefix = "/storage/v1/object/sign/story-audio/";
      if (!url.pathname.startsWith(prefix)) return null;
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch { return null; }
  }
  if (!path || path.length > 1024 || path.startsWith("/") || path.includes("\\") || path.includes("?") || path.includes("#") || path.includes("%")) return null;
  if (path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return path.includes("/") ? path : null;
}