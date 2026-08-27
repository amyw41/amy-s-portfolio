// Ported from amy-wangs-jar's components/WhatsInside/layout.ts (the source
// for this section's carousel geometry), with one deliberate change: that
// original solved itemSize against `useViewportWidth()` (raw
// window.innerWidth) minus a hardcoded PAGE_PADDING guess at the page's own
// side padding — correct for amy-wangs-jar's own px-4 page, but this site's
// .pageContainer has its own, viewport-dependent side padding (--pad in
// lib/tokens.css, clamp(24px,7vw,150px) — nothing like a flat 32px), so
// reusing that same guess is exactly what was making the carousel spill
// past its container's edge. PAGE_PADDING is 0 here instead, and the width
// this solves against is meant to be a *measured* element width (the
// carousel's own wrapping div, via useElementWidth — see Carousel.tsx) that
// already sits inside .pageContainer, not the raw viewport — so the
// solved-for row can never exceed what .pageContainer actually leaves it,
// at any viewport width, without needing to know that padding's own formula
// at all.

export const NEIGHBOR_SCALE = 0.72;
// Must match the arrow buttons' own fixed size below (Carousel.tsx's
// .navArrow — see About.module.css).
export const ARROW_SIZE = 36;

const MIN_ITEM_SIZE = 100; // px — floor so items stay legible on the smallest phones
export const MAX_ITEM_SIZE = 352; // px — amy-wangs-jar's own CAROUSEL_MAX_ITEM_SIZE (0.8x its shared 440px ceiling)
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
