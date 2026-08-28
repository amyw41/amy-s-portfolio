// Ported from jar-portfolio's components/WhatsInside/layout.ts — the exact
// arrow-to-arrow width-solve math for the carousel below. One deliberate
// change from that source: it solved against `useViewportWidth()` (raw
// window.innerWidth) minus a hardcoded PAGE_PADDING guess at the page's own
// side padding. This site's own .pageContainer has its own,
// viewport-dependent side padding (--pad in lib/tokens.css, clamp(24px,
// 7vw,150px) — nothing like a flat number), so reusing that guess would
// reproduce the exact bug a previous attempt at this section shipped with
// (the row solving against the wrong width and overflowing/stranding its
// arrows). `computeLayout` here instead takes a *measured* container width
// directly (via useElementWidth — see Carousel.tsx) — a width already
// measured from an element that actually stretches to fill .pageContainer,
// so this can never overflow it at any viewport width without needing to
// know that padding's own formula at all.

export const NEIGHBOR_SCALE = 0.72;
// Must match the arrow buttons' own fixed size (Carousel.tsx's .navArrow —
// see About.module.css).
export const ARROW_SIZE = 36;

// px — floor so items stay legible on the smallest phones. 70, not a
// rounder-looking 100/120: verified by hand (solvedItemSize at a
// 320px-wide phone's own available width, after .pageContainer's side
// padding, computes to ~72px) that anything higher than this actually
// forces the MIN_ITEM_SIZE clamp to kick in at realistic phone widths —
// and once clamped, itemSize > what the width-solve actually allows, so
// totalWidth exceeds the measured container and the row overflows
// .pageContainer. 70 stays just under that solved value at 320px (and
// every wider phone), so the floor is never actually reached in practice —
// it only exists as a hard backstop past that.
const MIN_ITEM_SIZE = 70;
export const MAX_ITEM_SIZE = 320; // px — ceiling so a centered item never grows absurdly large on wide viewports
const GAP_RATIO = 29 / 360; // preserves the original design's gap:itemSize ratio at any size
const IMAGE_RATIO = 256 / 360; // preserves the original image:itemSize ratio at any size

// Solves for the item size that makes the whole arrow-to-arrow row exactly
// fit `containerWidth` — deriving every dimension from a formula means it
// can never overflow its container by construction, at any width.
export function computeLayout(containerWidth: number, maxItemSize: number = MAX_ITEM_SIZE) {
  const available = Math.max(containerWidth, 200);
  const denom = 1 + 2 * NEIGHBOR_SCALE + 4 * GAP_RATIO;
  const solvedItemSize = (available - 2 * ARROW_SIZE) / denom;
  const itemSize = Math.min(maxItemSize, Math.max(MIN_ITEM_SIZE, solvedItemSize));
  return deriveLayout(itemSize);
}

export function deriveLayout(itemSize: number) {
  const gap = itemSize * GAP_RATIO;
  const imageSize = itemSize * IMAGE_RATIO;
  const neighborSize = itemSize * NEIGHBOR_SCALE;
  const spacing = itemSize / 2 + gap + neighborSize / 2;
  const containerWidth = 2 * (spacing + neighborSize / 2);
  const totalWidth = 2 * ARROW_SIZE + 2 * gap + containerWidth;
  return { itemSize, imageSize, spacing, containerWidth, gap, totalWidth };
}
