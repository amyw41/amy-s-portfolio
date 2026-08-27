export interface AlphaBBox {
  naturalWidth: number;
  naturalHeight: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  /** Raw alpha channel (0–255 per pixel), cropped to exactly the bbox above
   * (row-major, length bboxW*bboxH) — lets a caller test "is THIS pixel
   * actually part of the artwork" instead of just "is it inside the
   * rectangular bbox," which a thin/irregular silhouette (a tube, a bag
   * shot at an angle) leaves plenty of transparent room inside for. Falls
   * back to an all-255 (fully opaque) mask on the same degenerate paths the
   * bbox itself falls back on (tainted canvas, fully-transparent file) —
   * without real pixel data there's nothing better to do than treat the
   * whole rect as hittable, same as before this field existed. */
  alphaMask: Uint8Array;
}

export const ALPHA_THRESHOLD = 8;

// One offscreen canvas, reused (just resized) across every computeAlphaBBox
// call instead of allocating a fresh <canvas> element per image — this runs
// once per item at mount (14 of them, back to back via Promise.all in
// useJarPhysics), and each call is synchronous start-to-finish, so nothing
// else can be mid-read when the next call resizes and redraws into it.
let sharedCanvas: HTMLCanvasElement | null = null;

/**
 * Optional (0–1, normalised to the file's own natural size) sub-rectangle
 * to restrict the alpha scan to — see computeAlphaBBox's `scanRegion` param.
 */
export interface ScanRegion {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Finds the tight bounding box of all non-transparent (alpha > 8) pixels
 * in a loaded image via an offscreen canvas. Sizing and physics-body
 * geometry are built from this — never from the file's own pixel
 * dimensions — so export padding baked into a PNG never inflates an
 * item's apparent footprint. (A future per-item outline should be
 * positioned against this bbox too, not the file's raw bounds.)
 *
 * `scanRegion`, when given, restricts which pixels are even considered —
 * content outside it (e.g. cam.png's beaded strap, which dangles well past
 * the camera body itself) never contributes to the bbox, and — since the
 * item's div is sized off this bbox and clips via overflow:hidden — never
 * renders either. Ported for items.manifest.ts's per-item `cropRegion`.
 */
export function computeAlphaBBox(img: HTMLImageElement, scanRegion?: ScanRegion): AlphaBBox {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  // Shared by every fallback path below — without real pixel data, an
  // all-255 (fully opaque) mask makes the alpha-aware hit test behave
  // exactly like the old rectangle-only test, rather than rejecting every
  // pixel by accident.
  const fallback: AlphaBBox = {
    naturalWidth: width,
    naturalHeight: height,
    bboxX: 0,
    bboxY: 0,
    bboxW: width,
    bboxH: height,
    alphaMask: new Uint8Array(Math.max(0, width * height)).fill(255),
  };

  if (!sharedCanvas) sharedCanvas = document.createElement("canvas");
  const canvas = sharedCanvas;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;

  ctx.drawImage(img, 0, 0);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    // Canvas tainted — shouldn't happen for same-origin /public assets,
    // but fall back to treating the whole file as the bbox rather than
    // throwing.
    return fallback;
  }

  const scanXStart = scanRegion ? Math.round(scanRegion.left * width) : 0;
  const scanXEnd = scanRegion ? Math.round(scanRegion.right * width) : width;
  const scanYStart = scanRegion ? Math.round(scanRegion.top * height) : 0;
  const scanYEnd = scanRegion ? Math.round(scanRegion.bottom * height) : height;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = scanYStart; y < scanYEnd; y++) {
    const rowOffset = y * width * 4;
    for (let x = scanXStart; x < scanXEnd; x++) {
      const alpha = data[rowOffset + x * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return fallback; // fully transparent file

  const bboxX = minX;
  const bboxY = minY;
  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;

  // Second pass, cropped to the bbox we just found — reuses the same `data`
  // already read above (no extra canvas draws/reads), just re-indexed into
  // a row-major, bbox-sized array so a caller can look up "is pixel (px,py)
  // relative to the bbox's own top-left actually opaque" in O(1).
  const alphaMask = new Uint8Array(bboxW * bboxH);
  for (let y = 0; y < bboxH; y++) {
    const srcRowOffset = (bboxY + y) * width * 4;
    const dstRowOffset = y * bboxW;
    for (let x = 0; x < bboxW; x++) {
      alphaMask[dstRowOffset + x] = data[srcRowOffset + (bboxX + x) * 4 + 3];
    }
  }

  return {
    naturalWidth: width,
    naturalHeight: height,
    bboxX,
    bboxY,
    bboxW,
    bboxH,
    alphaMask,
  };
}

// 1D sliding-window maximum, via a monotonic-decreasing-value deque (indices
// only, `head` instead of shifting) — the classic O(n) algorithm, independent
// of the window radius. Output[j] = max(src[j-r .. j+r]), clamped at the
// array's own edges (a short window at the boundary, not a zero-padded one —
// so dilation never fades out right at the bbox's own edge).
function slidingMax(src: Uint8Array, n: number, r: number): Uint8Array {
  const out = new Uint8Array(n);
  const dq: number[] = [];
  let head = 0;
  for (let i = 0; i < n + r; i++) {
    if (i < n) {
      while (dq.length > head && src[dq[dq.length - 1]] <= src[i]) dq.pop();
      dq.push(i);
    }
    const j = i - r;
    if (j >= 0 && j < n) {
      while (dq[head] < j - r) head++;
      out[j] = src[dq[head]];
    }
  }
  return out;
}

/**
 * Grows every opaque region of a cropped alpha mask outward by `radius`
 * pixels (in the SAME native/bbox pixel space the mask itself is in) —
 * grayscale morphological dilation with a square structuring element, done
 * as two separable 1D sliding-window-maximum passes (rows, then columns)
 * instead of a naive per-pixel neighborhood scan, so cost stays
 * O(width*height) no matter how big `radius` is (max-over-a-square IS
 * separable into max-over-a-row then max-over-a-column — this isn't an
 * approximation, just a faster way to compute the same result).
 *
 * Exists so the jar's click/grab hit test can be as generous as each blob
 * item's own drawn outline ring (see computeDilationRadius in
 * useJarPhysics.ts) instead of stopping exactly at the artwork's real
 * edge — same radius, same coordinate space, so "click anywhere the ring
 * visibly reaches" and "click anywhere this dilated mask reads opaque"
 * mean the same thing. `radius` is native/bbox pixels, not on-screen
 * pixels — same convention as computeDilationRadius's own return value.
 */
export function dilateAlphaMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const r = Math.round(radius);
  if (r <= 0 || width <= 0 || height <= 0 || mask.length !== width * height) return mask;

  // Horizontal pass: dilate each row independently.
  const rows = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    rows.set(slidingMax(mask.subarray(rowOffset, rowOffset + width), width, r), rowOffset);
  }

  // Vertical pass over the horizontally-dilated result — a column isn't
  // contiguous in a row-major buffer, so gather/scatter through a small
  // reusable strip instead of transposing the whole thing.
  const out = new Uint8Array(width * height);
  const col = new Uint8Array(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) col[y] = rows[y * width + x];
    const dilatedCol = slidingMax(col, height, r);
    for (let y = 0; y < height; y++) out[y * width + x] = dilatedCol[y];
  }

  return out;
}
