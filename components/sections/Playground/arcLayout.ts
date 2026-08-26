// Layout math for the /playground/[category] detail page's rotating photo
// arc — ported from jar-portfolio's components/WhatsInside/layout.ts,
// trimmed to just the pieces the arc actually needs. That source file's
// `computeLayout` re-solves itemSize against the live viewport width for
// its OWN carousel (a straight belt, not a curve) — CategoryDetail.tsx
// instead freezes itemSize at MAX_ITEM_SIZE (like jar-portfolio's own
// detail page already did) and scales the whole finished composition as a
// single unit to fit (see its own useElementWidth usage), so only the
// itemSize -> {gap, imageSize} formulas and the arc-slot math are needed
// here, not the width-solve itself.

export const MAX_ITEM_SIZE = 440; // px — the original design size, frozen rather than re-solved
const GAP_RATIO = 29 / 360; // preserves the original design's gap:itemSize ratio at any size
const IMAGE_RATIO = 256 / 360; // preserves the original image:itemSize ratio at any size

export function deriveItemMetrics(itemSize: number) {
  return {
    gap: itemSize * GAP_RATIO,
    imageSize: itemSize * IMAGE_RATIO,
  };
}

/**
 * Position + rotation for a slot `offsetDeg` degrees around from center (0
 * = dead center/top, positive = right, negative = left) at the given
 * radius.
 */
export function getArcSlot(offsetDeg: number, radius: number) {
  const angleDeg = 90 - offsetDeg;
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(angle) * radius,
    y: -Math.sin(angle) * radius,
    rotate: offsetDeg,
  };
}
