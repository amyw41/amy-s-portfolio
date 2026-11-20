/**
 * Card videos fetched ahead of time (home's work cards), kept as blob URLs
 * for the rest of the visit. A card whose video is already here plays it
 * from memory the moment it mounts, so the card arrives already moving
 * instead of showing its still poster first and then switching to the
 * video (2026-11-20: that read as the card not having fully loaded). The
 * videos are small (a few hundred KB each).
 */

const ready = new Map<string, string>();
const loading = new Map<string, Promise<void>>();

/** Fetches a video into memory (once per visit). Resolves when it's in, or
 * quietly if it fails (the card then just streams it as before). */
export function preloadVideo(src: string): Promise<void> {
  if (ready.has(src)) return Promise.resolve();
  let promise = loading.get(src);
  if (!promise) {
    promise = fetch(src)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(`${res.status}`))))
      .then((blob) => {
        ready.set(src, URL.createObjectURL(blob));
      })
      .catch(() => {
        loading.delete(src);
      });
    loading.set(src, promise);
  }
  return promise;
}

/** The in-memory copy of a preloaded video, or null if it isn't in yet. */
export function preloadedVideo(src: string): string | null {
  return ready.get(src) ?? null;
}
