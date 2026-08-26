import { ETC_CATEGORIES, type EtcCategory, type EtcPhoto } from "@/lib/etc";

/**
 * Layout math for the plate view's poster composition — ported from
 * jar-portfolio's app/etc/page.tsx (STAGE_WIDTH/computeStageHeight and
 * friends), which designs the whole thing at one fixed pixel size and never
 * rescales it (that page just lets a narrow viewport scroll horizontally
 * instead). Here the poster is designed at this same fixed size, but then
 * scaled as a single unit (via `transform: scale()`, capped at MAX_SCALE) to
 * fit inside whatever width `.pageContainer` actually has — see index.tsx's
 * own usePosterScale usage. Nothing below needs to know about that scale
 * factor; it all still just designs one fixed-size canvas.
 */

// Never grown for a wide desktop the way jar-portfolio's detail carousel
// page grows past MAX_ITEM_SIZE (its own poster IS the design ceiling — see
// index.tsx) — 1 just means "never render bigger than authored," since this
// site's own --content-max (1050px) is already narrower than DESIGN_WIDTH
// below, so upscaling essentially never triggers anyway. Kept as an actual
// cap (not hardcoded out) so a future --content-max increase can't
// accidentally blow the poster up past its tuned size.
export const MAX_SCALE = 1;

// Matches jar-portfolio's own STAGE_WIDTH: every xPct/yPct and plate.width/
// height/z field in lib/etc.ts was mockup-tuned at this exact canvas width,
// so it has to stay in lockstep with that data, not just be picked freely.
export const DESIGN_WIDTH = 1277;
export const PLATE_SIZE = 480; // matches jar-portfolio's own PLATE_SIZE estimate

const SLIDE_UP_DURATION = 0.35;
const PHOTO_DURATION = 0.35;
const STAGGER_STEP = 0.03;
export const VIEWPORT_AMOUNT = 0.1;
export const SLIDE_UP_TRANSITION = { duration: SLIDE_UP_DURATION, ease: "easeOut" as const };

const PLATE_SLIDE_OFFSET = 40; // matches the plate motion.div's initial y
const PHOTO_SLIDE_OFFSET = 70; // matches the photo motion.div's initial y (upward)
const STAGE_HEIGHT_PADDING = 48;

// See categoryStaggerStep's own comment — caps how much slower a
// many-photo category's cascade reads next to drawing's own 4-photo one.
const REFERENCE_PHOTO_COUNT = 4;
const STAGGER_SPAN = (REFERENCE_PHOTO_COUNT - 1) * STAGGER_STEP;

/** Where a photo falls in its category's own top-to-bottom order (0 =
 * highest up), independent of the order it's listed in the category. */
function topToBottomRank(photos: EtcPhoto[], target: EtcPhoto): number {
  return [...photos].sort((a, b) => (a.plate?.yPct ?? 0) - (b.plate?.yPct ?? 0)).indexOf(target);
}

/** STAGGER_STEP is per-photo, so a category's *total* cascade time grows
 * with its photo count. This scales the step down for categories with more
 * photos than drawing, so every category's cascade stays within the same
 * time budget drawing already uses instead of stretching out further. */
function categoryStaggerStep(photos: EtcPhoto[]): number {
  return Math.min(STAGGER_STEP, STAGGER_SPAN / Math.max(1, photos.length - 1));
}

/** Entrance delay for a given photo within its category's cluster — shared
 * by every photo's `transition.delay` in PlateView. */
export function photoRevealDelay(photos: EtcPhoto[], photo: EtcPhoto): number {
  return SLIDE_UP_DURATION + topToBottomRank(photos, photo) * categoryStaggerStep(photos);
}
export const PHOTO_TRANSITION_DURATION = PHOTO_DURATION;

function requiredStageHeight(yPct: number, size: number, topExtra: number, bottomExtra: number): number {
  const half = size / 2;
  const fraction = yPct / 100;
  return Math.max((half + topExtra) / fraction, (half + bottomExtra) / (1 - fraction));
}

/** Tallest room any single plate/photo needs to avoid clipping top or
 * bottom, accounting for each element's *unsettled* whileInView offset (see
 * jar-portfolio's own comment this was ported from) — not just its resting
 * size. */
function computeStageHeight(categories: EtcCategory[]): number {
  let required = 0;
  for (const cat of categories) {
    required = Math.max(required, requiredStageHeight(cat.plateYPct, PLATE_SIZE, 0, PLATE_SLIDE_OFFSET));
    for (const photo of cat.photos) {
      if (!photo.plate) continue;
      required = Math.max(
        required,
        requiredStageHeight(photo.plate.yPct, photo.plate.height, PHOTO_SLIDE_OFFSET, 0),
      );
    }
  }
  return Math.ceil(required) + STAGE_HEIGHT_PADDING;
}

export const STAGE_HEIGHT = computeStageHeight(ETC_CATEGORIES);

/** Crops the tall, worst-case STAGE_HEIGHT canvas down to how far the real
 * content actually reaches, so there's no dead space below the lowest
 * plate/photo — see jar-portfolio's own comment on why this is a separate
 * pass from computeStageHeight itself. */
function computeVisibleStageHeight(categories: EtcCategory[], stageHeight: number): number {
  let bottom = 0;
  for (const cat of categories) {
    bottom = Math.max(bottom, (cat.plateYPct / 100) * stageHeight + PLATE_SIZE / 2);
    for (const photo of cat.photos) {
      if (!photo.plate) continue;
      bottom = Math.max(bottom, (photo.plate.yPct / 100) * stageHeight + photo.plate.height / 2);
    }
  }
  return Math.ceil(bottom) + 40;
}

/** Every plate/photo's yPct is authored as a % of STAGE_HEIGHT (the tall,
 * worst-case reference height) — this converts that once into a literal px
 * offset within the DESIGN_WIDTH x STAGE_HEIGHT canvas. */
export function toPx(yPct: number): number {
  return (yPct / 100) * STAGE_HEIGHT;
}

/**
 * Top-left corner (not center) of a `width`x`height` box centered at
 * (xPct, yPct) — literal px, in the same DESIGN_WIDTH x STAGE_HEIGHT canvas
 * as toPx. PhotoTile uses these instead of the plate's own "left: X%; top:
 * Ypx" + CSS `transform: translate(-50%,-50%)` centering trick, because its
 * root element also carries Framer's `layout` prop — a `layout`-enabled
 * element's FLIP animation is itself driven by an inline `transform` Framer
 * writes straight onto the DOM node, which would silently clobber a
 * stylesheet `transform: translate(...)` on that same element (inline
 * always wins over an external rule for the same property). Baking the
 * centering into left/top arithmetic instead means the element's own
 * `transform` is left entirely free for `layout` to use.
 */
export function slotLeft(xPct: number, width: number): number {
  return (xPct / 100) * DESIGN_WIDTH - width / 2;
}
export function slotTop(yPct: number, height: number): number {
  return toPx(yPct) - height / 2;
}

export const VISIBLE_STAGE_HEIGHT = computeVisibleStageHeight(ETC_CATEGORIES, STAGE_HEIGHT);
