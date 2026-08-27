"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EtcCategory } from "@/lib/etc";
import { useCarouselStep } from "@/lib/useCarouselStep";
import { useElementWidth, useElementSize } from "./useElementWidth";
import { deriveItemMetrics, getArcSlot, MAX_ITEM_SIZE } from "./arcLayout";
import { SLIDE_UP_TRANSITION } from "./posterLayout";
import PlateCircle from "./PlateCircle";
import styles from "./CategoryDetail.module.css";
import { ARC_SPRING } from "@/lib/motion";

// The prev/next nav arrows on the photo ring itself — bigger than a plain
// text back link, so the ring makes visible room for them (see
// arrowLinearOffset below).
const NAV_ARROW_SIZE = 50;

const CENTER_SCALE = 1.1;
// How big the immediate left/right neighbor photos render, as a visual
// scale on top of their own itemSize box. The arc's own spacing/arrow-
// offset math (itemSpacing below) is re-derived from THIS value, so bumping
// it makes the neighbor photos bigger *and* automatically widens the gaps
// between items to match, instead of making them overlap.
const PHOTO_NEIGHBOR_SCALE = 0.85;
const FAR_SCALE = 0.7;

// Frozen at the plate's own geometry scale — the item ring's geometry
// (attachRadius, topReach, and therefore the hub's on-screen position) is
// built from THIS value, not PLATE_SCALE below, so shrinking/growing the
// plate's own rendered size never moves the item ring, arrows, or hub.
const PLATE_GEOMETRY_SCALE = 2.5;
// The plate's diameter relative to itemSize — purely how big the plate PNG
// itself renders, independent of PLATE_GEOMETRY_SCALE above.
const PLATE_SCALE = 2;
// How much of the plate image actually RENDERS, as a fraction of its own
// diameter — the crop window always starts from the image's own top edge
// (its clean edge post-rotation, see PlateCircle's own comment), so this is
// "how far down from the top of the image is visible." Deliberately large
// (nearly the whole plate) — tried tuning this to land the crop's bottom
// edge exactly at the footer, but that meant fighting the same handful of
// pixels every time the footer/arc math shifted elsewhere. Simpler: reveal
// almost the entire plate and let the excess bleed straight past the arc's
// own logical bottom, underneath the footer that immediately follows in the
// DOM (paints on top, covering it) — see PLATE_LAYOUT_RATIO below for why
// this does NOT also inflate the scale-fit math.
const PLATE_VISIBLE_RATIO = 0.95;
// The SAME ratio, but only for the scale-fit math (areaHeight/
// plateBottomBelowHub below) — kept modest so the arc/arrows don't shrink
// just to make room for the full-plate reveal above. The crop itself is
// still rendered at PLATE_VISIBLE_RATIO's full height; it's simply allowed
// to extend past this smaller "logical" footprint (.section's own
// overflow-y: visible is what permits that bleed instead of clipping it).
const PLATE_LAYOUT_RATIO = 0.35;
// Fraction of itemSize left as breathing room between the item ring and the
// plate's own rim.
const PLATE_ITEM_GAP_RATIO = -0.4;
// The actual "how curved" knob: a multiplier on attachRadius (below), the
// radius of the circle every photo sits on. Bigger radius = the same
// angular spread between items covers less vertical drop, so the left/right
// photos sit higher (flatter curve); smaller = more sag.
const CURVE_FLATTEN = 1.2;

// Ceiling on how large the whole composition (scaled up from its fixed
// design size) is ever allowed to render, so an ultrawide monitor doesn't
// blow it up just because the space is there.
const MAX_SCALE = 1.5;

/**
 * Every photo's signed offset from center at a given (unbounded) `index`,
 * keyed by photo index. When photoCount is even, the photo sitting exactly
 * opposite center can't split evenly between the two sides — the tie always
 * resolves to the right unless told otherwise, which would force that one
 * photo to jump straight from "visible on the left" to "invisible on the
 * right" (or back) on some steps and not others. Continuing whichever side
 * it resolved to at `prev`'s step instead keeps every step a uniform ±1
 * offset change for every photo, so both rotation directions animate the
 * same way.
 */
