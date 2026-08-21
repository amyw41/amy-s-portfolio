/**
 * Generates a pixel-exact white outline ring hugging an image's real alpha
 * silhouette (not its rectangular bounds) — used for the 'blob' category
 * border in the jar (see JarItem.tsx). Rendered behind the item's own
 * image, masked over a solid category-colour background, so one generated
 * ring serves every colour (see getOutlineMask's own comment).
 *
 * Construction, once per item at load, in an offscreen canvas sized to the
 * image + 2*radius on every side:
 *   1. Draw the image `samples` times, offset around a circle of `radius` —
 *      dilates the silhouette outward.
 *   2. source-in + solid white fill — collapses that dilated union into a
 *      flat white silhouette (alpha only, no per-pixel colour survives).
 *   3. destination-out, draw the original once at centre — punches the
 *      undilated interior back out, leaving only the ring.
 *
 * Generated at devicePixelRatio (not 1:1 with the source file's own natural
 * size) so the raster has enough pixels to stay sharp on Retina once scaled
 * down in CSS via mask-size: contain.
 *
 * `radius` is in the image's own native (source-file) pixels and is
 * REQUIRED, deliberately with no default — this used to default to a flat
 * 3px, which meant every item was dilated by the same *source-pixel*
 * amount regardless of how much smaller (or larger) it renders on screen
 * once the alpha-bbox display-scale normalisation (see useJarPhysics.ts)
 * shrinks it down. A heavily-scaled-down item (small object, large
 * transparent canvas — e.g. kitty-mirror) ended up with a barely-visible
 * ring while a lightly-scaled one (e.g. ballet) stayed legible, even
 * though both asked for "the same" radius. Callers now MUST derive this
 * per item from the on-screen thickness they actually want (see
 * useJarPhysics.ts's dilation-radius computation) — that's what makes the
 * baked-in ring a *consistent on-screen* thickness across every item,
 * not a consistent source-pixel one.
 */
export function generateOutlineMask(image: HTMLImageElement, radius: number, samples = 24): string {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (w <= 0 || h <= 0) throw new Error("generateOutlineMask: image has no natural size");

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil((w + radius * 2) * dpr);
  canvas.height = Math.ceil((h + radius * 2) * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("generateOutlineMask: 2d context unavailable");

  const drawW = w * dpr;
  const drawH = h * dpr;
  const baseX = radius * dpr;
  const baseY = radius * dpr;
  const r = radius * dpr;

  // 1. Dilate: stamp the image `samples` times around a ring of radius r.
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r;
    ctx.drawImage(image, baseX + dx, baseY + dy, drawW, drawH);
  }

  // 2. Collapse the dilated union into a flat white silhouette.
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Punch the undilated interior back out, leaving just the ring.
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(image, baseX, baseY, drawW, drawH);
  ctx.globalCompositeOperation = "source-over";

  return canvas.toDataURL("image/png");
}

/** Per-src cache — generation is real canvas work, and the result never
 * changes for a given src, so this guarantees generateOutlineMask runs at
 * most once per item for the lifetime of the page. Module-level (not a ref
 * inside a hook) so it survives across resize rebuilds and remounts alike. */
const cache = new Map<string, string>();

/**
 * Cache-checked wrapper around generateOutlineMask, keyed by the item's own
 * src. Returns null (after logging a warning) if generation fails — callers
 * fall back to stacked drop-shadow filters for the border in that case
 * (see JarItem.tsx), never throw. `radius` is required for the same reason
 * as generateOutlineMask's own — see its doc comment.
 */
export function getOutlineMask(src: string, image: HTMLImageElement, radius: number, samples = 24): string | null {
  const cached = cache.get(src);
  if (cached) return cached;
  try {
    const mask = generateOutlineMask(image, radius, samples);
    cache.set(src, mask);
    return mask;
  } catch (err) {
    console.warn(`[jar] outline mask generation failed for ${src} — falling back to drop-shadow border.`, err);
    return null;
  }
}
