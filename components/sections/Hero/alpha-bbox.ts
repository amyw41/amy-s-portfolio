export interface AlphaBBox {
  naturalWidth: number;
  naturalHeight: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
  /** Offset from the file's centre to the bbox's centre, in natural
   * (source-file) pixels. Positive x = bbox centre sits right of the file
   * centre; positive y = below it. */
  offsetX: number;
  offsetY: number;
}

const ALPHA_THRESHOLD = 8;

/**
 * Finds the tight bounding box of all non-transparent (alpha > 8) pixels
 * in a loaded image via an offscreen canvas. Sizing and physics-body
 * geometry are built from this — never from the file's own pixel
 * dimensions — so export padding baked into a PNG never inflates an
 * item's apparent footprint. (A future per-item outline should be
 * positioned against this bbox too, not the file's raw bounds.)
 */
export function computeAlphaBBox(img: HTMLImageElement): AlphaBBox {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const fallback: AlphaBBox = {
    naturalWidth: width,
    naturalHeight: height,
    bboxX: 0,
    bboxY: 0,
    bboxW: width,
    bboxH: height,
    offsetX: 0,
    offsetY: 0,
  };

  const canvas = document.createElement("canvas");
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

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
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
    offsetX: bboxX + bboxW / 2 - width / 2,
    offsetY: bboxY + bboxH / 2 - height / 2,
  };
}