function computeOffsets(index: number, photoCount: number, prev: Map<number, number>): Map<number, number> {
  const offsets = new Map<number, number>();
  for (let i = 0; i < photoCount; i++) {
    const raw = (((i - index) % photoCount) + photoCount) % photoCount;
    let diff: number;
    if (raw > photoCount / 2) {
      diff = raw - photoCount;
    } else if (raw < photoCount / 2) {
      diff = raw;
    } else {
      const prevOffset = prev.get(i);
      diff = prevOffset !== undefined && prevOffset < 0 ? raw - photoCount : raw;
    }
    offsets.set(i, diff);
  }
  return offsets;
}

/**
 * The rotating photo-arc detail view landed on after clicking a plate in
 * plate view — ported from jar-portfolio's app/etc/[category]/page.tsx.
 * The plate sits at the bottom as a partially-cropped "hub," photos arrange
 * on a curved arc above it that rotates as you step through them, and the
 * whole thing is designed once at a fixed pixel size, then scaled as a
 * single unit (via useElementWidth + a capped `scale`) to fit inside
 * .pageContainer — same technique PlateView.tsx uses for the overview
 * poster, just width-only here too (this page has no fixed-viewport-height
 * budget the way jar-portfolio's detail page did; it's an ordinary
 * scrolling page like the rest of this site).
 */
