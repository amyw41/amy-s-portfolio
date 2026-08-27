/**
 * Collage-mode layout: fixed-width column masonry (the standard Pinterest/
 * Masonry.js pattern) — NOT the row-justified ("every row exactly fills the
 * width, solved-for row height") approach this file used originally. Amy's
 * follow-up after seeing that version: she wants photos aligned by a shared
 * WIDTH instead (each photo keeping its own natural height at that width),
 * and a fixed count per row (3) rather than however many happen to fit a
 * solved row height.
 *
 * The algorithm: split the container into `columnCount` equal-width
 * columns, then walk the photos in order (drawing, then dancing, then
 * nails, each in lib/etc.ts's own listed order — same document order as
 * before) and drop each one into whichever column is CURRENTLY shortest,
 * sized to that column's fixed width with its own natural aspect ratio
 * (height = width / aspectRatio — never cropped). Since every column starts
 * at height 0, the very first `columnCount` photos land one per column in
 * order — literally "3 per row" for that first row — and every column
 * packs tight with zero gap underneath any of its own photos (a photo's y
 * is always exactly its column's running height, no more). Later rows drift
 * slightly out of strict left-to-right lockstep as columns' heights diverge
 * (a photo can only ever go to the shortest column, not "the next slot in
 * reading order" once columns are uneven) — an unavoidable trade-off of
 * this pattern, and the same one every Pinterest-style masonry makes; it's
 * what keeps every column gapless while every photo still keeps its own
 * real proportions.
 */

export interface CollageBox {
  x: number;
  y: number;
  width: number;
  /** Total box height, gap-packing included — this is what the column math
   * actually stacks against (see `captionHeight` below). */
  height: number;
  /** Height of just the photo portion, i.e. `height` minus whatever
   * `captionHeight` the caller passed in (0 when it didn't) — callers that
   * render a caption below the photo (not overlaid on it) size the image to
   * this instead of the full box, and give the remaining strip to the
   * caption. Equal to `height` whenever `captionHeight` is 0. */
  imageHeight: number;
}

export interface CollageLayout {
  /** Same length/order as the `aspectRatios` input — boxes[i] is where
   * aspectRatios[i] landed. */
  boxes: CollageBox[];
  /** Height of the tallest column, gaps included — the caller sets this as
   * the container's own height, since every box inside is
   * `position: absolute` and so contributes nothing to auto height. */
  totalHeight: number;
}

const EMPTY: CollageLayout = { boxes: [], totalHeight: 0 };

/**
 * @param containerWidth available width to split into columns.
 * @param columnCount how many fixed-width columns to split it into.
 * @param gap px gap between columns, horizontally — see computeJustifiedLayout's
 *   own `gap` param.
 *
 * Pulled out so callers that need a column's width BEFORE calling
 * computeJustifiedLayout (to measure how a caption will wrap at that width —
 * see `estimateCaptionHeight` below) use the exact same formula the packing
 * math itself uses internally, rather than a second copy that could drift
 * out of sync with it.
 */
export function getColumnWidth(containerWidth: number, columnCount: number, gap: number): number {
  if (containerWidth <= 0 || columnCount < 1) return 0;
  return (containerWidth - gap * (columnCount - 1)) / columnCount;
}

/**
 * Line-height ratio the caption's own CSS (Playground.module.css's
 * .collageCaption, ExtrasCaseStudy.tsx's caption `<p>`) is set to explicitly
 * (not the browser's own "normal", which is font- and platform-dependent) —
 * `estimateCaptionHeight` below needs this exact number to predict, ahead of
 * the real DOM layout, how tall the caption's real wrapped text will render.
 */
export const GALLERY_CAPTION_LINE_HEIGHT = 1.3;

/**
 * Fixed space above and below the caption text within its own reserved
 * height (see `estimateCaptionHeight`) — deliberately NOT equal: per
 * request, the caption sits slightly closer to its own photo than to the
 * next one. PhotoTile.tsx's/ExtrasCaseStudy.tsx's own caption band anchors
 * the caption to the TOP of its reserved space (not centered) with exactly
 * GALLERY_CAPTION_PADDING_TOP above it, so whatever's left below — down to
 * the box's own bottom edge — comes out to exactly
 * GALLERY_CAPTION_PADDING_BOTTOM by construction (the box height already
 * bakes both numbers in). Was a single, equal GALLERY_CAPTION_PADDING (8px
 * each side, before that 16–17px via centering a fixed 56px row).
 */
export const GALLERY_CAPTION_PADDING_TOP = 6;
export const GALLERY_CAPTION_PADDING_BOTTOM = 10;

/**
 * Reads the caption's actual rendered font size/family straight from the
 * page — `--gallery-caption-fs` (lib/tokens.css) and the body's own
 * resolved font stack (app/globals.css's `--font-roboto`) — instead of
 * each gallery keeping its own hardcoded copy of those values just for
 * `estimateCaptionHeight` to measure against. Guards for the server/
 * pre-hydration case where `document` doesn't exist yet; computeJustifiedLayout's
 * own `containerWidth <= 0` guard means this fallback never actually
 * affects a real layout (see estimateCaptionHeight's own comment).
 */
