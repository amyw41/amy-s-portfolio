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
  height: number;
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
 * @param aspectRatios each photo's width/height, in the exact order they
 *   should be considered (row-major reading order, so far as this pattern
 *   allows — see this file's own top comment).
 * @param containerWidth available width to split into columns.
 * @param columnCount how many fixed-width columns to split it into.
 * @param gap px gap between photos, both across a row and down a column.
 */
export function computeJustifiedLayout(
  aspectRatios: number[],
  containerWidth: number,
  columnCount: number,
  gap: number,
): CollageLayout {
  if (containerWidth <= 0 || aspectRatios.length === 0 || columnCount < 1) return EMPTY;

  const columnWidth = (containerWidth - gap * (columnCount - 1)) / columnCount;
  const columnHeights = new Array(columnCount).fill(0);
  const boxes: CollageBox[] = new Array(aspectRatios.length);

  for (let i = 0; i < aspectRatios.length; i++) {
    let col = 0;
    for (let c = 1; c < columnCount; c++) {
      if (columnHeights[c] < columnHeights[col]) col = c;
    }
    const height = columnWidth / aspectRatios[i];
    boxes[i] = { x: col * (columnWidth + gap), y: columnHeights[col], width: columnWidth, height };
    columnHeights[col] += height + gap;
  }

  const tallest = Math.max(...columnHeights);
  return { boxes, totalHeight: tallest > 0 ? tallest - gap : 0 };
}