export default function CategoryDetail({ category }: { category: EtcCategory }) {
  const router = useRouter();
  const photos = category.photos;
  const photoCount = photos.length;
  // step/index/advance are the same bookkeeping useCarouselStep documents
  // (see lib/useCarouselStep.ts for why `step` itself is unbounded rather
  // than wrapped). Every navigation action here (arrows, clicking a
  // neighbor) is a single ±1 step, so `advance` (goBy) is the only thing
  // that ever changes it.
  const { step, index, goBy: advance } = useCarouselStep(photoCount);

  // Next's App Router normally resets scroll on a <Link> navigation, but
  // this page's own height changes right after mount (ResizeObserver-driven
  // scale starts at 0 and jumps to its real value once useElementWidth/
  // useElementSize measure the DOM) — if the browser was scrolled any
  // distance down the (much taller) overview page before the click, that
  // late height change can leave the window a little short of true 0 here,
  // which reads as the arc's own top edge (arrows, far photos) being cropped
  // by the viewport. Forcing it explicitly on mount is a cheap, harmless
  // no-op on the common case (already at 0) and a real fix on the rare one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  // Frozen at the design constant, not re-solved per viewport — the whole
  // composition (item spacing, arrow position, plate size, crop line) is
  // designed once at this one fixed size, then scaled as a single unit to
  // fit whatever space is actually available (see `scale` below).
  const itemSize = MAX_ITEM_SIZE;
  const { gap, imageSize } = deriveItemMetrics(itemSize);
  // Width-only ref on the stage (unchanged — needed for the hub's own
  // inline width/height sizing and the scale-to-fit horizontal axis).
  const [stageRef, availableWidth] = useElementWidth<HTMLDivElement>();
  // Width+height ref on the content column — gives us the full vertical
  // budget so the composition can shrink on short viewports too.
  const [contentRef, contentSize] = useElementSize<HTMLDivElement>();

  // Bookkeeping for the jump-freeze behavior below — `offsets` is this
  // step's own resolved per-photo distances (computeOffsets above), and
  // `prevOffsets` is the step before it, kept only so a big jump (see
  // `jumped` further down) can be detected and frozen instead of sweeping
  // across the plate. This has to be state, not a ref: a ref mutated
  // directly during render (jar-portfolio's own version of this component
  // does exactly that) trips this project's lint rules against reading or
  // writing ref.current during render. The React-sanctioned alternative for
  // "recompute derived data when a prop/state value changes" is to detect
  // the change and call the setter *during render itself* — React then
  // discards this render's own return value and immediately re-renders
  // with the new state before anything reaches the screen, so there's no
  // extra frame or flicker, just one (invisible) wasted call to this
  // function body.
  const [ring, setRing] = useState(() => ({
    step,
    offsets: computeOffsets(index, photoCount, new Map()),
    prevOffsets: new Map<number, number>(),
  }));
  if (ring.step !== step) {
    setRing({ step, offsets: computeOffsets(index, photoCount, ring.offsets), prevOffsets: ring.offsets });
  }
  // Read unconditionally, not just in the `else` case: when the `if` above
  // just fired, this render's return value is about to be thrown away (see
  // this state's own comment), so it doesn't matter that `ring` here is
  // still one step stale — the very next call to this function body (which
  // is the one that actually renders) sees `ring.step === step` and reads
  // the freshly-committed values instead.
  const offsets = ring.offsets;
  const prevOffsets = ring.prevOffsets;

  // The radius the whole row curves around — tied to the plate's frozen
  // geometry scale (not its own possibly-different rendered size), so items
  // ride close around where the plate's rim always was, regardless of how
  // big the plate itself actually renders.
  const plateGeometryRadius = (itemSize * PLATE_GEOMETRY_SCALE) / 2;
  const attachRadius = (plateGeometryRadius + itemSize * (0.5 + PLATE_ITEM_GAP_RATIO)) * CURVE_FLATTEN;
  const plateSize = itemSize * PLATE_SCALE;
  const plateVisibleHeight = plateSize * PLATE_VISIBLE_RATIO;
  // Only for the scale-fit math below (areaHeight) — see PLATE_LAYOUT_RATIO's
  // own comment for why this is deliberately smaller than plateVisibleHeight
  // (the crop's own actual rendered height) rather than reusing it directly.
  const plateLayoutHeight = plateSize * PLATE_LAYOUT_RATIO;
  // The crop window's own top stays pinned plateGeometryRadius above the
  // hub, so the visible sliver stays attached to the photo ring. This is
  // deliberately based on plateLayoutHeight, not the taller plateVisibleHeight
  // actually used to size the crop below — the crop's real bottom edge now
  // lands PAST the hub (by design, so it can reach the footer), but the
  // scale-fit math still treats the hub as if it only extended this far.
  const plateBottomBelowHub = plateLayoutHeight - plateGeometryRadius;

  // Converts a *linear* distance into the angle needed to cover that same
  // arc-length at attachRadius.
  const degFor = (linear: number) => (linear / attachRadius) * (180 / Math.PI);
  const neighborSize = itemSize * PHOTO_NEIGHBOR_SCALE;
  const itemSpacing = itemSize / 2 + gap + neighborSize / 2;
  const angleStepDeg = degFor(itemSpacing);
  const arrowLinearOffset = itemSpacing + neighborSize / 2 + gap + NAV_ARROW_SIZE / 2;
  const arrowDeg = degFor(arrowLinearOffset);
  const leftArrowSlot = getArcSlot(-arrowDeg, attachRadius);
  const rightArrowSlot = getArcSlot(arrowDeg, attachRadius);

  // Container sizing: wide/tall enough to hold the plate + the full curved
  // row, arrows included, without clipping.
  const topReach = attachRadius + (itemSize * CENTER_SCALE) / 2 + 12;
  const areaHeight = topReach + plateBottomBelowHub;
  const areaWidth = Math.abs(rightArrowSlot.x) * 2 + NAV_ARROW_SIZE + 16;

  const designWidth = photoCount === 0 ? plateSize : areaWidth;
  // photoCount === 0 branch: same plateLayoutHeight-not-plateVisibleHeight
  // reasoning as areaHeight above — the empty-state plate is also allowed to
  // render taller than what the scale-fit math accounts for.
  const designHeight = photoCount === 0 ? plateLayoutHeight : areaHeight;
  // Scale by whichever axis is tighter: width OR height.
  // The header (back+title) sits outside .stage but inside .content —
  // subtract an estimate of its rendered height (≈60px for the title +
  // margin-bottom:12px) from contentSize.height so the stage's own
  // designHeight budget is compared against only the space below it.
  const headerEstimate = 60;
  const availableHeight = contentSize.height > 0 ? Math.max(contentSize.height - headerEstimate, 0) : 0;
  // Both fall back to 0 (not 1) when unmeasured — a `1` fallback here used to
  // mean the composition briefly rendered at its full, unscaled design size
  // (areaWidth/areaHeight, well past what actually fits) for the one frame
  // before useElementWidth/useElementSize's layout effects correct it. That
  // used to be invisible behind .section's old `overflow: hidden`; now that
  // overflow is visible (see .section's own comment — needed so the plate
  // can bleed under the footer), the same oversized flash reads as the whole
  // composition visibly zooming in on load. `scale`'s own `Math.max(..., 0)`
  // below keeps this from ever going negative before real measurements land.
  const widthScale = availableWidth > 0 ? availableWidth / designWidth : 1;
  const heightScale = availableHeight > 0 ? availableHeight / designHeight : 1;
  const scale = Math.min(widthScale, heightScale, MAX_SCALE);

  return (
    <section className={styles.section}>
      <div className={`pageContainer ${styles.pageInner}`}>
        <motion.div
          ref={contentRef}
          className={styles.content}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SLIDE_UP_TRANSITION}
        >
          <header className={styles.header}>
            {/* Briefly tried a solid black circle around the arrow (matching
             * a similar attempt on the case-study pages' own Back button,
             * CaseStudyKit.tsx) — dropped per request ("i dont want the
             * black circle around the arrows"). Plain "←" glyph again.
             * router.push('/playground'), not router.back() — per request,
             * this should always land on the top of the plates overview
             * grid, not wherever you happened to scroll to on it before
             * clicking into a category (router.push always scrolls to top
             * by default, so no extra scroll-reset code is needed here). */}
            <button type="button" onClick={() => router.push('/playground')} className={styles.backButton}>
              <span aria-hidden="true">←</span>
              Back
            </button>
            <h1 className={styles.title}>{category.label}</h1>
          </header>

          {photoCount === 0 ? (
            <div ref={stageRef} className={styles.stage} style={{ height: plateLayoutHeight * scale }}>
              <div
                className={styles.hubEmpty}
                style={{
                  width: plateSize,
                  height: plateVisibleHeight,
                  transform: `translateX(-50%) scale(${scale})`,
                }}
              >
                <p className={styles.comingSoon}>Coming soon.</p>
                <div className={styles.plateCrop} style={{ top: 0, width: plateSize, height: plateVisibleHeight }}>
                  <PlateCircle label="" src={category.plateImage} size={plateSize} />
                </div>
              </div>
            </div>
          ) : (
            <div ref={stageRef} className={styles.stage} style={{ height: areaHeight * scale }}>
              <div
                className={styles.hub}
                style={{
                  width: areaWidth,
                  height: areaHeight,
                  transform: `translateX(-50%) scale(${scale})`,
                }}
              >
                {/* Hub: the plate, both arrows, and the item track are all
                    positioned relative to this single anchor point. */}
                <div className={styles.hubAnchor} style={{ bottom: plateBottomBelowHub }}>
                  <div
                    className={styles.plateCrop}
                    style={{ top: -plateGeometryRadius, width: plateSize, height: plateVisibleHeight }}
                  >
                    <PlateCircle label="" src={category.plateImage} size={plateSize} />
                  </div>

                  {photoCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => advance(-1)}
                        aria-label="Previous photo"
                        className={styles.navArrow}
                        style={{
                          left: leftArrowSlot.x,
                          top: leftArrowSlot.y,
                          transform: `translate(-50%, -50%) rotate(${leftArrowSlot.rotate}deg)`,
                        }}
                      >
                        <ChevronLeft size={32} strokeWidth={1.25} />
                      </button>
                      <button
                        type="button"
                        onClick={() => advance(1)}
                        aria-label="Next photo"
                        className={styles.navArrow}
                        style={{
                          left: rightArrowSlot.x,
                          top: rightArrowSlot.y,
                          transform: `translate(-50%, -50%) rotate(${rightArrowSlot.rotate}deg)`,
                        }}
                      >
                        <ChevronRight size={32} strokeWidth={1.25} />
                      </button>
                    </>
                  )}

                  {/* Edge-faded (an alpha mask on the items themselves, not
                      an opaque overlay) — mask-size/-position stretch the
                      left-right gradient to 3x this box's own height,
                      centered, so the center item's spring can briefly
                      overshoot past its resting scale without popping
                      invisible at the top edge. */}
                  <div className={styles.itemMask} style={{ top: -topReach, width: areaWidth, height: topReach }}>
                    {/* The wheel: a single rigid rotation (spring on
                        `rotate` alone) is what makes the whole row move
                        together, instead of every item separately
                        re-targeting its own x/y along the curve. Pivots
                        from bottom-center (originY:1), the hub point every
                        item is already anchored to below. */}
                    <motion.div
                      className={styles.wheel}
                      style={{ originX: 0.5, originY: 1 }}
                      initial={false}
                      animate={{ rotate: -step * angleStepDeg }}
                      transition={ARC_SPRING}
                    >
                      {photos.map((photo, i) => {
                        const offset = offsets.get(i)!;
                        const dist = Math.abs(offset);
                        const isCenter = dist === 0;
                        const imageOpacity = isCenter ? 1 : dist === 1 ? 0.55 : 0;
                        // Only the immediate left/right neighbors are click
                        // targets — clicking one centers it (advancing the
                        // wheel). `offset` (this photo's true signed
                        // distance from center, not the freeze-adjusted
                        // posOffset below) is exactly the single step that
                        // lands it in the center.
                        const clickable = dist === 1;

                        const prevOffset = prevOffsets.get(i);
                        const jumped = prevOffset !== undefined && Math.abs(offset - prevOffset) > 1;
                        // A jump straight from the visible left slot into
                        // the invisible right one would otherwise teleport
                        // to its new (offscreen) spot and only then start
                        // fading — an instant pop rather than a fade.
                        // Freezing position at the last visible slot for
                        // just this transition lets it fade out from where
                        // it was actually seen instead.
                        const exiting = jumped && Math.abs(prevOffset!) <= 1 && dist >= 2;
                        const posOffset = exiting ? prevOffset! : offset;
                        const posDist = Math.abs(posOffset);
                        const itemStep = step + posOffset;
                        const itemScale = posDist === 0 ? CENTER_SCALE : posDist === 1 ? PHOTO_NEIGHBOR_SCALE : FAR_SCALE;
                        // itemScale grows/shrinks each photo from its own
                        // center, so a bigger-scaled photo pushes its
                        // bottom edge further from the hub than a smaller
                        // neighbor's — recomputing the point at an adjusted
                        // radius (through getArcSlot, the same math every
                        // other position on this arc already uses) keeps
                        // position and rotation self-consistent at any
                        // angle.
                        const bottomAlignedRadius = attachRadius + (itemSize * (itemScale - 1)) / 2;
                        const slot = getArcSlot(itemStep * angleStepDeg, bottomAlignedRadius);

                        return (
                          <motion.button
                            type="button"
                            key={photo.src}
                            onClick={clickable ? () => advance(offset) : undefined}
                            aria-label={clickable ? `Center photo: ${photo.caption}` : undefined}
                            aria-hidden={!clickable}
                            tabIndex={clickable ? 0 : -1}
                            initial={false}
                            animate={{ x: slot.x, y: slot.y, rotate: slot.rotate, scale: itemScale }}
                            transition={
                              jumped
                                ? {
                                    x: { duration: 0 },
                                    y: { duration: 0 },
                                    rotate: { duration: 0 },
                                    scale: { duration: 0 },
                                  }
                                : ARC_SPRING
                            }
                            style={{
                              zIndex: 10 - dist,
                              pointerEvents: clickable ? "auto" : "none",
                              cursor: clickable ? "pointer" : undefined,
                              width: itemSize,
                              height: itemSize,
                              // Centers the box on its (left:50%, top:100%)
                              // anchor point via a static negative margin,
                              // not a stylesheet `transform: translate(-50%,
                              // -50%)` — Framer already owns this element's
                              // `transform` entirely (it's driven by the
                              // `animate` x/y/rotate/scale below), so a CSS
                              // transform here would just be silently
                              // overridden. Same reasoning as PhotoTile.tsx's
                              // own slotLeft/slotTop centering math.
                              marginLeft: -itemSize / 2,
                              marginTop: -itemSize / 2,
                            }}
                            className={styles.item}
                          >
                            <motion.div
                              animate={{ opacity: imageOpacity }}
                              transition={ARC_SPRING}
                              className={styles.itemImageWrap}
                              style={{ width: imageSize, height: imageSize }}
                            >
                              <Image
                                src={photo.src}
                                alt={photo.caption}
                                fill
                                sizes="(min-width: 640px) 288px, 256px"
                                draggable={false}
                                className={styles.itemImage}
                                unoptimized={process.env.NODE_ENV !== "production"}
                              />
                            </motion.div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
