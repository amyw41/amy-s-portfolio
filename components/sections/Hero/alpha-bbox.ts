export interface AlphaBBox {
  naturalWidth: number;
  naturalHeight: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
}

const ALPHA_THRESHOLD = 8;

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
  const fallback: AlphaBBox = {
    naturalWidth: width,
    naturalHeight: height,
    bboxX: 0,
    bboxY: 0,
    bboxW: width,
    bboxH: height,
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

  return {
    naturalWidth: width,
    naturalHeight: height,
    bboxX,
    bboxY,
    bboxW,
    bboxH,
  };
}