export function getCaptionFont(): { fontSizePx: number; fontFamily: string } {
  if (typeof document === "undefined") return { fontSizePx: 20, fontFamily: "sans-serif" };
  const rootStyle = getComputedStyle(document.documentElement);
  const fontSizePx = parseFloat(rootStyle.getPropertyValue("--gallery-caption-fs")) || 20;
  const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
  return { fontSizePx, fontFamily };
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  return measureCtx;
}

/**
 * Predicts the px height a caption needs — including its own top/bottom
 * padding (GALLERY_CAPTION_PADDING_TOP/_BOTTOM) — when rendered at
 * `fontSizePx` in `fontFamily`, wrapped (greedily, word by word, matching
 * normal CSS text wrapping) to fit within `maxWidthPx`. Used to give each
 * photo in the gallery its OWN caption-row height (see
 * computeJustifiedLayout's per-photo `captionHeight` array below) instead
 * of one fixed row sized for the worst case — a short caption gets a short
 * row, a long one that wraps to 3+ lines gets a taller one, and the next
 * photo in that column starts exactly far enough down either way; nothing
 * gets clamped/truncated.
 *
 * Server-side (no `document`) or before layout ever measures a real width,
 * this falls back to a plain 1-line estimate — computeJustifiedLayout's own
 * `containerWidth <= 0` guard already returns EMPTY in that case, so this
 * fallback in practice only matters for the very first client render before
 * useElementWidth's ResizeObserver has measured anything.
 */
export function estimateCaptionHeight(
  text: string,
  maxWidthPx: number,
  fontSizePx: number,
  fontFamily: string,
  fontWeight = "300",
): number {
  const lineHeight = fontSizePx * GALLERY_CAPTION_LINE_HEIGHT;
  const padding = GALLERY_CAPTION_PADDING_TOP + GALLERY_CAPTION_PADDING_BOTTOM;
  const ctx = getMeasureContext();
  if (!ctx || maxWidthPx <= 0) return lineHeight + padding;

  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  const words = text.split(/\s+/).filter(Boolean);
  let lines = words.length > 0 ? 1 : 0;
  let lineWidth = 0;
  for (const word of words) {
    const wordWidth = ctx.measureText(`${word} `).width;
    if (lineWidth > 0 && lineWidth + wordWidth > maxWidthPx) {
      lines++;
      lineWidth = wordWidth;
    } else {
      lineWidth += wordWidth;
    }
  }
  return lines * lineHeight + padding;
}

/**
 * @param aspectRatios each photo's width/height, in the exact order they
 *   should be considered (row-major reading order, so far as this pattern
 *   allows — see this file's own top comment).
 * @param containerWidth available width to split into columns.
 * @param columnCount how many fixed-width columns to split it into.
 * @param gap px gap between columns, horizontally.
 * @param captionHeight extra px reserved below each photo for a caption
 *   that renders underneath it rather than overlaid on top — added on top
 *   of each box's own image-aspect-ratio height so the packing math gives
 *   every tile genuine dedicated caption space instead of stealing it from
 *   the photo. Either one number applied to every photo, or an array (same
 *   length/order as `aspectRatios`) giving each photo its own height — see
 *   `estimateCaptionHeight` for how callers build that array from each
 *   caption's own real wrapped line count. Defaults to 0 (no caption row,
 *   `imageHeight` === `height`).
 * @param rowGap px gap stacked vertically between one box and the next one
 *   down its column. Defaults to `gap` (the original, single-value
 *   behavior) — pass 0 when a caption band already supplies its own visual
 *   breathing room below the photo (see PhotoTile.tsx/ExtrasCaseStudy.tsx's
 *   own centered-caption technique) and an extra row gap on top of that
 *   would just make the space below the caption bigger than the space
 *   above it, breaking the symmetry that centering is meant to give.
 */
export function computeJustifiedLayout(
  aspectRatios: number[],
  containerWidth: number,
  columnCount: number,
  gap: number,
  captionHeight: number | number[] = 0,
  rowGap = gap,
): CollageLayout {
  if (containerWidth <= 0 || aspectRatios.length === 0 || columnCount < 1) return EMPTY;

  const columnWidth = getColumnWidth(containerWidth, columnCount, gap);
  const columnHeights = new Array(columnCount).fill(0);
  const boxes: CollageBox[] = new Array(aspectRatios.length);

  for (let i = 0; i < aspectRatios.length; i++) {
    let col = 0;
    for (let c = 1; c < columnCount; c++) {
      if (columnHeights[c] < columnHeights[col]) col = c;
    }
    const ch = Array.isArray(captionHeight) ? (captionHeight[i] ?? 0) : captionHeight;
    const imageHeight = columnWidth / aspectRatios[i];
    const height = imageHeight + ch;
    boxes[i] = { x: col * (columnWidth + gap), y: columnHeights[col], width: columnWidth, height, imageHeight };
    columnHeights[col] += height + rowGap;
  }

  const tallest = Math.max(...columnHeights);
  return { boxes, totalHeight: tallest > 0 ? tallest - rowGap : 0 };
}
